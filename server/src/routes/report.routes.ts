import { Router, Request, Response } from 'express';
import { PrismaClient, ReportStatus, WasteCategory, Urgency, ReportType, Role } from '@prisma/client';
import { getActiveSchoolYearId } from '../services/rollover.service.js';
import { approveReports, awardCollectedReportsWithinTransaction, formatReportResponse } from '../services/report-points.service.js';
import { recordWeightContribution } from '../services/challenge-progress.service.js';
import { authenticate, requireAdmin, requireRole, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

function normalizeLocation(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

// DELETE /api/reports/purge — ADMIN only
router.delete('/purge', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    await prisma.challengeContribution.deleteMany({});
    await prisma.pointHistory.deleteMany({});
    await prisma.userChallengeProgress.deleteMany({});
    await prisma.report.deleteMany({});
    await prisma.offense.deleteMany({});
    await prisma.user.updateMany({
      where: { role: Role.STUDENT },
      data: { points: 0, warningsCount: 0, certificates: [] },
    });
    await prisma.recycleMarketStock.updateMany({
      data: { accumulatedKg: 0.0, isApprovedForSale: false },
    });
    await prisma.recycleSaleTransaction.deleteMany({});

    console.log('[Purge] Purged all reports, point histories, offenses, challenge data, and reset market inventory.');
    return res.json({ message: 'Database purged successfully' });
  } catch (error) {
    console.error('Purge error:', error);
    return res.status(500).json({ error: 'Failed to purge database' });
  }
});

// GET /api/reports — any authenticated role
router.get('/', authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const { status, category, reporterId, schoolYearId } = req.query;

    const where: any = {};
    if (status) where.status = status as ReportStatus;
    if (category) where.category = category as WasteCategory;
    if (reporterId) where.reporterId = reporterId as string;

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
        // Never expose reporter email in list payloads.
        reporter: { select: { id: true, name: true, role: true } },
        assignedMrf: { select: { id: true, name: true } },
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

// Asset reports are described with a pillar marker by the teacher portal. The
// client may omit `reportType`, so derive it server-side as defense-in-depth.
const ASSET_DESCRIPTION_MARKERS = [
  '[PILLAR: FURNITURE]',
  '[PILLAR: ELECTRONICS]',
  '[PILLAR: FIXTURES]',
  '[PILLAR: EQUIPMENT]',
  '[PILLAR: OTHER]',
];

function deriveReportType(rawType: unknown, description?: string): ReportType {
  const normalized = typeof rawType === 'string' ? rawType.trim().toUpperCase() : '';
  if (normalized === 'ASSET') return ReportType.ASSET;
  if (normalized === 'WASTE') return ReportType.WASTE;

  const desc = (description || '').toUpperCase();
  if (ASSET_DESCRIPTION_MARKERS.some((marker) => desc.includes(marker))) {
    return ReportType.ASSET;
  }
  return ReportType.WASTE;
}

// POST /api/reports — any authenticated user, reporterId from JWT
router.post('/', authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const {
      title,
      description,
      urgency,
      category,
      coordinates,
      locationName,
      imageUrl,
      reportType,
    } = req.body;

    if (!title || !coordinates) {
      return res.status(400).json({ error: 'Title and coordinates are required' });
    }

    const locName = locationName || 'Campus Location';
    const cat = mapWasteCategory(category);
    const locKey = normalizeLocation(locName);

    const existingActive = await prisma.report.findFirst({
      where: {
        reporterId: userId,
        locationKey: locKey,
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
        locationKey: normalizeLocation(cleanLoc),
        reporterId: userId,
        imageUrl: imageUrl || null,
        reportType: deriveReportType(reportType, description),
        pointsAwarded: 0,
        schoolYearId: await getActiveSchoolYearId(),
      },
      include: {
        reporter: { select: { id: true, name: true, role: true } },
      },
    });

    return res.status(201).json(formatReportResponse(report));
  } catch (error) {
    console.error('Submit report error:', error);
    return res.status(500).json({ error: 'Failed to submit report' });
  }
});

