import { Router, Request, Response } from 'express';

import { prisma } from '../lib/prisma.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { authenticateWithEnrollPro, authenticateLearnerWithEnrollPro } from '../services/enrollpro-auth.service.js';
import {
  cacheVerifiedPassword,
  canUseLocalFastPath,
  clearCachedPassword,
  isRevalidationDue,
  verifyLocalPassword,
  verifyOfflinePassword,
} from '../services/offline-auth.service.js';
import { getActiveSchoolYearId } from '../services/rollover.service.js';
import { getJwtSecret } from '../config/env.js';
import { PrismaRateLimitStore } from '../lib/rate-limit-store.js';

const router = Router();
const JWT_ALGORITHMS: jwt.Algorithm[] = ['HS256'];
const ACCESS_EXPIRY_SECONDS = 15 * 60; // 15 minutes
const REFRESH_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
// Offline sessions are a fallback, not the norm: keep them short-lived so a
// suspension/rollover on EnrollPro takes effect quickly once it is reachable.
const OFFLINE_REFRESH_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Local-first login is opt-in. With the flag off, the old EnrollPro-first flow
// (including the offline cache fallback) is unchanged.
const AUTH_LOCAL_FIRST = process.env.AUTH_LOCAL_FIRST === 'true';
const AUTH_LOCAL_REVALIDATE_DAYS = (() => {
  const days = Number(process.env.AUTH_LOCAL_REVALIDATE_DAYS ?? '0');
  return Number.isFinite(days) && days > 0 ? days : 0;
})();
// A valid cost-12 hash used only to equalize timing for unknown identifiers.
const DUMMY_BCRYPT_HASH = '$2b$12$jcejuecJCU7Q15i9JlXMEOIKY9P2oNdedhY1s/UjnkHKNy7fLHKYO';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  store: new PrismaRateLimitStore(),
  handler: (_req, res) => res.status(429).json({
    error: 'Too many login attempts. Please try again in 15 minutes.',
    code: 'RATE_LIMITED',
  }),
});

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString('hex');
}

function getRefreshExpiry(): Date {
  return new Date(Date.now() + REFRESH_EXPIRY_MS);
}

function safeUser(user: any) {
  const {
    passwordHash: _passwordHash,
    passwordCachedAt: _passwordCachedAt,
    passwordVerifiedAt: _passwordVerifiedAt,
    passwordChangeRequired: _passwordChangeRequired,
    passwordResetRequired: _passwordResetRequired,
    ...rest
  } = user;
  return { ...rest, certificatesEarned: rest.certificates };
}

/**
 * Masks learner/staff identifiers before they reach the logs. LRNs and employee
 * IDs are personal data under RA 10173; logs must not become a secondary store
 * of them.
 */
function maskId(value: string | undefined | null): string {
  const id = String(value ?? '').trim();
  if (id.length <= 4) return '****';
  return `${id.slice(0, 2)}${'*'.repeat(id.length - 4)}${id.slice(-2)}`;
}

async function writeLoginAudit(
  user: any,
  actionType: string,
  details: string,
  req: Request
): Promise<void> {
  try {
    const schoolYearId = await getActiveSchoolYearId().catch(() => null);
    await prisma.auditLog.create({
      data: {
        actorName: user?.name || 'Unknown',
        actorRole: user?.role || 'UNKNOWN',
        actionType,
        details,
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
        schoolYearId,
      },
    });
  } catch (error: any) {
    console.error('[Auth] Failed to write login audit row:', error?.message || error);
  }
}

