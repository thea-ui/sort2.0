import { useState, useEffect, useMemo, useCallback } from 'react';
import { apiService } from '../services/api';

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

function broadcastChange() {
  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new CustomEvent(SCRAP_UPDATED_EVENT));
}

export function useAssetScrap() {
  const [stocksRecord, setStocksRecord] = useState<Record<string, ScrapStockItem>>(DEFAULT_SCRAP);
  const [salesHistory, setSalesHistory] = useState<ScrapSaleTransaction[]>([]);
  const [items, setItems] = useState<ScrapItem[]>([]);

  const reloadScrapData = useCallback(async () => {
    try {
      const list = await apiService.getAssetScrapStocks();
      if (Array.isArray(list) && list.length > 0) {
        const rec: Record<string, ScrapStockItem> = {};
        list.forEach((s: any) => { rec[s.materialCode] = s; });
        setStocksRecord(rec);
      }
    } catch (err) {
      console.warn('Failed to fetch scrap stocks:', err);
    }

    try {
      const sales = await apiService.getAssetScrapSales();
      if (Array.isArray(sales)) {
        setSalesHistory(
          sales.map((st: any) => ({
            id: st.id,
            materialCode: st.materialCode,
            materialName: st.materialName,
            weightKg: st.weightKg,
            marketPriceKg: st.marketPriceKg,
            totalRevenue: st.totalRevenue,
            buyerName: st.buyerName,
            approvalReference: st.approvalReference || null,
            soldAt: typeof st.soldAt === 'string' ? st.soldAt.replace('T', ' ').substring(0, 16) : new Date(st.soldAt).toISOString().replace('T', ' ').substring(0, 16),
          }))
        );
      }
    } catch (err) {
      console.warn('Failed to fetch scrap sales:', err);
    }

    try {
      const scrapItems = await apiService.getAssetScrapItems();
      if (Array.isArray(scrapItems)) setItems(scrapItems as ScrapItem[]);
    } catch (err) {
      console.warn('Failed to fetch scrap items:', err);
    }
  }, []);

  useEffect(() => {
    reloadScrapData();
    window.addEventListener('storage', reloadScrapData);
    window.addEventListener(SCRAP_UPDATED_EVENT, reloadScrapData as EventListener);
    const interval = setInterval(reloadScrapData, 10000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', reloadScrapData);
      window.removeEventListener(SCRAP_UPDATED_EVENT, reloadScrapData as EventListener);
    };
  }, [reloadScrapData]);

  const addScrapKg = async (materialCode: string, addKg: number) => {
    if (!materialCode || addKg <= 0) return;
    try {
      await apiService.updateAssetScrapStock(materialCode, { addKg });
      await reloadScrapData();
      broadcastChange();
    } catch (err) {
      console.error('Failed to add scrap kg:', err);
      setStocksRecord((prev) => {
        const item = prev[materialCode];
        if (!item) return prev;
        return { ...prev, [materialCode]: { ...item, accumulatedKg: item.accumulatedKg + addKg } };
      });
      broadcastChange();
    }
  };

  const approveSale = async (materialCode: string, isApproved: boolean, approvalReference?: string) => {
    try {
      await apiService.approveAssetScrapSale({ materialCode, isApproved, approvalReference });
      await reloadScrapData();
      broadcastChange();
    } catch (err) {
      console.error('Failed to approve scrap sale:', err);
    }
  };

  const sellBatch = async (materialCode: string, buyerName?: string, approvalReference?: string) => {
    const item = stocksRecord[materialCode];
    if (!item || item.accumulatedKg <= 0) return null;
    try {
      const res = await apiService.sellAssetScrapBatch({ materialCode, buyerName, approvalReference });
      if (res?.transaction) {
        await reloadScrapData();
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
      await reloadScrapData();
      broadcastChange();
    } catch (err) {
      console.error('Failed to update scrap threshold/price:', err);
    }
  };

  const createScrapItem = async (input: CreateScrapItemInput) => {
    const created = await apiService.createAssetScrapItem(input);
    await reloadScrapData();
    broadcastChange();
    return created as ScrapItem;
  };

  const weighScrapItem = async (id: string, weightKg: number) => {
    const res = await apiService.weighAssetScrapItem(id, weightKg);
    await reloadScrapData();
    broadcastChange();
    return res?.item as ScrapItem | undefined;
  };

  const disposeScrapItem = async (id: string, disposalReference?: string) => {
    const res = await apiService.disposeAssetScrapItem(id, disposalReference);
    await reloadScrapData();
    broadcastChange();
    return res?.item as ScrapItem | undefined;
  };

  const totalScrapSales = useMemo(
    () => salesHistory.reduce((sum, tx) => sum + (tx.totalRevenue || 0), 0),
    [salesHistory]
  );

  const materials = useMemo(() => Object.values(stocksRecord), [stocksRecord]);

  const pendingItems = useMemo(
    () => items.filter((it) => it.status === 'AWAITING_WEIGHT'),
    [items]
  );

  // Items that have already been weighed (in stock, sold, or disposed),
  // newest weighing first — used for the scrap weigh history.
  const weighedItems = useMemo(
    () =>
      items
        .filter((it) => it.status !== 'AWAITING_WEIGHT')
        .sort((a, b) => {
          const aTime = new Date(a.weighedAt || a.updatedAt || a.createdAt).getTime();
          const bTime = new Date(b.weighedAt || b.updatedAt || b.createdAt).getTime();
          return bTime - aTime;
        }),
    [items]
  );

  return {
    stocksRecord,
    materials,
    items,
    pendingItems,
    weighedItems,
    salesHistory,
    totalScrapSales,
    addScrapKg,
    createScrapItem,
    weighScrapItem,
    disposeScrapItem,
    approveSale,
    sellBatch,
    updateThresholdOrPrice,
    reloadScrapData,
  };
}
