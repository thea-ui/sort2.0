import React from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Award,
  Coins,
  FileText,
  Package,
  Scale,
  Sparkles,
  Truck,
  Wine,
} from 'lucide-react';
import { Report, User as UserType } from '../../../../types';
import { MarketStockItem, useRecycleMarket } from '../../../../hooks/useRecycleMarket';
import {
  countUnweighedResidual,
  residualRecords,
  sumResidualKg,
} from '../../../../utils/wasteStreams';

export interface CollectionKpi {
  key: string;
  label: string;
  value: string;
  unit?: string;
  icon: React.ElementType;
  iconCls: string;
  badge: string;
  badgeCls: string;
  badgeIcon?: React.ElementType;
  footer: string;
}

export interface ItemizedRecyclable {
  code: string;
  category: string;
  shortName: string;
  stock?: MarketStockItem;
  soldRevenuePhp: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}

export interface ResidualWasteSummary {
  category: string;
  countLabel: string;
  weightKg: number;
  avgKg: number;
  unweighed: number;
}

interface UseCollectionsMetricsArgs {
  reports: Report[];
  users: UserType[];
  rewardsReservePercent: number;
}

/**
 * Derived Collections metrics (KPI tiles, itemized recyclable stocks, residual
 * waste) shared by the Collections grids. Market stock data comes from
 * `useRecycleMarket`, matching the Recycle Market page.
 */
