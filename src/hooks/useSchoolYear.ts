import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';

export interface SchoolYear {
  id: string;
  enrollproId?: number;
  label: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isArchived: boolean;
  archivedAt?: string;
  createdAt: string;
  _count?: {
    reports: number;
    pointHistories: number;
    offenses: number;
    saleTransactions: number;
  };
}

export interface MarketStockSnapshot {
  id: string;
  schoolYearId: string;
  categoryCode: string;
  categoryName: string;
  closingKg: number;
  openingKg: number;
}

export interface UserPointSnapshot {
  id: string;
  schoolYearId: string;
  userId: string;
  closingPoints: number;
  rank?: number;
  user?: { id: string; name: string; gradeLevel?: string };
}

export interface LedgerSale {
  id: string;
  categoryCode: string;
  categoryName: string;
  weightKg: number;
  marketPriceKg: number;
  totalRevenue: number;
  buyerName: string;
  soldAt: string;
}

export interface LedgerReportRow {
  id: string;
  title: string;
  reporterName: string;
  gradeLevel?: string;
  sectionName?: string;
  locationName: string;
  category: string;
  status: string;
  urgency: string;
  weightCollected: number;
  pointsAwarded: number;
  createdAt: string;
}

export interface LedgerPointTxn {
  id: string;
  userName: string;
  gradeLevel?: string;
  amount: number;
  reason: string;
  createdAt: string;
}

export interface SchoolYearLedger {
  schoolYear: SchoolYear;
  reports: {
    total: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    collectedWeightKg: number;
    rows: LedgerReportRow[];
    rowsTruncated: boolean;
  };
  points: {
    totalAwarded: number;
    totalDeducted: number;
    topStudents: {
      rank: number;
      userId: string;
      name: string;
      gradeLevel?: string;
      sectionName?: string;
      closingPoints: number;
    }[];
    transactions: LedgerPointTxn[];
  };
  market: {
    revenuePhp: number;
    soldKg: number;
    sales: LedgerSale[];
    snapshots: { categoryCode: string; categoryName: string; openingKg: number; closingKg: number }[];
  };
}

// ── Shared cache ─────────────────────────────────────────────────────────
// Multiple components (Ledger, MRF Asset Ledger, …) consume this hook. A
// module-level cache + single poller prevents duplicate requests and request
// waterfalls while keeping every consumer in sync.

interface SchoolYearCache {
  active: SchoolYear | null;
  all: SchoolYear[];
  at: number;
}

let cache: SchoolYearCache | null = null;
let inflight: Promise<void> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
const CACHE_TTL_MS = 15000;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

async function loadSchoolYears(force = false): Promise<void> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) return;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const [active, all] = await Promise.all([
        apiService.getActiveSchoolYear().catch(() => null),
        apiService.getSchoolYears().catch(() => []),
      ]);
      cache = {
        active: active ?? null,
        all: Array.isArray(all) ? all : [],
        at: Date.now(),
      };
    } finally {
      inflight = null;
    }
  })();

  await inflight;
  notify();
}

function ensurePolling() {
  if (pollTimer !== null) return;
  pollTimer = setInterval(() => {
    void loadSchoolYears(true).catch(() => {});
  }, 30000);
}

export function useSchoolYear() {
  const [, setTick] = useState(0);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const rerender = () => {
      setLoading(false);
      setTick((n) => n + 1);
    };
    listeners.add(rerender);
    ensurePolling();

    if (!cache) {
      setLoading(true);
      loadSchoolYears()
        .catch(() => {})
        .finally(rerender);
    }

    return () => {
      listeners.delete(rerender);
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    await loadSchoolYears(true);
    setLoading(false);
  }, []);

  const createSchoolYear = useCallback(async (data: { label: string; startDate: string; endDate: string; enrollproId?: number }) => {
    try {
      setError(null);
      const result = await apiService.createSchoolYear(data);
      await loadSchoolYears(true);
      return result;
    } catch (err: any) {
      const message = err.message || 'Failed to create school year';
      setError(message);
      throw new Error(message);
    }
  }, []);

  const updateSchoolYear = useCallback(async (id: string, data: { label?: string; startDate?: string; endDate?: string }) => {
    try {
      setError(null);
      const result = await apiService.updateSchoolYear(id, data);
      await loadSchoolYears(true);
      return result;
    } catch (err: any) {
      const message = err.message || 'Failed to update school year';
      setError(message);
      throw new Error(message);
    }
  }, []);

  const activateSchoolYear = useCallback(async (id: string) => {
    try {
      setError(null);
      const result = await apiService.activateSchoolYear(id);
      await loadSchoolYears(true);
      return result;
    } catch (err: any) {
      const message = err.message || 'Failed to activate school year';
      setError(message);
      throw new Error(message);
    }
  }, []);

  const importSchoolYears = useCallback(async () => {
    try {
      setError(null);
      const result = await apiService.importSchoolYears();
      await loadSchoolYears(true);
      return result;
    } catch (err: any) {
      const message = err.message || 'Failed to import school years';
      setError(message);
      throw new Error(message);
    }
  }, []);

  const getSchoolYearDetails = useCallback(async (id: string) => {
    try {
      return await apiService.getSchoolYearDetails(id);
    } catch (err: any) {
      throw new Error(err.message || 'Failed to fetch school year details');
    }
  }, []);

  const getSchoolYearLedger = useCallback(async (id: string): Promise<SchoolYearLedger> => {
    try {
      return await apiService.getSchoolYearLedger(id);
    } catch (err: any) {
      throw new Error(err.message || 'Failed to fetch school year ledger');
    }
  }, []);

  return {
    activeSchoolYear: cache?.active ?? null,
    allSchoolYears: cache?.all ?? [],
    loading,
    error,
    refresh,
    createSchoolYear,
    updateSchoolYear,
    activateSchoolYear,
    importSchoolYears,
    getSchoolYearDetails,
    getSchoolYearLedger,
  };
}
