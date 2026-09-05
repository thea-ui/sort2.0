import { Router, Request, Response } from 'express';
import { PrismaClient, ReportStatus, WasteCategory, Urgency, ReportType, Role } from '@prisma/client';
import { getActiveSchoolYearId } from '../services/rollover.service.js';
import { verifyReports, formatReportResponse } from '../services/report-points.service.js';

const router = Router();
const prisma = new PrismaClient();

// DELETE /api/reports/purge - Wipe all test reports, point histories, offenses, and reset user points
router.delete('/purge', async (req: Request, res: Response): Promise<any> => {
  try {
    await prisma.pointHistory.deleteMany({});
    await prisma.report.deleteMany({});
    await prisma.offense.deleteMany({});
    await prisma.user.updateMany({
      where: { role: Role.STUDENT },
      data: { points: 0, warningsCount: 0, certificates: [] },
    });

    // Reset recycle market inventory to 0 so tests start from a clean slate
    await prisma.recycleMarketStock.updateMany({
      data: { accumulatedKg: 0.0, isApprovedForSale: false },
    });
    await prisma.recycleSaleTransaction.deleteMany({});

    console.log('🧹 Purged all reports, point histories, offenses, and reset market inventory.');
    return res.json({ message: 'Database purged successfully' });
  } catch (error) {
    console.error('Purge error:', error);
    return res.status(500).json({ error: 'Failed to purge database' });
  }
});

// GET /api/reports - Fetch all reports with optional filters
router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const { status, category, reporterId, schoolYearId } = req.query;

    const where: any = {};
    if (status) where.status = status as ReportStatus;
    if (category) where.category = category as WasteCategory;
    if (reporterId) where.reporterId = reporterId as string;

    // School year filtering: explicit param or active SY
    if (schoolYearId) {
      where.schoolYearId = schoolYearId as string;
    } else {
      const activeSyId = await getActiveSchoolYearId();
      if (activeSyId) where.schoolYearId = activeSyId;
    }

    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: {
          select: { id: true, name: true, role: true, email: true },
        },
        assignedMrf: {
          select: { id: true, name: true },
        },
      },
    });

    const formatted = reports.map(formatReportResponse);
    return res.json(formatted);
  } catch (error) {
    console.error('Fetch reports error:', error);
    return res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

function mapWasteCategory(cat?: string): WasteCategory {
  if (!cat) return WasteCategory.NON_BIODEGRADABLE;
  const upper = cat.toUpperCase();
  if (upper === 'BIODEGRADABLE' || upper === 'ORGANIC') return WasteCategory.BIODEGRADABLE;
  if (upper === 'RECYCLABLE') return WasteCategory.RECYCLABLE;
  if (upper === 'HAZARDOUS') return WasteCategory.HAZARDOUS;
  return WasteCategory.NON_BIODEGRADABLE;
}

// POST /api/reports - Submit a new waste report
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      title,
      description,
      urgency,
      category,
      coordinates,
      locationName,
      reporterId,
      reporterEmail,
      imageUrl,
      reportType,
    } = req.body;

    if (!title || !coordinates) {
      return res.status(400).json({ error: 'Title and coordinates are required' });
    }

    const locName = locationName || 'Campus Location';
    const cat = mapWasteCategory(category);

    // Resolve valid reporterId by ID or email to prevent FK violation
    let targetUser: any = null;
    if (reporterId) {
      targetUser = await prisma.user.findUnique({ where: { id: reporterId } }).catch(() => null);
    }
    if (!targetUser && reporterEmail) {
      targetUser = await prisma.user.findUnique({ where: { email: reporterEmail.toLowerCase() } }).catch(() => null);
    }
    if (!targetUser) {
      targetUser = await prisma.user.findFirst({ where: { role: Role.STUDENT } }) ||
                   await prisma.user.findFirst();
    }

    if (!targetUser) {
      return res.status(400).json({ error: 'No valid user found in database to attach report.' });
    }

    const validReporterId = targetUser.id;

    // Duplicate Check: 1 active report per user per trash bin
    const existingActive = await prisma.report.findFirst({
      where: {
        reporterId: validReporterId,
        locationName: locName,
        category: cat,
        status: { in: [ReportStatus.PENDING, ReportStatus.DISPATCHED] },
      },
    });

    if (existingActive) {
      return res.status(400).json({ error: 'You have already submitted an active report for this trash bin. You cannot submit multiple reports for the same bin.' });
    }

    let cleanTitle = (title || 'Waste Report').replace(/\s*at\s*Grid\s*\[[^\]]+\]/gi, '').replace(/\s*Grid\s*\[[^\]]+\]/gi, '').trim() || 'Scattered Debris';
    let cleanLoc = locName.replace(/\s*at\s*Grid\s*\[[^\]]+\]/gi, '').replace(/\s*Grid\s*\[[^\]]+\]/gi, '').trim() || 'Campus Location';

    const report = await prisma.report.create({
      data: {
        title: cleanTitle,
        description: description || '',
        urgency: (urgency as Urgency) || Urgency.MEDIUM,
        category: cat,
        lat: coordinates.lat || 14.5995,
        lng: coordinates.lng || 120.9842,
        locationName: cleanLoc,
        reporterId: validReporterId,
        imageUrl: imageUrl || null,
        reportType: (reportType as ReportType) || ReportType.WASTE,
        pointsAwarded: 0,
        schoolYearId: await getActiveSchoolYearId(),
      },
      include: {
        reporter: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    return res.status(201).json(formatReportResponse(report));
  } catch (error) {
    console.error('Submit report error:', error);
    return res.status(500).json({ error: 'Failed to submit report' });
  }
});

