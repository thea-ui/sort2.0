import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireRole, requireAdmin } from '../middleware/auth.js';
import { getActiveSchoolYearId } from '../services/rollover.service.js';

const router = Router();
const prisma = new PrismaClient();

// Default scrap materials for a school MRF. Seeded on first read; editable by admins.
const DEFAULT_SCRAP_STOCKS = [
  { materialCode: 'ferrous_metal', materialName: 'Ferrous Metal (Steel / Iron)', thresholdLimitKg: 50, marketPricePerKg: 12, hazmat: false },
  { materialCode: 'non_ferrous_metal', materialName: 'Non-Ferrous Metal (Aluminum / Copper)', thresholdLimitKg: 20, marketPricePerKg: 55, hazmat: false },
  { materialCode: 'e_waste', materialName: 'E-Waste (Electronics)', thresholdLimitKg: 20, marketPricePerKg: 20, hazmat: true },
  { materialCode: 'plastic', materialName: 'Hard Plastic', thresholdLimitKg: 40, marketPricePerKg: 8, hazmat: false },
  { materialCode: 'wood', materialName: 'Wood / Lumber', thresholdLimitKg: 60, marketPricePerKg: 3, hazmat: false },
  { materialCode: 'glass', materialName: 'Glass', thresholdLimitKg: 40, marketPricePerKg: 5, hazmat: false },
  { materialCode: 'mixed', materialName: 'Mixed / Other Scrap', thresholdLimitKg: 50, marketPricePerKg: 5, hazmat: false },
];

// GET /api/asset-scrap/stocks — current scrap stock & thresholds by material
router.get('/stocks', authenticate, async (_req: Request, res: Response): Promise<any> => {
  try {
    let stocks = await prisma.assetScrapStock.findMany({ orderBy: { createdAt: 'asc' } });
    if (stocks.length === 0) {
      await prisma.assetScrapStock.createMany({ data: DEFAULT_SCRAP_STOCKS });
      stocks = await prisma.assetScrapStock.findMany({ orderBy: { createdAt: 'asc' } });
    }
    res.json(stocks);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch scrap stocks' });
  }
});

// PATCH /api/asset-scrap/stocks/:code — add weighed kg, or update threshold/price
router.patch('/stocks/:code', requireRole('MRF', 'ADMIN'), async (req: Request, res: Response): Promise<any> => {
  try {
    const code = req.params.code as string;
    const { addKg, setAccumulatedKg, thresholdLimitKg, marketPricePerKg } = req.body;

    const existing = await prisma.assetScrapStock.findUnique({ where: { materialCode: code } });
    if (!existing) {
      return res.status(404).json({ error: 'Scrap material not found' });
    }

    let newAccumulated = existing.accumulatedKg;
    if (typeof addKg === 'number') newAccumulated += addKg;
    if (typeof setAccumulatedKg === 'number') newAccumulated = setAccumulatedKg;

    const updated = await prisma.assetScrapStock.update({
      where: { materialCode: code },
      data: {
        ...(typeof thresholdLimitKg === 'number' ? { thresholdLimitKg } : {}),
        ...(typeof marketPricePerKg === 'number' ? { marketPricePerKg } : {}),
        accumulatedKg: Math.max(0, parseFloat(newAccumulated.toFixed(2))),
      },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update scrap stock' });
  }
});

// POST /api/asset-scrap/approve-sale — Disposal Committee / admin authorizes a batch sale
router.post('/approve-sale', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const { materialCode, isApproved, approvalReference } = req.body;
    if (!materialCode) return res.status(400).json({ error: 'materialCode is required' });

    const stock = await prisma.assetScrapStock.findUnique({ where: { materialCode } });
    if (!stock) return res.status(404).json({ error: 'Scrap material not found' });
    if (stock.hazmat) {
      return res.status(400).json({ error: 'Hazardous/e-waste cannot be sold as ordinary scrap. Use an accredited handler.', code: 'HAZMAT' });
    }

    const setApproval = typeof isApproved === 'boolean' ? isApproved : true;

    const updated = await prisma.assetScrapStock.update({
      where: { materialCode },
      data: {
        isApprovedForSale: setApproval,
        approvedAt: setApproval ? new Date() : null,
        ...(approvalReference !== undefined ? { approvalReference: approvalReference ? String(approvalReference) : null } : {}),
      },
    });

    res.json({ success: true, stock: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to approve scrap sale' });
  }
});

// POST /api/asset-scrap/sell-batch — execute a batch sale (caps at threshold, leaves remainder)
router.post('/sell-batch', requireRole('MRF', 'ADMIN'), async (req: Request, res: Response): Promise<any> => {
  try {
    const { materialCode, buyerName, approvalReference } = req.body;
    if (!materialCode) return res.status(400).json({ error: 'materialCode is required' });

    const stock = await prisma.assetScrapStock.findUnique({ where: { materialCode } });
    if (!stock) return res.status(404).json({ error: 'Scrap material not found' });
    if (stock.hazmat) {
      return res.status(400).json({ error: 'Hazardous/e-waste cannot be sold as ordinary scrap.', code: 'HAZMAT' });
    }
    if (stock.accumulatedKg <= 0) {
      return res.status(400).json({ error: 'No accumulated weight to sell' });
    }
    if (!stock.isApprovedForSale) {
      return res.status(400).json({ error: 'Batch sale not approved yet (Disposal Committee approval required).', code: 'NOT_APPROVED' });
    }

    const weightSold = stock.accumulatedKg >= stock.thresholdLimitKg ? stock.thresholdLimitKg : stock.accumulatedKg;
    const remainingKg = Math.max(0, stock.accumulatedKg - weightSold);
    const pricePerKg = stock.marketPricePerKg;
    const totalRevenue = Math.round(weightSold * pricePerKg);

    const buyer = (buyerName && String(buyerName).trim()) || 'Junk / Scrap Buyer';

    const transaction = await prisma.assetScrapSaleTransaction.create({
      data: {
        materialCode: stock.materialCode,
        materialName: stock.materialName,
        weightKg: parseFloat(weightSold.toFixed(1)),
        marketPriceKg: pricePerKg,
        totalRevenue,
        buyerName: buyer,
        approvalReference: approvalReference ? String(approvalReference) : stock.approvalReference,
        schoolYearId: await getActiveSchoolYearId(),
      },
    });

    const updatedStock = await prisma.assetScrapStock.update({
      where: { materialCode },
      data: {
        accumulatedKg: parseFloat(remainingKg.toFixed(2)),
        isApprovedForSale: false,
        approvedAt: null,
        approvalReference: null,
      },
    });

    res.status(201).json({ success: true, transaction, updatedStock });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to process scrap sale' });
  }
});

// GET /api/asset-scrap/sales — scrap sales ledger (by school year)
router.get('/sales', authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const { schoolYearId } = req.query;
    const where: any = {};
    if (schoolYearId) {
      where.schoolYearId = schoolYearId as string;
    } else {
      const activeSyId = await getActiveSchoolYearId();
      if (activeSyId) where.schoolYearId = activeSyId;
    }

    const sales = await prisma.assetScrapSaleTransaction.findMany({
      where,
      orderBy: { soldAt: 'desc' },
    });
    res.json(sales);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch scrap sales' });
  }
});

export default router;
