import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { ReportStatus, WasteCategory, Urgency, ReportType, Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import {
  deleteReportPhoto,
  parseLegacyPhotoDataUrl,
  ReportPhotoError,
  reportPhotoContentType,
  resolveReportPhotoFile,
  storeReportPhoto,
} from '../services/report-photo-storage.js';
import { getActiveSchoolYearId } from '../services/rollover.service.js';
import { approveReports, awardCollectedReportsWithinTransaction, formatReportResponse } from '../services/report-points.service.js';
import { countUnverifiedActiveStreamReports, dispatchStreamWithinTransaction } from '../services/report-dispatch.service.js';
import { recordWeightContribution } from '../services/challenge-progress.service.js';
import { ASSET_DESCRIPTION_MARKERS } from '../services/report-expiry.js';
import { authenticate, requireAdmin, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import {
  createReportPdfTempPath,
  generateReportPdfToFile,
  normalizeReportPdfPayload,
  reportPdfFileName,
  ReportPdfError,
} from '../services/report-pdf.service.js';
import { promises as fsPromises } from 'node:fs';

const router = Router();

function normalizeLocation(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

// DELETE /api/reports/purge — ADMIN only
router.delete('/purge', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    await prisma.challengeContribution.deleteMany({});
    await prisma.pointHistory.deleteMany({});
    await prisma.userChallengeProgress.deleteMany({});
    // Walk-in data: claims reference turnovers (SetNull), so delete claims first.
    await prisma.rewardClaim.deleteMany({});
    await prisma.walkInTurnoverItem.deleteMany({});
    await prisma.walkInTurnover.deleteMany({});
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

// GET /api/reports — any authenticated role.
// Optional pagination: ?limit=N (1..5000) & ?offset=N. Photo evidence is
// never embedded in this payload — rows carry photoUrl instead.
router.get('/', authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const { status, category, reporterId, schoolYearId, limit, offset } = req.query;

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

    const take = limit ? Math.min(Math.max(parseInt(String(limit), 10) || 0, 1), 5000) : undefined;
    const skip = offset ? Math.max(parseInt(String(offset), 10) || 0, 0) : undefined;

    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      // Base64 photo evidence is fetched per report via /reports/:id/photo.
      omit: { imageUrl: true },
      include: {
        // Never expose reporter email in list payloads.
        reporter: { select: { id: true, name: true, role: true, gradeLevel: true, sectionName: true } },
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
  return WasteCategory.NON_BIODEGRADABLE;
}

// Asset reports are described with a pillar marker by the teacher portal. The
// client may omit `reportType`, so derive it server-side as defense-in-depth.
// The marker list is shared with the daily-reset expiry predicate.
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

    if (urgency !== undefined && !Object.values(Urgency).includes(urgency as Urgency)) {
      return res.status(400).json({ error: `Invalid urgency "${urgency}"`, code: 'INVALID_URGENCY' });
    }

    // Students may view the campus map but must never file asset reports.
    // Enforced here (not just in the UI) because reportType can be derived
    // from pillar markers in the description.
    const derivedType = deriveReportType(reportType, description);
    if (derivedType === ReportType.ASSET && (req as AuthenticatedRequest).userRole === 'STUDENT') {
      return res.status(403).json({
        error: 'Students cannot file asset reports. Please report waste issues instead.',
        code: 'FORBIDDEN',
      });
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
      select: { id: true },
    });

    if (existingActive) {
      return res.status(400).json({ error: 'You have already submitted an active report for this trash bin. You cannot submit multiple reports for the same bin.' });
    }

    let cleanTitle = (title || 'Waste Report').replace(/\s*at\s*Grid\s*\[[^\]]+\]/gi, '').replace(/\s*Grid\s*\[[^\]]+\]/gi, '').trim() || 'Scattered Debris';
    let cleanLoc = locName.replace(/\s*at\s*Grid\s*\[[^\]]+\]/gi, '').replace(/\s*Grid\s*\[[^\]]+\]/gi, '').trim() || 'Campus Location';

    // Photo evidence: new uploads are written to disk (the DB stores only the
    // path). Legacy external URLs (mock/dev image links) stay in image_url.
    const reportId = crypto.randomUUID();
    let storedPhotoPath: string | null = null;
    let externalImageUrl: string | null = null;

    if (typeof imageUrl === 'string' && imageUrl.trim().length > 0) {
      const value = imageUrl.trim();
      if (value.startsWith('data:')) {
        try {
          storedPhotoPath = storeReportPhoto(reportId, value).photoPath;
        } catch (error: any) {
          const status = error instanceof ReportPhotoError ? error.status : 400;
          return res.status(status).json({
            error: error.message || 'Invalid photo evidence',
            code: 'INVALID_PHOTO',
          });
        }
      } else if (/^https?:\/\//i.test(value) && value.length <= 2000) {
        externalImageUrl = value;
      } else {
        return res.status(400).json({
          error: 'imageUrl must be an image data URL or an http(s) URL.',
          code: 'INVALID_PHOTO_URL',
        });
      }
    }

    let report;
    try {
      report = await prisma.report.create({
        data: {
          id: reportId,
          title: cleanTitle,
          description: description || '',
          urgency: (urgency as Urgency) || Urgency.MEDIUM,
          category: cat,
          lat: coordinates.lat || 14.5995,
          lng: coordinates.lng || 120.9842,
          locationName: cleanLoc,
          locationKey: normalizeLocation(cleanLoc),
          reporterId: userId,
          photoPath: storedPhotoPath,
          imageUrl: externalImageUrl,
          reportType: derivedType,
          pointsAwarded: 0,
          schoolYearId: await getActiveSchoolYearId(),
        },
        include: {
          reporter: { select: { id: true, name: true, role: true } },
        },
      });
    } catch (createError) {
      // Never leave an orphan photo file behind when the row insert fails.
      if (storedPhotoPath) deleteReportPhoto(storedPhotoPath);
      throw createError;
    }

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
      select: {
        id: true,
        status: true,
        isVerified: true,
        locationKey: true,
        category: true,
        schoolYearId: true,
      },
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

      // Dispatch is stream-wide (see the transaction below): every active
      // report in the bin stream must be approved first, or dispatching one
      // report would silently dispatch its unverified siblings. The UI gates
      // the button on "Verify All" for the same reason.
      const unverifiedInStream = await countUnverifiedActiveStreamReports(prisma, {
        locationKey: targetReport.locationKey,
        category: targetReport.category,
        schoolYearId: targetReport.schoolYearId,
      });
      if (unverifiedInStream > 0) {
        return res.status(409).json({
          error: 'All active reports in this bin stream must be verified before dispatch.',
          code: 'STREAM_NOT_VERIFIED',
        });
      }
    }

    const data: any = {};
    if (status) {
      if (!Object.values(ReportStatus).includes(status as ReportStatus)) {
        return res.status(400).json({
          error: `Invalid status "${status}"`,
          code: 'INVALID_STATUS',
        });
      }
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

    let normalizedWeight: number | undefined;
    if (weightCollected !== undefined) {
      const kg = Number(weightCollected);
      if (!Number.isFinite(kg) || kg < 0 || kg > 100000) {
        return res.status(400).json({
          error: 'weightCollected must be a number between 0 and 100000 kg',
          code: 'INVALID_WEIGHT',
        });
      }
      data.weightCollected = kg;
      normalizedWeight = kg;
    }

    const becomesTerminal = status === 'COLLECTED' || status === 'RESOLVED';
    const shouldContributeWeight =
      normalizedWeight !== undefined &&
      normalizedWeight > 0 &&
      (becomesTerminal || targetReport.status === 'COLLECTED' || targetReport.status === 'RESOLVED');

    const allChallengeCompletions: { userId: string; challengeId: string; title: string; pointsAwarded: number }[] = [];
    const allAwards: { reportId: string; userId: string; amount: number; rank: number }[] = [];

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.report.update({
        where: { id: targetId },
        data,
        omit: { imageUrl: true },
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
        }, normalizedWeight!);
        allChallengeCompletions.push(...completions);
      }

      // Dispatch applies to the whole bin stream: one collector assignment
      // covers every active sibling report, mirroring the stream-wide
      // resolution used on collection. Without this, only the target report is
      // dispatched and the rest need a manual second dispatch.
      if (status === 'DISPATCHED') {
        await dispatchStreamWithinTransaction(
          tx,
          {
            locationKey: result.locationKey,
            category: result.category,
            schoolYearId: result.schoolYearId,
          },
          data.assignedMrfId,
        );
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
    }, { timeout: 15_000 }); // stream collection performs per-stream award work; 5s default is too tight

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

    const report = await prisma.report.findUnique({
      where: { id: targetId },
      select: { id: true, status: true },
    });
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

