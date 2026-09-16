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

  const totalScrapSales = useMemo(
    () => salesHistory.reduce((sum, tx) => sum + (tx.totalRevenue || 0), 0),
    [salesHistory]
  );

  const materials = useMemo(() => Object.values(stocksRecord), [stocksRecord]);

  return {
    stocksRecord,
    materials,
    salesHistory,
    totalScrapSales,
    addScrapKg,
    approveSale,
    sellBatch,
    updateThresholdOrPrice,
    reloadScrapData,
  };
}
