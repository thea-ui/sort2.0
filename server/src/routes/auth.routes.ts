import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { authenticateWithEnrollPro, authenticateLearnerWithEnrollPro } from '../services/enrollpro-auth.service.js';
import { getJwtSecret } from '../config/env.js';

const router = Router();
const prisma = new PrismaClient();
const JWT_ALGORITHMS: jwt.Algorithm[] = ['HS256'];
const ACCESS_EXPIRY_SECONDS = 15 * 60; // 15 minutes
const REFRESH_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req, res) => res.status(429).json({
    error: 'Too many login attempts. Please try again in 15 minutes.',
    code: 'RATE_LIMITED',
  }),
});

// ─── Helpers ───────────────────────────────────────────────────────────

function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString('hex');
}

function getRefreshExpiry(): Date {
  return new Date(Date.now() + REFRESH_EXPIRY_MS);
}

function safeUser(user: any) {
  const { passwordHash: _, ...rest } = user;
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

// POST /api/auth/login
// Students login with LRN, Teachers/Admin/MRF login with Employee ID
// Authentication is delegated to EnrollPro — no local password comparison
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
      console.log(`[Auth] Login failed: user not found for identifier "${maskId(loginId)}"`);
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    // Only allow EnrollPro-synced accounts
    if (user.syncSource !== 'ENROLLPRO') {
      console.log(`[Auth] Login failed: user "${maskId(loginId)}" not provisioned (syncSource=${user.syncSource})`);
      return res.status(401).json({ error: 'Account not provisioned. Contact your administrator.', code: 'NOT_PROVISIONED' });
    }

    // Enrolled students only: archived / not-yet-enrolled learners cannot sign in
    if (user.role === 'STUDENT' && (user.archivedAt || user.enrollmentStatus === 'NOT_ENROLLED' || user.enrollmentStatus === 'ALUMNI')) {
      console.log(`[Auth] Login denied: student "${maskId(loginId)}" is not enrolled for the current school year`);
      return res.status(403).json({
        error: 'You are not enrolled for this school year yet. Please wait for enrollment to be completed.',
        code: 'NOT_ENROLLED',
      });
    }

    // Route by role: students use the dedicated learner endpoint
    const isStudent = user.role === 'STUDENT';
    const authResult = isStudent
      ? await authenticateLearnerWithEnrollPro(user.enrollproLrn || loginId, loginPassword)
      : await authenticateWithEnrollPro(loginId, loginPassword);

    if (authResult.unreachable) {
      console.log(`[Auth] Login failed: EnrollPro unreachable for "${maskId(loginId)}"`);
      return res.status(503).json({
        error: 'Authentication service unreachable. Please try again later.',
        code: 'AUTH_SERVICE_UNREACHABLE',
        unreachable: true,
      });
    }

    if (authResult.mustChangePassword) {
      console.log(`[Auth] Login failed: user "${maskId(loginId)}" must change password in EnrollPro`);
      return res.status(403).json({
        error: 'Please change your password in EnrollPro first, then sign in.',
        code: 'PASSWORD_CHANGE_REQUIRED',
      });
    }

    if (authResult.accountInactive) {
      console.log(`[Auth] Login failed: student "${maskId(loginId)}" EnrollPro portal account inactive`);
      return res.status(403).json({
        error: 'Your EnrollPro portal account is not yet activated. Contact the registrar.',
        code: 'NO_ENROLLPRO_ACCOUNT',
      });
    }

    if (!authResult.success) {
      // Log the real reason from EnrollPro (401 vs 400 vs other) while keeping
      // the client response generic so we never leak which part was wrong.
      console.warn(`[Auth] Login failed for "${maskId(loginId)}": ${authResult.error || 'invalid credentials'}`);
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    // Check if account is suspended
    if (user.accountStatus === 'SUSPENDED' && user.suspendedUntil && user.suspendedUntil > new Date()) {
      const remainingMs = user.suspendedUntil.getTime() - Date.now();
      const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
      const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
      const timeStr = remainingHours > 1 ? `${remainingHours} hours` : `${remainingMinutes} minutes`;
      console.log(`[Auth] Login failed: user "${maskId(loginId)}" suspended until ${user.suspendedUntil.toISOString()}`);
      return res.status(403).json({
        error: `Account is suspended. You can log in again in ${timeStr}.`,
        code: 'ACCOUNT_SUSPENDED',
        suspendedUntil: user.suspendedUntil.toISOString(),
      });
    }

    // Auto-unsuspend if suspension has expired
    if (user.accountStatus === 'SUSPENDED' && user.suspendedUntil && user.suspendedUntil <= new Date()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { accountStatus: 'ACTIVE', suspendedUntil: null },
      });
      user.accountStatus = 'ACTIVE';
      user.suspendedUntil = null;
    }

    // Create short-lived access token
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      getJwtSecret(),
      { expiresIn: ACCESS_EXPIRY_SECONDS }
    );

    // Create refresh token and store session
    const refreshToken = generateRefreshToken();
    const deviceInfo = req.headers['user-agent'] || 'unknown';
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';

    await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken,
        deviceInfo,
        ipAddress,
        expiresAt: getRefreshExpiry(),
      },
    });

    return res.json({
      token: accessToken,
      accessToken,
      refreshToken,
      expiresIn: `${ACCESS_EXPIRY_SECONDS}s`,
      user: safeUser(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/refresh — exchange refresh token for new access token
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

// POST /api/auth/logout — invalidate a specific session
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

// POST /api/auth/logout-all — invalidate all sessions for a user
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

// GET /api/auth/sessions — list active sessions for current user
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
