import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/bins - List all waste bins
router.get('/', authenticate, async (_req: Request, res: Response): Promise<any> => {
  try {
    const bins = await prisma.wasteBin.findMany({
      orderBy: { fillLevel: 'desc' },
    });

    const formatted = bins.map((b) => ({
      id: b.id,
      name: b.name,
      locationName: b.locationName,
      fillLevel: b.fillLevel,
      type: b.type,
      coordinates: { lat: b.lat, lng: b.lng },
      activeDispatch: b.activeDispatch,
      lastEmptied: b.lastEmptied ? b.lastEmptied.toISOString() : undefined,
    }));

    return res.json(formatted);
  } catch (error) {
    console.error('Fetch bins error:', error);
    return res.status(500).json({ error: 'Failed to fetch waste bins' });
  }
});

// PATCH /api/bins/:id - Update bin status or trigger dispatch
router.patch('/:id', requireRole('ADMIN', 'MRF'), async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { fillLevel, activeDispatch, lastEmptied } = req.body;

    const data: any = {};
    if (fillLevel !== undefined) {
      const level = Number(fillLevel);
      if (!Number.isFinite(level) || level < 0 || level > 100) {
        return res.status(400).json({ error: 'fillLevel must be a number between 0 and 100' });
      }
      data.fillLevel = level;
    }
    if (activeDispatch !== undefined) data.activeDispatch = Boolean(activeDispatch);
    if (lastEmptied) {
      const parsed = new Date(lastEmptied);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'lastEmptied must be a valid date' });
      }
      data.lastEmptied = parsed;
    }

    const updated = await prisma.wasteBin.update({
      where: { id: Array.isArray(id) ? id[0] : id },
      data,
    });

    return res.json({
      id: updated.id,
      name: updated.name,
      locationName: updated.locationName,
      fillLevel: updated.fillLevel,
      type: updated.type,
      coordinates: { lat: updated.lat, lng: updated.lng },
      activeDispatch: updated.activeDispatch,
      lastEmptied: updated.lastEmptied ? updated.lastEmptied.toISOString() : undefined,
    });
  } catch (error) {
    console.error('Update bin error:', error);
    return res.status(500).json({ error: 'Failed to update waste bin' });
  }
});

export default router;
