import { useState, useEffect, useMemo, useCallback } from 'react';
import { apiService } from '../services/api';

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

const DEFAULT_STOCKS_RECORD: Record<string, MarketStockItem> = {
  pet_plastic: { categoryCode: 'pet_plastic', categoryName: 'PET Plastic Bottles', shortName: 'PET Bottles', thresholdLimitKg: 50.0, marketPricePerKg: 18, accumulatedKg: 0.0, isApprovedForSale: false },
  aluminum_cans: { categoryCode: 'aluminum_cans', categoryName: 'Aluminum & Metal Cans', shortName: 'Aluminum Cans', thresholdLimitKg: 30.0, marketPricePerKg: 45, accumulatedKg: 0.0, isApprovedForSale: false },
  cardboard: { categoryCode: 'cardboard', categoryName: 'Cardboard & Paper', shortName: 'Cardboard', thresholdLimitKg: 60.0, marketPricePerKg: 12, accumulatedKg: 0.0, isApprovedForSale: false },
  glass: { categoryCode: 'glass', categoryName: 'Glass Bottles & Containers', shortName: 'Glass Bottles', thresholdLimitKg: 40.0, marketPricePerKg: 15, accumulatedKg: 0.0, isApprovedForSale: false },
};

const DEFAULT_SALES: SaleTransaction[] = [];