// PATCH /api/reports/:id/status — ADMIN or MRF, lifecycle fields only
router.patch('/:id/status', requireRole('ADMIN', 'MRF'), async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const targetId = Array.isArray(id) ? id[0] : id;
    const { status, assignedMrfId, weightCollected, isVerified, skipPoints, pointsAwarded } = req.body;

    if (isVerified !== undefined || skipPoints !== undefined || pointsAwarded !== undefined) {
      console.warn(`[Auth] Rejecting forbidden fields in status update for report ${targetId}: isVerified=${isVerified}, skipPoints=${skipPoints}, pointsAwarded=${pointsAwarded}`);
      return res.status(400).json({
        error: 'Status updates cannot set isVerified, skipPoints, or pointsAwarded. Use POST /verify or /verify-batch instead.',
        code: 'FORBIDDEN_FIELDS',
      });
    }

    const targetReport = await prisma.report.findUnique({
      where: { id: targetId },
      include: { reporter: { select: { id: true, role: true } } },
    });
    if (!targetReport) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Terminal reports are immutable: never re-open a completed, expired, or
    // dismissed report (prevents re-dispatching already-finished reports).
    const TERMINAL_STATUSES: ReportStatus[] = [
      ReportStatus.COLLECTED,
      ReportStatus.RESOLVED,
      ReportStatus.EXPIRED,
      ReportStatus.DISMISSED,
    ];
    if (status && TERMINAL_STATUSES.includes(targetReport.status) && targetReport.status !== status) {
      return res.status(409).json({
        error: `Report is already ${targetReport.status} and its status can no longer change.`,
        code: 'INVALID_TRANSITION',
      });
    }

    // Verification is a hard gate: a report must be approved before dispatch.
    if (status === 'DISPATCHED') {
      if (!targetReport.isVerified) {
        return res.status(409).json({
          error: 'Report must be verified before it can be dispatched.',
          code: 'NOT_VERIFIED',
        });
      }
    }

    const data: any = {};
    if (status) {
      data.status = status as ReportStatus;
      if (status === 'COLLECTED' || status === 'RESOLVED') {
        data.completedAt = new Date();
      }
    }
    // Validate the two integrity-critical fields before persisting them:
    // assignedMrfId must reference real dispatch personnel, and weightCollected
    // feeds points/challenge progress so it must be a sane, bounded number.
    if (assignedMrfId !== undefined) {
      if (assignedMrfId === null) {
        data.assignedMrfId = null;
      } else {
        const assignee = await prisma.user.findUnique({
          where: { id: String(assignedMrfId) },
          select: { role: true },
        });
        if (!assignee || (assignee.role !== 'MRF' && assignee.role !== 'ADMIN')) {
          return res.status(400).json({
            error: 'assignedMrfId must reference an existing MRF or admin user',
            code: 'INVALID_ASSIGNEE',
          });
        }
        data.assignedMrfId = String(assignedMrfId);
      }
    }

    if (weightCollected !== undefined) {
      const kg = Number(weightCollected);
      if (!Number.isFinite(kg) || kg < 0 || kg > 100000) {
        return res.status(400).json({
          error: 'weightCollected must be a number between 0 and 100000 kg',
          code: 'INVALID_WEIGHT',
        });
      }
      data.weightCollected = kg;
    }

    const becomesTerminal = status === 'COLLECTED' || status === 'RESOLVED';
    const shouldContributeWeight =
      weightCollected !== undefined &&
      weightCollected > 0 &&
      (becomesTerminal || targetReport.status === 'COLLECTED' || targetReport.status === 'RESOLVED');

    const allChallengeCompletions: { userId: string; challengeId: string; title: string; pointsAwarded: number }[] = [];
    const allAwards: { reportId: string; userId: string; amount: number; rank: number }[] = [];

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.report.update({
        where: { id: targetId },
        data,
        include: {
          reporter: { select: { id: true, name: true, role: true } },
          assignedMrf: { select: { id: true, name: true } },
        },
      });

      if (shouldContributeWeight) {
        const { completions } = await recordWeightContribution(tx, {
          id: result.id,
          reporterId: result.reporterId,
          category: result.category,
          locationKey: result.locationKey,
          schoolYearId: result.schoolYearId,
        }, weightCollected);
        allChallengeCompletions.push(...completions);
      }

      // Collection is the reward event. Resolve every still-active report in the
      // same stream, then award points/ranks to the collected, approved reports.
      if (becomesTerminal) {
        await tx.report.updateMany({
          where: {
            locationKey: result.locationKey,
            category: result.category,
            schoolYearId: result.schoolYearId,
            status: { in: [ReportStatus.PENDING, ReportStatus.DISPATCHED] },
          },
          data: { status: status as ReportStatus, completedAt: data.completedAt || new Date() },
        });

        const award = await awardCollectedReportsWithinTransaction(tx, {
          locationKey: result.locationKey,
          category: result.category,
          schoolYearId: result.schoolYearId,
        });
        allAwards.push(...award.awards);
        allChallengeCompletions.push(...award.challengeCompletions);
      }

      return result;
    });

    return res.json({
      ...formatReportResponse(updated),
      awards: allAwards,
      challengeCompletions: allChallengeCompletions,
    });
  } catch (error) {
    console.error('Update report status error:', error);
    return res.status(500).json({ error: 'Failed to update report status' });
  }
});