// GET /api/reports/:id/photo — authenticated photo evidence for one report.
// New rows stream the file from disk; legacy rows fall back to the base64
// data URL (until the backfill script has moved them); external URLs redirect.
router.get('/:id/photo', authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const targetId = Array.isArray(id) ? id[0] : id;

    const report = await prisma.report.findUnique({
      where: { id: targetId },
      select: { imageUrl: true, photoPath: true },
    });
    if (!report) {
      return res.status(404).json({ error: 'No photo for this report' });
    }

    if (report.photoPath) {
      const absolute = resolveReportPhotoFile(report.photoPath);
      const contentType = absolute ? reportPhotoContentType(absolute) : null;
      if (!absolute || !contentType) {
        return res.status(404).json({ error: 'Photo file is missing' });
      }
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'private, max-age=86400, immutable');
      return res.sendFile(absolute, (error) => {
        if (error) console.error('Report photo send error:', error.message);
      });
    }

    const imageUrl = report.imageUrl;
    if (!imageUrl) {
      return res.status(404).json({ error: 'No photo for this report' });
    }

    if (/^https?:\/\//i.test(imageUrl)) {
      return res.redirect(imageUrl);
    }

    const legacy = parseLegacyPhotoDataUrl(imageUrl);
    if (!legacy) {
      return res.status(404).json({ error: 'Unsupported photo format' });
    }

    res.setHeader('Content-Type', legacy.mime);
    res.setHeader('Cache-Control', 'private, max-age=86400, immutable');
    res.setHeader('Content-Length', legacy.buffer.length.toString());
    return res.send(legacy.buffer);
  } catch (error) {
    console.error('Report photo error:', error);
    return res.status(500).json({ error: 'Failed to load report photo' });
  }
});

