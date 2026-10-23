import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { createPollScheduler } from '../utils/pollScheduler';

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
let lastSerialized: string | null = null;
const CACHE_TTL_MS = 15000;
const listeners = new Set<() => void>();

// Ref-counted poller: starts with the first consumer and stops with the last
// (the old module-level interval ran forever, even after all views unmounted,
// and was duplicated by dev hot reloads).
const poller = createPollScheduler(() => loadSchoolYears(true), {
  intervalMs: 30_000,
  hiddenIntervalMs: 90_000,
  immediate: false,
});

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

  // Notify only when the payload actually changed, so the 30s poll does not
  // re-render every consumer with identical data.
  const serialized = JSON.stringify({ active: cache?.active ?? null, all: cache?.all ?? [] });
  if (serialized !== lastSerialized) {
    lastSerialized = serialized;
    notify();
  }
}

export function useSchoolYear() {
  const [, setTick] = useState(0);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    const rerender = () => {
      setLoading(false);
      setTick((n) => n + 1);
    };
    listeners.add(rerender);
    poller.start();

    if (!cache) {
      setLoading(true);
      loadSchoolYears()
        .catch(() => {})
        .finally(rerender);
    }

    return () => {
      listeners.delete(rerender);
      poller.stop();
    };
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
    getSchoolYearLedger,
  };
}