export function useRecycleMarket() {
  const [reservePercent, setReservePercent] = useState<number>(20);

  const [stocksRecord, setStocksRecord] = useState<Record<string, MarketStockItem>>(() => {
    try {
      const v = localStorage.getItem('sort_market_version');
      if (v !== MARKET_STORAGE_VERSION) {
        localStorage.setItem('sort_market_version', MARKET_STORAGE_VERSION);
        localStorage.setItem('sort_market_stocks', JSON.stringify(DEFAULT_STOCKS_RECORD));
        localStorage.setItem('sort_market_sales', JSON.stringify(DEFAULT_SALES));
        return DEFAULT_STOCKS_RECORD;
      }
      const stored = localStorage.getItem('sort_market_stocks');
      return stored ? JSON.parse(stored) : DEFAULT_STOCKS_RECORD;
    } catch {
      return DEFAULT_STOCKS_RECORD;
    }
  });

  const [salesHistory, setSalesHistory] = useState<SaleTransaction[]>(() => {
    try {
      const stored = localStorage.getItem('sort_market_sales');
      return stored ? JSON.parse(stored) : DEFAULT_SALES;
    } catch {
      return DEFAULT_SALES;
    }
  });

  const reloadMarketData = useCallback(async () => {
    try {
      const stocksList = await apiService.getMarketStocks();
      if (Array.isArray(stocksList) && stocksList.length > 0) {
        setStocksRecord(prev => {
          const rec = { ...prev };
          stocksList.forEach((s: any) => {
            rec[s.categoryCode] = s;
          });
          localStorage.setItem('sort_market_stocks', JSON.stringify(rec));
          return rec;
        });
      }
    } catch (err) {
      console.warn('Failed to fetch market stocks from server API:', err);
    }

    try {
      const sales = await apiService.getMarketSales();
      if (Array.isArray(sales)) {
        const formatted = sales.map((st: any) => ({
          id: st.id,
          categoryCode: st.categoryCode,
          categoryName: st.categoryName,
          weightKg: st.weightKg,
          marketPriceKg: st.marketPriceKg,
          totalRevenue: st.totalRevenue,
          buyerName: st.buyerName,
          soldAt: typeof st.soldAt === 'string' ? st.soldAt.replace('T', ' ').substring(0, 16) : new Date(st.soldAt).toISOString().replace('T', ' ').substring(0, 16),
        }));
        setSalesHistory(formatted);
        localStorage.setItem('sort_market_sales', JSON.stringify(formatted));
      }
    } catch (err) {
      console.warn('Failed to fetch sales history from server API:', err);
    }

    try {
      const settings = await apiService.getSettings();
      if (settings?.rewardsReservePercent) {
        setReservePercent(settings.rewardsReservePercent);
      }
    } catch {
      // use default 20%
    }
  }, []);

  const broadcastChange = () => {
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('sort_market_updated'));
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const ch = new BroadcastChannel('sort_market_channel');
        ch.postMessage({ type: 'MARKET_UPDATED', timestamp: Date.now() });
        ch.close();
      } catch (e) {}
    }
  };

  useEffect(() => {
    reloadMarketData();

    const handleUpdate = () => reloadMarketData();

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel('sort_market_channel');
        channel.onmessage = handleUpdate;
      } catch (e) {}
    }

    const interval = setInterval(reloadMarketData, 2500);

    window.addEventListener('storage', handleUpdate);
    window.addEventListener('sort_market_updated', handleUpdate as EventListener);

    return () => {
      clearInterval(interval);
      if (channel) channel.close();
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('sort_market_updated', handleUpdate as EventListener);
    };
  }, [reloadMarketData]);

  // Actions
  const approveSaleBatch = async (categoryCode: string, isApproved: boolean = true) => {
    try {
      await apiService.approveMarketSale({ categoryCode, isApproved });
      await reloadMarketData();
      broadcastChange();
    } catch (err) {
      console.error('Failed to approve sale batch via API:', err);
      setStocksRecord((prev) => {
        const item = prev[categoryCode];
        if (!item) return prev;
        return {
          ...prev,
          [categoryCode]: { ...item, isApprovedForSale: isApproved, approvedAt: isApproved ? new Date().toISOString() : null },
        };
      });
      broadcastChange();
    }
  };

  const sellBatch = async (categoryCode: string, buyerName?: string) => {
    const currentItem = stocksRecord[categoryCode];
    if (!currentItem || currentItem.accumulatedKg <= 0) return null;

    try {
      const res = await apiService.sellMarketBatch({ categoryCode, buyerName });
      if (res && res.transaction) {
        await reloadMarketData();
        broadcastChange();
        return res.transaction;
      }
    } catch (err) {
      console.error('Failed to sell batch via API:', err);
    }

    // Local state fallback (Cap sold weight at threshold, leave remainder in inventory)
    const weightSold = currentItem.accumulatedKg >= currentItem.thresholdLimitKg
      ? currentItem.thresholdLimitKg
      : currentItem.accumulatedKg;
    const remainingKg = Math.max(0, currentItem.accumulatedKg - weightSold);
    const revenue = Math.round(weightSold * currentItem.marketPricePerKg);

    const fallbackTx: SaleTransaction = {
      id: `sale-${Date.now()}`,
      categoryCode,
      categoryName: currentItem.categoryName,
      weightKg: parseFloat(weightSold.toFixed(1)),
      marketPriceKg: currentItem.marketPricePerKg,
      totalRevenue: revenue,
      buyerName: buyerName || 'GreenCycle Recycling Vendor',
      soldAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    setSalesHistory((prev) => [fallbackTx, ...prev]);
    setStocksRecord((prev) => ({
      ...prev,
      [categoryCode]: {
        ...prev[categoryCode],
        accumulatedKg: parseFloat(remainingKg.toFixed(2)),
        isApprovedForSale: false,
        approvedAt: null,
      },
    }));

    broadcastChange();
    return fallbackTx;
  };

  const addStockKg = async (categoryCode: string, addKg: number) => {
    if (addKg <= 0) return;
    if (!categoryCode || typeof categoryCode !== 'string') return;

    try {
      await apiService.updateMarketStock(categoryCode, { addKg });
      await reloadMarketData();
      broadcastChange();
    } catch (err) {
      console.error('Failed to add stock kg via API:', err);
      setStocksRecord((prev) => {
        const item = prev[categoryCode];
        if (!item) return prev;
        return {
          ...prev,
          [categoryCode]: { ...item, accumulatedKg: item.accumulatedKg + addKg },
        };
      });
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
      await reloadMarketData();
      broadcastChange();
    } catch (err) {
      console.error('Failed to update threshold/price via API:', err);
      setStocksRecord((prev) => {
        const item = prev[categoryCode];
        if (!item) return prev;
        return {
          ...prev,
          [categoryCode]: {
            ...item,
            ...(typeof thresholdLimitKg === 'number' ? { thresholdLimitKg } : {}),
            ...(typeof marketPricePerKg === 'number' ? { marketPricePerKg } : {}),
          },
        };
      });
      broadcastChange();
    }
  };

  // Calculations
  const totalVendorSales = useMemo(() => {
    return salesHistory.reduce((sum, tx) => sum + (tx.totalRevenue || 0), 0);
  }, [salesHistory]);

  const rewardsReservedPhp = useMemo(() => {
    return Math.round(totalVendorSales * (reservePercent / 100));
  }, [totalVendorSales, reservePercent]);

  const categoryRevenueMap = useMemo(() => {
    const map: Record<string, number> = {};
    salesHistory.forEach((tx) => {
      map[tx.categoryCode] = (map[tx.categoryCode] || 0) + tx.totalRevenue;
    });
    return map;
  }, [salesHistory]);

  return {
    stocksRecord,
    salesHistory,
    totalVendorSales,
    rewardsReservedPhp,
    categoryRevenueMap,
    approveSaleBatch,
    sellBatch,
    addStockKg,
    updateThresholdOrPrice,
    reloadMarketData,
  };
}
