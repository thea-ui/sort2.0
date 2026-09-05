import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getActiveSchoolYearId } from '../services/rollover.service.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/inventory - List all inventory items
router.get('/', async (_req: Request, res: Response): Promise<any> => {
  try {
    const items = await prisma.mrfInventoryItem.findMany({
      orderBy: { category: 'asc' },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch inventory' });
  }
});

// POST /api/inventory - Add new inventory item
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, category, description, unit, quantity, minThreshold, condition, isPersistent } = req.body;
    if (!name || !category || !unit) {
      return res.status(400).json({ error: 'name, category, and unit are required' });
    }

    const item = await prisma.mrfInventoryItem.create({
      data: {
        name,
        category,
        description: description || null,
        unit,
        quantity: quantity || 0,
        minThreshold: minThreshold || null,
        condition: condition || 'GOOD',
        isPersistent: isPersistent || false,
      },
    });

    // If initial quantity > 0, create a STOCK_IN transaction
    if (quantity > 0) {
      const schoolYearId = await getActiveSchoolYearId();
      if (schoolYearId) {
        await prisma.mrfInventoryTransaction.create({
          data: {
            itemId: item.id,
            schoolYearId,
            type: 'STOCK_IN',
            quantity,
            notes: 'Initial stock',
          },
        });
      }
    }

    res.status(201).json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create inventory item' });
  }
});

// PATCH /api/inventory/:id - Update inventory item
router.patch('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : Array.isArray(req.params.id) ? req.params.id[0] : '';
    const { name, category, description, unit, minThreshold, condition, isPersistent } = req.body;

    const item = await prisma.mrfInventoryItem.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(description !== undefined && { description }),
        ...(unit !== undefined && { unit }),
        ...(minThreshold !== undefined && { minThreshold }),
        ...(condition !== undefined && { condition }),
        ...(isPersistent !== undefined && { isPersistent }),
      },
    });
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update inventory item' });
  }
});

// DELETE /api/inventory/:id - Delete inventory item
router.delete('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : Array.isArray(req.params.id) ? req.params.id[0] : '';
    await prisma.mrfInventoryItem.delete({ where: { id } });
    res.json({ message: 'Inventory item deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete inventory item' });
  }
});

// GET /api/inventory/transactions - Get inventory transaction log
router.get('/transactions', async (req: Request, res: Response): Promise<any> => {
  try {
    const itemId = typeof req.query.itemId === 'string' ? req.query.itemId : undefined;
    const schoolYearId = typeof req.query.schoolYearId === 'string' ? req.query.schoolYearId : undefined;
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    const where: any = {};
    if (itemId) where.itemId = itemId;
    if (schoolYearId) where.schoolYearId = schoolYearId;
    if (type) where.type = type;

    const transactions = await prisma.mrfInventoryTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        item: { select: { id: true, name: true, category: true, unit: true } },
        schoolYear: { select: { id: true, label: true } },
      },
      take: 100,
    });
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch transactions' });
  }
});

// POST /api/inventory/transactions - Record stock in/out
router.post('/transactions', async (req: Request, res: Response): Promise<any> => {
  try {
    const { itemId, type, quantity, notes, performedBy } = req.body;
    if (!itemId || !type || quantity === undefined) {
      return res.status(400).json({ error: 'itemId, type, and quantity are required' });
    }

    const schoolYearId = await getActiveSchoolYearId();
    if (!schoolYearId) {
      return res.status(400).json({ error: 'No active school year found' });
    }

    // Update item quantity
    const item = await prisma.mrfInventoryItem.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const newQuantity = item.quantity + quantity;
    if (newQuantity < 0) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    const [transaction] = await prisma.$transaction([
      prisma.mrfInventoryTransaction.create({
        data: {
          itemId,
          schoolYearId,
          type,
          quantity,
          notes: notes || null,
          performedBy: performedBy || null,
        },
      }),
      prisma.mrfInventoryItem.update({
        where: { id: itemId },
        data: { quantity: Math.max(0, newQuantity) },
      }),
    ]);

    res.status(201).json(transaction);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to record transaction' });
  }
});

export default router;
