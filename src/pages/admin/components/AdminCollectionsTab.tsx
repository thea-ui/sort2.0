import React, { useState } from 'react';
import { Coins } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { AppModal } from '../../../components/common/AppModal';
import { Input } from '../../../components/ui/Input';
import { Report, User as UserType } from '../../../types';
import { useToast } from '../../../hooks/useToast';
import { ScrapStockItem } from '../../../hooks/useAssetScrap';
import { CollectionsKpiGrid } from './collections/CollectionsKpiGrid';
import { RecyclablesSummaryGrid } from './collections/RecyclablesSummaryGrid';
import { ScrapApprovalsGrid } from './collections/ScrapApprovalsGrid';
import { ItemizedRecyclable, useCollectionsMetrics } from './collections/useCollectionsMetrics';

export interface AdminCollectionsTabProps {
  reports: Report[];
  users?: UserType[];
  settings?: { rewardsReservePercent?: number } | null;
}

/**
 * Collections audit surface: KPI tiles + itemized recyclable stocks + scrap
 * disposal approvals + residual waste. The previous search/status filter state
 * and the three photo/dispatch/offense modals were unreachable (audit B5: no
 * control ever opened them) and were removed; collection actions live in the
 * Reports queue.
 */
export const AdminCollectionsTab: React.FC<AdminCollectionsTabProps> = ({
  reports,
  users = [],
  settings,
}) => {
  const toast = useToast();
  const {
    kpiCards,
    itemizedRecyclables,
    residualWaste,
    totalMRFRevenuePhp,
    grandTotalRevenuePhp,
    approveSaleBatch,
    scrapMaterials,
    totalScrapSales,
    approveScrapSale,
    nextScrapApprovalReference,
  } = useCollectionsMetrics({
    reports,
    users,
    rewardsReservePercent: settings?.rewardsReservePercent ?? 20,
  });

  const [scrapTarget, setScrapTarget] = useState<ScrapStockItem | null>(null);
  const [approvalRef, setApprovalRef] = useState('');
  const [approving, setApproving] = useState(false);

  const handleApproveSale = async (item: ItemizedRecyclable) => {
    await approveSaleBatch(item.code, true);
    toast.success(`Authorized sale of ${item.shortName} batch. Dispatched notification to MRF.`);
  };

  const handleApproveScrap = async () => {
    if (!scrapTarget) return;
    setApproving(true);
    try {
      await approveScrapSale(scrapTarget.materialCode, true, approvalRef.trim() || undefined);
      toast.success(`Authorized scrap sale of ${scrapTarget.materialName}. MRF can now complete the batch sale.`);
      setScrapTarget(null);
      setApprovalRef('');
    } catch {
      toast.error('Failed to approve scrap batch. Please try again.');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-[var(--text-strong)]">
      <PageHeader
        title="Waste Dispatch & Recyclables"
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div
              className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[color-mix(in_srgb,var(--gold)_10%,white)] border border-[var(--gold)]/25"
              title={`Recyclables ₱${totalMRFRevenuePhp.toLocaleString()} + Asset scrap ₱${totalScrapSales.toLocaleString()}`}
            >
              <Coins size={14} className="text-[var(--gold)]" />
              <span className="text-xs font-bold text-[var(--text-strong)]">Total Revenue</span>
              <span className="text-sm font-black text-[var(--gold)]">
                ₱{grandTotalRevenuePhp.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className="hidden sm:inline text-[10px] font-semibold text-[var(--text-strong)]/50">
                recyclables + scrap
              </span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-emerald-50 border border-emerald-200/80">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-bold text-emerald-700">Auto-Sync Active</span>
            </div>
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

      <ScrapApprovalsGrid
        materials={scrapMaterials}
        totalScrapSales={totalScrapSales}
        onApproveSale={(material) => {
          setApprovalRef(nextScrapApprovalReference);
          setScrapTarget(material);
        }}
      />

      <AppModal
        open={scrapTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setScrapTarget(null);
            setApprovalRef('');
          }
        }}
        icon={<Coins size={20} />}
        title="Approve Scrap Batch Sale"
        description="Record the Disposal Committee reference (WMR / IIRUP / PTR / minutes) before MRF can sell this batch."
        confirmLabel="Approve Batch"
        onConfirm={handleApproveScrap}
        loading={approving}
      >
        <div className="space-y-2">
          <label
            htmlFor="scrap-approval-reference"
            className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider"
          >
            Approval Reference
          </label>
          <Input
            id="scrap-approval-reference"
            value={approvalRef}
            onChange={(e) => setApprovalRef(e.target.value)}
            placeholder="e.g. WMR-2026-014"
            className="h-10 rounded-xl"
          />
          {scrapTarget && (
            <p className="text-xs text-muted-foreground pt-1">
              {scrapTarget.materialName} · {scrapTarget.accumulatedKg.toFixed(1)} kg batch · Est. value ₱
              {Math.round(scrapTarget.accumulatedKg * scrapTarget.marketPricePerKg).toLocaleString()}
            </p>
          )}
        </div>
      </AppModal>
    </div>
  );
};
