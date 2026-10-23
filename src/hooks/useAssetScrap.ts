import { useState, useEffect, useMemo } from 'react';
import { apiService } from '../services/api';
import { createPollScheduler } from '../utils/pollScheduler';

export interface ScrapStockItem {
  id?: string;
  materialCode: string;
  materialName: string;
  thresholdLimitKg: number;
  marketPricePerKg: number;
  accumulatedKg: number;
  isApprovedForSale?: boolean;
  approvalReference?: string | null;
  approvedAt?: string | null;
  hazmat?: boolean;
}

export type ScrapItemStatus = 'AWAITING_WEIGHT' | 'IN_STOCK' | 'SOLD' | 'DISPOSED';

export interface ScrapItem {
  id: string;
  materialCode: string;
  materialName: string;
  weightKg: number | null;
  status: ScrapItemStatus;
  description?: string | null;
  sourceAssetId?: string | null;
  sourceReportId?: string | null;
  weighedBy?: string | null;
  weighedAt?: string | null;
  saleTransactionId?: string | null;
  disposedBy?: string | null;
  disposedAt?: string | null;
  disposalReference?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScrapItemInput {
  materialCode: string;
  weightKg?: number;
  status?: 'AWAITING_WEIGHT' | 'IN_STOCK';
  description?: string;
  sourceAssetId?: string;
  sourceReportId?: string;
}

export interface ScrapSaleTransaction {
  id: string;
  materialCode: string;
  materialName: string;
  weightKg: number;
  marketPriceKg: number;
  totalRevenue: number;
  buyerName: string;
  approvalReference?: string | null;
  soldAt: string;
}

const DEFAULT_SCRAP: Record<string, ScrapStockItem> = {
  ferrous_metal: { materialCode: 'ferrous_metal', materialName: 'Ferrous Metal (Steel / Iron)', thresholdLimitKg: 50, marketPricePerKg: 12, accumulatedKg: 0, isApprovedForSale: false, hazmat: false },
  non_ferrous_metal: { materialCode: 'non_ferrous_metal', materialName: 'Non-Ferrous Metal (Aluminum / Copper)', thresholdLimitKg: 20, marketPricePerKg: 55, accumulatedKg: 0, isApprovedForSale: false, hazmat: false },
  e_waste: { materialCode: 'e_waste', materialName: 'E-Waste (Electronics)', thresholdLimitKg: 20, marketPricePerKg: 20, accumulatedKg: 0, isApprovedForSale: false, hazmat: true },
  plastic: { materialCode: 'plastic', materialName: 'Hard Plastic', thresholdLimitKg: 40, marketPricePerKg: 8, accumulatedKg: 0, isApprovedForSale: false, hazmat: false },
  wood: { materialCode: 'wood', materialName: 'Wood / Lumber', thresholdLimitKg: 60, marketPricePerKg: 3, accumulatedKg: 0, isApprovedForSale: false, hazmat: false },
  glass: { materialCode: 'glass', materialName: 'Glass', thresholdLimitKg: 40, marketPricePerKg: 5, accumulatedKg: 0, isApprovedForSale: false, hazmat: false },
  mixed: { materialCode: 'mixed', materialName: 'Mixed / Other Scrap', thresholdLimitKg: 50, marketPricePerKg: 5, accumulatedKg: 0, isApprovedForSale: false, hazmat: false },
};

const SCRAP_UPDATED_EVENT = 'sort_scrap_updated';
const POLL_INTERVAL_MS = 30_000;
const POLL_HIDDEN_INTERVAL_MS = 90_000;

interface ScrapCache {
  stocksRecord: Record<string, ScrapStockItem>;
  salesHistory: ScrapSaleTransaction[];
  items: ScrapItem[];
}

// ── Shared store ─────────────────────────────────────────────────────────
// One cache + one ref-counted poller for every consumer (MRF dashboard and
// the scrap stock tab used to mount two independent 10s pollers). No
// localStorage here: the data is server-backed, and writes are change-gated.

let cache: ScrapCache | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function loadCache(): ScrapCache {
  if (!cache) {
    cache = { stocksRecord: DEFAULT_SCRAP, salesHistory: [], items: [] };
  }
  return cache;
}

async function fetchScrapData(): Promise<void> {
  if (inflight) return inflight;
  const current = loadCache();

  inflight = (async () => {
    const [stocksResult, salesResult, itemsResult] = await Promise.allSettled([
      apiService.getAssetScrapStocks(),
      apiService.getAssetScrapSales(),
      apiService.getAssetScrapItems(),
    ]);

    const next: ScrapCache = { ...current };
    let changed = false;

    if (stocksResult.status === 'fulfilled' && Array.isArray(stocksResult.value) && stocksResult.value.length > 0) {
      const rec: Record<string, ScrapStockItem> = {};
      stocksResult.value.forEach((s: any) => {
        rec[s.materialCode] = s;
      });
      if (JSON.stringify(rec) !== JSON.stringify(current.stocksRecord)) {
        next.stocksRecord = rec;
        changed = true;
      }
    } else if (stocksResult.status === 'rejected') {
      console.warn('Failed to fetch scrap stocks:', stocksResult.reason);
    }

    if (salesResult.status === 'fulfilled' && Array.isArray(salesResult.value)) {
      const formatted = salesResult.value.map((st: any) => ({
        id: st.id,
        materialCode: st.materialCode,
        materialName: st.materialName,
        weightKg: st.weightKg,
        marketPriceKg: st.marketPriceKg,
        totalRevenue: st.totalRevenue,
        buyerName: st.buyerName,
        approvalReference: st.approvalReference || null,
        soldAt: typeof st.soldAt === 'string' ? st.soldAt.replace('T', ' ').substring(0, 16) : new Date(st.soldAt).toISOString().replace('T', ' ').substring(0, 16),
      }));
      if (JSON.stringify(formatted) !== JSON.stringify(current.salesHistory)) {
        next.salesHistory = formatted;
        changed = true;
      }
    } else if (salesResult.status === 'rejected') {
      console.warn('Failed to fetch scrap sales:', salesResult.reason);
    }

    if (itemsResult.status === 'fulfilled' && Array.isArray(itemsResult.value)) {
      if (JSON.stringify(itemsResult.value) !== JSON.stringify(current.items)) {
        next.items = itemsResult.value as ScrapItem[];
        changed = true;
      }
    } else if (itemsResult.status === 'rejected') {
      console.warn('Failed to fetch scrap items:', itemsResult.reason);
    }

    cache = next;
    if (changed) notify();
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

const poller = createPollScheduler(fetchScrapData, {
  intervalMs: POLL_INTERVAL_MS,
  hiddenIntervalMs: POLL_HIDDEN_INTERVAL_MS,
  immediate: false,
});

function broadcastChange(): void {
  // Same-tab custom event only; no synthetic storage events (those woke every
  // storage listener in the tab and triggered reload storms).
  window.dispatchEvent(new CustomEvent(SCRAP_UPDATED_EVENT));
}

function patchStockLocally(materialCode: string, patch: Partial<ScrapStockItem>): void {
  const current = loadCache();
  const item = current.stocksRecord[materialCode];
  if (!item) return;
  cache = {
    ...current,
    stocksRecord: { ...current.stocksRecord, [materialCode]: { ...item, ...patch } },
  };
  notify();
}

export function useAssetScrap() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const rerender = () => setTick((n) => n + 1);
    listeners.add(rerender);
    poller.start();

    const handleUpdate = () => {
      void fetchScrapData();
    };
    window.addEventListener(SCRAP_UPDATED_EVENT, handleUpdate);

    if (!cache) void fetchScrapData();

    return () => {
      listeners.delete(rerender);
      poller.stop();
      window.removeEventListener(SCRAP_UPDATED_EVENT, handleUpdate);
    };
  }, []);

  const state = loadCache();

  const addScrapKg = async (materialCode: string, addKg: number) => {
    if (!materialCode || addKg <= 0) return;
    try {
      await apiService.updateAssetScrapStock(materialCode, { addKg });
      await fetchScrapData();
      broadcastChange();
    } catch (err) {
      console.error('Failed to add scrap kg:', err);
      const item = loadCache().stocksRecord[materialCode];
      if (item) patchStockLocally(materialCode, { accumulatedKg: item.accumulatedKg + addKg });
      broadcastChange();
    }
  };

  const approveSale = async (materialCode: string, isApproved: boolean, approvalReference?: string) => {
    try {
      await apiService.approveAssetScrapSale({ materialCode, isApproved, approvalReference });
      await fetchScrapData();
      broadcastChange();
    } catch (err) {
      console.error('Failed to approve scrap sale:', err);
      throw err;
    }
  };

  const sellBatch = async (materialCode: string, buyerName?: string, approvalReference?: string) => {
    const item = state.stocksRecord[materialCode];
    if (!item || item.accumulatedKg <= 0) return null;
    try {
      const res = await apiService.sellAssetScrapBatch({ materialCode, buyerName, approvalReference });
      if (res?.transaction) {
        await fetchScrapData();
        broadcastChange();
        return res.transaction as ScrapSaleTransaction;
      }
    } catch (err) {
      console.error('Failed to sell scrap batch:', err);
      throw err;
    }
    return null;
  };

  const updateThresholdOrPrice = async (materialCode: string, thresholdLimitKg?: number, marketPricePerKg?: number) => {
    try {
      await apiService.updateAssetScrapStock(materialCode, { thresholdLimitKg, marketPricePerKg });
      await fetchScrapData();
      broadcastChange();
    } catch (err) {
      console.error('Failed to update scrap threshold/price:', err);
    }
  };

  const createScrapItem = async (input: CreateScrapItemInput) => {
    const created = await apiService.createAssetScrapItem(input);
    await fetchScrapData();
    broadcastChange();
    return created as ScrapItem;
  };

  const weighScrapItem = async (id: string, weightKg: number) => {
    const res = await apiService.weighAssetScrapItem(id, weightKg);
    await fetchScrapData();
    broadcastChange();
    return res?.item as ScrapItem | undefined;
  };

  const disposeScrapItem = async (id: string, disposalReference?: string) => {
    const res = await apiService.disposeAssetScrapItem(id, disposalReference);
    await fetchScrapData();
    broadcastChange();
    return res?.item as ScrapItem | undefined;
  };

  const totalScrapSales = useMemo(
    () => state.salesHistory.reduce((sum, tx) => sum + (tx.totalRevenue || 0), 0),
    [state.salesHistory]
  );

  const materials = useMemo(() => Object.values(state.stocksRecord), [state.stocksRecord]);

  const pendingItems = useMemo(
    () => state.items.filter((it) => it.status === 'AWAITING_WEIGHT'),
    [state.items]
  );

  // Items that have already been weighed (in stock, sold, or disposed),
  // newest weighing first — used for the scrap weigh history.
  const weighedItems = useMemo(
    () =>
      state.items
        .filter((it) => it.status !== 'AWAITING_WEIGHT')
        .sort((a, b) => {
          const aTime = new Date(a.weighedAt || a.updatedAt || a.createdAt).getTime();
          const bTime = new Date(b.weighedAt || b.updatedAt || b.createdAt).getTime();
          return bTime - aTime;
        }),
    [state.items]
  );

  return {
    stocksRecord: state.stocksRecord,
    materials,
    items: state.items,
    pendingItems,
    weighedItems,
    salesHistory: state.salesHistory,
    totalScrapSales,
    addScrapKg,
    createScrapItem,
    weighScrapItem,
    disposeScrapItem,
    approveSale,
    sellBatch,
    updateThresholdOrPrice,
    reloadScrapData: fetchScrapData,
  };
}
