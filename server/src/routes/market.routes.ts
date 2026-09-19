import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getActiveSchoolYearId } from '../services/rollover.service.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

const DEFAULT_STOCKS = [
  { categoryCode: 'pet_plastic', categoryName: 'PET Plastic Bottles', shortName: 'PET Bottles', thresholdLimitKg: 50.0, marketPricePerKg: 18.0, accumulatedKg: 0.0 },
  { categoryCode: 'aluminum_cans', categoryName: 'Aluminum & Metal Cans', shortName: 'Aluminum Cans', thresholdLimitKg: 30.0, marketPricePerKg: 45.0, accumulatedKg: 0.0 },
  { categoryCode: 'cardboard', categoryName: 'Cardboard & Paper', shortName: 'Cardboard', thresholdLimitKg: 60.0, marketPricePerKg: 12.0, accumulatedKg: 0.0 },
  { categoryCode: 'glass', categoryName: 'Glass Bottles & Containers', shortName: 'Glass Bottles', thresholdLimitKg: 40.0, marketPricePerKg: 15.0, accumulatedKg: 0.0 },
];

// GET /api/market/stocks - Get current market stock levels & thresholds
router.get('/stocks', authenticate, async (_req: Request, res: Response) => {
  try {
    let stocks = await prisma.recycleMarketStock.findMany({
      orderBy: { createdAt: 'asc' },
    });

    if (stocks.length === 0) {
      await prisma.recycleMarketStock.createMany({ data: DEFAULT_STOCKS });
      stocks = await prisma.recycleMarketStock.findMany({
        orderBy: { createdAt: 'asc' },
      });
    }

    res.json(stocks);
  } catch (error) {
    console.error('Error fetching market stocks:', error);
    res.status(500).json({ error: 'Failed to fetch market stocks' });
  }
});

// PATCH /api/market/stocks/:code - Update threshold, price, or add accumulated kg
router.patch('/stocks/:code', requireRole('ADMIN', 'MRF'), async (req: Request, res: Response) => {
  try {
    const code = req.params.code as string;
    const { thresholdLimitKg, marketPricePerKg, addKg, setAccumulatedKg } = req.body;

    const existing = await prisma.recycleMarketStock.findUnique({
      where: { categoryCode: code },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Market stock category not found' });
    }

    let newAccumulated = existing.accumulatedKg;
    if (typeof addKg === 'number') {
      newAccumulated += addKg;
    }
    if (typeof setAccumulatedKg === 'number') {
      newAccumulated = setAccumulatedKg;
    }

    const updated = await prisma.recycleMarketStock.update({
      where: { categoryCode: code },
      data: {
        ...(typeof thresholdLimitKg === 'number' ? { thresholdLimitKg } : {}),
        ...(typeof marketPricePerKg === 'number' ? { marketPricePerKg } : {}),
        accumulatedKg: Math.max(0, parseFloat(newAccumulated.toFixed(2))),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating market stock:', error);
    res.status(500).json({ error: 'Failed to update market stock' });
  }
});

// POST /api/market/approve-sale - Admin authorizes batch sale for MRF
router.post('/approve-sale', requireRole('ADMIN', 'MRF'), async (req: Request, res: Response) => {
  try {
    const { categoryCode, isApproved } = req.body;
    if (!categoryCode) {
      return res.status(400).json({ error: 'categoryCode is required' });
    }

    const setApproval = typeof isApproved === 'boolean' ? isApproved : true;

    const updated = await prisma.recycleMarketStock.update({
      where: { categoryCode },
      data: {
        isApprovedForSale: setApproval,
        approvedAt: setApproval ? new Date() : null,
      },
    });

    res.json({ success: true, stock: updated });
  } catch (error) {
    console.error('Error approving sale batch:', error);
    res.status(500).json({ error: 'Failed to approve sale batch' });
  }
});

// POST /api/market/sell-batch - Execute batch sale for category
router.post('/sell-batch', requireRole('ADMIN', 'MRF'), async (req: Request, res: Response) => {
  try {
    const { categoryCode, buyerName } = req.body;

    if (!categoryCode) {
      return res.status(400).json({ error: 'categoryCode is required' });
    }

    const stock = await prisma.recycleMarketStock.findUnique({
      where: { categoryCode },
    });

    if (!stock) {
      return res.status(404).json({ error: 'Market stock category not found' });
    }

    if (stock.accumulatedKg <= 0) {
      return res.status(400).json({ error: 'No accumulated weight to sell' });
    }

    // Cap sold batch weight to threshold limit (leave remainder in inventory stock)
    const weightSold = stock.accumulatedKg >= stock.thresholdLimitKg 
      ? stock.thresholdLimitKg 
      : stock.accumulatedKg;
    const remainingKg = Math.max(0, stock.accumulatedKg - weightSold);
    const pricePerKg = stock.marketPricePerKg;
    const totalRevenue = Math.round(weightSold * pricePerKg);

    // Read default vendor name from system settings
    const settings = await prisma.systemSetting.findUnique({ where: { id: 'default_setting' } });
    const buyer = (buyerName && buyerName.trim()) || settings?.defaultVendorName || 'GreenCycle Recycling Vendor';

    // 1. Create Sale Transaction Record
    const transaction = await prisma.recycleSaleTransaction.create({
      data: {
        categoryCode: stock.categoryCode,
        categoryName: stock.categoryName,
        weightKg: parseFloat(weightSold.toFixed(1)),
        marketPriceKg: pricePerKg,
        totalRevenue,
        buyerName: buyer,
        schoolYearId: await getActiveSchoolYearId(),
      },
    });

    // 2. Set remaining weight in inventory & clear approval status
    const updatedStock = await prisma.recycleMarketStock.update({
      where: { categoryCode },
      data: {
        accumulatedKg: parseFloat(remainingKg.toFixed(2)),
        isApprovedForSale: false,
        approvedAt: null,
      },
    });

    res.status(201).json({
      success: true,
      transaction,
      updatedStock,
    });
  } catch (error) {
    console.error('Error processing sell batch:', error);
    res.status(500).json({ error: 'Failed to process sell batch' });
  }
});

// GET /api/market/sales - Get all logged sales transactions (Ledger)
router.get('/sales', authenticate, async (req: Request, res: Response) => {
  try {
    const { schoolYearId } = req.query;
    const where: any = {};
    if (schoolYearId) {
      where.schoolYearId = schoolYearId as string;
    } else {
      const activeSyId = await getActiveSchoolYearId();
      if (activeSyId) where.schoolYearId = activeSyId;
    }

    const sales = await prisma.recycleSaleTransaction.findMany({
      where,
      orderBy: { soldAt: 'desc' },
    });
    res.json(sales);
  } catch (error) {
    console.error('Error fetching sales ledger:', error);
    res.status(500).json({ error: 'Failed to fetch sales ledger' });
  }
});

export default router;