// PATCH /api/reports/:id/status - Update report status (no longer awards points directly)
router.patch('/:id/status', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const targetId = Array.isArray(id) ? id[0] : id;
    const { status, assignedMrfId, weightCollected, isVerified, skipPoints } = req.body;

    const data: any = {};
    if (status) {
      data.status = status as ReportStatus;
      if (status === 'COLLECTED' || status === 'RESOLVED') {
        data.completedAt = new Date();
      }
    }
    if (assignedMrfId !== undefined) data.assignedMrfId = assignedMrfId;
    if (weightCollected !== undefined) data.weightCollected = weightCollected;
    if (isVerified !== undefined) data.isVerified = isVerified;

    const targetReport = await prisma.report.findUnique({ where: { id: targetId } });
    if (!targetReport) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // If verifying (not skipping points), use the atomic award service
    if (!skipPoints && isVerified && !targetReport.pointsAwardedAt) {
      const { updatedReports } = await verifyReports([targetId]);
      // Return the updated report from the service if available
      const awarded = updatedReports.find(r => r.id === targetId);
      if (awarded) {
        return res.json(formatReportResponse(awarded));
      }
    }

    // For non-verification updates (dispatch, dismiss, weight, etc.)
    const updated = await prisma.report.update({
      where: { id: targetId },
      data,
      include: {
        reporter: { select: { id: true, name: true, role: true } },
        assignedMrf: { select: { id: true, name: true } },
      },
    });

    return res.json(formatReportResponse(updated));
  } catch (error) {
    console.error('Update report status error:', error);
    return res.status(500).json({ error: 'Failed to update report status' });
  }
});

// POST /api/reports/verify-batch - Batch verify reports atomically
router.post('/verify-batch', async (req: Request, res: Response): Promise<any> => {
  try {
    const { reportIds } = req.body;

    if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
      return res.status(400).json({ error: 'reportIds must be a non-empty array' });
    }

    if (reportIds.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 reports per batch' });
    }

    const { updatedReports, awards } = await verifyReports(reportIds);

    return res.json({
      updatedReports: updatedReports.map(formatReportResponse),
      awards,
      summary: {
        totalProcessed: updatedReports.length,
        totalAwarded: awards.length,
        totalPoints: awards.reduce((sum, a) => sum + a.amount, 0),
      },
    });
  } catch (error) {
    console.error('Batch verify error:', error);
    return res.status(500).json({ error: 'Failed to verify reports' });
  }
});

export default router;
