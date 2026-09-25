import React from 'react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Report, User as UserType } from '../../../types';
import { useToast } from '../../../hooks/useToast';
import { CollectionsKpiGrid } from './collections/CollectionsKpiGrid';
import { RecyclablesSummaryGrid } from './collections/RecyclablesSummaryGrid';
import { ItemizedRecyclable, useCollectionsMetrics } from './collections/useCollectionsMetrics';

export interface AdminCollectionsTabProps {
  reports: Report[];
  users?: UserType[];
  settings?: { rewardsReservePercent?: number } | null;
}

/**
 * Collections audit surface: KPI tiles + itemized recyclable stocks + residual
 * waste. The previous search/status filter state and the three photo/dispatch/
 * offense modals were unreachable (audit B5: no control ever opened them) and
 * were removed; collection actions live in the Reports queue.
 */
export const AdminCollectionsTab: React.FC<AdminCollectionsTabProps> = ({
  reports,
  users = [],
  settings,
}) => {
  const toast = useToast();
  const { kpiCards, itemizedRecyclables, residualWaste, totalMRFRevenuePhp, approveSaleBatch } =
    useCollectionsMetrics({
      reports,
      users,
      rewardsReservePercent: settings?.rewardsReservePercent ?? 20,
    });

  const handleApproveSale = async (item: ItemizedRecyclable) => {
    await approveSaleBatch(item.code, true);
    toast.success(`Authorized sale of ${item.shortName} batch. Dispatched notification to MRF.`);
  };

  return (
    <div className="space-y-6 animate-fade-in text-[var(--text-strong)]">
      <PageHeader
        title="Waste Dispatch & Recyclables"
        description="Verify submissions, dispatch collection alerts, and audit recyclable revenue."
        actions={
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-emerald-50 border border-emerald-200/80">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-bold text-emerald-700">Auto-Sync Active</span>
          </div>
        }
      />

      <CollectionsKpiGrid kpis={kpiCards} />

      <RecyclablesSummaryGrid
        items={itemizedRecyclables}
        residual={residualWaste}
        totalRevenuePhp={totalMRFRevenuePhp}
        onApproveSale={handleApproveSale}
      />
    </div>
  );
};