async function finishLogin(
  user: any,
  authSource: string,
  req: Request,
  res: Response,
  opts: {
    offlineAuth?: boolean;
    cachePassword?: string;
    mustChangePassword?: boolean;
    requiresPasswordReset?: boolean;
  } = {}
): Promise<any> {
  // Suspension gate â€” identical to the pre-local-first behavior, including the
  // automatic release of an expired suspension.
  if (user.accountStatus === 'SUSPENDED' && user.suspendedUntil && user.suspendedUntil > new Date()) {
    const remainingMs = user.suspendedUntil.getTime() - Date.now();
    const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
    const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
    const timeStr = remainingHours > 1 ? `${remainingHours} hours` : `${remainingMinutes} minutes`;
    console.log(`[Auth] Login failed: user "${maskId(user.employeeId)}" suspended until ${user.suspendedUntil.toISOString()}`);
    await writeLoginAudit(user, 'LOGIN_BLOCKED', `code=ACCOUNT_SUSPENDED; authSource=${authSource}; result=blocked`, req);
    return res.status(403).json({
      error: `Account is suspended. You can log in again in ${timeStr}.`,
      code: 'ACCOUNT_SUSPENDED',
      suspendedUntil: user.suspendedUntil.toISOString(),
    });
  }

  if (user.accountStatus === 'SUSPENDED' && user.suspendedUntil && user.suspendedUntil <= new Date()) {
    await prisma.user.update({
      where: { id: user.id },
      data: { accountStatus: 'ACTIVE', suspendedUntil: null },
    });
    user.accountStatus = 'ACTIVE';
    user.suspendedUntil = null;
  }

  const allowedRoles = PORTAL_ROLES[typeof req.body?.portal === 'string' ? req.body.portal.toUpperCase() : ''];
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    console.log(`[Auth] Login denied: role ${user.role} attempted the ${String(req.body?.portal).toUpperCase()} portal`);
    await writeLoginAudit(user, 'LOGIN_BLOCKED', `code=WRONG_PORTAL; authSource=${authSource}; result=blocked`, req);
    return res.status(403).json({
      error: 'This account does not have access to this portal.',
      code: 'WRONG_PORTAL',
    });
  }

  const mustChangePassword = Boolean(opts.mustChangePassword || opts.requiresPasswordReset);
  if (mustChangePassword) {
    // EnrollPro accepted the credential. SORT must not force a password-change
    // interstitial; keep the flag only to disable local-first caching and
    // re-check the account with EnrollPro on the next login.
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: null,
        passwordCachedAt: null,
        passwordVerifiedAt: null,
        passwordChangeRequired: Boolean(opts.mustChangePassword),
        passwordResetRequired: Boolean(opts.requiresPasswordReset),
      },
    });
    console.warn(`[Auth] Login accepted for "${maskId(user.employeeId)}" with EnrollPro password-change flag; password not cached`);
  }

  if (opts.cachePassword && !mustChangePassword) {
    await cacheVerifiedPassword(user.id, opts.cachePassword);
  }

  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    getJwtSecret(),
    { expiresIn: ACCESS_EXPIRY_SECONDS }
  );

  const refreshToken = generateRefreshToken();
  const deviceInfo = req.headers['user-agent'] || 'unknown';
  const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';

  await prisma.userSession.create({
    data: {
      userId: user.id,
      refreshToken,
      deviceInfo,
      ipAddress,
      expiresAt: opts.offlineAuth
        ? new Date(Date.now() + OFFLINE_REFRESH_EXPIRY_MS)
        : getRefreshExpiry(),
    },
  });

  await writeLoginAudit(
    user,
    'LOGIN_SUCCESS',
    `authSource=${authSource}; result=success; offline=${Boolean(opts.offlineAuth)}; mustChange=${mustChangePassword}`,
    req
  );

  return res.json({
    token: accessToken,
    accessToken,
    refreshToken,
    expiresIn: `${ACCESS_EXPIRY_SECONDS}s`,
    ...(opts.offlineAuth ? { offlineAuth: true } : {}),
    user: safeUser(user),
  });
}

// Portal admission map: each sign-in surface admits exactly one role family.
// ADMIN console â†’ admin accounts only; MRF terminal â†’ MRF accounts only;
// Student/Faculty sign-in â†’ learners and teachers only.
const PORTAL_ROLES: Record<string, string[]> = {
  ADMIN: ['ADMIN'],
  MRF: ['MRF'],
  STAFF: ['STUDENT', 'TEACHER'],
};

