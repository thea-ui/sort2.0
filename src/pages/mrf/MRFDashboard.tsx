import React, { useState } from 'react';
import { useMockData } from '../../hooks/useMockData';
import { useRecycleMarket } from '../../hooks/useRecycleMarket';
import { useAssetScrap } from '../../hooks/useAssetScrap';
import { toast } from '../../hooks/useToast';
import { Report } from '../../types';
import { isReportDoneAndExpired, cleanReportTitle, cleanLocationName, parseReportTags, stripReportTags } from '../../utils/reportUtils';
import { ASSET_DISPOSITIONS } from '../../utils/assetDispositions';
import { apiService } from '../../services/api';
import {
  Truck,
  Scale,
  MapPin,
  CheckCircle2,
  Play,
  X,
  Wrench,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Activity,
  LayoutDashboard,
  Zap,
  Recycle,
  Armchair,
  Trash2,
  AlertTriangle,
  Eye,
  Map as MapIcon,
  Target,
  User,
  Users,
  Clock,
  Coins,
  DollarSign,
  Plus,
  Sparkles,
  Filter,
  Check,
  ChevronRight,
  FolderTree,
  ShoppingBag,
  Navigation,
  Maximize2,
} from 'lucide-react';
import { MRFDirectPickupTab } from './components/MRFDirectPickupTab';
import { MRFWalkInTab } from './components/MRFWalkInTab';
import { MRFBinMapTab } from './components/MRFBinMapTab';
import { MRFMarketTab } from './components/MRFMarketTab';
import { MRFAssetLedgerPage } from './components/MRFAssetLedgerPage';
import { AssetScrapStockTab } from './components/AssetScrapStockTab';
import { MRFHistoryTab } from './components/MRFHistoryTab';
import { CollectedItemsInput } from './components/CollectedItemsInput';
import { computeCollectionTotals } from '../../utils/collectionTotals';
import { ModalPortal } from '../../components/common/ModalPortal';
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

  // Completion & Detail Modal States
  const [completeModalReport, setCompleteModalReport] = useState<Report | null>(null);
  const [mrfDetailReport, setMrfDetailReport] = useState<Report | null>(null);
  const [mrfPhotoFull, setMrfPhotoFull] = useState(false);
  const mrfDetailPhotoSrc = useReportPhoto(mrfDetailReport?.photoUrl, mrfDetailReport?.imageUrl);
  const [weightKg, setWeightKg] = useState<string>('');
  const [itemWeights, setItemWeights] = useState<Record<string, string>>({
    pet_plastic: '',
    aluminum_cans: '',
    cardboard: '',
    glass: '',
  });
  const [assetOutcome, setAssetOutcome] = useState<string>(ASSET_DISPOSITIONS[1].value);
  const [assetScrapMaterial, setAssetScrapMaterial] = useState<string>('ferrous_metal');
  const [assetScrapKg, setAssetScrapKg] = useState<string>('');
  const [otherMaterialName, setOtherMaterialName] = useState<string>('');
  const [otherMaterialKg, setOtherMaterialKg] = useState<string>('');
  const [completionNotes, setCompletionNotes] = useState<string>('');

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

  const openCompleteModal = (report: Report) => {
    setItemWeights({ pet_plastic: '', aluminum_cans: '', cardboard: '', glass: '' });
    setOtherMaterialKg('');
    setOtherMaterialName(report.otherMaterialLabel || '');
    setWeightKg('');
    setCompletionNotes('');
    setCompleteModalReport(report);
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeModalReport) return;
    const report = completeModalReport;

    const isRecyclable = completeModalReport.category === 'RECYCLABLE' ||
      completeModalReport.description.toUpperCase().includes('WASTE');

    const isAsset = completeModalReport.reportType === 'ASSET' ||
      completeModalReport.description.toUpperCase().includes('FURNITURE') ||
      completeModalReport.description.toUpperCase().includes('ELECTRONICS') ||
      completeModalReport.description.toUpperCase().includes('FIXTURES') ||
      completeModalReport.description.toUpperCase().includes('EQUIPMENT');

    if (isRecyclable) {
      const otherParsedKg = parseFloat(otherMaterialKg) || 0;
      const otherLabel = otherMaterialName.trim();

      // Require at least one weight entered
      const hasAnyWeight = Object.values(itemWeights).some(v => (parseFloat(v) || 0) > 0) || otherParsedKg > 0;
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
          const cat = RECYCLABLE_CATEGORIES.find(c => c.id === catId);
          itemsLogged.push(`${cat?.shortName || catId}: ${parsed}kg`);
        }
      }

      // Non-listed materials are recorded in the notes only: there is no market
      // price/threshold category for them, so they must not inflate sellable stock.
      if (otherParsedKg > 0) {
        totalWeight += otherParsedKg;
        itemsLogged.push(`${otherLabel || 'Other material'}: ${otherParsedKg}kg (not in market stock)`);
      }

      const finalNotes = otherParsedKg > 0
        ? [completionNotes.trim(), `Other material logged: ${otherLabel || 'Unnamed material'} — ${otherParsedKg}kg (not added to market stock)`].filter(Boolean).join('\n')
        : completionNotes;

      updateReportStatus(completeModalReport.id, 'COLLECTED', totalWeight, finalNotes);
      showToast(`Logged: ${itemsLogged.join(', ')}. Collection submitted to Admin.`);
    } else if (isAsset) {
      const dispositionValue = LEGACY_ASSET_OUTCOME[assetOutcome] || assetOutcome;
      const disposition = ASSET_DISPOSITIONS.find(d => d.value === dispositionValue) || ASSET_DISPOSITIONS[1];
      const parsedKg = parseFloat(assetScrapKg) || 0;

      updateReportStatus(report.id, 'RESOLVED', undefined, completionNotes, disposition.value);

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
          notes: completionNotes || undefined,
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
            showToast(disposition.hazmat
              ? `E-waste recorded (${parsedKg} kg) — route to a DENR-accredited handler (not sold as ordinary scrap).`
              : `Recorded ${parsedKg} kg of scrap; asset logged in the ledger.`);
          } else {
            await createScrapItem({
              materialCode: scrapMaterialCode,
              status: 'AWAITING_WEIGHT',
              description: assetTitle,
              sourceAssetId: assetRecordId,
              sourceReportId: report.id,
            });
            showToast(disposition.hazmat
              ? 'E-waste logged as unweighed — record its disposal in Scrap Stock.'
              : 'Asset logged as unweighed scrap — weigh it in Scrap Stock when ready.');
          }
        } catch (err) {
          console.warn('Scrap item creation notice:', err);
          showToast('Asset recorded, but the scrap stock update failed.');
        }
      } else {
        showToast(`Asset outcome recorded: ${disposition.value}.`);
      }

      setAssetScrapKg('');
    } else {
        // Non-recyclable collections (residual, biodegradable) are weighed
        // manually. Previously this passed `undefined`, so residual was
        // always recorded as 0 kg and could never be monitored by weight.
        updateReportStatus(completeModalReport.id, 'COLLECTED', parseFloat(weightKg) || 0, completionNotes);
      showToast(`Job finished! Cleanup verified and collection report sent to Admin.`);
    }

    setCompleteModalReport(null);
    setWeightKg('');
    setItemWeights({ pet_plastic: '', aluminum_cans: '', cardboard: '', glass: '' });
    setOtherMaterialName('');
    setOtherMaterialKg('');
    setCompletionNotes('');
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

              {visibleDispatchGroups.length === 0 ? (
                <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-8 text-center text-xs text-[var(--text-strong)]/50">
                  No active tasks in this folder right now.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {visibleDispatchGroups.map(group => {
                const rep = group.firstReport;
                const mergedCount = group.allReports.length;
                const isRecyclable = rep.category === 'RECYCLABLE' || rep.description.toUpperCase().includes('WASTE');
                const isAsset = rep.reportType === 'ASSET' ||
                  rep.description.toUpperCase().includes('FURNITURE') ||
                  rep.description.toUpperCase().includes('ELECTRONICS') ||
                  rep.description.toUpperCase().includes('FIXTURES') ||
                  rep.description.toUpperCase().includes('EQUIPMENT');

                const CategoryIcon = isRecyclable ? Recycle : isAsset ? Armchair : Trash2;
                const categoryLabel = isRecyclable ? 'Recyclables' : isAsset ? 'Asset Task' : 'General Waste';
                const categoryStyle = isRecyclable
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                  : isAsset
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-zinc-100 text-zinc-600';

                const isPending = rep.status === 'PENDING';
                const cardAccent = isPending ? 'border-l-amber-400' : 'border-l-[var(--accent)]';

                return (
                  <div
                    key={rep.id}
                    className={`bg-white/95 backdrop-blur-md border border-white/80 border-l-4 ${cardAccent} rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row justify-between items-start gap-5`}
                  >
                    <div className="space-y-2 min-w-0 flex-1">
                      {/* Pills row */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`flex items-center gap-1.5 text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${categoryStyle}`}>
                          <CategoryIcon size={11} />
                          {categoryLabel}
                        </span>
                        {rep.urgency === 'HIGH' && (
                          <span className="flex items-center gap-1 text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-[var(--danger)]/10 text-[var(--danger-strong)]">
                            <AlertTriangle size={10} /> Urgent
                          </span>
                        )}
                        <span className={`text-[9px] font-bold uppercase px-2.5 py-1 rounded-full ${
                          isPending ? 'bg-amber-100 text-amber-700' : 'bg-[color-mix(in_srgb,var(--primary)_10%,white)] text-[var(--text-strong)]'
                        }`}>
                          {isPending ? 'Unconfirmed' : 'Ongoing'}
                        </span>
                        {mergedCount > 1 && (
                          <span className="bg-[color-mix(in_srgb,var(--primary)_10%,white)] border border-[var(--primary)]/25 text-[var(--text-strong)] text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
                            <Users size={11} /> {mergedCount} reports merged
                          </span>
                        )}
                      </div>

                      {/* High-Visibility Location Badge */}
                      <div className="bg-[color-mix(in_srgb,var(--accent)_10%,white)] border border-[var(--accent)]/30 px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 text-xs text-[var(--text-strong)]">
                        <MapPin size={14} className="text-[var(--accent)] shrink-0" />
                        <span className="font-extrabold text-sm text-[var(--text-strong)]">{cleanLocationName(rep.locationName)}</span>
                      </div>

                      {/* Title */}
                      <h4 className="text-base font-bold text-[var(--text-strong)] tracking-tight leading-snug">{cleanReportTitle(rep.title)}</h4>

                      {/* Description — clean, no box */}
                      <p className="text-xs text-[var(--text-strong)]/60 leading-relaxed">
                        {rep.description}
                      </p>

                      {/* Reporter */}
                      <p className="text-[11px] text-[var(--text-strong)]/50 font-medium flex flex-wrap items-center gap-2">
                        <span>
                          <span className="font-bold text-[var(--text-strong)]">{rep.reporterName}</span> · {rep.timestamp}
                        </span>
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="shrink-0 w-full sm:w-auto self-center flex flex-col gap-2">
                      <button
                        onClick={() => setMrfDetailReport(rep)}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-[var(--text-strong)] text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye size={13} className="text-[var(--accent)]" /> View Map & Details
                      </button>

                      {isPending ? (
                        <button
                          onClick={() => handleConfirmDispatch(rep)}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white text-xs font-bold shadow-md shadow-[var(--accent)]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Play size={13} /> Confirm Dispatch
                        </button>
                      ) : (
                        <button
                          onClick={() => openCompleteModal(rep)}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary)] text-white text-xs font-bold shadow-md shadow-[var(--primary)]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <CheckCircle2 size={13} /> Complete & Finish
                        </button>
                      )}
                    </div>
                  </div>
                );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
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

      {/* ── JOB COMPLETION MODAL (Redesigned) ── */}
      {completeModalReport && (
        <ModalPortal>
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setCompleteModalReport(null); }}
        >
          {(() => {
            const isRecyclable = completeModalReport.category === 'RECYCLABLE' || completeModalReport.description.toUpperCase().includes('WASTE');
            const isAsset = completeModalReport.reportType === 'ASSET' ||
              completeModalReport.description.toUpperCase().includes('FURNITURE') ||
              completeModalReport.description.toUpperCase().includes('ELECTRONICS') ||
              completeModalReport.description.toUpperCase().includes('FIXTURES') ||
              completeModalReport.description.toUpperCase().includes('EQUIPMENT');

            const totalWeight = isRecyclable
              ? computeCollectionTotals(itemWeights, otherMaterialKg).totalWeight
              : (parseFloat(weightKg) || 0);

            const urgencyConfig = {
              LOW: { label: 'Low Priority', dot: 'bg-emerald-400', ring: 'ring-emerald-400/20', text: 'text-emerald-700', bg: 'bg-emerald-50' },
              MEDIUM: { label: 'Medium Priority', dot: 'bg-amber-400', ring: 'ring-amber-400/20', text: 'text-amber-700', bg: 'bg-amber-50' },
              HIGH: { label: 'High Priority', dot: 'bg-red-500', ring: 'ring-red-400/20', text: 'text-red-700', bg: 'bg-red-50' },
            }[completeModalReport.urgency] || { label: 'Standard', dot: 'bg-gray-400', ring: 'ring-gray-400/20', text: 'text-gray-600', bg: 'bg-gray-50' };

            return (
              <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-y-auto relative my-auto max-h-[92dvh]">

            {/* ── Header ── */}
            <div className="bg-gradient-to-br from-[var(--primary)] via-[var(--primary-light)] to-[var(--primary)] px-6 pt-6 pb-5 relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, var(--accent) 0%, transparent 50%), radial-gradient(circle at 80% 20%, var(--accent) 0%, transparent 50%)' }} />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setCompleteModalReport(null); }}
                className="absolute top-4 right-4 p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer z-10"
              >
                <X size={16} />
              </button>

                <div className="flex items-start gap-3 relative z-10">
                  <div className="h-11 w-11 rounded-2xl bg-[color-mix(in_srgb,var(--accent)_20%,white)] ring-1 ring-[var(--accent)]/30 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={20} className="text-[var(--accent)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white tracking-tight">Complete Task Assignment</h3>
                    <p className="text-xs font-black text-white mt-1 leading-snug truncate">{cleanReportTitle(completeModalReport.title)}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <MapPin size={11} className="text-white/50 flex-shrink-0" />
                      <p className="text-[11px] text-white/60 font-medium truncate">{cleanLocationName(completeModalReport.locationName)}</p>
                    </div>
                  </div>
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-2 mt-4 relative z-10 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 ring-1 ring-white/10 text-white/80`}>
                    {isAsset ? deriveAssetCategory(completeModalReport.description) : completeModalReport.category}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${urgencyConfig.bg} ${urgencyConfig.text} ring-1 ring-current/10`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${urgencyConfig.dot} ring-2 ${urgencyConfig.ring}`} />
                    {urgencyConfig.label}
                  </span>
                  {completeModalReport.assignedMrfName && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/10 ring-1 ring-white/10 text-white/60">
                      <User size={10} />
                      {completeModalReport.assignedMrfName}
                    </span>
                  )}
                </div>
              </div>

              {/* ── Body ── */}
              <form onSubmit={handleCompleteSubmit} className="p-6 space-y-4">

                {/* RECYCLABLE: Itemized Weight Inputs — only the materials the
                    student identified are shown, so MRF just weighs and confirms. */}
                {isRecyclable && completeModalReport && (() => {
                  const reportedCodes = completeModalReport.materials ?? [];
                  const hasReportedMaterials = reportedCodes.length > 0;
                  const reportedCategories = hasReportedMaterials
                    ? RECYCLABLE_CATEGORIES.filter(cat => reportedCodes.includes(cat.id))
                    : RECYCLABLE_CATEGORIES;

                  return (
                    <div className="space-y-3">
                      {hasReportedMaterials && (
                        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[var(--primary)]/10 bg-[var(--background)]/50 px-3 py-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-strong)]/40">
                            Student identified
                          </span>
                          {reportedCategories.map(cat => (
                            <span
                              key={cat.id}
                              className="rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--accent)]"
                            >
                              {cat.shortName}
                            </span>
                          ))}
                          {reportedCodes.includes('others') && (
                            <span className="rounded-full border border-[var(--primary)]/15 bg-white px-2 py-0.5 text-[10px] font-bold text-[var(--text-strong)]/70">
                              Mixed / Others{completeModalReport.otherMaterialLabel ? `: ${completeModalReport.otherMaterialLabel}` : ''}
                            </span>
                          )}
                        </div>
                      )}
                      <CollectedItemsInput
                        categories={reportedCategories}
                        itemWeights={itemWeights}
                        onWeightChange={(catId, value) => setItemWeights(prev => ({ ...prev, [catId]: value }))}
                        otherName={otherMaterialName}
                        onOtherNameChange={setOtherMaterialName}
                        otherKg={otherMaterialKg}
                        onOtherKgChange={setOtherMaterialKg}
                      />
                    </div>
                  );
                })()}

                {/* ASSET: Outcome Dropdown */}
                {isAsset && (() => {
                  const tags = parseReportTags(completeModalReport.description);
                  const observation = tags['observation'];
                  const freeText = stripReportTags(completeModalReport.description);
                  return (
                  <div className="space-y-3">
                    {/* Asset details — header already shows name, category, and location */}
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">Asset Details</span>
                        {observation && (
                          <span className="text-[10px] font-bold text-amber-800 bg-white border border-amber-200 px-2 py-0.5 rounded-full capitalize">
                            {observation}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[var(--text-strong)]/60 font-semibold">
                        Reported by {completeModalReport.reporterName}
                      </p>
                      {freeText && (
                        <p className="text-[11px] text-[var(--text-strong)]/70 leading-relaxed">{freeText}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-amber-50 flex items-center justify-center">
                        <Wrench size={14} className="text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[var(--text-strong)]">Select Asset Outcome</p>
                        <p className="text-[10px] text-gray-400 font-medium">Choose resolution status for this asset</p>
                      </div>
                    </div>
                    <select
                      value={assetOutcome}
                      onChange={e => setAssetOutcome(e.target.value)}
                      className="w-full rounded-xl border-2 border-gray-100 bg-white px-3.5 py-2.5 text-xs font-bold text-gray-900 outline-none cursor-pointer focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
                    >
                      <optgroup label="Reuse / Recovery">
                        {ASSET_DISPOSITIONS.filter(d => !d.scrap && !d.hazmat).map(d => (
                          <option key={d.value} value={d.value}>{d.value}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Disposal">
                        {ASSET_DISPOSITIONS.filter(d => d.scrap || d.hazmat).map(d => (
                          <option key={d.value} value={d.value}>{d.value}</option>
                        ))}
                      </optgroup>
                    </select>

                    {(() => {
                      const sel = ASSET_DISPOSITIONS.find(d => d.value === assetOutcome);
                      if (!sel) return null;
                      if (sel.scrap) {
                        return (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Material</label>
                              <select
                                value={assetScrapMaterial}
                                onChange={e => setAssetScrapMaterial(e.target.value)}
                                className="w-full rounded-xl border-2 border-gray-100 bg-white px-3 py-2 text-xs font-bold text-gray-900 outline-none cursor-pointer focus:border-amber-400"
                              >
                                <option value="ferrous_metal">Ferrous Metal (Steel/Iron)</option>
                                <option value="non_ferrous_metal">Non-Ferrous Metal (Aluminum/Copper)</option>
                                <option value="plastic">Hard Plastic</option>
                                <option value="wood">Wood / Lumber</option>
                                <option value="glass">Glass</option>
                                <option value="mixed">Mixed / Other</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Weight (kg) — optional</label>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                placeholder="0.0"
                                value={assetScrapKg}
                                onChange={e => setAssetScrapKg(e.target.value)}
                                className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-900 outline-none focus:bg-white focus:border-amber-400"
                              />
                            </div>
                          </div>
                        );
                      }
                      if (sel.hazmat) {
                        return (
                          <p className="text-[11px] text-rose-600 font-bold bg-rose-50 rounded-xl px-3 py-2 border border-rose-200">
                            E-waste must go to a DENR-accredited handler — it will not be added to sellable scrap stock.
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  );
                })()}

                {/* GENERAL TRASH: Standard Completion */}
                {!isRecyclable && !isAsset && (
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                    <div>
                      <p className="text-xs font-bold text-[var(--text-strong)] mb-1">Standard Waste Collection</p>
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        Confirming will mark this task as done and notify <span className="font-bold text-gray-700">{completeModalReport.reporterName}</span>.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Collected Weight (kg) — optional
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="Leave blank if not weighed"
                        value={weightKg}
                        onChange={e => setWeightKg(e.target.value)}
                        className="w-full rounded-xl border-2 border-gray-100 bg-white px-3.5 py-2.5 text-xs text-gray-900 outline-none placeholder:text-gray-300 focus:border-[var(--accent)]/40 focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
                      />
                      <p className="text-[10px] text-gray-400">
                        Only recyclables are weighed. Residual and biodegradable batches are monitored by report and pickup counts, so you can leave this blank.
                      </p>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Completion Notes (optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Add any observations, issues, or notes for Admin..."
                    value={completionNotes}
                    onChange={e => setCompletionNotes(e.target.value)}
                    className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-900 outline-none resize-none placeholder:text-gray-300 focus:bg-white focus:border-[var(--accent)]/40 focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
                  />
                </div>

                {/* Submit */}
                {isRecyclable && totalWeight === 0 && (
                  <p className="text-[11px] text-amber-600 font-bold text-center bg-amber-50 rounded-xl px-3 py-2 border border-amber-200">
                    Enter at least one weight above to confirm collection.
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isRecyclable && totalWeight === 0}
                  className={`w-full py-3.5 rounded-2xl text-white text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
                    isRecyclable && totalWeight === 0
                      ? 'bg-gray-300 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] hover:from-[var(--accent-dark)] hover:to-[var(--accent-darker)] shadow-lg shadow-[var(--accent)]/25 hover:shadow-[var(--accent)]/40 cursor-pointer'
                  }`}
                >
                  <CheckCircle2 size={16} />
                  {isRecyclable && totalWeight > 0
                    ? `Confirm Completion — ${totalWeight.toFixed(1)} kg Total`
                    : 'Confirm Completion & Notify'
                  }
                </button>
              </form>
            </div>
            );
          })()}
        </div>
        </ModalPortal>
      )}

      {/* ── MRF TASK DETAILS & CAMPUS MINI-MAP PREVIEW MODAL ── */}
      {mrfDetailReport && (() => {
        const minLat = 14.5975, maxLat = 14.6035, minLng = 120.9815, maxLng = 120.9885;
        const lat = mrfDetailReport.coordinates?.lat || 14.6000;
        const lng = mrfDetailReport.coordinates?.lng || 120.9850;
        const pctY = Math.max(8, Math.min(92, ((maxLat - lat) / (maxLat - minLat)) * 100));
        const pctX = Math.max(8, Math.min(92, ((lng - minLng) / (maxLng - minLng)) * 100));

        const isScattered = mrfDetailReport.isScatteredDebris === true ||
          (
            (mrfDetailReport.title.toLowerCase().includes('scattered debris') ||
             mrfDetailReport.locationName.toLowerCase().includes('scattered debris') ||
             mrfDetailReport.description.toLowerCase().includes('[scattered debris pin]')) &&
            !mrfDetailReport.description.toLowerCase().includes('[associated bin id') &&
            !mrfDetailReport.description.toLowerCase().includes('[location:')
          );

        const isPending = mrfDetailReport.status === 'PENDING';

        return (
          <ModalPortal>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
            <div className="bg-white border border-gray-200 rounded-2xl sm:rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl space-y-4 relative my-auto max-h-[92dvh] overflow-y-auto">
              
              {/* Close Button */}
              <button
                onClick={() => setMrfDetailReport(null)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer z-20"
              >
                <X size={18} />
              </button>

              {/* Modal Header */}
              <div className="flex items-start gap-3 border-b border-gray-100 pb-3 pr-8">
                <div className="h-11 w-11 rounded-2xl bg-[color-mix(in_srgb,var(--accent)_15%,white)] text-[var(--accent)] flex items-center justify-center font-bold shrink-0">
                  <Truck size={22} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[var(--primary)] text-white">
                      Task ID: {mrfDetailReport.id}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      isPending ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-[color-mix(in_srgb,var(--primary)_10%,white)] text-[var(--text-strong)] border border-[var(--primary)]/25'
                    }`}>
                      {isPending ? 'Unconfirmed Dispatch' : 'Ongoing Task'}
                    </span>
                  </div>
                  <h3 className="text-base font-heading font-black text-[var(--text-strong)] leading-snug">
                    {cleanReportTitle(mrfDetailReport.title)}
                  </h3>
                </div>
              </div>

              {/* Prominent High-Visibility Campus Location Banner */}
              <div className="bg-[color-mix(in_srgb,var(--accent)_10%,white)] border border-[var(--accent)]/30 p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-wider block">Target Pickup Location</span>
                  <h4 className="text-lg font-heading font-black text-[var(--text-strong)] leading-tight mt-0.5">{cleanLocationName(mrfDetailReport.locationName)}</h4>
                  {isScattered && (
                    <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-mono font-bold text-gray-700 bg-white/90 border border-[var(--accent)]/30 px-2.5 py-0.5 rounded-md">
                      <Navigation size={10} className="text-[var(--accent)]" /> Grid [{lat.toFixed(4)}, {lng.toFixed(4)}]
                    </span>
                  )}
                </div>
                <div className="h-10 w-10 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <MapPin size={22} />
                </div>
              </div>

              {/* Photo Evidence & Report Description Card */}
              <div className="space-y-2">
                {mrfDetailPhotoSrc && (
                  <button
                    type="button"
                    onClick={() => setMrfPhotoFull(true)}
                    className="group relative block w-full rounded-2xl overflow-hidden border border-gray-200 h-44 sm:h-52 bg-gray-100 shadow-inner cursor-zoom-in"
                  >
                    <img src={mrfDetailPhotoSrc} alt="Waste report evidence" className="w-full h-full object-cover" />
                    <span className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-xs text-white text-[10px] px-2.5 py-1 rounded-lg font-mono flex items-center gap-1.5">
                      <Maximize2 size={11} /> Tap to view full screen
                    </span>
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-black/60 p-2.5 text-white">
                        <Maximize2 size={18} />
                      </span>
                    </span>
                  </button>
                )}

                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 text-xs text-gray-800 space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Task Notes & Description:</span>
                  <p className="font-medium leading-relaxed italic text-gray-700">"{mrfDetailReport.description}"</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-gray-100 flex gap-3">
                {isPending ? (
                  <button
                    onClick={() => {
                      handleConfirmDispatch(mrfDetailReport);
                      setMrfDetailReport(null);
                    }}
                    className="flex-1 py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white text-xs font-bold shadow-md shadow-[var(--accent)]/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Play size={15} /> Confirm Dispatch (Start Task)
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const rep = mrfDetailReport;
                      setMrfDetailReport(null);
                      if (rep) openCompleteModal(rep);
                    }}
                    className="flex-1 py-3 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary)] text-white text-xs font-bold shadow-md shadow-[var(--primary)]/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 size={15} /> Complete & Finish Task
                  </button>
                )}
              </div>
            </div>
          </div>
          </ModalPortal>
        );
      })()}

      <PhotoLightbox
        src={mrfPhotoFull ? mrfDetailPhotoSrc : null}
        alt="Waste report evidence full view"
        caption="Photo Evidence"
        onClose={() => setMrfPhotoFull(false)}
      />

    </div>
  );
};
