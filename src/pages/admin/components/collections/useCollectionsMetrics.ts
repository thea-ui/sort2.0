import React, { useMemo } from 'react';
import {
  AlertTriangle,
  Coins,
  Cylinder,
  FileText,
  Package,
  Scale,
  Truck,
  Wine,
} from 'lucide-react';
import { Report, User as UserType } from '../../../../types';
import { MarketStockItem, useRecycleMarket } from '../../../../hooks/useRecycleMarket';
import { useAssetScrap } from '../../../../hooks/useAssetScrap';
import { generateScrapApprovalReference } from '../../../../utils/scrapReference';
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
  footerLeft: string;
  footerRight: string;
  footerRightCls: string;
}

export interface ItemizedRecyclable {
  code: string;
  category: string;
  shortName: string;
  stock?: MarketStockItem;
  soldRevenuePhp: number;
  icon: React.ElementType;
  /** Raw ramp shade — icon tile and progress bar. */
  color: string;
  /** Readable text shade of the same ramp step (revenue, %) . */
  strongColor: string;
  barColor: string;
  bgColor: string;
  borderColor: string;
}

export interface ResidualWasteSummary {
  category: string;
  count: number;
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

  const {
    materials: scrapMaterials,
    salesHistory: scrapSalesHistory,
    totalScrapSales,
    approveSale: approveScrapSale,
  } = useAssetScrap();

  const nextScrapApprovalReference = useMemo(
    () => generateScrapApprovalReference([...scrapMaterials, ...scrapSalesHistory]),
    [scrapMaterials, scrapSalesHistory],
  );

  // Market approvals use the same WMR series as scrap batches, continuing past
  // whatever reference is already stored on the recyclable stocks.
  const nextMarketApprovalReference = useMemo(
    () => generateScrapApprovalReference(Object.values(stocksRecord)),
    [stocksRecord],
  );

  const totalMRFRevenuePhp = totalVendorSales;
  const grandTotalRevenuePhp = totalMRFRevenuePhp + totalScrapSales;

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

  // Material accents follow the Overview card ramp (red → terracotta → amber
  // → gold, `--ramp-1..4`): one shade per card, stepping lighter left to
  // right — the same scheme as the Campus Analytics KPI row.
  const itemizedRecyclables: ItemizedRecyclable[] = [
    {
      code: 'pet_plastic',
      category: 'Plastic Bottles (PET / HDPE)',
      shortName: 'PET Bottles',
      stock: stocksRecord['pet_plastic'],
      soldRevenuePhp: categoryRevenueMap['pet_plastic'] || 0,
      icon: Package,
      color: 'text-[var(--ramp-1)]',
      strongColor: 'text-[var(--ramp-1-strong)]',
      barColor: 'bg-[var(--ramp-1)]',
      bgColor: 'bg-[var(--ramp-1)]/10',
      borderColor: 'border-[var(--ramp-1)]/25',
    },
    {
      code: 'glass',
      category: 'Glass / Beverage Bottles',
      shortName: 'Glass Bottles',
      stock: stocksRecord['glass'],
      soldRevenuePhp: categoryRevenueMap['glass'] || 0,
      icon: Wine,
      color: 'text-[var(--ramp-2)]',
      strongColor: 'text-[var(--ramp-2-strong)]',
      barColor: 'bg-[var(--ramp-2)]',
      bgColor: 'bg-[var(--ramp-2)]/10',
      borderColor: 'border-[var(--ramp-2)]/25',
    },
    {
      code: 'aluminum_cans',
      category: 'Aluminum & Metal Cans',
      shortName: 'Aluminum Cans',
      stock: stocksRecord['aluminum_cans'],
      soldRevenuePhp: categoryRevenueMap['aluminum_cans'] || 0,
      icon: Cylinder,
      color: 'text-[var(--ramp-3)]',
      strongColor: 'text-[var(--ramp-3-strong)]',
      barColor: 'bg-[var(--ramp-3)]',
      bgColor: 'bg-[var(--ramp-3)]/10',
      borderColor: 'border-[var(--ramp-3)]/25',
    },
    {
      code: 'cardboard',
      category: 'Paper & Cardboard',
      shortName: 'Cardboard',
      stock: stocksRecord['cardboard'],
      soldRevenuePhp: categoryRevenueMap['cardboard'] || 0,
      icon: FileText,
      color: 'text-[var(--ramp-4)]',
      strongColor: 'text-[var(--ramp-4-strong)]',
      barColor: 'bg-[var(--ramp-4)]',
      bgColor: 'bg-[var(--ramp-4)]/10',
      borderColor: 'border-[var(--ramp-4)]/25',
    },
  ];

  const residualWaste: ResidualWasteSummary = {
    category: 'Residual Waste Volume',
    count: residualCount,
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
      iconCls: 'bg-[var(--ramp-1)]/10 text-[var(--ramp-1-strong)]',
      footerLeft: `From ₱${totalMRFRevenuePhp.toLocaleString()} revenue`,
      footerRight: `${rewardsReservePercent}% reserve`,
      footerRightCls: 'text-[var(--ramp-1-strong)]',
    },
    {
      key: 'total-collected',
      label: 'Total Recyclables Collected',
      value: totalCollectedWeight.toFixed(1),
      unit: 'kg',
      icon: Scale,
      iconCls: 'bg-[var(--ramp-2)]/10 text-[var(--ramp-2-strong)]',
      footerLeft: 'Completed collections',
      footerRight: `${completedDispatchesCount} recorded`,
      footerRightCls: 'text-[var(--ramp-2-strong)]',
    },
    {
      key: 'active-dispatches',
      label: 'Active MRF Dispatches',
      value: String(activeDispatchesCount),
      unit: 'active',
      icon: Truck,
      iconCls: 'bg-[var(--ramp-3)]/10 text-[var(--ramp-3-strong)]',
      footerLeft:
        activeDispatchesCount > 0
          ? users
              .filter((u) => u.role === 'MRF')
              .map((mrf) => `${mrf.name} (${mrfActiveCountByUser.get(mrf.id) ?? 0})`)
              .join(' • ') || `${activeDispatchesCount} active dispatches in queue`
          : `${completedDispatchesCount} collections resolved & logged`,
      footerRight: activeDispatchesCount > 0 ? `${activeDispatchesCount} active` : 'Queue clear',
      footerRightCls: 'text-[var(--ramp-3-strong)]',
    },
    {
      key: 'pending-queue',
      label: 'Pending Action Queue',
      value: String(pendingCount),
      unit: 'reports',
      icon: AlertTriangle,
      iconCls: 'bg-[var(--ramp-4)]/10 text-[var(--ramp-4-strong)]',
      footerLeft: pendingCount > 0 ? 'Awaiting admin approval' : 'No pending verification',
      footerRight: pendingCount > 0 ? 'Requires action' : 'All verified',
      footerRightCls: 'text-[var(--ramp-4-strong)]',
    },
  ];

  return {
    kpiCards,
    itemizedRecyclables,
    residualWaste,
    totalMRFRevenuePhp,
    grandTotalRevenuePhp,
    approveSaleBatch,
    nextMarketApprovalReference,
    scrapMaterials,
    totalScrapSales,
    approveScrapSale,
    nextScrapApprovalReference,
  };
}
