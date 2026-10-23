import { useState, useEffect, useMemo } from 'react';
import { apiService } from '../services/api';
import { createPollScheduler } from '../utils/pollScheduler';

export interface MarketStockItem {
  id?: string;
  categoryCode: string;
  categoryName: string;
  shortName: string;
  thresholdLimitKg: number;
  marketPricePerKg: number;
  accumulatedKg: number;
  isApprovedForSale?: boolean;
  approvedAt?: string | null;
  approvalReference?: string | null;
}

export interface SaleTransaction {
  id: string;
  categoryCode: string;
  categoryName: string;
  weightKg: number;
  marketPriceKg: number;
  totalRevenue: number;
  buyerName: string;
  soldAt: string;
}

const MARKET_STORAGE_VERSION = 'sort_v13_clean_stocks';
const STOCKS_KEY = 'sort_market_stocks';
const SALES_KEY = 'sort_market_sales';
const MARKET_UPDATED_EVENT = 'sort_market_updated';

const POLL_INTERVAL_MS = 15_000;
const POLL_HIDDEN_INTERVAL_MS = 60_000;

const DEFAULT_STOCKS_RECORD: Record<string, MarketStockItem> = {
  pet_plastic: { categoryCode: 'pet_plastic', categoryName: 'PET Plastic Bottles', shortName: 'PET Bottles', thresholdLimitKg: 50.0, marketPricePerKg: 18, accumulatedKg: 0.0, isApprovedForSale: false },
  aluminum_cans: { categoryCode: 'aluminum_cans', categoryName: 'Aluminum & Metal Cans', shortName: 'Aluminum Cans', thresholdLimitKg: 30.0, marketPricePerKg: 45, accumulatedKg: 0.0, isApprovedForSale: false },
  cardboard: { categoryCode: 'cardboard', categoryName: 'Cardboard & Paper', shortName: 'Cardboard', thresholdLimitKg: 60.0, marketPricePerKg: 12, accumulatedKg: 0.0, isApprovedForSale: false },
  glass: { categoryCode: 'glass', categoryName: 'Glass Bottles & Containers', shortName: 'Glass Bottles', thresholdLimitKg: 40.0, marketPricePerKg: 15, accumulatedKg: 0.0, isApprovedForSale: false },
};

const DEFAULT_SALES: SaleTransaction[] = [];

interface MarketCache {
  stocksRecord: Record<string, MarketStockItem>;
  salesHistory: SaleTransaction[];
  reservePercent: number;
}

// ── Shared store ─────────────────────────────────────────────────────────
// One cache + one ref-counted poller for every consumer (MRF market tab,
// admin collections/impact, ...). Consumers re-render only when data changes
// and localStorage is written only on real changes — not on a timer.

let cache: MarketCache | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function loadCache(): MarketCache {
  if (cache) return cache;

  let stocksRecord = DEFAULT_STOCKS_RECORD;
  let salesHistory = DEFAULT_SALES;
  try {
    const version = localStorage.getItem('sort_market_version');
    if (version !== MARKET_STORAGE_VERSION) {
      localStorage.setItem('sort_market_version', MARKET_STORAGE_VERSION);
      localStorage.setItem(STOCKS_KEY, JSON.stringify(DEFAULT_STOCKS_RECORD));
      localStorage.setItem(SALES_KEY, JSON.stringify(DEFAULT_SALES));
    } else {
      const storedStocks = localStorage.getItem(STOCKS_KEY);
      if (storedStocks) stocksRecord = JSON.parse(storedStocks);
      const storedSales = localStorage.getItem(SALES_KEY);
      if (storedSales) salesHistory = JSON.parse(storedSales);
    }
  } catch {
    // Corrupt cache: fall back to defaults; the server fetch will replace them.
  }

  cache = { stocksRecord, salesHistory, reservePercent: 20 };
  return cache;
}

