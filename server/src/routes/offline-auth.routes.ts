/**
 * Break-glass offline auth administration and self-service PIN management.
 *
 * Enabling/disabling is admin-only; PINs are self-service while signed in
 * normally, or admin-set (for someone else) during an outage. A session that
 * itself came from the offline fallback may NOT set its own PIN — otherwise a
 * single break-glass login could convert itself into permanent local access.
 * Admins may still provision a PIN for another user so people can get back in.
 */
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin, type AuthenticatedRequest } from '../middleware/auth.js';
import {
  getOfflineAuthState,
  setOfflineAuthEnabled,
  setOfflinePin,
  clearOfflinePin,
  OfflinePinValidationError,
  OFFLINE_PIN_MIN_LENGTH,
  OFFLINE_PIN_MAX_LENGTH,
  MAX_OFFLINE_HOURS,
} from '../services/offline-auth.service.js';

const router = Router();
const prisma = new PrismaClient();

function actorOf(req: Request) {
  const authed = req as AuthenticatedRequest;
  return { name: authed.userName || 'Unknown', role: authed.userRole || 'UNKNOWN' };
}

function isOfflineSession(req: Request): boolean {
  return (req as AuthenticatedRequest).sessionKind === 'BREAK_GLASS';
}

function pinPolicyError(res: Response, err: unknown): boolean {
  if (err instanceof OfflinePinValidationError) {
    res.status(400).json({ error: err.message, code: 'INVALID_PIN' });
    return true;
  }
  return false;
}

// GET /api/offline-auth/status — current mode + whether the caller has a PIN.
router.get('/status', authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const state = await getOfflineAuthState();
    const user = await prisma.user.findUnique({
      where: { id: (req as AuthenticatedRequest).userId },
      select: { offlinePinSetAt: true },
    });
    return res.json({
      ...state,
      hasOfflinePin: Boolean(user?.offlinePinSetAt),
      offlinePinSetAt: user?.offlinePinSetAt ?? null,
      pinPolicy: {
        minLength: OFFLINE_PIN_MIN_LENGTH,
        maxLength: OFFLINE_PIN_MAX_LENGTH,
        digitsOnly: true,
      },
      maxHours: MAX_OFFLINE_HOURS,
      offlineSession: isOfflineSession(req),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/offline-auth/enable — arm the fallback (admin only). Allowed from a
// break-glass session: that is the documented recovery path when EnrollPro is
// down and nobody can sign in.
router.post('/enable', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const hoursRaw = req.body?.hours;
    const hours = hoursRaw === undefined ? MAX_OFFLINE_HOURS : Number(hoursRaw);
    if (!Number.isFinite(hours) || hours < 1 || hours > MAX_OFFLINE_HOURS) {
      return res.status(400).json({ error: `hours must be between 1 and ${MAX_OFFLINE_HOURS}`, code: 'INVALID_HOURS' });
    }
    const state = await setOfflineAuthEnabled(true, actorOf(req), {
      hours,
      reason: typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 200) : undefined,
    });
    return res.json({ message: 'Offline sign-in enabled', ...state });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/offline-auth/disable — disarm immediately and revoke break-glass sessions
router.post('/disable', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const state = await setOfflineAuthEnabled(false, actorOf(req), {
      reason: typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 200) : undefined,
    });
    return res.json({ message: 'Offline sign-in disabled', ...state });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/offline-auth/pin — set your own PIN (normal sessions only)
router.post('/pin', authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    if (isOfflineSession(req)) {
      return res.status(403).json({
        error: 'Set your offline PIN while signed in normally (EnrollPro reachable).',
        code: 'OFFLINE_SESSION_CANNOT_SET_PIN',
      });
    }
    const pin = String(req.body?.pin ?? '');
    await setOfflinePin((req as AuthenticatedRequest).userId, pin);
    return res.json({ message: 'Offline PIN saved' });
  } catch (error: any) {
    if (pinPolicyError(res, error)) return;
    return res.status(500).json({ error: error.message });
  }
});

// DELETE /api/offline-auth/pin — remove your own PIN
router.delete('/pin', authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    await clearOfflinePin((req as AuthenticatedRequest).userId);
    return res.json({ message: 'Offline PIN removed' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/offline-auth/pin/:userId — provision a PIN for another account
// (admin only, explicitly allowed from a break-glass session: it is how an
// operator restores access for everyone else during an outage).
router.post('/pin/:userId', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const targetId = String(req.params.userId);
    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, name: true, syncSource: true },
    });
    if (!target) {
      return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
    }
    if (target.syncSource !== 'ENROLLPRO') {
      return res.status(400).json({
        error: 'Offline PINs are only for EnrollPro-provisioned accounts.',
        code: 'NOT_PROVISIONED',
      });
    }
    const pin = String(req.body?.pin ?? '');
    await setOfflinePin(target.id, pin);
    await prisma.auditLog
      .create({
        data: {
          actorName: actorOf(req).name,
          actorRole: actorOf(req).role,
          actionType: 'OFFLINE_PIN_SET_BY_ADMIN',
          details: JSON.stringify({ targetUserId: target.id, targetName: target.name }),
        },
      })
      .catch(() => {});
    return res.json({ message: `Offline PIN set for ${target.name}` });
  } catch (error: any) {
    if (pinPolicyError(res, error)) return;
    return res.status(500).json({ error: error.message });
  }
});

export default router;
