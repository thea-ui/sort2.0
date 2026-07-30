import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'sortv2_super_secret_jwt_key_2026';

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password, employeeId } = req.body;
    const credential = password || employeeId;

    if (!email || !credential) {
      return res.status(400).json({ error: 'Email and password/ID are required' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password/ID' });
    }

    // Match against bcrypt password hash OR direct employeeId match
    let isMatch = false;
    if (password) {
      isMatch = await bcrypt.compare(password, user.passwordHash);
    }
    if (!isMatch && credential) {
      isMatch = credential.trim().toLowerCase() === user.employeeId.toLowerCase() ||
                credential.trim().toLowerCase() === user.passwordHash;
    }

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials. Please check your email and password/ID.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { passwordHash: _, ...safeUser } = user;
    return res.json({
      token,
      user: {
        ...safeUser,
        certificatesEarned: safeUser.certificates,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
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

    const { passwordHash: _, ...safeUser } = user;
    return res.json({
      user: {
        ...safeUser,
        certificatesEarned: safeUser.certificates,
      },
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

export default router;
