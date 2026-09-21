import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import {
  WalkInError,
  recordWalkIn,
  listWalkIns,
  listStudentWalkIns,
  getStudentProgress,
  searchWalkInStudents,
} from '../services/walk-in.service.js';

const router = Router();

const walkInLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({
    error: 'Too many walk-in submissions. Please slow down.',
    code: 'RATE_LIMITED',
  }),
});

function sendWalkInError(res: Response, err: any, fallback: string) {
  if (err instanceof WalkInError) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }
  console.error(`[WalkIn] ${fallback}:`, err?.stack || err?.message || err);
  return res.status(500).json({ error: fallback, code: 'INTERNAL_ERROR' });
}

// GET /api/walk-ins/students?q= — local roster search (offline accounts included)
router.get('/students', requireRole('ADMIN', 'MRF'), async (req: Request, res: Response): Promise<any> => {
  try {
    const q = String(req.query.q ?? '');
    const students = await searchWalkInStudents(q, Number(req.query.limit) || 10);
    return res.json({ students });
  } catch (err) {
    return sendWalkInError(res, err, 'Failed to search students');
  }
});

// GET /api/walk-ins/me — caller's own turnover history + kg progress
router.get('/me', authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const result = await listStudentWalkIns(userId, Number(req.query.limit) || 20);
    return res.json(result);
  } catch (err) {
    return sendWalkInError(res, err, 'Failed to fetch your bottle activity');
  }
});

// GET /api/walk-ins?date=YYYY-MM-DD&studentId= — station history (MRF/ADMIN)
router.get('/', requireRole('ADMIN', 'MRF'), async (req: Request, res: Response): Promise<any> => {
  try {
    const rows = await listWalkIns({
      date: req.query.date ? String(req.query.date) : undefined,
      studentId: req.query.studentId ? String(req.query.studentId) : undefined,
      limit: Number(req.query.limit) || 100,
    });
    return res.json({ turnovers: rows });
  } catch (err) {
    return sendWalkInError(res, err, 'Failed to fetch walk-in history');
  }
});

// POST /api/walk-ins — record a walk-in bottle turnover
router.post('/', requireRole('ADMIN', 'MRF'), walkInLimiter, async (req: Request, res: Response): Promise<any> => {
  try {
    const actor = req as AuthenticatedRequest;
    const result = await recordWalkIn({
      studentId: req.body?.studentId,
      items: req.body?.items,
      notes: req.body?.notes,
      idempotencyKey: req.body?.idempotencyKey,
      recordedById: actor.userId,
      recordedByName: actor.userName,
    });
    return res.status(201).json({ success: true, ...result });
  } catch (err) {
    return sendWalkInError(res, err, 'Failed to record walk-in turnover');
  }
});

// GET /api/walk-ins/progress/:studentId — progress for a specific student (MRF/ADMIN)
router.get('/progress/:studentId', requireRole('ADMIN', 'MRF'), async (req: Request, res: Response): Promise<any> => {
  try {
    const studentId = Array.isArray(req.params.studentId) ? req.params.studentId[0] : req.params.studentId;
    const progress = await getStudentProgress(studentId);
    if (!progress) {
      return res.status(409).json({ error: 'No active school year', code: 'NO_ACTIVE_SCHOOL_YEAR' });
    }
    return res.json({ progress });
  } catch (err) {
    return sendWalkInError(res, err, 'Failed to fetch student progress');
  }
});

export default router;
