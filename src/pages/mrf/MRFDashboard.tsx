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
  ShoppingBag,
  Navigation,
  Maximize2,
} from 'lucide-react';
import { MRFDirectPickupTab } from './components/MRFDirectPickupTab';
import { MRFWalkInTab } from './components/MRFWalkInTab';
import { MRFMarketTab } from './components/MRFMarketTab';
import { MRFAssetLedgerPage } from './components/MRFAssetLedgerPage';
import { AssetScrapStockTab } from './components/AssetScrapStockTab';
import { MRFHistoryTab } from './components/MRFHistoryTab';
import { PhotoLightbox } from '../../components/common/PhotoLightbox';

export interface ItemizedRecyclableCategory {
  id: 'pet_plastic' | 'aluminum_cans' | 'cardboard' | 'glass';
  name: string;
  shortName: string;
  thresholdLimitKg: number;
  marketPricePerKg: number;
  color: string;
  bgLight: string;
  borderColor: string;
}

export const RECYCLABLE_CATEGORIES: ItemizedRecyclableCategory[] = [
  { id: 'pet_plastic',   name: 'PET Plastic Bottles', shortName: 'PET Bottles', thresholdLimitKg: 0, marketPricePerKg: 0, color: 'text-[var(--text-strong)]', bgLight: 'bg-[color-mix(in_srgb,var(--primary)_10%,white)]', borderColor: 'border-[var(--primary)]/25' },
  { id: 'aluminum_cans', name: 'Aluminum & Metal Cans', shortName: 'Aluminum Cans', thresholdLimitKg: 0, marketPricePerKg: 0, color: 'text-amber-600', bgLight: 'bg-amber-50', borderColor: 'border-amber-200' },
  { id: 'cardboard',     name: 'Cardboard & Paper', shortName: 'Cardboard', thresholdLimitKg: 0, marketPricePerKg: 0, color: 'text-emerald-600', bgLight: 'bg-emerald-50', borderColor: 'border-emerald-200' },
  { id: 'glass',         name: 'Glass Bottles & Containers', shortName: 'Glass Bottles', thresholdLimitKg: 0, marketPricePerKg: 0, color: 'text-[var(--gold)]', bgLight: 'bg-[color-mix(in_srgb,var(--gold)_10%,white)]', borderColor: 'border-[var(--gold)]/25' },
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
  const [completionNotes, setCompletionNotes] = useState<string>('');

  // Dispatch Assignment Filter
  const [showOnlyMyAssigned, setShowOnlyMyAssigned] = useState<boolean>(true);

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
  const showToast = (msg: string) => {
    toast.success(msg);
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

  const handleSellBatch = async (cat: ItemizedRecyclableCategory) => {
    const stockItem = stocksRecord[cat.id];
    const currentKg = stockItem ? stockItem.accumulatedKg : 0;
    if (currentKg <= 0) {
      showToast(`No accumulated weight to sell for ${cat.shortName}.`);
      return;
    }

    const tx = await sellBatch(cat.id, 'GreenCycle Recycling Vendor');
    const soldKg = tx ? tx.weightKg : (currentKg >= cat.thresholdLimitKg ? cat.thresholdLimitKg : currentKg);
    const revenue = tx ? tx.totalRevenue : Math.round(soldKg * cat.marketPricePerKg);
    const remainingKg = Math.max(0, currentKg - soldKg);

    showToast(`🎉 Sold ${soldKg.toFixed(1)} kg batch of ${cat.shortName} for ₱${revenue.toLocaleString()}! (${remainingKg.toFixed(1)} kg remaining in stock)`);
  };

  const mrfNeededCount = activeDispatches.length;
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
      // Require at least one weight entered
      const hasAnyWeight = Object.values(itemWeights).some(v => (parseFloat(v) || 0) > 0);
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
      updateReportStatus(completeModalReport.id, 'COLLECTED', totalWeight, completionNotes);
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
        // Non-recyclable collections (residual, biodegradable, hazardous) are
        // weighed manually. Previously this passed `undefined`, so residual was
        // always recorded as 0 kg and could never be monitored by weight.
        updateReportStatus(completeModalReport.id, 'COLLECTED', parseFloat(weightKg) || 0, completionNotes);
      showToast(`Job finished! Cleanup verified and collection report sent to Admin.`);
    }

    setCompleteModalReport(null);
    setWeightKg('');
    setItemWeights({ pet_plastic: '', aluminum_cans: '', cardboard: '', glass: '' });
    setCompletionNotes('');
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">

      {/* ── 1. DASHBOARD OVERVIEW VIEW ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Header Subtitle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,white)] border border-[var(--accent)]/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                Control Hub Telemetry
              </span>
              <h3 className="text-xl font-heading font-black text-[var(--text-strong)] mt-1.5">
                Facility Operational Overview
              </h3>
              <p className="text-xs text-[var(--text-strong)]/50 mt-0.5">Live operational statistics, active dispatches status, and campus bin monitor.</p>
            </div>
          </div>

          {/* Quick Summary Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Card 1: MRF Needed (Action Required) */}
            <button
              type="button"
              onClick={() => setActiveTab?.('dispatches')}
              className="bg-gradient-to-br from-[#FFF5F5] to-[#FFF0ED] border border-[#FF5722]/30 rounded-3xl p-5 text-left shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-[#FF5722] bg-[#FF5722]/15 border border-[#FF5722]/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  MRF Needed
                </span>
                <div className="h-9 w-9 rounded-xl bg-[#FF5722] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-110 transition-transform">
                  <AlertCircle size={18} />
                </div>
              </div>
              <div>
                <p className="text-3xl font-heading font-black text-[var(--text-strong)]">
                  {mrfNeededCount}
                </p>
                <p className="text-xs font-extrabold text-[#FF5722] mt-1 group-hover:text-rose-700 transition-colors">Dispatches Needing Attention</p>
                <p className="text-[11px] text-[var(--text-strong)]/60 font-medium mt-0.5">
                  {reports.filter(r => r.status === 'DISPATCHED').length} active dispatches assigned by Admin
                </p>
              </div>
            </button>

            {/* Card 2: Waste & Bin Pickups */}
            <button
              type="button"
              onClick={() => setActiveTab?.('dispatches')}
                              className="bg-gradient-to-br from-[color-mix(in_srgb,var(--accent)_5%,white)] to-[color-mix(in_srgb,var(--accent)_10%,white)] border border-[var(--accent)]/30 rounded-3xl p-5 text-left shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_15%,white)] border border-[var(--accent)]/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Recyclables & Waste
                </span>
                <div className="h-9 w-9 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-110 transition-transform">
                  <Scale size={18} />
                </div>
              </div>
              <div>
                <p className="text-3xl font-heading font-black text-[var(--text-strong)]">
                  {wasteTaskCount}
                </p>
                  <p className="text-xs font-extrabold text-[var(--accent)] mt-1 group-hover:text-[var(--accent-dark)] transition-colors">Waste Collection Tasks</p>
                <p className="text-[11px] text-[var(--text-strong)]/60 font-medium mt-0.5">Bins requiring payload weigh-in</p>
              </div>
            </button>

            {/* Card 3: Asset Repair & Transport */}
            <button
              type="button"
              onClick={() => setActiveTab?.('dispatches')}
              className="bg-gradient-to-br from-[#FFFDF0] to-[#FFFBE6] border border-[var(--gold)]/30 rounded-3xl p-5 text-left shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_15%,white)] border border-[var(--gold)]/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Asset Incidents
                </span>
                <div className="h-9 w-9 rounded-xl bg-[var(--gold)] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-110 transition-transform">
                  <Wrench size={18} />
                </div>
              </div>
              <div>
                <p className="text-3xl font-heading font-black text-[var(--text-strong)]">
                  {assetTaskCount}
                </p>
                <p className="text-xs font-extrabold text-[var(--gold)] mt-1 group-hover:text-amber-700 transition-colors">Asset Maintenance Tasks</p>
                <p className="text-[11px] text-[var(--text-strong)]/60 font-medium mt-0.5">Classroom furniture & fixtures</p>
              </div>
            </button>

          </div>

          {/* 2-Column Split View: Recent Dispatches Preview + Campus Bin Monitor Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

            {/* Active Dispatches Stream Preview */}
            <div className="bg-white/95 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between h-full space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Zap size={18} className="text-[#FF5722]" />
                    <h4 className="text-sm font-heading font-bold text-[var(--text-strong)]">Dispatches Needing Attention</h4>
                  </div>
                  <span className="text-[10px] font-extrabold text-[#FF5722] bg-[#FF5722]/10 border border-[#FF5722]/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {activeDispatches.length} Active
                  </span>
                </div>

                <div className="space-y-3 divide-y divide-gray-100">
                  {activeDispatches.slice(0, 3).map(rep => (
                    <div
                      key={rep.id}
                      onClick={() => setMrfDetailReport(rep)}
                      className="pt-3 first:pt-0 flex items-center justify-between text-xs hover:bg-gray-50 p-2 rounded-2xl transition-colors cursor-pointer group"
                    >
                      <div className="space-y-1 min-w-0 pr-2">
                        <p className="font-bold text-[var(--text-strong)] group-hover:text-[var(--accent)] transition-colors truncate">{cleanReportTitle(rep.title)}</p>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-semibold">
                          <span className="flex items-center gap-1 text-[var(--accent)] font-bold">
                            <MapPin size={11} /> {cleanLocationName(rep.locationName)}
                          </span>
                          <span>• Reporter: {rep.reporterName}</span>
                        </div>
                      </div>
                      <span className={`shrink-0 text-[9px] font-black px-2.5 py-1 rounded-full uppercase ${
                        rep.status === 'PENDING' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-[color-mix(in_srgb,var(--primary)_10%,white)] text-[var(--text-strong)] border border-[var(--primary)]/25'
                      }`}>
                        {rep.status === 'PENDING' ? 'Unconfirmed' : 'Ongoing'}
                      </span>
                    </div>
                  ))}
                  {activeDispatches.length === 0 && (
                    <p className="text-xs text-gray-400 py-6 text-center font-medium">No pending dispatches requiring attention.</p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 mt-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab?.('dispatches')}
                  className="w-full py-2.5 px-4 rounded-2xl bg-[color-mix(in_srgb,var(--primary)_5%,white)] hover:bg-[color-mix(in_srgb,var(--primary)_10%,white)] text-[var(--text-strong)] text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  Manage Actions & Kilo Logs <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* MRF Recyclables Market Batch Telemetry */}
            <div className="bg-white/95 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between h-full space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Coins size={18} className="text-[var(--gold)]" />
                    <h4 className="text-sm font-heading font-bold text-[var(--text-strong)]">Recyclables Market Batch Telemetry</h4>
                  </div>
                  <span className="text-[10px] font-black text-[var(--accent)] bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    ₱{totalVendorSales.toLocaleString()} Sales Revenue
                  </span>
                </div>

                <div className="space-y-3">
                  {RECYCLABLE_CATEGORIES.map(cat => {
                    const stockItem = stocksRecord[cat.id];
                    const currentKg = stockItem ? stockItem.accumulatedKg : 0;
                    const thresholdKg = stockItem ? stockItem.thresholdLimitKg : cat.thresholdLimitKg;
                    const isApproved = stockItem ? stockItem.isApprovedForSale === true : false;
                    const pct = Math.min(100, Math.round((currentKg / thresholdKg) * 100));
                    const isThresholdReached = currentKg >= thresholdKg;

                    return (
                      <div key={cat.id} className="space-y-1.5 p-2 rounded-2xl bg-gray-50 border border-gray-100">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-[var(--text-strong)] flex items-center gap-1.5">
                            <span className={`text-[10px] font-extrabold ${cat.color}`}>{cat.shortName}</span>
                          </span>
                          <div className="flex items-center gap-2">
                            {isApproved ? (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[var(--accent)] text-white">
                                Ready to Sell
                              </span>
                            ) : isThresholdReached ? (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                Awaiting Admin
                              </span>
                            ) : null}
                            <span className="text-[11px] font-bold text-gray-700">{currentKg.toFixed(1)} / {thresholdKg} kg</span>
                          </div>
                        </div>
                        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isApproved ? 'bg-[var(--accent)]' : isThresholdReached ? 'bg-amber-400 animate-pulse' : 'bg-[var(--accent)]'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 mt-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab?.('mrf-market')}
                  className="w-full py-2.5 px-4 rounded-2xl bg-[color-mix(in_srgb,var(--gold)_10%,white)] hover:bg-[color-mix(in_srgb,var(--gold)_20%,white)] text-[var(--gold)] text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  Open Recycle Market & Vendor Sales Ledger <ArrowRight size={14} />
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ── 2. ACTIVE DISPATCHES DEDICATED VIEW ── */}
      {activeTab === 'dispatches' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <span className="text-[10px] font-bold text-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,white)] px-2.5 py-1 rounded-full uppercase tracking-wider">
                {showOnlyMyAssigned ? 'My Assigned Tasks' : 'All Dispatches'}
              </span>
              <h3 className="text-xl font-heading font-black text-[var(--text-strong)] tracking-tight mt-1.5 flex items-center gap-2">
                <Truck size={20} className="text-[var(--accent)]" />
                Assigned Dispatches & Pickups
              </h3>
              <p className="text-xs text-[var(--text-strong)]/50 mt-0.5">Manage tasks assigned by Admin to your account, confirm ongoing dispatches, and complete with payload logs.</p>
            </div>
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
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {activeDispatchGroups.map(group => {
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
                  ? 'bg-emerald-100 text-emerald-700'
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
                          <span className="flex items-center gap-1 text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-rose-100 text-rose-600">
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
                          onClick={() => setCompleteModalReport(rep)}
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
          totalVendorSales={totalVendorSales}
          handleSellBatch={handleSellBatch}
        />
      )}

      {/* ── 3. COLLECTION HISTORY VIEW ── */}
      {activeTab === 'mrf-history' && (
        <MRFHistoryTab reports={reports} />
      )}

      {/* ── JOB COMPLETION MODAL (Redesigned) ── */}
      {completeModalReport && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
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
              ? Object.values(itemWeights).reduce((sum, v) => sum + (parseFloat(v) || 0), 0)
              : (parseFloat(weightKg) || 0);

            const filledCount = isRecyclable
              ? Object.values(itemWeights).filter(v => (parseFloat(v) || 0) > 0).length
              : 0;

            const urgencyConfig = {
              LOW: { label: 'Low Priority', dot: 'bg-emerald-400', ring: 'ring-emerald-400/20', text: 'text-emerald-700', bg: 'bg-emerald-50' },
              MEDIUM: { label: 'Medium Priority', dot: 'bg-amber-400', ring: 'ring-amber-400/20', text: 'text-amber-700', bg: 'bg-amber-50' },
              HIGH: { label: 'High Priority', dot: 'bg-red-500', ring: 'ring-red-400/20', text: 'text-red-700', bg: 'bg-red-50' },
            }[completeModalReport.urgency] || { label: 'Standard', dot: 'bg-gray-400', ring: 'ring-gray-400/20', text: 'text-gray-600', bg: 'bg-gray-50' };

            return (
              <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden relative">

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

                {/* RECYCLABLE: Itemized Weight Inputs */}
                {isRecyclable && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-[color-mix(in_srgb,var(--accent)_10%,white)] flex items-center justify-center">
                          <Scale size={14} className="text-[var(--accent)]" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[var(--text-strong)]">Log Collected Items</p>
                          <p className="text-[10px] text-gray-400 font-medium">Weigh each recyclable type in kg</p>
                        </div>
                      </div>
                      {totalWeight > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[color-mix(in_srgb,var(--accent)_10%,white)] ring-1 ring-[var(--accent)]/20">
                          <span className="text-[11px] font-bold text-[var(--accent)]">{totalWeight.toFixed(1)} kg</span>
                        </div>
                      )}
                    </div>

                    {/* Progress indicator */}
                    <div className="flex items-center gap-2 px-1">
                      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[#10B981] transition-all duration-500"
                          style={{ width: `${isRecyclable ? (filledCount / RECYCLABLE_CATEGORIES.length) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-gray-400">{filledCount}/{RECYCLABLE_CATEGORIES.length}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      {RECYCLABLE_CATEGORIES.map(cat => {
                        const val = parseFloat(itemWeights[cat.id]) || 0;
                        const isFilled = val > 0;
                        return (
                          <div
                            key={cat.id}
                            className={`rounded-xl border-2 transition-all duration-200 p-3 ${
                              isFilled
                                ? `${cat.borderColor} ${cat.bgLight} shadow-sm`
                                : 'border-gray-100 bg-white hover:border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <label className={`text-[10px] font-bold uppercase tracking-wider ${isFilled ? cat.color : 'text-gray-400'}`}>
                                {cat.shortName}
                              </label>
                              {isFilled && (
                                <span className={`text-[9px] font-bold ${cat.color} bg-white px-1.5 py-0.5 rounded-full`}>
                                  {val.toFixed(1)} kg
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                placeholder="0.0"
                                value={itemWeights[cat.id] || ''}
                                onChange={e => setItemWeights(prev => ({ ...prev, [cat.id]: e.target.value }))}
                                className={`w-full rounded-lg border px-2.5 py-2 text-sm font-bold outline-none transition-all ${
                                  isFilled
                                    ? `border-${cat.id === 'pet_plastic' ? 'sky' : cat.id === 'aluminum_cans' ? 'amber' : cat.id === 'cardboard' ? 'emerald' : 'purple'}-300 bg-white text-gray-900 focus:ring-2 focus:ring-[var(--accent)]/30`
                                    : 'border-gray-200 bg-gray-50 text-gray-400 focus:bg-white focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30'
                                }`}
                              />
                              <span className="text-[10px] text-gray-400 font-bold flex-shrink-0">kg</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

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
                        Collected Weight (kg)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="e.g. 4.5"
                        value={weightKg}
                        onChange={e => setWeightKg(e.target.value)}
                        className="w-full rounded-xl border-2 border-gray-100 bg-white px-3.5 py-2.5 text-xs text-gray-900 outline-none placeholder:text-gray-300 focus:border-[var(--accent)]/40 focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
                      />
                      <p className="text-[10px] text-gray-400">
                        Used for residual waste monitoring. Leave blank if it could not be weighed — the batch will be flagged as unweighed.
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
                {mrfDetailReport.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setMrfPhotoFull(true)}
                    className="group relative block w-full rounded-2xl overflow-hidden border border-gray-200 h-44 sm:h-52 bg-gray-100 shadow-inner cursor-zoom-in"
                  >
                    <img src={mrfDetailReport.imageUrl} alt="Waste report evidence" className="w-full h-full object-cover" />
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
                      setCompleteModalReport(rep);
                    }}
                    className="flex-1 py-3 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary)] text-white text-xs font-bold shadow-md shadow-[var(--primary)]/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 size={15} /> Complete & Finish Task
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <PhotoLightbox
        src={mrfPhotoFull ? mrfDetailReport?.imageUrl ?? null : null}
        alt="Waste report evidence full view"
        caption="Photo Evidence"
        onClose={() => setMrfPhotoFull(false)}
      />

    </div>
  );
};