// POST /api/auth/login
// Students login with LRN, Teachers/Admin/MRF login with Employee ID.
// EnrollPro remains the password authority; an opt-in local-first fast path
// may satisfy normal logins once EnrollPro has verified the cached hash.
router.post('/login', loginLimiter, async (req: Request, res: Response): Promise<any> => {
  try {
    const { identifier, password, lrn, employeeId, email } = req.body;
    const loginId = (identifier || lrn || employeeId || email || '').trim();
    const loginPassword = password || '';

    if (!loginId || !loginPassword) {
      return res.status(400).json({ error: 'ID and password are required' });
    }

    // Find user by: enrollproLrn, employeeId, or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { enrollproLrn: { equals: loginId, mode: 'insensitive' } },
          { employeeId: { equals: loginId, mode: 'insensitive' } },
          { email: { equals: loginId, mode: 'insensitive' } },
        ],
      },
    });

    if (!user) {
      // Timing equalization for unknown identifiers: never reveal account
      // existence through a fast 401.
      await bcrypt.compare(loginPassword, DUMMY_BCRYPT_HASH).catch(() => false);
      console.log(`[Auth] Login failed: user not found for identifier "${maskId(loginId)}"`);
      await writeLoginAudit(null, 'LOGIN_FAILED', 'code=INVALID_CREDENTIALS; authSource=NONE; result=failure', req);
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    // Only allow EnrollPro-synced accounts
    if (user.syncSource !== 'ENROLLPRO') {
      console.log(`[Auth] Login failed: user "${maskId(loginId)}" not provisioned (syncSource=${user.syncSource})`);
      await writeLoginAudit(user, 'LOGIN_FAILED', 'code=NOT_PROVISIONED; authSource=NONE; result=failure', req);
      return res.status(401).json({ error: 'Account not provisioned. Contact your administrator.', code: 'NOT_PROVISIONED' });
    }

    // Enrolled students only: archived / not-yet-enrolled learners cannot sign in
    if (user.role === 'STUDENT' && (user.archivedAt || user.enrollmentStatus === 'NOT_ENROLLED' || user.enrollmentStatus === 'ALUMNI')) {
      console.log(`[Auth] Login denied: student "${maskId(loginId)}" is not enrolled for the current school year`);
      await writeLoginAudit(user, 'LOGIN_BLOCKED', 'code=NOT_ENROLLED; authSource=NONE; result=blocked', req);
      return res.status(403).json({
        error: 'You are not enrolled for this school year yet. Please wait for enrollment to be completed.',
        code: 'NOT_ENROLLED',
      });
    }

    // Local-first check. Only a hash EnrollPro has verified, with no pending
    // password-change flag and no expired revalidation window, can skip the
    // network call. Everything else falls through to EnrollPro.
    const isStudent = user.role === 'STUDENT';
    const local = await verifyLocalPassword(user, loginPassword);
    const revalidationDue = isRevalidationDue(user.passwordVerifiedAt, AUTH_LOCAL_REVALIDATE_DAYS);

    if (
      canUseLocalFastPath({
        enabled: AUTH_LOCAL_FIRST,
        hasLocalHash: local.hasHash,
        localMatches: local.matches,
        verifiedAt: user.passwordVerifiedAt,
        passwordChangeRequired: user.passwordChangeRequired,
        passwordResetRequired: user.passwordResetRequired,
        revalidationDue,
      })
    ) {
      console.log(`[Auth] Local-first login accepted for "${maskId(loginId)}"`);
      return finishLogin(user, 'LOCAL', req, res);
    }

    const authResult = isStudent
      ? await authenticateLearnerWithEnrollPro(user.enrollproLrn || loginId, loginPassword)
      : await authenticateWithEnrollPro(loginId, loginPassword);

    if (authResult.unreachable) {
      // New local-first policy: a verified local credential may still work
      // during an outage, but an unverified hash or an active password-change
      // flag must not bypass the EnrollPro check.
      if (AUTH_LOCAL_FIRST) {
        if (local.matches && !user.passwordChangeRequired && !user.passwordResetRequired && user.passwordVerifiedAt) {
          console.warn(`[Auth] Local-stale login accepted for "${maskId(loginId)}" while EnrollPro is unreachable`);
          return finishLogin(user, 'LOCAL_STALE', req, res, { offlineAuth: true });
        }
        if (local.matches) {
          console.log(`[Auth] Login blocked: "${maskId(loginId)}" has an unverified or must-change local password`);
          await writeLoginAudit(user, 'LOGIN_BLOCKED', 'code=AUTH_SERVICE_UNREACHABLE; authSource=NONE; result=blocked', req);
          return res.status(503).json({
            error: 'Authentication service unreachable. Please try again later.',
            code: 'AUTH_SERVICE_UNREACHABLE',
            unreachable: true,
          });
        }
        if (!local.hasHash) {
          await writeLoginAudit(user, 'LOGIN_FAILED', 'code=AUTH_SERVICE_UNREACHABLE; authSource=NONE; result=failure', req);
          return res.status(503).json({
            error: 'Authentication service unreachable. Please try again later.',
            code: 'AUTH_SERVICE_UNREACHABLE',
            unreachable: true,
          });
        }
        await writeLoginAudit(user, 'LOGIN_FAILED', 'code=INVALID_CREDENTIALS; authSource=NONE; result=failure', req);
        return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
      }

      // Legacy fallback (AUTH_LOCAL_FIRST off): preserve the existing offline
      // cache behavior and the 24-hour offline refresh window.
      const offline = await verifyOfflinePassword(user, loginPassword);
      if (!offline.ok) {
        console.log(
          `[Auth] Login failed: EnrollPro unreachable and no usable offline verifier for "${maskId(loginId)}" (${offline.reason})`
        );
        await writeLoginAudit(user, 'LOGIN_FAILED', 'code=AUTH_SERVICE_UNREACHABLE; authSource=NONE; result=failure', req);
        return res.status(503).json({
          error: 'Authentication service unreachable. Please try again later.',
          code: 'AUTH_SERVICE_UNREACHABLE',
          unreachable: true,
        });
      }
      console.warn(`[Auth] Offline login accepted for "${maskId(loginId)}" using cached password verifier`);
      return finishLogin(user, 'LOCAL_OFFLINE', req, res, { offlineAuth: true });
    }

    if (authResult.accountInactive) {
      await clearCachedPassword(user.id);
      console.log(`[Auth] Login failed: student "${maskId(loginId)}" EnrollPro portal account inactive`);
      await writeLoginAudit(user, 'LOGIN_BLOCKED', 'code=NO_ENROLLPRO_ACCOUNT; authSource=ENROLLPRO; result=blocked', req);
      return res.status(403).json({
        error: 'Your EnrollPro portal account is not yet activated. Contact the registrar.',
        code: 'NO_ENROLLPRO_ACCOUNT',
      });
    }

    if (!authResult.success) {
      // Log the real reason from EnrollPro (401 vs 400 vs other) while keeping
      // the client response generic so we never leak which part was wrong.
      console.warn(`[Auth] Login failed for "${maskId(loginId)}": ${authResult.error || 'invalid credentials'}`);
      await writeLoginAudit(user, 'LOGIN_FAILED', 'code=INVALID_CREDENTIALS; authSource=ENROLLPRO; result=failure', req);
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    if (authResult.mustChangePassword || authResult.requiresPasswordReset) {
      console.warn(
        `[Auth] Login blocked for "${maskId(loginId)}": EnrollPro requires a password change`
      );
    }

    return finishLogin(user, 'ENROLLPRO', req, res, {
      mustChangePassword: authResult.mustChangePassword,
      requiresPasswordReset: authResult.requiresPasswordReset,
      cachePassword:
        authResult.mustChangePassword || authResult.requiresPasswordReset
          ? undefined
          : loginPassword,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/refresh â€” exchange refresh token for new access token
router.post('/refresh', async (req: Request, res: Response): Promise<any> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const session = await prisma.userSession.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      // Clean up expired session if it exists
      if (session) {
        await prisma.userSession.delete({ where: { id: session.id } }).catch(() => {});
      }
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Strict guard: only EnrollPro-synced accounts are valid
    if (session.user.syncSource !== 'ENROLLPRO') {
      await prisma.userSession.delete({ where: { id: session.id } }).catch(() => {});
      return res.status(401).json({ error: 'Account not provisioned. Contact your administrator.' });
    }

    // Enrolled students only: block refresh for archived / not-yet-enrolled learners
    if (session.user.role === 'STUDENT' && (session.user.archivedAt || session.user.enrollmentStatus === 'NOT_ENROLLED' || session.user.enrollmentStatus === 'ALUMNI')) {
      await prisma.userSession.delete({ where: { id: session.id } }).catch(() => {});
      return res.status(403).json({ error: 'You are not enrolled for the current school year yet.', code: 'NOT_ENROLLED' });
    }

    // Suspended accounts must not be able to mint fresh access tokens.
    // (Previously a suspension only blocked new logins; existing sessions could
    // keep rotating refresh tokens indefinitely.)
    if (
      session.user.accountStatus === 'SUSPENDED' &&
      session.user.suspendedUntil &&
      session.user.suspendedUntil > new Date()
    ) {
      await prisma.userSession.delete({ where: { id: session.id } }).catch(() => {});
      return res.status(403).json({
        error: 'Account is suspended.',
        code: 'ACCOUNT_SUSPENDED',
        suspendedUntil: session.user.suspendedUntil.toISOString(),
      });
    }

    // Rotate refresh token (issue new one, invalidate old)
    const newRefreshToken = generateRefreshToken();
    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        refreshToken: newRefreshToken,
        expiresAt: getRefreshExpiry(),
      },
    });

    const accessToken = jwt.sign(
      { id: session.user.id, email: session.user.email, role: session.user.role, name: session.user.name },
      getJwtSecret(),
      { expiresIn: ACCESS_EXPIRY_SECONDS }
    );

    return res.json({
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: `${ACCESS_EXPIRY_SECONDS}s`,
      user: safeUser(session.user),
    });
  } catch (error) {
    console.error('Refresh error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout â€” invalidate a specific session
router.post('/logout', async (req: Request, res: Response): Promise<any> => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await prisma.userSession.deleteMany({ where: { refreshToken } });
    }

    return res.json({ message: 'Logged out' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout-all â€” invalidate all sessions for a user
router.post('/logout-all', async (req: Request, res: Response): Promise<any> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: JWT_ALGORITHMS }) as { id: string };

    await prisma.userSession.deleteMany({ where: { userId: decoded.id } });

    return res.json({ message: 'All sessions invalidated' });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// GET /api/auth/sessions â€” list active sessions for current user
router.get('/sessions', async (req: Request, res: Response): Promise<any> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: JWT_ALGORITHMS }) as { id: string };

    const sessions = await prisma.userSession.findMany({
      where: {
        userId: decoded.id,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ sessions });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response): Promise<any> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: JWT_ALGORITHMS }) as { id: string };

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Strict guard: only EnrollPro-synced accounts are valid. Exception:
    // offline walk-in students (syncSource LOCAL) may be served when a valid
    // signed token is presented (e.g. the documented minted-token contingency
    // while EnrollPro is down). Login itself stays strictly delegated to
    // EnrollPro (see POST /login), so this cannot become a local auth bypass.
    if (user.syncSource !== 'ENROLLPRO' && user.enrollmentStatus !== 'OFFLINE_DEMO') {
      return res.status(401).json({ error: 'Account not provisioned. Contact your administrator.' });
    }

    // Enrolled students only
    if (user.role === 'STUDENT' && (user.archivedAt || user.enrollmentStatus === 'NOT_ENROLLED' || user.enrollmentStatus === 'ALUMNI')) {
      return res.status(403).json({ error: 'You are not enrolled for this school year yet.', code: 'NOT_ENROLLED' });
    }

    return res.json({
      user: safeUser(user),
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

export default router;
