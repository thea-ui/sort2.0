import React, { useState } from 'react';
import { residualRecords, sumResidualKg, countUnweighedResidual } from '../../../utils/wasteStreams';
import {
  Scale,
  Search,
  Truck,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Eye,
  X,
  Send,
  Coins,
  Package,
  Wine,
  Sparkles,
  FileText,
  Trash2,
  Filter,
  Clock,
  User as UserIcon,
  ShieldAlert,
  ArrowUpRight,
  Award,
  Navigation,
  Check,
  Building,
} from 'lucide-react';
import { Report, User as UserType, ReportStatus } from '../../../types';
import { isReportDoneAndExpired, cleanReportTitle, cleanLocationName } from '../../../utils/reportUtils';
import { useRecycleMarket } from '../../../hooks/useRecycleMarket';

export interface AdminCollectionsTabProps {
  reports: Report[];
  users?: UserType[];
  settings?: { falseReportPointPenalty?: number; rewardsReservePercent?: number } | null;
  dispatchReport?: (reportId: string, mrfId: string, mrfName: string) => void;
  updateReportStatus?: (reportId: string, status: ReportStatus, weightCollected?: number) => void;
  addOffense?: (userId: string, description: string, severity: 'WARNING' | 'DEDUCT' | 'SUSPENSION') => void;
  deductPoints?: (userId: string, amount: number) => void;
}

interface KpiCard {
  key: string;
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ElementType;
  iconCls: string;
  badge: string;
  badgeCls: string;
  badgeIcon?: React.ElementType;
  footer: string;
}

