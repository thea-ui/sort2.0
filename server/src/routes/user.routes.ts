import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { getActiveSchoolYearId } from '../services/rollover.service.js';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'sortv2_super_secret_jwt_key_2026';

// Auth middleware — only ADMIN can manage users
function requireAdmin(req: Request, res: Response, next: Function): any {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
    if (decoded.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    (req as any).userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// GET /api/users - List EnrollPro-synced users (public for initial app load)
router.get('/', async (_req: Request, res: Response): Promise<any> => {
  try {
    const users = await prisma.user.findMany({
      where: {
        syncSource: 'ENROLLPRO',
      },
      orderBy: { name: 'asc' },
      select: {
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

    await prisma.user.update({
      where: { id: targetId },
      data: { points: { decrement: actualDeduction } },
    });

    await prisma.pointHistory.create({
      data: {
        userId: targetId,
        amount: -deductAmount,
        reason: reason || 'Admin point deduction',
        schoolYearId: await getActiveSchoolYearId(),
      },
    });

    const updatedUser = await prisma.user.findUnique({ where: { id: targetId } });
    return res.json({
      message: `${deductAmount} points deducted`,
      points: updatedUser?.points || 0,
    });
  } catch (error) {
    console.error('Deduct points error:', error);
    return res.status(500).json({ error: 'Failed to deduct points' });
  }
});

export default router;
