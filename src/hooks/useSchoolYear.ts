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
  inventory: {
    totals: Record<string, number>;
    transactions: {
      id: string;
      itemName?: string;
      unit?: string;
      type: string;
      quantity: number;
      notes?: string;
      createdAt: string;
    }[];
  };
}

export function useSchoolYear() {
  const [activeSchoolYear, setActiveSchoolYear] = useState<SchoolYear | null>(null);
  const [allSchoolYears, setAllSchoolYears] = useState<SchoolYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActive = useCallback(async () => {
    try {
      const sy = await apiService.getActiveSchoolYear();
      setActiveSchoolYear(sy);
    } catch {
      console.warn('Failed to fetch active school year');
    }
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const list = await apiService.getSchoolYears();
      setAllSchoolYears(list);
    } catch {
      console.warn('Failed to fetch school years');
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchActive(), fetchAll()]);
    setLoading(false);
  }, [fetchActive, fetchAll]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  const createSchoolYear = useCallback(async (data: { label: string; startDate: string; endDate: string; enrollproId?: number }) => {
    try {
      setError(null);
      const result = await apiService.createSchoolYear(data);
      await refresh();
      return result;
    } catch (err: any) {
      const message = err.message || 'Failed to create school year';
      setError(message);
      throw new Error(message);
    }
  }, [refresh]);

  const updateSchoolYear = useCallback(async (id: string, data: { label?: string; startDate?: string; endDate?: string }) => {
    try {
      setError(null);
      const result = await apiService.updateSchoolYear(id, data);
      await refresh();
      return result;
    } catch (err: any) {
      const message = err.message || 'Failed to update school year';
      setError(message);
      throw new Error(message);
    }
  }, [refresh]);

  const activateSchoolYear = useCallback(async (id: string) => {
    try {
      setError(null);
      const result = await apiService.activateSchoolYear(id);
      await refresh();
      return result;
    } catch (err: any) {
      const message = err.message || 'Failed to activate school year';
      setError(message);
      throw new Error(message);
    }
  }, [refresh]);

  const deactivateSchoolYear = useCallback(async (id: string, replacementId: string) => {
    try {
      setError(null);
      const result = await apiService.deactivateSchoolYear(id, replacementId);
      await refresh();
      return result;
    } catch (err: any) {
      const message = err.message || 'Failed to deactivate school year';
      setError(message);
      throw new Error(message);
    }
  }, [refresh]);

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
    activeSchoolYear,
    allSchoolYears,
    loading,
    error,
    refresh,
    createSchoolYear,
    updateSchoolYear,
    activateSchoolYear,
    deactivateSchoolYear,
    getSchoolYearDetails,
    getSchoolYearLedger,
  };
}
