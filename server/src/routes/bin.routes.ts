import { Router, Request, Response } from 'express';
import { PrismaClient, WasteCategory } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/bins - List all waste bins
router.get('/', async (_req: Request, res: Response): Promise<any> => {
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
router.patch('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { fillLevel, activeDispatch, lastEmptied } = req.body;

    const data: any = {};
    if (fillLevel !== undefined) data.fillLevel = fillLevel;
    if (activeDispatch !== undefined) data.activeDispatch = activeDispatch;
    if (lastEmptied) data.lastEmptied = new Date(lastEmptied);

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
