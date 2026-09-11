import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { getActiveSchoolYearId } from '../services/rollover.service.js';

const router = Router();
const prisma = new PrismaClient();

const ALLOWED_ACTIONS = ['RECOVERED', 'REPAIRED', 'DISPOSED'];

// GET /api/assets — list MRF asset ledger records
router.get('/', authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const action = typeof req.query.action === 'string' ? req.query.action : undefined;
    const schoolYearId = typeof req.query.schoolYearId === 'string' ? req.query.schoolYearId : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;

    const where: any = {};
    if (action) where.action = action;
    if (schoolYearId) where.schoolYearId = schoolYearId;
    if (q) {
      where.OR = [
        { assetName: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
        { locationName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const records = await prisma.mrfAssetRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch asset records' });
  }
});

// GET /api/assets/summary — aggregate counts per action/category
router.get('/summary', authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const schoolYearId = typeof req.query.schoolYearId === 'string' ? req.query.schoolYearId : undefined;
    const where: any = schoolYearId ? { schoolYearId } : {};

    const [byAction, byCategory, total] = await Promise.all([
      prisma.mrfAssetRecord.groupBy({ by: ['action'], where, _count: { _all: true }, _sum: { quantity: true } }),
      prisma.mrfAssetRecord.groupBy({ by: ['category'], where, _count: { _all: true } }),
      prisma.mrfAssetRecord.count({ where }),
    ]);

    res.json({ total, byAction, byCategory });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch asset summary' });
  }
});

// POST /api/assets — record a recovered/repaired/disposed asset event
router.post('/', requireRole('MRF', 'ADMIN'), async (req: Request, res: Response): Promise<any> => {
  try {
    const { assetName, category, action, quantity, unit, condition, sourceReportId, locationName, notes } = req.body;

    if (!assetName || !category || !action) {
      return res.status(400).json({ error: 'assetName, category, and action are required' });
    }
    if (!ALLOWED_ACTIONS.includes(action)) {
      return res.status(400).json({ error: `action must be one of: ${ALLOWED_ACTIONS.join(', ')}` });
    }

    const schoolYearId = await getActiveSchoolYearId();

    const record = await prisma.mrfAssetRecord.create({
      data: {
        assetName: String(assetName).trim(),
        category: String(category),
        action: String(action),
        quantity: quantity !== undefined && quantity !== null ? Number(quantity) : 1,
        unit: unit || 'pcs',
        condition: condition || null,
        sourceReportId: sourceReportId || null,
        locationName: locationName || null,
        notes: notes || null,
        performedBy: (req as AuthenticatedRequest).userName || null,
        schoolYearId,
      },
    });

    res.status(201).json(record);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create asset record' });
  }
});

export default router;