// POST /api/reports/export-pdf — render the exactly-filtered report table the
// client posts into a letterhead PDF (same flow as certificate view/download).
// At most two renders run at once; each streams to a temp file so the server
// never holds the document chunks + concatenated buffer + response copy.
let activePdfExports = 0;
const MAX_CONCURRENT_PDF_EXPORTS = 2;

router.post('/export-pdf', authenticate, async (req: Request, res: Response): Promise<any> => {
  if (activePdfExports >= MAX_CONCURRENT_PDF_EXPORTS) {
    res.setHeader('Retry-After', '5');
    return res.status(429).json({
      error: 'Too many PDF exports in progress. Please try again shortly.',
      code: 'PDF_BUSY',
    });
  }

  activePdfExports += 1;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    activePdfExports = Math.max(0, activePdfExports - 1);
  };

  let tempPath: string | null = null;
  try {
    const payload = normalizeReportPdfPayload(req.body);
    tempPath = createReportPdfTempPath();
    await generateReportPdfToFile(payload, tempPath);
    const fileName = reportPdfFileName(payload.title);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);

    const fileToSend = tempPath;
    return res.sendFile(fileToSend, (error) => {
      release();
      void fsPromises.rm(fileToSend, { force: true }).catch(() => undefined);
      if (error) console.error('Report PDF send error:', error.message);
    });
  } catch (error: any) {
    release();
    if (tempPath) void fsPromises.rm(tempPath, { force: true }).catch(() => undefined);
    if (error instanceof ReportPdfError) {
      return res.status(error.status).json({ error: error.message, code: 'REPORT_PDF_INVALID' });
    }
    console.error('Report PDF export error:', error);
    return res.status(500).json({ error: 'Failed to generate report PDF' });
  }
});

export default router;
