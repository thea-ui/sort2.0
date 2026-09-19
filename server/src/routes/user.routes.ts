import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, optionalAuthenticate, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { getActiveSchoolYearId } from '../services/rollover.service.js';
import { generateCertificatePDF } from '../services/certificate-pdf.service.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/users
// Privacy: anonymous callers get a minimised projection (no email, employee ID,
// account status). Only staff roles receive the full record (RA 10173 data minimisation).
router.get('/', optionalAuthenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const role = (req as AuthenticatedRequest).userRole;
    const isStaff = role === 'ADMIN' || role === 'TEACHER' || role === 'MRF';

    const users = await prisma.user.findMany({
      where: {
        syncSource: 'ENROLLPRO',
      },
      orderBy: { name: 'asc' },
      select: isStaff
        ? {
            id: true,
            name: true,
            email: true,
            employeeId: true,
            role: true,
            points: true,
            warningsCount: true,
            classroomSection: true,
            certificates: true,
            syncSource: true,
            gradeLevel: true,
            sectionName: true,
            createdAt: true,
            accountStatus: true,
            suspendedUntil: true,
            archivedAt: true,
            enrollmentStatus: true,
          }
        : {
            id: true,
            name: true,
            role: true,
            points: true,
            classroomSection: true,
            certificates: true,
            gradeLevel: true,
            sectionName: true,
          },
    });

    const formatted = users.map((u) => ({
      ...u,
      certificatesEarned: u.certificates,
    }));

    return res.json(formatted);
  } catch (error) {
    console.error('Fetch users error:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/leaderboard - Top students by points (EnrollPro-synced only)
router.get('/leaderboard', async (_req: Request, res: Response): Promise<any> => {
  try {
    const leaderboard = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        syncSource: 'ENROLLPRO',
        // Graduated/archived learners cannot sign in, so they must never be ranked.
        archivedAt: null,
      },
      orderBy: { points: 'desc' },
      take: 20,
      select: {
        id: true,
        name: true,
        points: true,
        gradeLevel: true,
        sectionName: true,
        classroomSection: true,
        certificates: true,
      },
    });

    return res.json(leaderboard);
  } catch (error) {
    console.error('Fetch leaderboard error:', error);
    return res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// POST /api/users/:id/warn - Issue an offense by severity type (admin only)
router.post('/:id/warn', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { description, severity, deductPoints, reportId } = req.body;
    const sev = (severity || 'WARNING') as string;

    const targetId = Array.isArray(id) ? id[0] : id;
    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const systemSettings = await prisma.systemSetting.findUnique({ where: { id: 'default_setting' } });
    const suspensionDurationHours = systemSettings?.suspensionDurationHours ?? 24;

    let offenseData: any = {
      userId: targetId,
      description: description || 'Violation of waste management rules',
      severity: sev as any,
      schoolYearId: await getActiveSchoolYearId(),
    };

    let pointsDeducted = 0;
    let warningsCount = user.warningsCount;

    if (sev === 'WARNING') {
      // WARNING: log offense, increment warningsCount only
      warningsCount = user.warningsCount + 1;
      await prisma.user.update({ where: { id: targetId }, data: { warningsCount: { increment: 1 } } });

    } else if (sev === 'DEDUCT') {
      // DEDUCT: log offense, increment warningsCount, deduct points
      warningsCount = user.warningsCount + 1;
      const updatedUser = await prisma.user.update({ where: { id: targetId }, data: { warningsCount: { increment: 1 } } });

      const autoDeductAmount = systemSettings?.warningAutoDeductAmount ?? 10;
      const warningThreshold = systemSettings?.warningThreshold ?? 3;
      const pointsToDeduct = deductPoints || (updatedUser.warningsCount >= warningThreshold ? autoDeductAmount : 0);

      if (pointsToDeduct > 0) {
        const actualDeduction = Math.min(pointsToDeduct, updatedUser.points);
        if (actualDeduction > 0) {
          await prisma.user.update({ where: { id: targetId }, data: { points: { decrement: actualDeduction } } });
          await prisma.pointHistory.create({
            data: {
              userId: targetId,
              amount: -actualDeduction,
              reason: `Offense penalty: ${description || 'DEDUCT'}${updatedUser.warningsCount >= warningThreshold ? ` (${warningThreshold}-strike rule)` : ''}`,
              schoolYearId: await getActiveSchoolYearId(),
            },
          });
          pointsDeducted = actualDeduction;
        }
      }

    } else if (sev === 'SUSPENSION') {
      // SUSPENSION: log offense with expiresAt, suspend account for X hours
      const suspendedUntil = new Date(Date.now() + suspensionDurationHours * 60 * 60 * 1000);
      offenseData.expiresAt = suspendedUntil;
      warningsCount = user.warningsCount + 1;

      await prisma.user.update({
        where: { id: targetId },
        data: {
          warningsCount: { increment: 1 },
          accountStatus: 'SUSPENDED',
          suspendedUntil,
        },
      });

      // Invalidate all sessions for this user
      await prisma.userSession.deleteMany({ where: { userId: targetId } });
    }

    const offense = await prisma.offense.create({ data: offenseData });

    return res.json({
      message: sev === 'SUSPENSION'
        ? `Account suspended for ${suspensionDurationHours} hours`
        : sev === 'DEDUCT'
          ? `${pointsDeducted} points deducted`
          : 'Warning issued',
      offense,
      warningsCount,
      pointsDeducted,
    });
  } catch (error) {
    console.error('Warn user error:', error);
    return res.status(500).json({ error: 'Failed to issue warning' });
  }
});

