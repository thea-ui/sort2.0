import { Router, Request, Response } from 'express';

import { prisma } from '../lib/prisma.js';
import { requireAdmin, type AuthenticatedRequest } from '../middleware/auth.js';
import { getActiveSchoolYearId } from '../services/rollover.service.js';
import {
  DataSeedError,
  clearActiveYearActivity,
  getDataSeedStatus,
  runDataSeed,
} from '../services/data-seeder.service.js';

const router = Router();

function respondError(res: Response, error: unknown): any {
  if (error instanceof DataSeedError) {
    return res.status(error.status).json({ error: error.message, code: error.code });
  }
  console.error('[DataSeed] Failed:', error);
  return res.status(500).json({ error: (error as any)?.message || 'Data generation failed' });
}

// GET /api/data-seed/status — active year, eligible accounts, current counts
router.get('/status', requireAdmin, async (_req: Request, res: Response): Promise<any> => {
  try {
    return res.json(await getDataSeedStatus());
  } catch (error) {
    return respondError(res, error);
  }
});

// POST /api/data-seed — generate a full year of activity using real synced accounts
router.post('/', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const actor = req as AuthenticatedRequest;
    const { mode, volume, include, seed } = req.body ?? {};
    const seedNumber = Number(seed);

    const result = await runDataSeed({
      mode: mode === 'RESEED_YEAR' ? 'RESEED_YEAR' : 'SEED_EMPTY',
      volume: volume === 'LIGHT' || volume === 'HEAVY' ? volume : 'NORMAL',
      include: include && typeof include === 'object' ? include : undefined,
      seed: Number.isFinite(seedNumber) ? seedNumber : undefined,
      actorName: actor.userName || 'Admin',
      actorRole: actor.userRole || 'ADMIN',
    });

    return res.json({ message: `Generated data for ${result.schoolYearLabel}`, ...result });
  } catch (error) {
    return respondError(res, error);
  }
});

// POST /api/data-seed/clear-year — delete only the active year's activity
router.post('/clear-year', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const actor = req as AuthenticatedRequest;
    const counts = await clearActiveYearActivity();

    await prisma.auditLog.create({
      data: {
        actorName: actor.userName || 'Admin',
        actorRole: actor.userRole || 'ADMIN',
        actionType: 'DATA_SEED_CLEARED',
        details: `Cleared active-year activity: ${counts.reports} reports, ${counts.pointHistories} point entries, ${counts.walkIns} walk-ins, ${counts.offenses} offenses, ${counts.sales} sales, ${counts.assetRecords} asset ledger records.`,
        schoolYearId: await getActiveSchoolYearId(),
      },
    });

    return res.json({ message: 'Active-year activity cleared', ...counts });
  } catch (error) {
    return respondError(res, error);
  }
});

export default router;
