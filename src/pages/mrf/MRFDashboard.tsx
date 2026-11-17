import React, { useState } from 'react';
import { useMockData } from '../../hooks/useMockData';
import { useRecycleMarket } from '../../hooks/useRecycleMarket';
import { useAssetScrap } from '../../hooks/useAssetScrap';
import { toast } from '../../hooks/useToast';
import { Report } from '../../types';
import { cleanReportTitle, cleanLocationName } from '../../utils/reportUtils';
import { ASSET_DISPOSITIONS } from '../../utils/assetDispositions';
import { formatShortDate } from '../../utils/dateFormat';
import { apiService } from '../../services/api';
import {
  Truck,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Zap,
  Recycle,
  Armchair,
  Trash2,
  Eye,
  Users,
  Coins,
  Filter,
  ChevronRight,
  FolderTree,
} from 'lucide-react';
import { MRFDirectPickupTab } from './components/MRFDirectPickupTab';
import { MRFWalkInTab } from './components/MRFWalkInTab';
import { MRFBinMapTab } from './components/MRFBinMapTab';
import { MRFMarketTab } from './components/MRFMarketTab';
import { MRFAssetLedgerPage } from './components/MRFAssetLedgerPage';
import { AssetScrapStockTab } from './components/AssetScrapStockTab';
import { MRFHistoryTab } from './components/MRFHistoryTab';
import { MRFTaskPage, TaskCompletionPayload } from './components/MRFTaskPage';
import { DataTable, TableColumn } from '../../components/data-table';
import { PhotoLightbox } from '../../components/common/PhotoLightbox';
import { useReportPhoto } from '../../hooks/useReportPhoto';

export interface ItemizedRecyclableCategory {
  id: 'pet_plastic' | 'aluminum_cans' | 'cardboard' | 'glass';
  name: string;
  shortName: string;
  thresholdLimitKg: number;
  marketPricePerKg: number;
  color: string;
  barColor: string;
  bgLight: string;
  borderColor: string;
}

/**
 * Material accents follow the admin content scheme: one accent-family shade
 * per material, read top-to-bottom as a descending ramp (never rainbow).
 */
export const RECYCLABLE_CATEGORIES: ItemizedRecyclableCategory[] = [
  { id: 'pet_plastic',   name: 'PET Plastic Bottles', shortName: 'PET Bottles', thresholdLimitKg: 0, marketPricePerKg: 0, color: 'text-[var(--accent-bright)]', barColor: 'bg-[var(--accent-bright)]', bgLight: 'bg-[var(--accent-bright)]/10', borderColor: 'border-[var(--accent-bright)]/25' },
  { id: 'aluminum_cans', name: 'Aluminum & Metal Cans', shortName: 'Aluminum Cans', thresholdLimitKg: 0, marketPricePerKg: 0, color: 'text-[var(--accent-light)]', barColor: 'bg-[var(--accent-light)]', bgLight: 'bg-[var(--accent-light)]/10', borderColor: 'border-[var(--accent-light)]/25' },
  { id: 'cardboard',     name: 'Cardboard & Paper', shortName: 'Cardboard', thresholdLimitKg: 0, marketPricePerKg: 0, color: 'text-[var(--accent)]', barColor: 'bg-[var(--accent)]', bgLight: 'bg-[var(--accent)]/10', borderColor: 'border-[var(--accent)]/25' },
  { id: 'glass',         name: 'Glass Bottles & Containers', shortName: 'Glass Bottles', thresholdLimitKg: 0, marketPricePerKg: 0, color: 'text-[var(--accent-dark)]', barColor: 'bg-[var(--accent-dark)]', bgLight: 'bg-[var(--accent-dark)]/10', borderColor: 'border-[var(--accent-dark)]/25' },
];

// DepEd/COA-aligned asset dispositions live in src/utils/assetDispositions.ts

// Legacy outcome strings (old UI) → current disposition value.
const LEGACY_ASSET_OUTCOME: Record<string, string> = {
  'Repaired On-Site': 'Repaired On-Site (returned to service)',
  'Transported to MRF Workshop': 'Repaired at MRF Workshop',
  'Needs Replacement': 'Declared Unserviceable → Scrap',
};

export function deriveAssetCategory(description?: string): string {
  const d = (description || '').toUpperCase();
  if (d.includes('[PILLAR: FURNITURE]')) return 'Furniture';
  if (d.includes('[PILLAR: ELECTRONICS]')) return 'Electronics';
  if (d.includes('[PILLAR: FIXTURES]')) return 'Fixtures';
  if (d.includes('[PILLAR: EQUIPMENT]')) return 'Equipment';
  return 'Other';
}