// POST /api/users/:id/deduct-points - Deduct points directly (admin only)
router.post('/:id/deduct-points', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    const targetId = Array.isArray(id) ? id[0] : id;
    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const deductAmount = Math.abs(parseInt(amount) || 0);
    if (deductAmount <= 0) {
      return res.status(400).json({ error: 'Invalid deduction amount' });
    }

    // Prevent points from going below 0
    const actualDeduction = Math.min(deductAmount, user.points);

    if (actualDeduction <= 0) {
      return res.json({ message: 'No points to deduct', points: 0 });
    }

    // The ledger and the balance must move together, and the ledger must record
    // the amount ACTUALLY deducted (not the requested amount) or the history
    // stops reconciling with users.points.
    const activeSchoolYearId = await getActiveSchoolYearId();
    const updatedUser = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: targetId },
        data: { points: { decrement: actualDeduction } },
      });

      await tx.pointHistory.create({
        data: {
          userId: targetId,
          amount: -actualDeduction,
          reason: reason || 'Admin point deduction',
          schoolYearId: activeSchoolYearId,
        },
      });

      return updated;
    });

    return res.json({
      message: `${actualDeduction} points deducted`,
      points: updatedUser.points,
      requestedAmount: deductAmount,
    });
  } catch (error) {
    console.error('Deduct points error:', error);
    return res.status(500).json({ error: 'Failed to deduct points' });
  }
});

// POST /api/users/:id/claim-certificate — claim a certificate (authenticated user or admin)
router.post('/:id/claim-certificate', authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { certificateName } = req.body;
    const targetId = Array.isArray(id) ? id[0] : id;
    const reqUser = req as AuthenticatedRequest;

    // Only the user themselves or an admin can claim
    if (reqUser.userId !== targetId && reqUser.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Can only claim your own certificate', code: 'FORBIDDEN' });
    }

    if (!certificateName || typeof certificateName !== 'string' || certificateName.trim().length === 0) {
      return res.status(400).json({ error: 'certificateName is required' });
    }

    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'STUDENT') {
      return res.status(400).json({ error: 'Only students can claim certificates' });
    }

    // Check threshold
    const settings = await prisma.systemSetting.findUnique({ where: { id: 'default_setting' } });
    const threshold = settings?.certificatePointThreshold ?? 500;

    if (user.points < threshold) {
      return res.status(400).json({
        error: `Insufficient points. Need ${threshold}, have ${user.points}`,
        code: 'INSUFFICIENT_POINTS',
        required: threshold,
        current: user.points,
      });
    }

    // Check if already claimed
    const existingCerts = user.certificates || [];
    if (existingCerts.includes(certificateName.trim())) {
      return res.status(409).json({
        error: 'Certificate already claimed',
        code: 'ALREADY_CLAIMED',
      });
    }

    // Award certificate
    const updated = await prisma.user.update({
      where: { id: targetId },
      data: {
        certificates: { push: certificateName.trim() },
      },
      select: { id: true, name: true, points: true, certificates: true },
    });

    console.log(`[Certificate] ${user.name} claimed "${certificateName.trim()}" (${user.points} pts)`);
    return res.json({
      message: 'Certificate claimed successfully',
      user: { ...updated, certificatesEarned: updated.certificates },
    });
  } catch (error) {
    console.error('Claim certificate error:', error);
    return res.status(500).json({ error: 'Failed to claim certificate' });
  }
});

