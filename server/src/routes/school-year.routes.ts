import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin, requireRole } from '../middleware/auth.js';
import { mirrorEnrollProSchoolYears } from '../services/enrollpro-sync.service.js';

const router = Router();
const prisma = new PrismaClient();

function getParamId(req: Request): string {
  const raw = req.params.id;
  return Array.isArray(raw) ? raw[0] : String(raw || '');
}

// ── Validation Helpers ─────────────────────────────────────────────────────

const LABEL_REGEX = /^\d{4}-\d{4}$/;

// Manual school-year creation is for real academic years, not arbitrary input.
// EnrollPro-mirrored years bypass this (they are the authoritative catalog).
const MAX_FUTURE_YEARS = 2;
const MAX_PAST_YEARS = 30;

function validateLabel(label: string): string | null {
  if (!label || typeof label !== 'string') return 'label is required';
  const trimmed = label.trim();
  if (!LABEL_REGEX.test(trimmed)) return 'label must match format YYYY-YYYY (e.g. 2026-2027)';
  const parts = trimmed.split('-');
  const startYear = parseInt(parts[0], 10);
  const endYear = parseInt(parts[1], 10);
  if (endYear !== startYear + 1) return 'second year must equal first year plus one';

  // Reject implausible labels (e.g. a typo like "2099-2100"). Without this an
  // admin can create a school year that no real data will ever belong to.
  const currentYear = new Date().getUTCFullYear();
  if (startYear > currentYear + MAX_FUTURE_YEARS) {
    return `start year ${startYear} is too far in the future (max ${currentYear + MAX_FUTURE_YEARS})`;
  }
  if (startYear < currentYear - MAX_PAST_YEARS) {
    return `start year ${startYear} is too far in the past (min ${currentYear - MAX_PAST_YEARS})`;
  }
  return null;
}

function validateDates(startDate: string, endDate: string): string | null {
  if (!startDate || !endDate) return 'startDate and endDate are required';
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime())) return 'startDate is not a valid ISO date';
  if (isNaN(end.getTime())) return 'endDate is not a valid ISO date';
  if (start >= end) return 'startDate must be before endDate';
  return null;
}

async function checkLabelUniqueness(label: string, excludeId?: string): Promise<string | null> {
  const existing = await prisma.schoolYear.findFirst({
    where: { label: label.trim(), ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return existing ? `A school year with label "${label.trim()}" already exists` : null;
}

async function checkDateOverlap(startDate: Date, endDate: Date, excludeId?: string): Promise<string | null> {
  const overlapping = await prisma.schoolYear.findFirst({
    where: {
      ...(excludeId ? { id: { not: excludeId } } : {}),
      isArchived: false,
      startDate: { lt: endDate },
      endDate: { gt: startDate },
    },
    select: { id: true, label: true },
  });
  return overlapping ? `The selected date range overlaps SY ${overlapping.label}` : null;
}

async function writeAuditLog(
  actorName: string,
  actorRole: string,
  actionType: string,
  details: string,
  schoolYearId?: string
) {
  await prisma.auditLog.create({
    data: {
      actorName,
      actorRole,
      actionType,
      details,
      schoolYearId: schoolYearId || null,
    },
  });
}

// ── Routes ─────────────────────────────────────────────────────────────────

// GET /api/school-years — List all school years with counts (admin + MRF).
//
// The MRF Asset Ledger consumes this list for its school-year dropdown. When
// the local catalog is empty we mirror EnrollPro's school-year catalog first,
// so the dropdown tracks EnrollPro without requiring a manual admin sync. A
// short cooldown prevents hammering EnrollPro while its catalog is unreachable.
let lastSchoolYearMirrorAttempt = 0;
const SCHOOL_YEAR_MIRROR_COOLDOWN_MS = 60_000;

router.get('/', requireRole('ADMIN', 'MRF'), async (_req: Request, res: Response): Promise<any> => {
  try {
    const listSchoolYears = () =>
      prisma.schoolYear.findMany({
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

    let schoolYears = await listSchoolYears();

    if (schoolYears.length === 0 && Date.now() - lastSchoolYearMirrorAttempt > SCHOOL_YEAR_MIRROR_COOLDOWN_MS) {
      lastSchoolYearMirrorAttempt = Date.now();
      await mirrorEnrollProSchoolYears().catch(() => {});
      schoolYears = await listSchoolYears();
    }

    res.json(schoolYears);
  } catch (error: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to fetch school years' } });
  }
});

// GET /api/school-years/active — Get current active school year (authenticated)
router.get('/active', authenticate, async (_req: Request, res: Response): Promise<any> => {
  try {
    // Deterministic: newest start date wins if legacy data has more than one
    // active row. Log loudly so the anomaly is visible in server logs.
    const active = await prisma.schoolYear.findMany({
      where: { isActive: true, isArchived: false },
      orderBy: { startDate: 'desc' },
    });
    if (active.length > 1) {
      console.warn(
        `[SY] ${active.length} active school years found: ${active.map((s) => s.label).join(', ')} — using "${active[0].label}"`
      );
    }
    res.json(active[0] || null);
  } catch (error: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to fetch active school year' } });
  }
});

// GET /api/school-years/:id — Get single school year with snapshot data (admin only)
router.get('/:id', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const id = getParamId(req);
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

    if (!sy) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'School year not found' } });
    res.json(sy);
  } catch (error: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to fetch school year' } });
  }
});