export const AdminCollectionsTab: React.FC<AdminCollectionsTabProps> = ({
  reports: initialReports,
  users = [],
  settings,
  dispatchReport,
  updateReportStatus,
  addOffense,
  deductPoints,
}) => {
  // Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'DISPATCHED' | 'COLLECTED'>('ALL');

  // Modals
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string; id: string } | null>(null);
  const [dispatchModalReport, setDispatchModalReport] = useState<Report | null>(null);
  const [selectedMrfId, setSelectedMrfId] = useState<string>('');
  const [flagOffenseReport, setFlagOffenseReport] = useState<Report | null>(null);
  const [flagReason, setFlagReason] = useState<string>('False report submission / Non-existent waste hazard');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Use authoritative reports array directly from props
  const allReportsList: Report[] = initialReports;

  const {
    stocksRecord,
    salesHistory,
    totalVendorSales,
    rewardsReservedPhp,
    categoryRevenueMap,
    approveSaleBatch,
    sellBatch,
  } = useRecycleMarket();

  const totalMRFRevenuePhp = totalVendorSales;

  // Real-time computed collection metrics
  // Use market stock accumulatedKg for accurate MRF-based total weight (consistent with Recycle Market page)
  const totalCollectedWeight = Object.values(stocksRecord).reduce((sum, stock) => sum + (stock?.accumulatedKg || 0), 0);
  const collectedReports = allReportsList.filter((r) => r.status === 'COLLECTED' || r.status === 'RESOLVED');
  const completedDispatchesCount = collectedReports.length;

  const dispatchedReports = allReportsList.filter((r) => r.status === 'DISPATCHED');
  const activeDispatchesCount = dispatchedReports.length;
  const mrfActiveCountByUser = new Map<string, number>();
  dispatchedReports.forEach((r) => {
    if (r.assignedMrfId) {
      mrfActiveCountByUser.set(r.assignedMrfId, (mrfActiveCountByUser.get(r.assignedMrfId) ?? 0) + 1);
    }
  });

  const pendingReports = allReportsList.filter((r) => r.status === 'PENDING');
  const pendingCount = pendingReports.length;

  // Residual Waste Tracking — single shared definition (see utils/wasteStreams)
  const residualReports = residualRecords(collectedReports);
  const residualWeightKg = sumResidualKg(residualReports);
  const residualCount = residualReports.length;
  const residualUnweighed = countUnweighedResidual(residualReports);

  // Itemized MRF Recyclable Collection Logs
  const itemizedRecyclables = [
    {
      code: 'pet_plastic',
      category: 'Plastic Bottles (PET / HDPE)',
      shortName: 'PET Bottles',
      stock: stocksRecord['pet_plastic'],
      icon: Package,
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
      borderColor: 'border-sky-200',
    },
    {
      code: 'glass',
      category: 'Glass / Beverage Bottles',
      shortName: 'Glass Bottles',
      stock: stocksRecord['glass'],
      icon: Wine,
      color: 'text-[#00A77C]',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
    },
    {
      code: 'aluminum_cans',
      category: 'Aluminum & Metal Cans',
      shortName: 'Aluminum Cans',
      stock: stocksRecord['aluminum_cans'],
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
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
  ];

  // Residual Waste Tracking Card
  const residualWaste = {
    category: 'Residual Waste Volume',
    countLabel: `${residualCount} Non-Recyclable Batch${residualCount === 1 ? '' : 'es'}`,
    weightKg: residualWeightKg > 0 ? residualWeightKg : 0.0,
    avgKg: residualCount - residualUnweighed > 0 ? residualWeightKg / (residualCount - residualUnweighed) : 0,
    unweighed: residualUnweighed,
    icon: Trash2,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
  };

  // Filtered reports list (Admin sees all recorded collections for full audit trail)
  const filteredReports = allReportsList.filter((r) => {
    const matchesSearch =
      (r.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.reporterName || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.locationName || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.title || '').toLowerCase().includes(search.toLowerCase());

    if (statusFilter === 'PENDING') return matchesSearch && r.status === 'PENDING';
    if (statusFilter === 'DISPATCHED') return matchesSearch && r.status === 'DISPATCHED';
    if (statusFilter === 'COLLECTED') return matchesSearch && (r.status === 'COLLECTED' || r.status === 'RESOLVED');
    return matchesSearch;
  });

  // Action: Approve & Dispatch Task
  const handleConfirmDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchModalReport || !selectedMrfId) return;

    const mrfUser = users.find(u => u.id === selectedMrfId);
    const mrfStaffName = mrfUser ? mrfUser.name : 'MRF Dispatch Staff';

    if (dispatchReport) {
      // dispatchReport approves (verifies) first, then dispatches — the server
      // rejects dispatch of an unverified report.
      dispatchReport(dispatchModalReport.id, selectedMrfId, mrfStaffName);
    }

    setToastMessage(`Report #${dispatchModalReport.id} approved & dispatched to ${mrfStaffName}!`);
    setDispatchModalReport(null);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Action: Flag False Offense & Deduct Points
  const handleConfirmFlagOffense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flagOffenseReport) return;
    const falseReportPenalty = settings?.falseReportPointPenalty ?? 50;

    if (addOffense) {
      addOffense(flagOffenseReport.reporterId, flagReason, 'WARNING');
    }
    if (deductPoints) {
      deductPoints(flagOffenseReport.reporterId, falseReportPenalty);
    }
    if (updateReportStatus) {
      updateReportStatus(flagOffenseReport.id, 'RESOLVED');
    }

    setToastMessage(`Flagged false report from ${flagOffenseReport.reporterName}. ${falseReportPenalty} points deducted & warning registered.`);
    setFlagOffenseReport(null);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={11} /> Pending Verification
          </span>
        );
      case 'DISPATCHED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-sky-50 text-sky-700 border border-sky-200">
            <Truck size={11} /> Dispatched to MRF
          </span>
        );
      case 'COLLECTED':
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={11} /> Collected & Cleared
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-600 border border-rose-200">
            <Clock size={11} /> Expired (6 PM Reset)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-gray-50 text-gray-700 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  const formatTimestamp = (ts?: string) => {
    if (!ts) return 'Recent';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return ts;
    }
  };

  const kpiCards: KpiCard[] = [
    {
      key: 'rewards-reserve',
      label: 'MRF Sales Reserved for Rank 1 Rewards',
      value: `₱${rewardsReservedPhp.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      icon: Coins,
      iconCls: 'bg-amber-50 text-[#C69B26]',
      badge: `${settings?.rewardsReservePercent ?? 20}% Reserve`,
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
      iconCls: 'bg-emerald-50 text-[#00A77C]',
      badge: `${completedDispatchesCount} Recorded`,
      badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badgeIcon: ArrowUpRight,
      footer: `Across ${completedDispatchesCount} completed collection${completedDispatchesCount === 1 ? '' : 's'}`,
    },
    {
      key: 'active-dispatches',
      label: 'Active MRF Dispatches',
      value: activeDispatchesCount,
      unit: 'active',
      icon: Truck,
      iconCls: 'bg-sky-50 text-[#0091EA]',
      badge: activeDispatchesCount > 0 ? `${activeDispatchesCount} Active` : 'Queue Clear',
      badgeCls: 'bg-sky-50 text-sky-700 border-sky-200',
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
      value: pendingCount,
      unit: 'reports',
      icon: AlertTriangle,
      iconCls: 'bg-rose-50 text-[#FF5722]',
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

  return (
    <div className="space-y-6 animate-fade-in text-[#00271D]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm">
        <div>
          <span className="text-[10px] font-extrabold text-[#00A77C] bg-[#00A77C]/10 border border-[#00A77C]/20 px-3 py-1 rounded-full uppercase tracking-wider">
            Collections & Dispatch Action Center
          </span>
          <h2 className="text-2xl font-extrabold text-[#00271D] tracking-tight mt-2">
            Waste Dispatch & Recyclables Management
          </h2>
          <p className="text-xs text-[#00271D]/60 mt-1 max-w-xl">
            Verify incoming student/teacher submissions, dispatch collection alerts to MRF staff, and audit itemized recyclable revenues.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200/80 self-start sm:self-auto">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs font-bold text-emerald-700">Auto-Sync Active</span>
        </div>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="bg-[#00271D] text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between animate-fade-in border border-[#00A77C]/30">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#00A77C]" />
            {toastMessage}
          </span>
          <button type="button" onClick={() => setToastMessage(null)} className="opacity-80 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      {/* 1. TOP METRIC CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          const BadgeIcon = card.badgeIcon;
          return (
            <div
              key={card.key}
              className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-xl ${card.iconCls}`}>
                  <Icon size={20} />
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider border px-2.5 py-1 rounded-full ${card.badgeCls}`}
                >
                  {BadgeIcon && <BadgeIcon size={11} />}
                  {card.badge}
                </span>
              </div>
              <p className="text-xs font-semibold text-[#00271D]/60 mt-4">
                {card.label}
              </p>
              <p className="text-3xl font-black text-[#00271D] tracking-tight mt-1">
                {card.value}
                {card.unit && (
                  <span className="text-base font-bold text-[#00271D]/40 ml-1.5">{card.unit}</span>
                )}
              </p>
              <p className="text-[11px] font-medium text-[#00271D]/50 mt-4 pt-3 border-t border-[#00271D]/5 truncate" title={card.footer}>
                {card.footer}
              </p>
            </div>
          );
        })}
      </div>

      {/* 2. ITEMIZED MRF RECYCLABLES LOG SUMMARY */}
      <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-[#00271D] flex items-center gap-2">
              <Package size={18} className="text-[#00A77C]" />
              Itemized MRF Recyclables Collection Summary
            </h3>
            <p className="text-xs text-[#00271D]/50 mt-0.5">
              Verified inventory log recorded by MRF staff with unit counts, weights, and market values
            </p>
          </div>
          <span className="text-xs font-extrabold text-[#00A77C] bg-[#00A77C]/10 border border-[#00A77C]/20 px-3 py-1.5 rounded-full whitespace-nowrap">
            Total Revenue Generated: ₱{totalMRFRevenuePhp.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Itemized Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {itemizedRecyclables.map((item) => {
            const ItemIcon = item.icon;
            const stock = item.stock;
            const accumulatedKg = stock ? stock.accumulatedKg : 0;
            const thresholdKg = stock ? stock.thresholdLimitKg : 50;
            const pricePerKg = stock ? stock.marketPricePerKg : 15;
            const isApproved = stock ? stock.isApprovedForSale === true : false;
            const pct = Math.min(100, Math.round((accumulatedKg / thresholdKg) * 100));
            const isThresholdReached = accumulatedKg >= thresholdKg;
            const catRevenue = categoryRevenueMap[item.code] || 0;

            return (
              <div
                key={item.category}
                className={`flex flex-col rounded-2xl border bg-white/90 p-4 transition-all hover:shadow-sm ${
                  isApproved
                    ? 'border-emerald-300 ring-1 ring-emerald-200'
                    : isThresholdReached
                    ? 'border-amber-300 ring-1 ring-amber-200'
                    : 'border-[#00271D]/10 hover:border-[#00271D]/20'
                }`}
              >
                {(isApproved || isThresholdReached) && (
                  <div
                    className={`-mx-4 -mt-4 mb-3 py-1 px-2 text-center text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 ${
                      isApproved ? 'bg-[#00A77C] text-white' : 'bg-amber-400 text-amber-950'
                    }`}
                  >
                    {isApproved ? (
                      <>
                        <CheckCircle2 size={10} /> Authorized for Sale
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={10} /> Ready to Sell
                      </>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-xl ${item.bgColor} ${item.color}`}>
                    <ItemIcon size={18} />
                  </div>
                  <span className="text-[10px] font-bold text-[#00271D]/40 uppercase tracking-wider">
                    {accumulatedKg.toFixed(1)} / {thresholdKg} kg
                  </span>
                </div>

                <div className="mt-3">
                  <h4 className="text-xs font-bold text-[#00271D] leading-tight">{item.category}</h4>
                  <p className="text-[10px] font-medium text-[#00271D]/40 mt-0.5">Rate ₱{pricePerKg}/kg</p>
                </div>

                {/* Batch progress */}
                <div className="mt-3 space-y-1.5">
                  <div className="h-1.5 w-full bg-[#00271D]/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isApproved ? 'bg-[#00A77C]' : isThresholdReached ? 'bg-amber-500' : 'bg-[#00A77C]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-[#00271D]/40">{pct}% of batch</span>
                </div>

                <div className="mt-auto pt-3 border-t border-[#00271D]/5 flex items-end justify-between gap-2">
                  <div>
                    <span className="text-[9px] font-bold text-[#00271D]/40 uppercase tracking-wider block">
                      Sold Revenue
                    </span>
                    <span className={`text-sm font-black ${item.color}`}>₱{catRevenue.toLocaleString()}</span>
                  </div>

                  {isApproved ? (
                    <span className="px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-[9px] font-black uppercase flex items-center gap-1">
                      <CheckCircle2 size={10} /> Authorized
                    </span>
                  ) : isThresholdReached ? (
                    <button
                      type="button"
                      onClick={async () => {
                        await approveSaleBatch(item.code, true);
                        setToastMessage(`Authorized sale of ${item.shortName} batch! Dispatched notification to MRF.`);
                        setTimeout(() => setToastMessage(null), 4000);
                      }}
                      className="px-2.5 py-1.5 rounded-xl text-[10px] font-black bg-amber-500 hover:bg-amber-600 text-white cursor-pointer transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <Coins size={12} /> Approve Sale
                    </button>
                  ) : (
                    <span className="text-[10px] font-semibold text-[#00271D]/35">Awaiting threshold</span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Residual Waste Card */}
          <div className="flex flex-col rounded-2xl border border-[#00271D]/10 bg-white/90 p-4 transition-all hover:shadow-sm hover:border-[#00271D]/20">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <Trash2 size={18} />
              </div>
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Non-Recyclable
              </span>
            </div>
            <div className="mt-3">
              <h4 className="text-xs font-bold text-[#00271D] leading-tight">{residualWaste.category}</h4>
              <p className="text-[10px] font-semibold text-rose-700 mt-0.5">{residualWaste.countLabel}</p>
            </div>
            <div className="mt-auto pt-3 border-t border-[#00271D]/5 space-y-1.5">
              <span className="text-lg font-black text-[#00271D] block">{residualWaste.weightKg.toFixed(1)} kg</span>
              <div className="flex items-center justify-between text-[10px] font-semibold">
                <span className="text-[#00271D]/50">
                  Avg {residualWaste.avgKg.toFixed(1)} kg / weighed batch
                </span>
                {residualWaste.unweighed > 0 && (
                  <span className="text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                    {residualWaste.unweighed} unweighed
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* MODAL 1: PHOTO EVIDENCE PREVIEW */}
      {previewImage && (
        <div className="fixed inset-0 bg-[#00271D]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h4 className="text-base font-extrabold text-[#00271D]">Photo Evidence Preview</h4>
                <p className="text-xs text-[#00271D]/50">Report #{previewImage.id} • {previewImage.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-xl hover:bg-gray-100 text-gray-500 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 max-h-96 flex items-center justify-center">
              <img src={previewImage.url} alt="Full Evidence" className="w-full h-auto object-contain" />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-700 cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: APPROVE & DISPATCH TO MRF STAFF */}
      {dispatchModalReport && (
        <div className="fixed inset-0 bg-[#00271D]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h4 className="text-base font-extrabold text-[#00271D] flex items-center gap-2">
                  <Send size={18} className="text-[#00A77C]" />
                  Approve & Dispatch to MRF
                </h4>
                <p className="text-xs text-[#00271D]/50">Assign collection task for Report #{dispatchModalReport.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setDispatchModalReport(null)}
                className="p-1 rounded-xl hover:bg-gray-100 text-gray-500 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmDispatch} className="space-y-4 text-xs">
              <div className="p-3 bg-[#F9F3F0] rounded-2xl space-y-1">
                <p className="font-bold text-[#00271D]">{cleanReportTitle(dispatchModalReport.title)}</p>
                <p className="text-[11px] text-[#00271D]/60">Location: {cleanLocationName(dispatchModalReport.locationName)}</p>
                {dispatchModalReport.coordinates && (
                  <p className="text-[11px] font-mono text-[#00A77C] font-semibold flex items-center gap-1">
                    <Navigation size={11} /> Grid [{dispatchModalReport.coordinates.lat.toFixed(4)}, {dispatchModalReport.coordinates.lng.toFixed(4)}]
                  </p>
                )}
                <p className="text-[11px] text-[#00271D]/60">Reporter: {dispatchModalReport.reporterName}</p>
              </div>

              <div>
                <label className="font-bold text-[#00271D] block mb-1.5">Assign MRF Logistics Specialist</label>
                <select
                  value={selectedMrfId}
                  onChange={(e) => setSelectedMrfId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-[#00A77C] outline-none font-medium cursor-pointer"
                >
                  <option value="">-- Pick MRF Personnel --</option>
                  {users.filter(u => u.role === 'MRF').map(mrf => (
                    <option key={mrf.id} value={mrf.id}>
                      {mrf.name} ({mrf.employeeId})
                    </option>
                  ))}
                  {users.filter(u => u.role === 'MRF').length === 0 && (
                    <option value="mrf-default">MRF Dispatch Operations Team</option>
                  )}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDispatchModalReport(null)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold text-gray-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#00A77C] hover:bg-[#008f6a] text-white font-bold cursor-pointer shadow-md shadow-[#00A77C]/20 flex items-center gap-1.5"
                >
                  <Send size={14} />
                  <span>Dispatch Alert Now</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: FLAG FALSE OFFENSE & PENALTY */}
      {flagOffenseReport && (
        <div className="fixed inset-0 bg-[#00271D]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h4 className="text-base font-extrabold text-rose-600 flex items-center gap-2">
                  <ShieldAlert size={18} />
                  Flag False Offense & Penalty
                </h4>
                <p className="text-xs text-[#00271D]/50">Report #{flagOffenseReport.id} by {flagOffenseReport.reporterName}</p>
              </div>
              <button
                type="button"
                onClick={() => setFlagOffenseReport(null)}
                className="p-1 rounded-xl hover:bg-gray-100 text-gray-500 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmFlagOffense} className="space-y-4 text-xs">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl space-y-1">
                <p className="font-bold text-rose-800">Penalty Impact Notice:</p>
                <p className="text-[11px] text-rose-700">• Deducts <strong>-{settings?.falseReportPointPenalty ?? 50} Eco-Points</strong> from user profile.</p>
                <p className="text-[11px] text-rose-700">• Logs official Warning Sanction in Admin Database.</p>
              </div>

              <div>
                <label className="font-bold text-[#00271D] block mb-1">Offense Justification Note</label>
                <textarea
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  rows={3}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-rose-500 outline-none resize-none font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFlagOffenseReport(null)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold text-gray-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold cursor-pointer shadow-md shadow-rose-200 flex items-center gap-1.5"
                >
                  <ShieldAlert size={14} />
                  <span>Apply Offense & Penalty</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