export function useCollectionsMetrics({
  reports,
  users,
  rewardsReservePercent,
}: UseCollectionsMetricsArgs) {
  const {
    stocksRecord,
    totalVendorSales,
    rewardsReservedPhp,
    categoryRevenueMap,
    approveSaleBatch,
  } = useRecycleMarket();

  const totalMRFRevenuePhp = totalVendorSales;

  const totalCollectedWeight = Object.values(stocksRecord).reduce(
    (sum, stock) => sum + (stock?.accumulatedKg || 0),
    0,
  );
  const collectedReports = reports.filter(
    (r) => r.status === 'COLLECTED' || r.status === 'RESOLVED',
  );
  const completedDispatchesCount = collectedReports.length;

  const dispatchedReports = reports.filter((r) => r.status === 'DISPATCHED');
  const activeDispatchesCount = dispatchedReports.length;
  const mrfActiveCountByUser = new Map<string, number>();
  dispatchedReports.forEach((r) => {
    if (r.assignedMrfId) {
      mrfActiveCountByUser.set(r.assignedMrfId, (mrfActiveCountByUser.get(r.assignedMrfId) ?? 0) + 1);
    }
  });

  const pendingCount = reports.filter((r) => r.status === 'PENDING').length;

  const residualReports = residualRecords(collectedReports);
  const residualWeightKg = sumResidualKg(residualReports);
  const residualCount = residualReports.length;
  const residualUnweighed = countUnweighedResidual(residualReports);

  const itemizedRecyclables: ItemizedRecyclable[] = [
    {
      code: 'pet_plastic',
      category: 'Plastic Bottles (PET / HDPE)',
      shortName: 'PET Bottles',
      stock: stocksRecord['pet_plastic'],
      soldRevenuePhp: categoryRevenueMap['pet_plastic'] || 0,
      icon: Package,
      color: 'text-[var(--text-strong)]',
      bgColor: 'bg-[var(--primary)]/10',
      borderColor: 'border-[var(--primary)]/25',
    },
    {
      code: 'glass',
      category: 'Glass / Beverage Bottles',
      shortName: 'Glass Bottles',
      stock: stocksRecord['glass'],
      soldRevenuePhp: categoryRevenueMap['glass'] || 0,
      icon: Wine,
      color: 'text-[var(--accent)]',
      bgColor: 'bg-[var(--primary)]/10',
      borderColor: 'border-emerald-200',
    },
    {
      code: 'aluminum_cans',
      category: 'Aluminum & Metal Cans',
      shortName: 'Aluminum Cans',
      stock: stocksRecord['aluminum_cans'],
      soldRevenuePhp: categoryRevenueMap['aluminum_cans'] || 0,
      icon: Sparkles,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
    },
    {
      code: 'cardboard',
      category: 'Paper & Cardboard',
      shortName: 'Cardboard',
      stock: stocksRecord['cardboard'],
      soldRevenuePhp: categoryRevenueMap['cardboard'] || 0,
      icon: FileText,
      color: 'text-[var(--gold)]',
      bgColor: 'bg-[var(--gold)]/10',
      borderColor: 'border-[var(--gold)]/25',
    },
  ];

  const residualWaste: ResidualWasteSummary = {
    category: 'Residual Waste Volume',
    countLabel: `${residualCount} Non-Recyclable Batch${residualCount === 1 ? '' : 'es'}`,
    weightKg: residualWeightKg > 0 ? residualWeightKg : 0.0,
    avgKg:
      residualCount - residualUnweighed > 0
        ? residualWeightKg / (residualCount - residualUnweighed)
        : 0,
    unweighed: residualUnweighed,
  };

  const kpiCards: CollectionKpi[] = [
    {
      key: 'rewards-reserve',
      label: 'MRF Sales Reserved for Rank 1 Rewards',
      value: `₱${rewardsReservedPhp.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      icon: Coins,
      iconCls: 'bg-amber-50 text-[var(--gold)]',
      badge: `${rewardsReservePercent}% Reserve`,
      badgeCls: 'bg-amber-50 text-amber-700 border-amber-200',
      badgeIcon: Award,
      footer: `Quarter-end pool · from ₱${totalMRFRevenuePhp.toLocaleString()} total revenue`,
    },
    {
      key: 'total-collected',
      label: 'Total Recyclables Collected',
      value: totalCollectedWeight.toFixed(1),
      unit: 'kg',
      icon: Scale,
      iconCls: 'bg-[var(--primary)]/10 text-[var(--accent)]',
      badge: `${completedDispatchesCount} Recorded`,
      badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badgeIcon: ArrowUpRight,
      footer: `Across ${completedDispatchesCount} completed collection${
        completedDispatchesCount === 1 ? '' : 's'
      }`,
    },
    {
      key: 'active-dispatches',
      label: 'Active MRF Dispatches',
      value: String(activeDispatchesCount),
      unit: 'active',
      icon: Truck,
      iconCls: 'bg-[var(--primary)]/10 text-[var(--text-strong)]',
      badge: activeDispatchesCount > 0 ? `${activeDispatchesCount} Active` : 'Queue Clear',
      badgeCls: 'bg-[var(--primary)]/10 text-[var(--text-strong)] border-[var(--primary)]/25',
      footer:
        activeDispatchesCount > 0
          ? users
              .filter((u) => u.role === 'MRF')
              .map((mrf) => `${mrf.name} (${mrfActiveCountByUser.get(mrf.id) ?? 0})`)
              .join(' • ') || `${activeDispatchesCount} active dispatches in queue`
          : `${completedDispatchesCount} collections resolved & logged`,
    },
    {
      key: 'pending-queue',
      label: 'Pending Action Queue',
      value: String(pendingCount),
      unit: 'reports',
      icon: AlertTriangle,
      iconCls: 'bg-rose-50 text-[var(--action)]',
      badge: pendingCount > 0 ? 'Requires Action' : 'All Verified',
      badgeCls:
        pendingCount > 0
          ? 'bg-rose-50 text-rose-700 border-rose-200'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200',
      footer:
        pendingCount > 0
          ? 'Awaiting admin approval & MRF alert'
          : 'Queue clear — no pending verification',
    },
  ];

  return {
    kpiCards,
    itemizedRecyclables,
    residualWaste,
    totalMRFRevenuePhp,
    approveSaleBatch,
  };
}
