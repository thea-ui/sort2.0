import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireRole, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { getActiveSchoolYearId } from '../services/rollover.service.js';

const router = Router();
const prisma = new PrismaClient();

// Per-item scrap lifecycle. AWAITING_WEIGHT is the "unweighed" state.
const OPEN_ITEM_STATUSES = ['AWAITING_WEIGHT', 'IN_STOCK'] as const;

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

// GET /api/asset-scrap/items — per-item scrap records (optionally filtered)
router.get('/items', authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const { status, materialCode, sourceAssetId, sourceReportId, schoolYearId } = req.query;
    const where: any = {};
    if (typeof status === 'string' && status) {
      const list = status.split(',').map((s) => s.trim()).filter(Boolean);
      where.status = list.length > 1 ? { in: list } : list[0];
    }
    if (typeof materialCode === 'string' && materialCode) where.materialCode = materialCode;
    if (typeof sourceAssetId === 'string' && sourceAssetId) where.sourceAssetId = sourceAssetId;
    if (typeof sourceReportId === 'string' && sourceReportId) where.sourceReportId = sourceReportId;
    if (typeof schoolYearId === 'string' && schoolYearId) where.schoolYearId = schoolYearId;

    const items = await prisma.assetScrapItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch scrap items' });
  }
});

