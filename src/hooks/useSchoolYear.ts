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

export function useSchoolYear() {
  const [activeSchoolYear, setActiveSchoolYear] = useState<SchoolYear | null>(null);
  const [allSchoolYears, setAllSchoolYears] = useState<SchoolYear[]>([]);
  const [loading, setLoading] = useState(true);

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
    await Promise.all([fetchActive(), fetchAll()]);
    setLoading(false);
  }, [fetchActive, fetchAll]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  const archiveSchoolYear = useCallback(async (id: string) => {
    try {
      const result = await apiService.archiveSchoolYear(id);
      await refresh();
      return result;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to archive school year');
    }
  }, [refresh]);

  const getSchoolYearDetails = useCallback(async (id: string) => {
    try {
      return await apiService.getSchoolYearDetails(id);
    } catch (err: any) {
      throw new Error(err.message || 'Failed to fetch school year details');
    }
  }, []);

  return {
    activeSchoolYear,
    allSchoolYears,
    loading,
    refresh,
    archiveSchoolYear,
    getSchoolYearDetails,
  };
}
