import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../middleware/auth.js';
import { runEnrollProSync, syncTermCalendar } from '../services/enrollpro-sync.service.js';

const router = Router();
const prisma = new PrismaClient();

// POST /api/sync/enrollpro — trigger full sync manually
router.post('/enrollpro', requireAdmin, async (_req: Request, res: Response): Promise<any> => {
  try {
    const result = await runEnrollProSync();
    return res.json({
      message: 'Sync completed',
      ...result,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/sync/terms — sync term calendar
router.post('/terms', requireAdmin, async (_req: Request, res: Response): Promise<any> => {
  try {
    const result = await syncTermCalendar();
    return res.json({
      message: 'Term sync completed',
      ...result,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/sync/all — sync everything (users + terms)
router.post('/all', requireAdmin, async (_req: Request, res: Response): Promise<any> => {
  try {
    const [syncResult, termResult] = await Promise.all([
      runEnrollProSync(),
      syncTermCalendar(),
    ]);

    return res.json({
      message: 'Full sync completed',
      users: syncResult,
      terms: termResult,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/sync/status — get sync history
router.get('/status', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const logs = await prisma.enrollmentSyncLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const lastSync = logs[0] || null;

    return res.json({
      lastSync: lastSync ? {
        id: lastSync.id,
        status: lastSync.status,
        recordsPulled: lastSync.recordsPulled,
        recordsCreated: lastSync.recordsCreated,
        recordsUpdated: lastSync.recordsUpdated,
        recordsDeleted: lastSync.recordsDeleted,
        durationMs: lastSync.durationMs,
        schoolYearLabel: lastSync.schoolYearLabel,
        error: lastSync.errorMessage,
        message: lastSync.message,
        createdAt: lastSync.createdAt,
      } : null,
      history: logs.map((l) => ({
        id: l.id,
        status: l.status,
        recordsPulled: l.recordsPulled,
        recordsCreated: l.recordsCreated,
        recordsUpdated: l.recordsUpdated,
        recordsDeleted: l.recordsDeleted,
        durationMs: l.durationMs,
        schoolYearLabel: l.schoolYearLabel,
        error: l.errorMessage,
        message: l.message,
        createdAt: l.createdAt,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/sync/health — check EnrollPro connectivity and auth status
router.get('/health', requireAdmin, async (_req: Request, res: Response): Promise<any> => {
  try {
    const base = process.env.ENROLLPRO_BASE_URL || 'https://dev-jegs.buru-degree.ts.net/api';
    const integrationKey = process.env.ENROLLPRO_SYNC_SECRET || '';

    // Test health (public endpoint)
    const healthRes = await fetch(`${base}/integration/v1/health`);
    const healthData: any = healthRes.ok ? await healthRes.json() : null;

    // Test integration endpoint with integration key
    const testRes = await fetch(`${base}/integration/v1/school-year`, {
      headers: integrationKey ? { 'X-Integration-Key': integrationKey } : {},
    });
    const testBody = await testRes.text().catch(() => '');

    return res.json({
      enrollproOnline: healthRes.ok,
      healthStatus: healthData?.data?.status || 'unknown',
      integrationKeyConfigured: !!integrationKey,
      integrationKeyValid: testRes.ok,
      integrationKeyLength: integrationKey.length,
      integrationKeyPreview: integrationKey.substring(0, 10) + '...',
      integrationError: testRes.ok ? null : testBody,
      systems: healthData?.data?.systems || [],
    });
  } catch (error: any) {
    return res.json({
      enrollproOnline: false,
      error: error.message,
    });
  }
});

// GET /api/sync/school-years — list all school years (active + archived) from local DB
router.get('/school-years', requireAdmin, async (_req: Request, res: Response): Promise<any> => {
  try {
    const schoolYears = await prisma.schoolYear.findMany({
      orderBy: [{ isActive: 'desc' }, { startDate: 'desc' }],
      select: {
        id: true,
        enrollproId: true,
        label: true,
        startDate: true,
        endDate: true,
        isActive: true,
        isArchived: true,
        archivedAt: true,
        createdAt: true,
        _count: {
          select: {
            reports: true,
            pointHistories: true,
            offenses: true,
            auditLogs: true,
          },
        },
      },
    });

    return res.json({
      schoolYears: schoolYears.map(sy => ({
        ...sy,
        reportCount: sy._count.reports,
        pointHistoryCount: sy._count.pointHistories,
        offenseCount: sy._count.offenses,
        auditLogCount: sy._count.auditLogs,
        _count: undefined,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/sync/enrollpro-school-year — fetch current active SY from EnrollPro
router.get('/enrollpro-school-year', requireAdmin, async (_req: Request, res: Response): Promise<any> => {
  try {
    const base = process.env.ENROLLPRO_BASE_URL || 'https://dev-jegs.buru-degree.ts.net/api';
    const integrationKey = process.env.ENROLLPRO_SYNC_SECRET || '';

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (integrationKey) {
      headers['X-Integration-Key'] = integrationKey;
    }

    const schoolYearRes = await fetch(`${base}/integration/v1/school-year`, { headers });
    if (!schoolYearRes.ok) {
      const body = await schoolYearRes.text().catch(() => '');
      return res.status(schoolYearRes.status).json({
        error: `EnrollPro returned ${schoolYearRes.status}`,
        details: body,
      });
    }

    const syData = await schoolYearRes.json() as { data?: any };
    const sy = syData.data;

    if (!sy?.id) {
      return res.json({ enrollproSchoolYear: null, message: 'No active school year in EnrollPro' });
    }

    // Check if this SY exists in our DB
    const localSY = await prisma.schoolYear.findUnique({
      where: { enrollproId: sy.id },
    });

    return res.json({
      enrollproSchoolYear: {
        id: sy.id,
        yearLabel: sy.yearLabel,
        term1Start: sy.term1Start,
        term1End: sy.term1End,
        term2Start: sy.term2Start,
        term2End: sy.term2End,
        term3Start: sy.term3Start,
        term3End: sy.term3End,
      },
      syncedLocally: !!localSY,
      localRecord: localSY ? {
        id: localSY.id,
        label: localSY.label,
        isActive: localSY.isActive,
        isArchived: localSY.isArchived,
      } : null,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
