import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { executeRollover, getActiveSchoolYearId } from '../services/rollover.service.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/school-years - List all school years
router.get('/', async (_req: Request, res: Response): Promise<any> => {
  try {
    const schoolYears = await prisma.schoolYear.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        _count: {
          select: {
            reports: true,
            pointHistories: true,
            offenses: true,
            saleTransactions: true,
          },
        },
      },
    });
    res.json(schoolYears);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch school years' });
  }
});

// GET /api/school-years/active - Get current active school year
router.get('/active', async (_req: Request, res: Response): Promise<any> => {
  try {
    const sy = await prisma.schoolYear.findFirst({
      where: { isActive: true, isArchived: false },
    });
    res.json(sy || null);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch active school year' });
  }
});

// GET /api/school-years/:id - Get single school year with snapshot data
router.get('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : Array.isArray(req.params.id) ? req.params.id[0] : '';
    const sy = await prisma.schoolYear.findUnique({
      where: { id },
      include: {
        marketStockSnapshots: true,
        pointSnapshots: {
          include: { user: { select: { id: true, name: true, gradeLevel: true } } },
          orderBy: { closingPoints: 'desc' },
          take: 20,
        },
        _count: {
          select: {
            reports: true,
            pointHistories: true,
            offenses: true,
            saleTransactions: true,
            auditLogs: true,
          },
        },
      },
    });

    if (!sy) return res.status(404).json({ error: 'School year not found' });
    res.json(sy);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch school year' });
  }
});

// POST /api/school-years - Create a new school year
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const { label, startDate, endDate, enrollproId } = req.body;
    if (!label) return res.status(400).json({ error: 'label is required' });

    const sy = await prisma.schoolYear.create({
      data: {
        label,
        enrollproId: enrollproId || null,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isActive: true,
        isArchived: false,
      },
    });
    res.status(201).json(sy);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create school year' });
  }
});

// POST /api/school-years/:id/archive - Trigger manual rollover
router.post('/:id/archive', async (req: Request, res: Response): Promise<any> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : Array.isArray(req.params.id) ? req.params.id[0] : '';
    const sy = await prisma.schoolYear.findUnique({ where: { id } });

    if (!sy) return res.status(404).json({ error: 'School year not found' });
    if (sy.isArchived) return res.status(400).json({ error: 'School year is already archived' });
    if (!sy.isActive) return res.status(400).json({ error: 'School year is not active' });

    // Create a new SY for the next year
    const nextYear = parseInt(sy.label.split('-')[1] || '0') + 1;
    const nextLabel = `${nextYear}-${nextYear + 1}`;

    const result = await executeRollover(
      (sy.enrollproId || 0) + 1,
      nextLabel,
      new Date(sy.endDate.getTime() + 24 * 60 * 60 * 1000),
      new Date(sy.endDate.getTime() + 365 * 24 * 60 * 60 * 1000)
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to archive school year' });
  }
});

export default router;
