import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/users - List all users
router.get('/', async (_req: Request, res: Response): Promise<any> => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        role: true,
        points: true,
        warningsCount: true,
        classroomSection: true,
        certificates: true,
        createdAt: true,
      },
    });

    const formatted = users.map((u) => ({
      ...u,
      certificatesEarned: u.certificates,
    }));

    return res.json(formatted);
  } catch (error) {
    console.error('Fetch users error:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/leaderboard - Top users by points
router.get('/leaderboard', async (_req: Request, res: Response): Promise<any> => {
  try {
    const leaderboard = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      orderBy: { points: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        points: true,
        classroomSection: true,
        certificates: true,
      },
    });

    return res.json(leaderboard);
  } catch (error) {
    console.error('Fetch leaderboard error:', error);
    return res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// POST /api/users/:id/warn - Issue an offense / warning
router.post('/:id/warn', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { description, severity } = req.body;

    const targetId = Array.isArray(id) ? id[0] : id;
    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const offense = await prisma.offense.create({
      data: {
        userId: targetId,
        description: description || 'Violation of waste management rules',
        severity: severity || 'WARNING',
      },
    });

    await prisma.user.update({
      where: { id: targetId },
      data: { warningsCount: { increment: 1 } },
    });

    return res.json({ message: 'Warning issued', offense });
  } catch (error) {
    console.error('Warn user error:', error);
    return res.status(500).json({ error: 'Failed to issue warning' });
  }
});

export default router;
