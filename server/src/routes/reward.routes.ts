import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import {
  RewardError,
  listRewardsForUser,
  requestRewardClaim,
  listRewardClaims,
  releaseRewardClaim,
  cancelRewardClaim,
  listRewardCatalog,
  createReward,
  updateReward,
  RewardActor,
} from '../services/reward.service.js';

const router = Router();

function sendRewardError(res: Response, err: any, fallback: string) {
  if (err instanceof RewardError) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }
  console.error(`[Rewards] ${fallback}:`, err?.stack || err?.message || err);
  return res.status(500).json({ error: fallback, code: 'INTERNAL_ERROR' });
}

function actorFrom(req: Request): RewardActor {
  const auth = req as AuthenticatedRequest;
  return { id: auth.userId, name: auth.userName, role: auth.userRole };
}

// GET /api/rewards — milestone ladder + caller progress and claims
router.get('/', authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const result = await listRewardsForUser(userId);
    return res.json(result);
  } catch (err) {
    return sendRewardError(res, err, 'Failed to fetch rewards');
  }
});

// GET /api/rewards/admin — full catalog (ADMIN)
router.get('/admin', requireAdmin, async (_req: Request, res: Response): Promise<any> => {
  try {
    return res.json({ rewards: await listRewardCatalog() });
  } catch (err) {
    return sendRewardError(res, err, 'Failed to fetch reward catalog');
  }
});

// GET /api/rewards/claims?status=&schoolYearId= — claim queue (ADMIN)
router.get('/claims', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const claims = await listRewardClaims({
      status: req.query.status ? String(req.query.status) : undefined,
      schoolYearId: req.query.schoolYearId ? String(req.query.schoolYearId) : undefined,
    });
    return res.json({ claims });
  } catch (err) {
    return sendRewardError(res, err, 'Failed to fetch reward claims');
  }
});

// POST /api/rewards/claims/:id/request — student reserves an unlocked claim
router.post('/claims/:id/request', authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const claim = await requestRewardClaim(userId, id);
    return res.json({ success: true, claim });
  } catch (err) {
    return sendRewardError(res, err, 'Failed to request claim');
  }
});

// POST /api/rewards/claims/:id/release — the admin Claim/Release button
router.post('/claims/:id/release', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await releaseRewardClaim(actorFrom(req), id);
    return res.json({ success: true, ...result });
  } catch (err) {
    return sendRewardError(res, err, 'Failed to release claim');
  }
});

// POST /api/rewards/claims/:id/cancel — void an unlocked/requested claim (ADMIN)
router.post('/claims/:id/cancel', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const claim = await cancelRewardClaim(actorFrom(req), id, req.body?.reason);
    return res.json({ success: true, claim });
  } catch (err) {
    return sendRewardError(res, err, 'Failed to cancel claim');
  }
});

// POST /api/rewards — create a catalog reward (ADMIN)
router.post('/', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const reward = await createReward(actorFrom(req), req.body ?? {});
    return res.status(201).json({ success: true, reward });
  } catch (err) {
    return sendRewardError(res, err, 'Failed to create reward');
  }
});

// PATCH /api/rewards/:id — update catalog fields (ADMIN)
router.patch('/:id', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const reward = await updateReward(actorFrom(req), id, req.body ?? {});
    return res.json({ success: true, reward });
  } catch (err) {
    return sendRewardError(res, err, 'Failed to update reward');
  }
});

export default router;