// POST /api/reports/:id/verify — ADMIN only, single verify
router.post('/:id/verify', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const targetId = Array.isArray(id) ? id[0] : id;

    const report = await prisma.report.findUnique({ where: { id: targetId } });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (report.status === ReportStatus.DISMISSED) {
      return res.status(400).json({ error: 'Cannot verify a dismissed report', code: 'DISMISSED' });
    }

    const result = await approveReports([targetId]);

    return res.json({
      updatedReports: result.updatedReports.map(formatReportResponse),
      awards: [],
      challengeCompletions: [],
      alreadyProcessed: result.alreadyProcessed,
    });
  } catch (error: any) {
    console.error('Verify report error:', error);
    if (error.message?.includes('PointRule table is empty')) {
      return res.status(500).json({ error: 'Point system not configured', code: 'CONFIGURATION_ERROR' });
    }
    return res.status(500).json({ error: 'Failed to verify report' });
  }
});

// POST /api/reports/verify-batch — ADMIN only, batch verify
router.post('/verify-batch', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const { reportIds } = req.body;

    if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
      return res.status(400).json({ error: 'reportIds must be a non-empty array' });
    }

    if (reportIds.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 reports per batch' });
    }

    const uniqueIds = [...new Set(reportIds.map(String))];
    const reports = await prisma.report.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, status: true },
    });

    const foundIds = new Set(reports.map(r => r.id));
    const missingIds = uniqueIds.filter(id => !foundIds.has(id));
    if (missingIds.length > 0) {
      return res.status(404).json({ error: 'Some reports not found', missingIds });
    }

    const dismissedIds = reports.filter(r => r.status === ReportStatus.DISMISSED).map(r => r.id);
    if (dismissedIds.length > 0) {
      return res.status(400).json({ error: 'Cannot verify dismissed reports', dismissedIds });
    }

    const result = await approveReports(uniqueIds);

    return res.json({
      updatedReports: result.updatedReports.map(formatReportResponse),
      awards: [],
      challengeCompletions: [],
      summary: {
        totalProcessed: result.updatedReports.length,
        totalAwarded: 0,
        totalPoints: 0,
      },
    });
  } catch (error: any) {
    console.error('Batch verify error:', error);
    if (error.message?.includes('PointRule table is empty')) {
      return res.status(500).json({ error: 'Point system not configured', code: 'CONFIGURATION_ERROR' });
    }
    return res.status(500).json({ error: 'Failed to verify reports' });
  }
});

export default router;
