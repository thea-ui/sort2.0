import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'sortv2_super_secret_jwt_key_2026';
const ACCESS_EXPIRY_SECONDS = 15 * 60; // 15 minutes
const REFRESH_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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

// POST /api/auth/login
// Students login with LRN, Teachers/Admin/MRF login with Employee ID
router.post('/login', async (req: Request, res: Response): Promise<any> => {
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
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Only allow EnrollPro-synced accounts
    if (user.syncSource !== 'ENROLLPRO') {
      return res.status(401).json({ error: 'Account not provisioned. Contact your administrator.' });
    }

    const isMatch = await bcrypt.compare(loginPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is suspended
    if (user.accountStatus === 'SUSPENDED' && user.suspendedUntil && user.suspendedUntil > new Date()) {
      const remainingMs = user.suspendedUntil.getTime() - Date.now();
      const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
      const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
      const timeStr = remainingHours > 1 ? `${remainingHours} hours` : `${remainingMinutes} minutes`;
      return res.status(403).json({
        error: `Account is suspended. You can log in again in ${timeStr}.`,
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
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
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
      { id: session.user.id, email: session.user.email, role: session.user.role },
      JWT_SECRET,
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
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

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
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

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
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Strict guard: only EnrollPro-synced accounts are valid
    if (user.syncSource !== 'ENROLLPRO') {
      return res.status(401).json({ error: 'Account not provisioned. Contact your administrator.' });
    }

    return res.json({
      user: safeUser(user),
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// PATCH /api/auth/change-password
router.patch('/change-password', async (req: Request, res: Response): Promise<any> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords required' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Strict guard: only EnrollPro-synced accounts can change password
    if (user.syncSource !== 'ENROLLPRO') {
      return res.status(401).json({ error: 'Account not provisioned. Contact your administrator.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    // Invalidate all other sessions after password change
    await prisma.userSession.deleteMany({
      where: {
        userId: user.id,
        refreshToken: { not: '' },
      },
    });

    return res.json({ message: 'Password changed successfully' });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

export default router;