// POST /api/users/claim-certificates-batch — auto-claim for all qualified students (admin only)
router.post('/claim-certificates-batch', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const { certificateName } = req.body;

    if (!certificateName || typeof certificateName !== 'string' || certificateName.trim().length === 0) {
      return res.status(400).json({ error: 'certificateName is required' });
    }

    const settings = await prisma.systemSetting.findUnique({ where: { id: 'default_setting' } });
    const threshold = settings?.certificatePointThreshold ?? 500;

    // Find all students who meet threshold and haven't claimed this cert yet
    const qualifiedStudents = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        syncSource: 'ENROLLPRO',
        points: { gte: threshold },
      },
      select: { id: true, name: true, points: true, certificates: true },
    });

    const certName = certificateName.trim();
    const newlyAwarded: { id: string; name: string; points: number }[] = [];
    const alreadyHad: { id: string; name: string }[] = [];

    for (const student of qualifiedStudents) {
      const existingCerts = student.certificates || [];
      if (existingCerts.includes(certName)) {
        alreadyHad.push({ id: student.id, name: student.name });
        continue;
      }

      await prisma.user.update({
        where: { id: student.id },
        data: { certificates: { push: certName } },
      });

      newlyAwarded.push({ id: student.id, name: student.name, points: student.points });
    }

    console.log(`[Certificate Batch] "${certName}" awarded to ${newlyAwarded.length} students (${alreadyHad.length} already had it)`);

    return res.json({
      message: `Certificate "${certName}" awarded to ${newlyAwarded.length} students`,
      certificateName: certName,
      threshold,
      awarded: newlyAwarded,
      alreadyHad,
      summary: {
        totalQualified: qualifiedStudents.length,
        newlyAwarded: newlyAwarded.length,
        alreadyClaimed: alreadyHad.length,
      },
    });
  } catch (error) {
    console.error('Batch certificate error:', error);
    return res.status(500).json({ error: 'Failed to award certificates' });
  }
});

// GET /api/users/:id/certificate/:certName/download — download certificate PDF
router.get('/:id/certificate/:certName/download', authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const certName = String(req.params.certName);
    const targetId = Array.isArray(id) ? id[0] : id;
    const reqUser = req as AuthenticatedRequest;

    // Only the user themselves or an admin can download
    if (reqUser.userId !== targetId && reqUser.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Can only download your own certificate', code: 'FORBIDDEN' });
    }

    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const decodedCertName = decodeURIComponent(certName);
    const certificates = user.certificates || [];

    if (!certificates.includes(decodedCertName)) {
      return res.status(404).json({ error: 'Certificate not earned yet', code: 'NOT_EARNED' });
    }

    // Get active school year for the certificate
    const activeSY = await prisma.schoolYear.findFirst({ where: { isActive: true } });
    const schoolYearLabel = activeSY?.label || 'Current';

    // Get leaderboard rank for this user
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT', syncSource: 'ENROLLPRO' },
      orderBy: { points: 'desc' },
      select: { id: true },
    });
    const rank = students.findIndex(s => s.id === targetId) + 1;

    const pdfBuffer = await generateCertificatePDF({
      studentName: user.name,
      certificateName: decodedCertName,
      schoolYear: schoolYearLabel,
      points: user.points,
      rank: rank || 1,
      gradeLevel: user.gradeLevel || undefined,
      sectionName: user.sectionName || undefined,
      lrn: user.enrollproLrn || undefined,
      dateAwarded: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    });

    const safeFileName = decodedCertName.replace(/[^a-zA-Z0-9]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}_${user.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());

    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Download certificate error:', error);
    return res.status(500).json({ error: 'Failed to generate certificate PDF' });
  }
});

// GET /api/users/:id/certificate/:certName/view — view certificate PDF in browser
router.get('/:id/certificate/:certName/view', authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const certName = String(req.params.certName);
    const targetId = Array.isArray(id) ? id[0] : id;
    const reqUser = req as AuthenticatedRequest;

    if (reqUser.userId !== targetId && reqUser.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Can only view your own certificate', code: 'FORBIDDEN' });
    }

    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const decodedCertName = decodeURIComponent(certName);
    const certificates = user.certificates || [];

    if (!certificates.includes(decodedCertName)) {
      return res.status(404).json({ error: 'Certificate not earned yet', code: 'NOT_EARNED' });
    }

    const activeSY = await prisma.schoolYear.findFirst({ where: { isActive: true } });
    const schoolYearLabel = activeSY?.label || 'Current';

    const students = await prisma.user.findMany({
      where: { role: 'STUDENT', syncSource: 'ENROLLPRO' },
      orderBy: { points: 'desc' },
      select: { id: true },
    });
    const rank = students.findIndex(s => s.id === targetId) + 1;

    const pdfBuffer = await generateCertificatePDF({
      studentName: user.name,
      certificateName: decodedCertName,
      schoolYear: schoolYearLabel,
      points: user.points,
      rank: rank || 1,
      gradeLevel: user.gradeLevel || undefined,
      sectionName: user.sectionName || undefined,
      lrn: user.enrollproLrn || undefined,
      dateAwarded: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${decodedCertName}_${user.name}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());

    return res.send(pdfBuffer);
  } catch (error) {
    console.error('View certificate error:', error);
    return res.status(500).json({ error: 'Failed to generate certificate PDF' });
  }
});

export default router;