// POST /api/school-years — Create a new school year (admin only, creates inactive by default)
router.post('/', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const { label, startDate, endDate, enrollproId } = req.body;

    // Validate label
    const labelError = validateLabel(label);
    if (labelError) return res.status(400).json({ error: { code: 'INVALID_LABEL', message: labelError } });

    // Validate dates
    const dateError = validateDates(startDate, endDate);
    if (dateError) return res.status(400).json({ error: { code: 'INVALID_DATES', message: dateError } });

    const trimmedLabel = label.trim();
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Check label uniqueness
    const dupError = await checkLabelUniqueness(trimmedLabel);
    if (dupError) return res.status(409).json({ error: { code: 'DUPLICATE_LABEL', message: dupError } });

    // Check date overlap
    const overlapError = await checkDateOverlap(start, end);
    if (overlapError) return res.status(409).json({ error: { code: 'DATE_OVERLAP', message: overlapError } });

    // Validate enrollproId if provided
    if (enrollproId !== undefined && enrollproId !== null) {
      if (typeof enrollproId !== 'number' || enrollproId <= 0) {
        return res.status(400).json({ error: { code: 'INVALID_ENROLLPRO_ID', message: 'enrollproId must be a positive number' } });
      }
      const existingEp = await prisma.schoolYear.findUnique({ where: { enrollproId } });
      if (existingEp) {
        return res.status(409).json({ error: { code: 'DUPLICATE_ENROLLPRO_ID', message: `A school year with EnrollPro ID ${enrollproId} already exists` } });
      }
    }

    // Create inactive by default (never silently activate)
    const sy = await prisma.schoolYear.create({
      data: {
        label: trimmedLabel,
        enrollproId: enrollproId || null,
        startDate: start,
        endDate: end,
        isActive: false,
        isArchived: false,
      },
    });

    const actorName = (req as any).userName || 'Admin';
    await writeAuditLog(actorName, 'ADMIN', 'SCHOOL_YEAR_CREATED', `Created school year "${trimmedLabel}" (inactive)`, sy.id);

    res.status(201).json(sy);
  } catch (error: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to create school year' } });
  }
});