type DispatchFolderKey = 'RECYCLABLE' | 'ASSET' | 'GENERAL';

function formatReportCategory(category?: string): string {
  if (!category) return 'General';
  if (category === 'NON_BIODEGRADABLE') return 'Non-Biodegradable';
  if (category === 'BIODEGRADABLE') return 'Biodegradable';
  if (category === 'RECYCLABLE') return 'Recyclable';
  return category.charAt(0) + category.slice(1).toLowerCase().replace(/_/g, ' ');
}

/** Folder bucket for an active dispatch: recyclables first, then assets, else general waste. */
function getDispatchKind(rep: Report): DispatchFolderKey {
  const d = rep.description.toUpperCase();
  if (rep.category === 'RECYCLABLE' || d.includes('WASTE')) return 'RECYCLABLE';
  if (
    rep.reportType === 'ASSET' ||
    d.includes('FURNITURE') ||
    d.includes('ELECTRONICS') ||
    d.includes('FIXTURES') ||
    d.includes('EQUIPMENT')
  ) {
    return 'ASSET';
  }
  return 'GENERAL';
}

interface MRFDashboardProps {
  activeTab: string;
  setActiveTab?: (tab: string) => void;
}

export const MRFDashboard: React.FC<MRFDashboardProps> = ({ activeTab, setActiveTab }) => {
  const {
    reports,
    bins,
    updateReportStatus,
    currentUser
  } = useMockData();

  // Dispatch task page (details + weighing) & photo lightbox
  const [dispatchTaskId, setDispatchTaskId] = useState<string | null>(null);
  const [mrfPhotoFull, setMrfPhotoFull] = useState(false);
  const dispatchTask = dispatchTaskId
    ? reports.find((report) => report.id === dispatchTaskId) ?? null
    : null;
  const mrfDetailPhotoSrc = useReportPhoto(dispatchTask?.photoUrl, dispatchTask?.imageUrl);

  // Dispatch Assignment Filter
  const [showOnlyMyAssigned, setShowOnlyMyAssigned] = useState<boolean>(true);
  const [dispatchFolder, setDispatchFolder] = useState<DispatchFolderKey | null>(null);

  const {
    stocksRecord,
    salesHistory,
    totalVendorSales,
    sellBatch,
    addStockKg,
  } = useRecycleMarket();

  const { createScrapItem } = useAssetScrap();

  // All MRF feedback routes through the global toast wrapper (Part 4 §5) so the
  // portal has a single toast implementation; the `showToast` prop signature is
  // kept for every tab that already consumes it.
  const showToast = (msg: string, variant: 'success' | 'error' = 'success') => {
    if (variant === 'error') toast.error(msg);
    else toast.success(msg);
  };

  const getTimeMs = (r: Report) => {
    if (r.timestamp) {
      let ts = r.timestamp.trim();
      if (ts.includes(' ')) {
        ts = ts.replace(' ', 'T');
      }
      if (!ts.endsWith('Z') && !ts.includes('+') && !ts.slice(10).includes('-')) {
        ts += 'Z';
      }
      const val = new Date(ts).getTime();
      if (!isNaN(val) && val > 0) return val;
    }
    if (r.id && r.id.startsWith('rep-')) {
      const num = parseInt(r.id.replace('rep-', ''), 10);
      if (!isNaN(num)) return num;
    }
    return 0;
  };

  // Group active dispatches by location & category so MRF receives ONE primary dispatch task per station, showing the FIRST reporter's report!
  interface DispatchGroup {
    firstReport: Report;
    allReports: Report[];
  }

  const activeDispatchGroups = React.useMemo<DispatchGroup[]>(() => {
    const map = new Map<string, DispatchGroup>();

    reports
      .filter(r => {
        if (r.status !== 'DISPATCHED') return false; // Exclude pending unverified reports!
        if (!showOnlyMyAssigned) return true;
        return (
          !r.assignedMrfId ||
          r.assignedMrfId === currentUser?.id ||
          r.assignedMrfName === currentUser?.name
        );
      })
      .forEach(r => {
        const key = `${r.locationName.trim().toLowerCase()}_${r.category || 'GENERAL'}`;
        if (!map.has(key)) {
          map.set(key, { firstReport: r, allReports: [r] });
        } else {
          const grp = map.get(key)!;
          grp.allReports.push(r);
          // Pick the report with the EARLIEST submission timestamp as firstReport
          if (getTimeMs(r) < getTimeMs(grp.firstReport)) {
            grp.firstReport = r;
          }
        }
      });

    return Array.from(map.values()).sort((a, b) => getTimeMs(a.firstReport) - getTimeMs(b.firstReport));
  }, [reports, showOnlyMyAssigned, currentUser]);

  const activeDispatches = React.useMemo(() => {
    return activeDispatchGroups.map(g => g.firstReport);
  }, [activeDispatchGroups]);

  const dispatchFolders = React.useMemo(
    () => {
      const buckets: Record<DispatchFolderKey, DispatchGroup[]> = {
        RECYCLABLE: [],
        ASSET: [],
        GENERAL: [],
      };
      activeDispatchGroups.forEach((group) => {
        buckets[getDispatchKind(group.firstReport)].push(group);
      });
      return [
        {
          key: 'RECYCLABLE' as const,
          label: 'Recyclable Waste',
          description: 'Recyclables waiting for recovery pickup',
          icon: Recycle,
          groups: buckets.RECYCLABLE,
        },
        {
          key: 'ASSET' as const,
          label: 'Asset Reports',
          description: 'Furniture, electronics, fixtures & equipment',
          icon: Armchair,
          groups: buckets.ASSET,
        },
        {
          key: 'GENERAL' as const,
          label: 'General Waste',
          description: 'Non-recyclable waste dispatches',
          icon: Trash2,
          groups: buckets.GENERAL,
        },
      ];
    },
    [activeDispatchGroups]
  );

  const visibleDispatchGroups = React.useMemo(
    () =>
      dispatchFolder
        ? activeDispatchGroups.filter((group) => getDispatchKind(group.firstReport) === dispatchFolder)
        : activeDispatchGroups,
    [activeDispatchGroups, dispatchFolder]
  );

  const activeDispatchFolder = dispatchFolders.find((folder) => folder.key === dispatchFolder) ?? null;

  const dispatchColumns = React.useMemo<TableColumn<DispatchGroup>[]>(() => {
    const isAssetFolder = activeDispatchFolder?.key === 'ASSET';
    return [
      {
        key: 'item',
        header: isAssetFolder ? 'Asset' : 'Report',
        value: (group) => cleanReportTitle(group.firstReport.title),
        cell: (group) => (
          <div className="min-w-0">
            <p className="truncate font-bold text-[var(--text-strong)]">
              {cleanReportTitle(group.firstReport.title)}
            </p>
            <p className="mt-0.5 truncate text-[10px] font-semibold text-[var(--text-strong)]/45">
              {isAssetFolder
                ? deriveAssetCategory(group.firstReport.description)
                : formatReportCategory(group.firstReport.category)}
              {group.allReports.length > 1 && (
                <span className="ml-1.5 inline-flex items-center gap-1">
                  <Users size={9} /> {group.allReports.length} merged
                </span>
              )}
            </p>
          </div>
        ),
      },
      {
        key: 'location',
        header: 'Location',
        className: 'hidden md:table-cell',
        value: (group) => cleanLocationName(group.firstReport.locationName),
        cell: (group) => (
          <span className="block max-w-[210px] truncate font-semibold text-[var(--text-strong)]/70 lg:max-w-[340px]">
            {cleanLocationName(group.firstReport.locationName)}
          </span>
        ),
      },
      {
        key: 'reported',
        header: 'Reported',
        className: 'hidden lg:table-cell',
        value: (group) => group.firstReport.timestamp,
        cell: (group) => (
          <span className="whitespace-nowrap text-[var(--text-strong)]/55">
            {formatShortDate(group.firstReport.timestamp)}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        value: (group) => group.firstReport.status,
        cell: (group) => (
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
              group.firstReport.status === 'PENDING'
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-[var(--primary)]/15 bg-[var(--background)] text-[var(--text-strong)]/65'
            }`}
          >
            {group.firstReport.status === 'PENDING' ? 'Unconfirmed' : 'Ongoing'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Action',
        align: 'right',
        cell: (group) => (
          <button
            type="button"
            onClick={() => setDispatchTaskId(group.firstReport.id)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--primary)]/15 bg-white px-3 py-1.5 text-[11px] font-bold text-[var(--text-strong)]/70 transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
          >
            <Eye size={12} /> View
          </button>
        ),
      },
    ];
  }, [activeDispatchFolder]);

  const handleSellBatch = async (
    cat: ItemizedRecyclableCategory,
    buyerName?: string,
    pricePerKg?: number,
  ): Promise<boolean> => {
    const stockItem = stocksRecord[cat.id];
    const currentKg = stockItem ? stockItem.accumulatedKg : 0;
    if (currentKg <= 0) {
      showToast(`No accumulated weight to sell for ${cat.shortName}.`, 'error');
      return false;
    }

    try {
      const tx = await sellBatch(cat.id, buyerName, pricePerKg);
      const soldKg = tx ? tx.weightKg : 0;
      const revenue = tx ? tx.totalRevenue : 0;
      const remainingKg = Math.max(0, currentKg - soldKg);
      const shop = tx?.buyerName ? ` to ${tx.buyerName}` : '';
      const rate = tx?.marketPriceKg ? ` at ₱${tx.marketPriceKg}/kg` : '';

      showToast(`🎉 Sold ${soldKg.toFixed(1)} kg batch of ${cat.shortName}${shop}${rate} for ₱${revenue.toLocaleString()}! (${remainingKg.toFixed(1)} kg remaining in stock)`);
      return true;
    } catch (err: any) {
      showToast(err?.message || `Vendor sale for ${cat.shortName} could not be completed.`, 'error');
      return false;
    }
  };

  const mrfNeededCount = activeDispatches.length;
  const mrfFirstName = (() => {
    const raw = currentUser?.name?.trim() ?? '';
    if (!raw) return 'MRF';
    const [before, after] = raw.split(',');
    const source = (after?.trim() || before).trim();
    return source.split(/\s+/)[0] || 'MRF';
  })();
  const wasteTaskCount = activeDispatches.filter(r =>
    r.reportType === 'WASTE' || r.category === 'RECYCLABLE' || r.description.toUpperCase().includes('WASTE')
  ).length;
  const assetTaskCount = activeDispatches.filter(r =>
    r.reportType === 'ASSET' ||
    r.description.toUpperCase().includes('FURNITURE') ||
    r.description.toUpperCase().includes('ELECTRONICS') ||
    r.description.toUpperCase().includes('FIXTURES') ||
    r.description.toUpperCase().includes('EQUIPMENT') ||
    r.description.toUpperCase().includes('OTHER')
  ).length;

  const handleConfirmDispatch = (report: Report) => {
    updateReportStatus(report.id, 'DISPATCHED');
    showToast(`Dispatch confirmed! Admin status updated to "Ongoing / Doing it now".`);
  };

  const handleTaskComplete = async (report: Report, payload: TaskCompletionPayload) => {
    const {
      itemWeights,
      otherMaterialName,
      otherMaterialKg,
      assetOutcome,
      assetScrapMaterial,
      assetScrapKg,
      weightKg,
      notes,
    } = payload;

    const isRecyclable =
      report.category === 'RECYCLABLE' || report.description.toUpperCase().includes('WASTE');

    const isAsset =
      report.reportType === 'ASSET' ||
      report.description.toUpperCase().includes('FURNITURE') ||
      report.description.toUpperCase().includes('ELECTRONICS') ||
      report.description.toUpperCase().includes('FIXTURES') ||
      report.description.toUpperCase().includes('EQUIPMENT');

    if (isRecyclable) {
      const otherParsedKg = parseFloat(otherMaterialKg) || 0;
      const otherLabel = otherMaterialName.trim();

      const hasAnyWeight =
        Object.values(itemWeights).some((value) => (parseFloat(value) || 0) > 0) || otherParsedKg > 0;
      if (!hasAnyWeight) {
        showToast('Please enter at least one weight before confirming.');
        return;
      }

      let totalWeight = 0;
      const itemsLogged: string[] = [];
      for (const [catId, kg] of Object.entries(itemWeights)) {
        const parsed = parseFloat(kg) || 0;
        if (parsed > 0) {
          addStockKg(catId, parsed);
          totalWeight += parsed;
          const cat = RECYCLABLE_CATEGORIES.find((entry) => entry.id === catId);
          itemsLogged.push(`${cat?.shortName || catId}: ${parsed}kg`);
        }
      }

      // Non-listed materials are recorded in the notes only: there is no market
      // price/threshold category for them, so they must not inflate sellable stock.
      if (otherParsedKg > 0) {
        totalWeight += otherParsedKg;
        itemsLogged.push(`${otherLabel || 'Other material'}: ${otherParsedKg}kg (not in market stock)`);
      }

      const finalNotes =
        otherParsedKg > 0
          ? [
              notes.trim(),
              `Other material logged: ${otherLabel || 'Unnamed material'} — ${otherParsedKg}kg (not added to market stock)`,
            ]
              .filter(Boolean)
              .join('\n')
          : notes;

      updateReportStatus(report.id, 'COLLECTED', totalWeight, finalNotes);
      showToast(`Logged: ${itemsLogged.join(', ')}. Collection submitted to Admin.`);
    } else if (isAsset) {
      const dispositionValue = LEGACY_ASSET_OUTCOME[assetOutcome] || assetOutcome;
      const disposition =
        ASSET_DISPOSITIONS.find((entry) => entry.value === dispositionValue) || ASSET_DISPOSITIONS[1];
      const parsedKg = parseFloat(assetScrapKg) || 0;

      updateReportStatus(report.id, 'RESOLVED', undefined, notes, disposition.value);

      // Record the asset in the ledger first so the scrap item can reference it.
      const assetTitle = cleanReportTitle(report.title);
      let assetRecordId: string | undefined;
      try {
        const assetRecord = await apiService.createAssetRecord({
          assetName: assetTitle,
          category: deriveAssetCategory(report.description),
          action: disposition.action,
          disposition: disposition.value,
          quantity: 1,
          unit: 'pcs',
          condition: disposition.condition,
          sourceReportId: report.id,
          locationName: cleanLocationName(report.locationName),
          notes: notes || undefined,
        });
        assetRecordId = assetRecord?.id;
      } catch (err) {
        console.warn('Asset record creation notice:', err);
      }

      // Scrap/e-waste assets become a per-material item. If no weight was entered
      // it is logged as AWAITING_WEIGHT so it stays visible in the Scrap Stock
      // queue instead of silently vanishing.
      if (disposition.scrap || disposition.hazmat) {
        const scrapMaterialCode = disposition.hazmat ? 'e_waste' : assetScrapMaterial;
        try {
          if (parsedKg > 0) {
            await createScrapItem({
              materialCode: scrapMaterialCode,
              weightKg: parsedKg,
              status: 'IN_STOCK',
              description: assetTitle,
              sourceAssetId: assetRecordId,
              sourceReportId: report.id,
            });
            showToast(
              disposition.hazmat
                ? `E-waste recorded (${parsedKg} kg) — route to a DENR-accredited handler (not sold as ordinary scrap).`
                : `Recorded ${parsedKg} kg of scrap; asset logged in the ledger.`,
            );
          } else {
            await createScrapItem({
              materialCode: scrapMaterialCode,
              status: 'AWAITING_WEIGHT',
              description: assetTitle,
              sourceAssetId: assetRecordId,
              sourceReportId: report.id,
            });
            showToast(
              disposition.hazmat
                ? 'E-waste logged as unweighed — record its disposal in Scrap Stock.'
                : 'Asset logged as unweighed scrap — weigh it in Scrap Stock when ready.',
            );
          }
        } catch (err) {
          console.warn('Scrap item creation notice:', err);
          showToast('Asset recorded, but the scrap stock update failed.');
        }
      } else {
        showToast(`Asset outcome recorded: ${disposition.value}.`);
      }
    } else {
      // Non-recyclable collections (residual, biodegradable) are weighed
      // manually, so residual is monitored by weight rather than always 0 kg.
      updateReportStatus(report.id, 'COLLECTED', parseFloat(weightKg) || 0, notes);
      showToast(`Job finished! Cleanup verified and collection report sent to Admin.`);
    }

    setDispatchTaskId(null);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">

      {/* ── 1. DASHBOARD OVERVIEW VIEW ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">

          {/* Hero */}
          <section className="relative overflow-hidden rounded-3xl bg-[var(--primary)] p-5 text-[var(--on-primary)] shadow-lg sm:p-6">
            <div className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -right-4 -top-6 h-24 w-24 rounded-full bg-white/5" />

            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--on-primary)]/55">MRF Terminal</p>
                <h2 className="mt-1 truncate text-xl font-heading font-black tracking-tight text-[var(--on-primary)]">
                  Welcome, {mrfFirstName}
                </h2>
                <p className="mt-0.5 text-[11px] font-medium text-[var(--on-primary)]/60">
                  {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                </p>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
                <Recycle size={18} />
              </span>
            </div>

            <div className="relative mt-5 grid grid-cols-3 divide-x divide-white/10 overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/10">
              <button
                type="button"
                onClick={() => setActiveTab?.('dispatches')}
                className="cursor-pointer px-3.5 py-3 text-left transition-colors hover:bg-white/5 sm:px-4"
              >
                <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--on-primary)]/50">Active</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-xl font-heading font-black">
                  {mrfNeededCount}
                  {mrfNeededCount > 0 && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-300" aria-hidden="true" />}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab?.('dispatches')}
                className="cursor-pointer px-3.5 py-3 text-left transition-colors hover:bg-white/5 sm:px-4"
              >
                <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--on-primary)]/50">Waste</span>
                <span className="mt-0.5 block text-xl font-heading font-black">{wasteTaskCount}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab?.('dispatches')}
                className="cursor-pointer px-3.5 py-3 text-left transition-colors hover:bg-white/5 sm:px-4"
              >
                <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--on-primary)]/50">Assets</span>
                <span className="mt-0.5 block text-xl font-heading font-black">{assetTaskCount}</span>
              </button>
            </div>
          </section>

          {/* Dispatch queue + market */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
            <section className="rounded-3xl border border-white/80 bg-white/95 p-4 shadow-sm backdrop-blur-md sm:p-5 lg:col-span-7">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--danger)]/10 text-[var(--danger-strong)]">
                    <Zap size={15} />
                  </span>
                  <div>
                    <h3 className="text-sm font-heading font-bold text-[var(--text-strong)]">Dispatch queue</h3>
                    <p className="text-[10px] font-medium text-[var(--text-strong)]/45">{activeDispatches.length} active</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab?.('dispatches')}
                  className="flex cursor-pointer items-center gap-1 text-[11px] font-bold text-[var(--accent)] hover:underline"
                >
                  View all <ArrowRight size={12} />
                </button>
              </div>

              {activeDispatches.length === 0 ? (
                <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--primary)]/15 bg-[var(--background)]/40 px-4 py-8 text-center">
                  <CheckCircle2 size={20} className="text-[var(--accent)]" />
                  <p className="text-xs font-semibold text-[var(--text-strong)]/55">All caught up — no active dispatches.</p>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {activeDispatches.slice(0, 3).map((rep, index) => (
                    <button
                      key={rep.id}
                      type="button"
                      onClick={() => setActiveTab?.('dispatches')}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                        index === 0
                          ? 'border-[var(--danger)]/20 bg-[var(--danger)]/[0.04]'
                          : 'border-[var(--primary)]/10 bg-white hover:bg-[var(--background)]/60'
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          index === 0
                            ? 'bg-[var(--danger)]/10 text-[var(--danger-strong)]'
                            : 'bg-[var(--primary)]/[0.06] text-[var(--text-strong)]/55'
                        }`}
                      >
                        {index === 0 ? <AlertCircle size={16} /> : <span className="text-[11px] font-black">#{index + 1}</span>}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-[var(--text-strong)]">{cleanReportTitle(rep.title)}</span>
                        <span className="mt-0.5 flex items-center gap-1 truncate text-[10px] font-medium text-[var(--text-strong)]/50">
                          <MapPin size={10} className="shrink-0 text-[var(--accent)]" /> {cleanLocationName(rep.locationName)}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${
                          rep.status === 'PENDING'
                            ? 'border-amber-200 bg-amber-50 text-amber-800'
                            : 'border-[var(--primary)]/15 bg-[var(--background)] text-[var(--text-strong)]/60'
                        }`}
                      >
                        {rep.status === 'PENDING' ? 'Unconfirmed' : 'Ongoing'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Recyclables market */}
            <section className="flex flex-col rounded-3xl border border-white/80 bg-white/95 p-4 shadow-sm backdrop-blur-md sm:p-5 lg:col-span-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
                    <Coins size={15} />
                  </span>
                  <div>
                    <h3 className="text-sm font-heading font-bold text-[var(--text-strong)]">Recyclables market</h3>
                    <p className="text-[10px] font-medium text-[var(--text-strong)]/45">Stock & sales</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-[var(--accent)]/10 px-2.5 py-1 text-[10px] font-black text-[var(--accent)]">
                  ₱{totalVendorSales.toLocaleString()}
                </span>
              </div>

              <div className="mt-4 flex-1 space-y-2.5">
                {RECYCLABLE_CATEGORIES.map(cat => {
                  const stockItem = stocksRecord[cat.id];
                  const currentKg = stockItem ? stockItem.accumulatedKg : 0;
                  const thresholdKg = stockItem ? stockItem.thresholdLimitKg : cat.thresholdLimitKg;
                  const isApproved = stockItem ? stockItem.isApprovedForSale === true : false;
                  const pct = Math.min(100, Math.round((currentKg / thresholdKg) * 100));
                  const isThresholdReached = currentKg >= thresholdKg;

                  return (
                    <div key={cat.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="truncate font-bold text-[var(--text-strong)]">{cat.shortName}</span>
                        <span className="flex shrink-0 items-center gap-1.5 font-semibold text-[var(--text-strong)]/50">
                          {isApproved && <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" title="Ready to sell" />}
                          {!isApproved && isThresholdReached && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="Awaiting admin approval" />}
                          {currentKg.toFixed(1)} / {thresholdKg} kg
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--primary)]/[0.07]">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isApproved ? cat.barColor : isThresholdReached ? 'bg-amber-400 animate-pulse' : cat.barColor
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setActiveTab?.('mrf-market')}
                className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[var(--accent)]/10 px-4 py-2.5 text-xs font-extrabold text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/20"
              >
                Open market <ArrowRight size={13} />
              </button>
            </section>
          </div>

          {/* Quick actions (desktop) */}
          <section className="hidden lg:block">
            <h3 className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--text-strong)]/45">Quick actions</h3>
            <div className="mt-3 grid grid-cols-4 gap-3">
              {[
                { id: 'mrf-walkin', label: 'Walk-in station', icon: Recycle },
                { id: 'mrf-direct', label: 'Direct pickup', icon: Truck },
                { id: 'mrf-scrap', label: 'Scrap stock', icon: Trash2 },
                { id: 'mrf-market', label: 'Recycle market', icon: Coins },
              ].map((action) => {
                const ActionIcon = action.icon;
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => setActiveTab?.(action.id)}
                    className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/80 bg-white/95 p-4 text-left shadow-sm backdrop-blur-md transition-colors hover:border-[var(--accent)]/30 hover:bg-[var(--accent)]/[0.02]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
                      <ActionIcon size={16} />
                    </span>
                    <span className="min-w-0 text-xs font-bold text-[var(--text-strong)]">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

        </div>
      )}

      {/* ── LIVE BIN MAP (admin edits it in Settings → Locations) ── */}
      {activeTab === 'mrf-bin-map' && (
        <MRFBinMapTab bins={bins} reports={reports} />
      )}

      {/* ── 2. ACTIVE DISPATCHES DEDICATED VIEW ── */}
      {activeTab === 'dispatches' && (
        dispatchTask ? (
          <MRFTaskPage
            key={dispatchTask.id}
            report={dispatchTask}
            folderLabel={activeDispatchFolder?.label ?? 'Tasks'}
            photoSrc={mrfDetailPhotoSrc}
            onBack={() => setDispatchTaskId(null)}
            onConfirmDispatch={handleConfirmDispatch}
            onComplete={(payload) => handleTaskComplete(dispatchTask, payload)}
            onOpenPhoto={() => setMrfPhotoFull(true)}
          />
        ) : (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 mb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowOnlyMyAssigned(!showOnlyMyAssigned)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  showOnlyMyAssigned
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Filter size={13} className="text-[var(--accent)]" />
                {showOnlyMyAssigned ? `Only My Assigned Tasks (${activeDispatches.length})` : `All Campus Dispatches (${reports.filter(r => r.status === 'DISPATCHED').length})`}
              </button>
            </div>
          </div>

          {activeDispatches.length === 0 ? (
            <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-12 text-center space-y-3">
              <div className="h-14 w-14 mx-auto rounded-2xl bg-[color-mix(in_srgb,var(--accent)_10%,white)] text-[var(--accent)] flex items-center justify-center">
                <CheckCircle2 size={28} />
              </div>
              <p className="text-base font-bold text-[var(--text-strong)]">All clear! No active dispatches assigned.</p>
              <p className="text-xs text-[var(--text-strong)]/50">When the Admin dispatches a pickup task, it will pop up right here.</p>
            </div>
          ) : dispatchFolder === null ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {dispatchFolders.filter((folder) => folder.groups.length > 0).map((folder, index) => {
                const FolderIcon = folder.icon;
                const rampNumber = Math.min(index + 1, 4);
                const latestMs = folder.groups.reduce(
                  (max, group) => Math.max(max, getTimeMs(group.firstReport)),
                  0,
                );
                return (
                  <button
                    key={folder.key}
                    type="button"
                    onClick={() => setDispatchFolder(folder.key)}
                    style={
                      {
                        '--ramp': `var(--ramp-${rampNumber})`,
                        '--ramp-strong': `var(--ramp-${rampNumber}-strong)`,
                      } as React.CSSProperties
                    }
                    className="flex h-full w-full cursor-pointer flex-col rounded-3xl border border-[var(--ramp)]/35 bg-white/95 p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-[var(--ramp)]/60 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-bold leading-tight text-[var(--text-strong)]">
                          {folder.label}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-strong)]/50">{folder.description}</p>
                      </div>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--ramp)] text-white shadow-xs">
                        <FolderIcon size={17} />
                      </span>
                    </div>
                    <div className="mt-auto flex items-center gap-2 pt-4">
                      <span className="shrink-0 rounded-full border border-[var(--ramp)]/30 bg-[color-mix(in_srgb,var(--ramp)_15%,white)] px-3 py-1 text-[11px] font-bold text-[var(--ramp-strong)]">
                        {folder.groups.length} {folder.groups.length === 1 ? 'task' : 'tasks'}
                      </span>
                      <span className="truncate text-[11px] text-[var(--text-strong)]/45">
                        {latestMs
                          ? `Latest: ${new Date(latestMs).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}`
                          : 'No activity yet'}
                      </span>
                      <ChevronRight
                        size={16}
                        className="ml-auto shrink-0 text-[var(--ramp-strong)]/70"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDispatchFolder(null)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold text-[var(--text-strong)]/70 transition hover:bg-[color-mix(in_srgb,var(--primary)_6%,white)]"
                >
                  <ArrowLeft size={13} /> Back
                </button>
                <span className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[var(--text-strong)]/60">
                  <FolderTree size={14} className="text-[var(--accent)]" />
                  <button
                    type="button"
                    onClick={() => setDispatchFolder(null)}
                    className="cursor-pointer transition hover:text-[var(--text-strong)]"
                  >
                    Dispatches
                  </button>
                  <ChevronRight size={13} className="text-[var(--text-strong)]/30" />
                  <span className="font-bold text-[var(--text-strong)]">
                    {activeDispatchFolder?.label ?? 'Tasks'}
                  </span>
                </span>
              </div>

              <DataTable
                columns={dispatchColumns}
                rows={visibleDispatchGroups}
                rowKey={(group) => group.firstReport.id}
                searchable
                searchPlaceholder={
                  activeDispatchFolder?.key === 'ASSET'
                    ? 'Search asset, location, or reporter…'
                    : 'Search report, location, or reporter…'
                }
                searchText={(group) =>
                  `${cleanReportTitle(group.firstReport.title)} ${cleanLocationName(group.firstReport.locationName)} ${group.firstReport.reporterName} ${group.firstReport.category} ${group.firstReport.description}`
                }
                emptyTitle="No active tasks in this folder."
                emptyHint="New dispatches appear here automatically."
                mobileCard={(group) => {
                  const rep = group.firstReport;
                  const pending = rep.status === 'PENDING';
                  return (
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[var(--text-strong)]">
                            {cleanReportTitle(rep.title)}
                          </p>
                          <p className="mt-0.5 truncate text-[10px] font-semibold text-[var(--text-strong)]/45">
                            {activeDispatchFolder?.key === 'ASSET'
                              ? deriveAssetCategory(rep.description)
                              : formatReportCategory(rep.category)}
                            {group.allReports.length > 1 && ` · ${group.allReports.length} merged`}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                            pending
                              ? 'border-amber-200 bg-amber-50 text-amber-800'
                              : 'border-[var(--primary)]/15 bg-[var(--background)] text-[var(--text-strong)]/65'
                          }`}
                        >
                          {pending ? 'Unconfirmed' : 'Ongoing'}
                        </span>
                      </div>
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-strong)]/60">
                        <MapPin size={12} className="shrink-0 text-[var(--accent)]" />
                        <span className="truncate">{cleanLocationName(rep.locationName)}</span>
                      </p>
                      <div className="flex items-center justify-between gap-2 border-t border-[var(--primary)]/5 pt-2">
                        <span className="text-[10px] font-medium text-[var(--text-strong)]/40">
                          {formatShortDate(rep.timestamp)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDispatchTaskId(rep.id)}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--primary)]/15 bg-white px-3 py-1.5 text-[11px] font-bold text-[var(--text-strong)]/70 transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
                        >
                          <Eye size={12} /> View
                        </button>
                      </div>
                    </div>
                  );
                }}
                paginate={false}
              />
            </div>
          )}
        </div>
        )
      )}

      {/* ── WALK-IN BOTTLE STATION ── */}
      {activeTab === 'mrf-walkin' && (
        <MRFWalkInTab showToast={showToast} />
      )}

      {/* ── 4. DIRECT UNSCHEDULED PICKUP PAGE ── */}
      {activeTab === 'mrf-direct' && (
        <MRFDirectPickupTab
          bins={bins}
          addStockKg={addStockKg}
          showToast={showToast}
        />
      )}

      {/* ── ASSET LEDGER TAB ── */}
      {activeTab === 'mrf-assets' && (
        <MRFAssetLedgerPage showToast={showToast} />
      )}

      {/* ── SCRAP RECOVERY STOCK TAB ── */}
      {activeTab === 'mrf-scrap' && (
        <AssetScrapStockTab showToast={showToast} />
      )}

      {/* ── 5. ITEMIZED RECYCLABLE MARKET & SELLING THRESHOLD TRACKER ── */}
      {activeTab === 'mrf-market' && (
        <MRFMarketTab
          stocksRecord={stocksRecord}
          salesHistory={salesHistory}
          handleSellBatch={handleSellBatch}
        />
      )}

      {/* ── 3. COLLECTION HISTORY VIEW ── */}
      {activeTab === 'mrf-history' && (
        <MRFHistoryTab reports={reports} />
      )}

      <PhotoLightbox
        src={mrfPhotoFull ? mrfDetailPhotoSrc : null}
        alt="Waste report evidence full view"
        caption="Photo Evidence"
        onClose={() => setMrfPhotoFull(false)}
      />

    </div>
  );
};