async function fetchMarketData(): Promise<void> {
  if (inflight) return inflight;
  const current = loadCache();

  inflight = (async () => {
    // Parallel fetches: no request waterfall, each failure isolated.
    const [stocksResult, salesResult, settingsResult] = await Promise.allSettled([
      apiService.getMarketStocks(),
      apiService.getMarketSales(),
      apiService.getSettings(),
    ]);

    const next: MarketCache = { ...current };
    let changed = false;

    if (stocksResult.status === 'fulfilled' && Array.isArray(stocksResult.value) && stocksResult.value.length > 0) {
      // The server list is authoritative: rebuilding from it (instead of
      // merging into the previous record) removes categories that were
      // deleted or renamed server-side.
      const rec: Record<string, MarketStockItem> = {};
      stocksResult.value.forEach((s: any) => {
        rec[s.categoryCode] = s;
      });
      if (JSON.stringify(rec) !== JSON.stringify(current.stocksRecord)) {
        next.stocksRecord = rec;
        changed = true;
      }
    } else if (stocksResult.status === 'rejected') {
      console.warn('Failed to fetch market stocks from server API:', stocksResult.reason);
    }

    if (salesResult.status === 'fulfilled' && Array.isArray(salesResult.value)) {
      const formatted = salesResult.value.map((st: any) => ({
        id: st.id,
        categoryCode: st.categoryCode,
        categoryName: st.categoryName,
        weightKg: st.weightKg,
        marketPriceKg: st.marketPriceKg,
        totalRevenue: st.totalRevenue,
        buyerName: st.buyerName,
        soldAt: typeof st.soldAt === 'string' ? st.soldAt.replace('T', ' ').substring(0, 16) : new Date(st.soldAt).toISOString().replace('T', ' ').substring(0, 16),
      }));
      if (JSON.stringify(formatted) !== JSON.stringify(current.salesHistory)) {
        next.salesHistory = formatted;
        changed = true;
      }
    } else if (salesResult.status === 'rejected') {
      console.warn('Failed to fetch sales history from server API:', salesResult.reason);
    }

    if (settingsResult.status === 'fulfilled') {
      // 0 is a legitimate reserve percentage; only null/undefined keep the default.
      const settings: any = settingsResult.value;
      const reserve = settings?.rewardsReservePercent;
      if (reserve !== undefined && reserve !== null && reserve !== current.reservePercent) {
        next.reservePercent = reserve;
        changed = true;
      }
    }

    cache = next;

    if (changed) {
      // Persist only on change; storage quota failures keep memory authoritative.
      try {
        localStorage.setItem(STOCKS_KEY, JSON.stringify(next.stocksRecord));
        localStorage.setItem(SALES_KEY, JSON.stringify(next.salesHistory));
      } catch {
        /* quota: in-memory state remains authoritative */
      }
      notify();
    }
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

const poller = createPollScheduler(fetchMarketData, {
  intervalMs: POLL_INTERVAL_MS,
  hiddenIntervalMs: POLL_HIDDEN_INTERVAL_MS,
  immediate: false,
});

function broadcastChange(): void {
  // Same-tab listeners + the cross-tab channel. No synthetic storage events:
  // those used to wake every storage listener in this tab (reload storm).
  window.dispatchEvent(new CustomEvent(MARKET_UPDATED_EVENT));
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const ch = new BroadcastChannel('sort_market_channel');
      ch.postMessage({ type: 'MARKET_UPDATED', timestamp: Date.now() });
      ch.close();
    } catch {
      /* channel unavailable */
    }
  }
}

function patchStockLocally(categoryCode: string, patch: Partial<MarketStockItem>): void {
  const current = loadCache();
  const item = current.stocksRecord[categoryCode];
  if (!item) return;
  cache = {
    ...current,
    stocksRecord: { ...current.stocksRecord, [categoryCode]: { ...item, ...patch } },
  };
  notify();
}

export function useRecycleMarket() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const rerender = () => setTick((n) => n + 1);
    listeners.add(rerender);
    poller.start();

    const handleUpdate = () => {
      void fetchMarketData();
    };
    window.addEventListener(MARKET_UPDATED_EVENT, handleUpdate);

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel('sort_market_channel');
        channel.onmessage = handleUpdate;
      } catch {
        /* channel unavailable */
      }
    }

    if (!cache) void fetchMarketData();

    return () => {
      listeners.delete(rerender);
      poller.stop();
      window.removeEventListener(MARKET_UPDATED_EVENT, handleUpdate);
      if (channel) channel.close();
    };
  }, []);

  const state = loadCache();

  // Actions
  const approveSaleBatch = async (
    categoryCode: string,
    isApproved: boolean = true,
    approvalReference?: string,
  ) => {
    // No local fallback: silently flipping local approval while the server
    // rejects the request would show an approval that does not exist (and the
    // MRF's sale would then fail server-side).
    await apiService.approveMarketSale({ categoryCode, isApproved, approvalReference });
    await fetchMarketData();
    broadcastChange();
  };

  const sellBatch = async (categoryCode: string, buyerName?: string) => {
    const currentItem = state.stocksRecord[categoryCode];
    if (!currentItem || currentItem.accumulatedKg <= 0) return null;

    // No fabricated local transaction: the callers display the returned sale as
    // revenue, so a failed API call must reject instead of inventing one.
    const res = await apiService.sellMarketBatch({ categoryCode, buyerName });
    if (!res || !res.transaction) {
      throw new Error('The vendor sale was not recorded by the server.');
    }
    await fetchMarketData();
    broadcastChange();
    return res.transaction;
  };

  const addStockKg = async (categoryCode: string, addKg: number) => {
    if (addKg <= 0) return;
    if (!categoryCode || typeof categoryCode !== 'string') return;

    try {
      await apiService.updateMarketStock(categoryCode, { addKg });
      await fetchMarketData();
      broadcastChange();
    } catch (err) {
      console.error('Failed to add stock kg via API:', err);
      const item = loadCache().stocksRecord[categoryCode];
      if (item) patchStockLocally(categoryCode, { accumulatedKg: item.accumulatedKg + addKg });
      broadcastChange();
    }
  };

  const updateThresholdOrPrice = async (
    categoryCode: string,
    thresholdLimitKg?: number,
    marketPricePerKg?: number
  ) => {
    try {
      await apiService.updateMarketStock(categoryCode, { thresholdLimitKg, marketPricePerKg });
      await fetchMarketData();
      broadcastChange();
    } catch (err) {
      console.error('Failed to update threshold/price via API:', err);
      patchStockLocally(categoryCode, {
        ...(typeof thresholdLimitKg === 'number' ? { thresholdLimitKg } : {}),
        ...(typeof marketPricePerKg === 'number' ? { marketPricePerKg } : {}),
      });
      broadcastChange();
    }
  };

  // Calculations
  const totalVendorSales = useMemo(() => {
    return state.salesHistory.reduce((sum, tx) => sum + (tx.totalRevenue || 0), 0);
  }, [state.salesHistory]);

  const rewardsReservedPhp = useMemo(() => {
    return Math.round(totalVendorSales * (state.reservePercent / 100));
  }, [totalVendorSales, state.reservePercent]);

  const categoryRevenueMap = useMemo(() => {
    const map: Record<string, number> = {};
    state.salesHistory.forEach((tx) => {
      map[tx.categoryCode] = (map[tx.categoryCode] || 0) + tx.totalRevenue;
    });
    return map;
  }, [state.salesHistory]);

  return {
    stocksRecord: state.stocksRecord,
    salesHistory: state.salesHistory,
    totalVendorSales,
    rewardsReservedPhp,
    categoryRevenueMap,
    approveSaleBatch,
    sellBatch,
    addStockKg,
    updateThresholdOrPrice,
    reloadMarketData: fetchMarketData,
  };
}