// PATCH /api/school-years/:id — Edit non-archived year fields (admin only)
router.patch('/:id', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const id = getParamId(req);
    const { label, startDate, endDate } = req.body;

    const sy = await prisma.schoolYear.findUnique({ where: { id } });
    if (!sy) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'School year not found' } });
    if (sy.isArchived) return res.status(400).json({ error: { code: 'ARCHIVED_IMMUTABLE', message: 'Archived school years cannot be edited' } });

    const updates: any = {};

    if (label !== undefined) {
      const labelError = validateLabel(label);
      if (labelError) return res.status(400).json({ error: { code: 'INVALID_LABEL', message: labelError } });
      const trimmedLabel = label.trim();
      const dupError = await checkLabelUniqueness(trimmedLabel, id);
      if (dupError) return res.status(409).json({ error: { code: 'DUPLICATE_LABEL', message: dupError } });
      updates.label = trimmedLabel;
    }

    if (startDate !== undefined || endDate !== undefined) {
      const newStart = startDate ? new Date(startDate) : new Date(sy.startDate);
      const newEnd = endDate ? new Date(endDate) : new Date(sy.endDate);
      const dateError = validateDates(newStart.toISOString(), newEnd.toISOString());
      if (dateError) return res.status(400).json({ error: { code: 'INVALID_DATES', message: dateError } });
      const overlapError = await checkDateOverlap(newStart, newEnd, id);
      if (overlapError) return res.status(409).json({ error: { code: 'DATE_OVERLAP', message: overlapError } });
      updates.startDate = newStart;
      updates.endDate = newEnd;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { code: 'NO_CHANGES', message: 'No valid fields to update' } });
    }

    const updated = await prisma.schoolYear.update({ where: { id }, data: updates });

    const actorName = (req as any).userName || 'Admin';
    const changes = Object.keys(updates).join(', ');
    await writeAuditLog(actorName, 'ADMIN', 'SCHOOL_YEAR_UPDATED', `Updated ${changes} for "${updated.label}"`, id);

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to update school year' } });
  }
});

// POST /api/school-years/:id/activate — Atomically make one year active (admin only)
router.post('/:id/activate', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const id = getParamId(req);

    const sy = await prisma.schoolYear.findUnique({ where: { id } });
    if (!sy) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'School year not found' } });
    if (sy.isArchived) return res.status(400).json({ error: { code: 'ARCHIVED_IMMUTABLE', message: 'Cannot activate an archived school year' } });
    if (sy.isActive) return res.status(400).json({ error: { code: 'ALREADY_ACTIVE', message: 'School year is already active' } });

    // Atomic: snapshot + reset outgoing market stock, deactivate current, activate target
    const result = await prisma.$transaction(async (tx) => {
      const currentActive = await tx.schoolYear.findFirst({
        where: { isActive: true, isArchived: false },
      });

      // Archive the outgoing year's recyclable closing balances, then empty the
      // live stock so the new year starts at zero (see rollover.service.ts step 7).
      if (currentActive) {
        const marketStocks = await tx.recycleMarketStock.findMany();
        for (const stock of marketStocks) {
          if (stock.accumulatedKg > 0) {
            await tx.marketStockSnapshot.upsert({
              where: {
                schoolYearId_categoryCode: {
                  schoolYearId: currentActive.id,
                  categoryCode: stock.categoryCode,
                },
              },
              update: { closingKg: stock.accumulatedKg },
              create: {
                schoolYearId: currentActive.id,
                categoryCode: stock.categoryCode,
                categoryName: stock.categoryName,
                closingKg: stock.accumulatedKg,
                openingKg: 0,
              },
            });
          }
        }
        await tx.recycleMarketStock.updateMany({
          data: { accumulatedKg: 0, isApprovedForSale: false, approvedAt: null },
        });
      }

      // Deactivate current active year
      await tx.schoolYear.updateMany({
        where: { isActive: true, isArchived: false },
        data: { isActive: false },
      });

      // Activate target year
      return tx.schoolYear.update({
        where: { id },
        data: { isActive: true },
      });
    });

    const actorName = (req as any).userName || 'Admin';
    await writeAuditLog(actorName, 'ADMIN', 'SCHOOL_YEAR_ACTIVATED', `Activated school year "${result.label}"`, id);

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to activate school year' } });
  }
});

