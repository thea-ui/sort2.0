import { Router, Request, Response } from 'express';

import { prisma } from '../lib/prisma.js';
import { getActiveSchoolYearId } from '../services/rollover.service.js';
import { authenticate, requireAdmin, requireRole } from '../middleware/auth.js';

const router = Router();

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

// POST /api/market/approve-sale - Admin authorizes batch sale for MRF.
// Admin-only: an MRF approving its own sale would defeat the authorization gate
// (the MRF UI only ever shows "Awaiting Admin Approval").
router.post('/approve-sale', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { categoryCode, isApproved, approvalReference } = req.body;
    if (!categoryCode) {
      return res.status(400).json({ error: 'categoryCode is required' });
    }

    const setApproval = typeof isApproved === 'boolean' ? isApproved : true;

    const updated = await prisma.recycleMarketStock.update({
      where: { categoryCode },
      data: {
        isApprovedForSale: setApproval,
        approvedAt: setApproval ? new Date() : null,
        ...(approvalReference !== undefined
          ? { approvalReference: approvalReference ? String(approvalReference) : null }
          : {}),
      },
    });

    res.json({ success: true, stock: updated });
  } catch (error) {
    console.error('Error approving sale batch:', error);
    res.status(500).json({ error: 'Failed to approve sale batch' });
  }
});

// POST /api/market/sell-batch - Execute batch sale for category (admin-approved only)
router.post('/sell-batch', requireRole('ADMIN', 'MRF'), async (req: Request, res: Response) => {
  try {
    const { categoryCode, buyerName } = req.body;

    if (!categoryCode) {
      return res.status(400).json({ error: 'categoryCode is required' });
    }

    const outcome = await prisma.$transaction(async (tx) => {
      // Row lock: two concurrent sells of the same category must not both read
      // the same accumulatedKg and log duplicate revenue.
      await tx.$queryRaw`SELECT id FROM recycle_market_stocks WHERE category_code = ${categoryCode} FOR UPDATE`;

      const stock = await tx.recycleMarketStock.findUnique({
        where: { categoryCode },
      });

      if (!stock) return { status: 404 as const, error: 'Market stock category not found' };

      if (stock.accumulatedKg <= 0) {
        return { status: 400 as const, error: 'No accumulated weight to sell' };
      }

      // The admin approval is the authorization to sell: without it, an MRF
      // could liquidate inventory with no admin oversight.
      if (!stock.isApprovedForSale) {
        return {
          status: 409 as const,
          error: 'Sale not approved by an administrator',
          code: 'NOT_APPROVED',
        };
      }

      // Cap sold batch weight to threshold limit (a zero threshold means "no
      // minimum", so the whole stock is sellable).
      const weightSold = stock.thresholdLimitKg > 0 && stock.accumulatedKg >= stock.thresholdLimitKg
        ? stock.thresholdLimitKg
        : stock.accumulatedKg;
      const remainingKg = Math.max(0, stock.accumulatedKg - weightSold);
      const pricePerKg = stock.marketPricePerKg;
      const totalRevenue = Math.round(weightSold * pricePerKg);

      // Read default vendor name from system settings
      const settings = await tx.systemSetting.findUnique({ where: { id: 'default_setting' } });
      const buyer = (buyerName && buyerName.trim()) || settings?.defaultVendorName || 'GreenCycle Recycling Vendor';

      // 1. Create Sale Transaction Record
      const transaction = await tx.recycleSaleTransaction.create({
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
      const updatedStock = await tx.recycleMarketStock.update({
        where: { categoryCode },
        data: {
          accumulatedKg: parseFloat(remainingKg.toFixed(2)),
          isApprovedForSale: false,
          approvedAt: null,
        },
      });

      return { status: 201 as const, transaction, updatedStock };
    });

    if (outcome.status !== 201) {
      return res.status(outcome.status).json({ error: outcome.error, ...(outcome as any).code ? { code: (outcome as any).code } : {} });
    }

    res.status(201).json({
      success: true,
      transaction: outcome.transaction,
      updatedStock: outcome.updatedStock,
    });
  } catch (error) {
    console.error('Error processing sell batch:', error);
    res.status(500).json({ error: 'Failed to process sell batch' });
  }
});

// GET /api/market/sales - Get logged sales transactions (Ledger)
// Bounded newest-first window: ?limit=1..5000 (default 1000), ?before=ISO date.
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

    const rawLimit = Number.parseInt(String(req.query.limit ?? ''), 10);
    const take = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 5000) : 1000;

    if (typeof req.query.before === 'string') {
      const before = new Date(req.query.before);
      if (!Number.isNaN(before.getTime())) where.soldAt = { lt: before };
    }

    const sales = await prisma.recycleSaleTransaction.findMany({
      where,
      orderBy: { soldAt: 'desc' },
      take,
    });
    res.json(sales);
  } catch (error) {
    console.error('Error fetching sales ledger:', error);
    res.status(500).json({ error: 'Failed to fetch sales ledger' });
  }
});

export default router;