// POST /api/asset-scrap/items — log a scrap item, weighed (IN_STOCK) or unweighed (AWAITING_WEIGHT)
router.post('/items', requireRole('MRF', 'ADMIN'), async (req: Request, res: Response): Promise<any> => {
  try {
    const { materialCode, weightKg, status, description, sourceAssetId, sourceReportId } = req.body;
    if (!materialCode) return res.status(400).json({ error: 'materialCode is required' });

    const stock = await prisma.assetScrapStock.findUnique({ where: { materialCode: String(materialCode) } });
    if (!stock) return res.status(404).json({ error: 'Scrap material not found' });

    const hasWeight = weightKg !== undefined && weightKg !== null && weightKg !== '';
    const parsedWeight = hasWeight ? Number(weightKg) : null;
    if (parsedWeight !== null && (!Number.isFinite(parsedWeight) || parsedWeight <= 0)) {
      return res.status(400).json({ error: 'weightKg must be a positive number' });
    }

    if (status !== undefined && !OPEN_ITEM_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${OPEN_ITEM_STATUSES.join(', ')}` });
    }
    const resolved = status || (parsedWeight !== null ? 'IN_STOCK' : 'AWAITING_WEIGHT');
    if (resolved === 'IN_STOCK' && parsedWeight === null) {
      return res.status(400).json({ error: 'weightKg is required to add an item to stock' });
    }
    const weighed = resolved === 'IN_STOCK';

    const item = await prisma.assetScrapItem.create({
      data: {
        materialCode: stock.materialCode,
        materialName: stock.materialName,
        weightKg: weighed ? parsedWeight : null,
        status: resolved,
        description: description ? String(description).trim() : null,
        sourceAssetId: sourceAssetId || null,
        sourceReportId: sourceReportId || null,
        weighedBy: weighed ? ((req as AuthenticatedRequest).userName || null) : null,
        weighedAt: weighed ? new Date() : null,
        schoolYearId: await getActiveSchoolYearId(),
      },
    });

    if (weighed && parsedWeight) {
      await prisma.assetScrapStock.update({
        where: { materialCode: stock.materialCode },
        data: { accumulatedKg: Math.max(0, parseFloat((stock.accumulatedKg + parsedWeight).toFixed(2))) },
      });
    }

    res.status(201).json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create scrap item' });
  }
});

// PATCH /api/asset-scrap/items/:id/weigh — set/correct the weight of a logged item
router.patch('/items/:id/weigh', requireRole('MRF', 'ADMIN'), async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const weight = Number(req.body?.weightKg);
    if (!Number.isFinite(weight) || weight <= 0) {
      return res.status(400).json({ error: 'weightKg must be a positive number' });
    }

    const item = await prisma.assetScrapItem.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'Scrap item not found' });
    if (!OPEN_ITEM_STATUSES.includes(item.status as any)) {
      return res.status(400).json({ error: 'This scrap item is already closed (sold or disposed)' });
    }

    const delta = weight - (item.weightKg || 0);
    const updated = await prisma.assetScrapItem.update({
      where: { id },
      data: {
        weightKg: parseFloat(weight.toFixed(2)),
        status: 'IN_STOCK',
        weighedBy: (req as AuthenticatedRequest).userName || null,
        weighedAt: new Date(),
      },
    });

    if (delta !== 0) {
      const stock = await prisma.assetScrapStock.findUnique({ where: { materialCode: item.materialCode } });
      if (stock) {
        await prisma.assetScrapStock.update({
          where: { materialCode: item.materialCode },
          data: { accumulatedKg: Math.max(0, parseFloat((stock.accumulatedKg + delta).toFixed(2))) },
        });
      }
    }

    res.json({ success: true, item: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to weigh scrap item' });
  }
});

// PATCH /api/asset-scrap/items/:id/dispose — route an item to an accredited handler
router.patch('/items/:id/dispose', requireRole('MRF', 'ADMIN'), async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const item = await prisma.assetScrapItem.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'Scrap item not found' });
    if (!OPEN_ITEM_STATUSES.includes(item.status as any)) {
      return res.status(400).json({ error: 'This scrap item is already closed (sold or disposed)' });
    }

    // Disposing removes any in-stock weight from the sellable stockpile.
    if (item.status === 'IN_STOCK' && (item.weightKg || 0) > 0) {
      const stock = await prisma.assetScrapStock.findUnique({ where: { materialCode: item.materialCode } });
      if (stock) {
        await prisma.assetScrapStock.update({
          where: { materialCode: item.materialCode },
          data: { accumulatedKg: Math.max(0, parseFloat((stock.accumulatedKg - (item.weightKg || 0)).toFixed(2))) },
        });
      }
    }

    const updated = await prisma.assetScrapItem.update({
      where: { id },
      data: {
        status: 'DISPOSED',
        disposedBy: (req as AuthenticatedRequest).userName || null,
        disposedAt: new Date(),
        disposalReference: req.body?.disposalReference ? String(req.body.disposalReference).trim() : item.disposalReference,
      },
    });

    res.json({ success: true, item: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to dispose scrap item' });
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

    const { transaction, updatedStock } = await prisma.$transaction(async (tx) => {
      const txRecord = await tx.assetScrapSaleTransaction.create({
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

      // Consume in-stock items FIFO so each sale keeps its batch provenance.
      // When an item is only partly needed, split it: the sold portion is marked
      // SOLD and the remainder stays IN_STOCK, so item sums always reconcile
      // with the stock total (no orphaned partial weights).
      const items = await tx.assetScrapItem.findMany({
        where: { materialCode, status: 'IN_STOCK' },
        orderBy: { createdAt: 'asc' },
      });
      let remainingToConsume = weightSold;
      for (const item of items) {
        if (remainingToConsume <= 0) break;
        const itemKg = item.weightKg || 0;
        if (itemKg <= 0) continue;

        if (itemKg <= remainingToConsume) {
          await tx.assetScrapItem.update({
            where: { id: item.id },
            data: { status: 'SOLD', saleTransactionId: txRecord.id },
          });
          remainingToConsume -= itemKg;
        } else {
          const soldPart = parseFloat(remainingToConsume.toFixed(2));
          await tx.assetScrapItem.update({
            where: { id: item.id },
            data: { weightKg: soldPart, status: 'SOLD', saleTransactionId: txRecord.id },
          });
          await tx.assetScrapItem.create({
            data: {
              materialCode: item.materialCode,
              materialName: item.materialName,
              weightKg: parseFloat((itemKg - soldPart).toFixed(2)),
              status: 'IN_STOCK',
              description: item.description,
              sourceAssetId: item.sourceAssetId,
              sourceReportId: item.sourceReportId,
              weighedBy: item.weighedBy,
              weighedAt: item.weighedAt,
              schoolYearId: item.schoolYearId,
            },
          });
          remainingToConsume = 0;
        }
      }

      const txStock = await tx.assetScrapStock.update({
        where: { materialCode },
        data: {
          accumulatedKg: parseFloat(remainingKg.toFixed(2)),
          isApprovedForSale: false,
          approvedAt: null,
          approvalReference: null,
        },
      });

      return { transaction: txRecord, updatedStock: txStock };
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