// GET /api/school-years/:id/ledger — full transparency ledger for a year (admin only)
router.get('/:id/ledger', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const id = getParamId(req);
    const sy = await prisma.schoolYear.findUnique({ where: { id } });
    if (!sy) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'School year not found' } });

    const [
      statusGroups,
      categoryGroups,
      reportAgg,
      awardedAgg,
      deductedAgg,
      pointSnapshots,
      reportRows,
      pointRows,
      sales,
      snapshots,
    ] = await Promise.all([
      prisma.report.groupBy({ by: ['status'], where: { schoolYearId: id }, _count: { _all: true } }),
      prisma.report.groupBy({ by: ['category'], where: { schoolYearId: id }, _count: { _all: true } }),
      prisma.report.aggregate({ where: { schoolYearId: id }, _sum: { weightCollected: true } }),
      prisma.pointHistory.aggregate({ where: { schoolYearId: id, amount: { gt: 0 } }, _sum: { amount: true } }),
      prisma.pointHistory.aggregate({ where: { schoolYearId: id, amount: { lt: 0 } }, _sum: { amount: true } }),
      prisma.userPointSnapshot.findMany({
        where: { schoolYearId: id },
        include: { user: { select: { id: true, name: true, gradeLevel: true, sectionName: true } } },
        orderBy: { closingPoints: 'desc' },
        take: 20,
      }),
      prisma.report.findMany({
        where: { schoolYearId: id },
        orderBy: { createdAt: 'desc' },
        take: 1000,
        select: {
          id: true,
          title: true,
          category: true,
          status: true,
          urgency: true,
          weightCollected: true,
          pointsAwarded: true,
          createdAt: true,
          locationName: true,
          reporter: { select: { name: true, gradeLevel: true, sectionName: true } },
        },
      }),
      prisma.pointHistory.findMany({
        where: { schoolYearId: id },
        orderBy: { createdAt: 'desc' },
        take: 1000,
        include: { user: { select: { name: true, gradeLevel: true } } },
      }),
      prisma.recycleSaleTransaction.findMany({ where: { schoolYearId: id }, orderBy: { soldAt: 'desc' } }),
      prisma.marketStockSnapshot.findMany({ where: { schoolYearId: id }, orderBy: { categoryName: 'asc' } }),
    ]);

    const revenuePhp = sales.reduce((sum, t) => sum + t.totalRevenue, 0);
    const soldKg = sales.reduce((sum, t) => sum + t.weightKg, 0);

    res.json({
      schoolYear: {
        id: sy.id,
        label: sy.label,
        startDate: sy.startDate,
        endDate: sy.endDate,
        isActive: sy.isActive,
        isArchived: sy.isArchived,
        archivedAt: sy.archivedAt,
        enrollproId: sy.enrollproId,
      },
      reports: {
        total: statusGroups.reduce((sum, g) => sum + g._count._all, 0),
        byStatus: Object.fromEntries(statusGroups.map((g) => [g.status, g._count._all])),
        byCategory: Object.fromEntries(categoryGroups.map((g) => [g.category, g._count._all])),
        collectedWeightKg: reportAgg._sum.weightCollected || 0,
        rows: reportRows.map((r) => ({
          id: r.id,
          title: r.title,
          reporterName: r.reporter?.name || 'Unknown',
          gradeLevel: r.reporter?.gradeLevel,
          sectionName: r.reporter?.sectionName,
          locationName: r.locationName,
          category: r.category,
          status: r.status,
          urgency: r.urgency,
          weightCollected: r.weightCollected || 0,
          pointsAwarded: r.pointsAwarded,
          createdAt: r.createdAt,
        })),
        rowsTruncated: reportRows.length >= 1000,
      },
      points: {
        totalAwarded: awardedAgg._sum.amount || 0,
        totalDeducted: Math.abs(deductedAgg._sum.amount || 0),
        topStudents: pointSnapshots.map((p, idx) => ({
          rank: p.rank ?? idx + 1,
          userId: p.userId,
          name: p.user?.name || 'Unknown',
          gradeLevel: p.user?.gradeLevel,
          sectionName: p.user?.sectionName,
          closingPoints: p.closingPoints,
        })),
        transactions: pointRows.map((p) => ({
          id: p.id,
          userName: p.user?.name || 'Unknown',
          gradeLevel: p.user?.gradeLevel,
          amount: p.amount,
          reason: p.reason,
          createdAt: p.createdAt,
        })),
      },
      market: {
        revenuePhp,
        soldKg,
        sales: sales.map((t) => ({
          id: t.id,
          categoryCode: t.categoryCode,
          categoryName: t.categoryName,
          weightKg: t.weightKg,
          marketPriceKg: t.marketPriceKg,
          totalRevenue: t.totalRevenue,
          buyerName: t.buyerName,
          soldAt: t.soldAt,
        })),
        snapshots: snapshots.map((s) => ({
          categoryCode: s.categoryCode,
          categoryName: s.categoryName,
          openingKg: s.openingKg,
          closingKg: s.closingKg,
        })),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to build school year ledger' } });
  }
});

export default router;
