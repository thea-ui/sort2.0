import React, { useState } from 'react';
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

  // Residual Waste Tracking (General / Non-Bio / Organic residual)
  const residualReports = collectedReports.filter((r) => r.category === 'GENERAL' || r.category === 'NON_BIODEGRADABLE' || r.category === 'ORGANIC');
  const residualWeightKg = residualReports.reduce((sum, r) => sum + (r.weightCollected || 0), 0);
  const residualCount = residualReports.length;

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
    disposalRoute: 'Transferred to Municipal Landfill Safety Station',
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

  return (
    <div className="space-y-6 animate-fade-in text-[#00271D]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold text-[#00A77C] bg-[#00A77C]/10 border border-[#00A77C]/20 px-3 py-1 rounded-full uppercase tracking-wider">
              COLLECTIONS & DISPATCH ACTION CENTER
            </span>
            <span className="text-xs font-semibold text-[#00271D]/40">• Real-Time Sync Active</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#00271D] tracking-tight mt-2">
            Waste Dispatch & Recyclables Management
          </h2>
          <p className="text-xs text-[#00271D]/60 mt-1 max-w-xl">
            Verify incoming student/teacher submissions, dispatch collection alerts to MRF staff, and audit itemized recyclable revenues.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-extrabold flex items-center gap-2">
            <CheckCircle2 size={15} />
            Auto-Sync Status
          </span>
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

      {/* 1. TOP METRIC CARDS ROW INCLUDING REWARDS RESERVE WIDGET */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* REWARDS RESERVE WIDGET (CRITICAL PROMPT REQ 3) */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/80 border border-amber-300/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-amber-500/20 rounded-xl text-[#C69B26] group-hover:scale-110 transition-transform">
              <Coins size={22} />
            </div>
            <span className="text-[10px] font-extrabold text-[#C69B26] bg-amber-100/80 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Award size={12} /> {settings?.rewardsReservePercent ?? 20}% Reserve
            </span>
          </div>
          <p className="text-xs font-bold text-amber-900/70 mt-3">MRF Sales Revenue Reserved for Rank 1 Rewards</p>
          <p className="text-3xl font-black text-[#00271D] tracking-tight mt-0.5">
            ₱{rewardsReservedPhp.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-3 pt-3 border-t border-amber-200/60 flex items-center justify-between text-[11px] text-amber-900/60 font-semibold">
            <span>Quarter-End Pool</span>
            <span className="font-extrabold text-amber-700">From ₱{totalMRFRevenuePhp.toLocaleString()} Total</span>
          </div>
        </div>

        {/* Card 2: Total Recyclables Collected (kg) */}
        <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-emerald-50 rounded-xl text-[#00A77C]">
              <Scale size={22} />
            </div>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <ArrowUpRight size={12} /> {completedDispatchesCount} Recorded
            </span>
          </div>
          <p className="text-xs font-semibold text-[#00271D]/60 mt-3">Total Recyclables Collected</p>
          <p className="text-3xl font-black text-[#00271D] tracking-tight mt-0.5">
            {totalCollectedWeight.toFixed(1)} <span className="text-base font-bold text-[#00271D]/50">kg</span>
          </p>
          <p className="text-[11px] font-medium text-[#00271D]/50 mt-3 pt-3 border-t border-[#00271D]/5">
            Across {completedDispatchesCount} completed collection{completedDispatchesCount === 1 ? '' : 's'}
          </p>
        </div>

        {/* Card 3: MRF Tasks Status */}
        <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-sky-50 rounded-xl text-[#0091EA]">
              <Truck size={22} />
            </div>
            <span className="text-[11px] font-bold text-sky-600 bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-full">
              {activeDispatchesCount > 0 ? `${activeDispatchesCount} Active` : 'Queue Clear'}
            </span>
          </div>
          <p className="text-xs font-semibold text-[#00271D]/60 mt-3">Active MRF Dispatches</p>
          <p className="text-3xl font-black text-[#00271D] tracking-tight mt-0.5">
            {activeDispatchesCount} <span className="text-base font-bold text-[#00271D]/50">active</span>
          </p>
          <p className="text-[11px] font-medium text-sky-700 mt-3 pt-3 border-t border-[#00271D]/5 font-semibold">
            {activeDispatchesCount > 0
              ? (() => {
                  const mrfUsers = users.filter(u => u.role === 'MRF');
                  if (mrfUsers.length === 0) {
                    return `${activeDispatchesCount} active dispatches in queue`;
                  }
                  return mrfUsers
                    .map(mrf => `${mrf.name} (${mrfActiveCountByUser.get(mrf.id) ?? 0})`)
                    .join(' • ');
                })()
              : `${completedDispatchesCount} collections resolved & logged`}
          </p>
        </div>

        {/* Card 4: Pending Verification Queue */}
        <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-amber-50 rounded-xl text-[#FFAB00]">
              <AlertTriangle size={22} />
            </div>
            <span className={`text-[11px] font-bold ${pendingCount > 0 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'} border px-2.5 py-0.5 rounded-full`}>
              {pendingCount > 0 ? 'Requires Action' : 'All Verified'}
            </span>
          </div>
          <p className="text-xs font-semibold text-[#00271D]/60 mt-3">Pending Action Queue</p>
          <p className="text-3xl font-black text-[#00271D] tracking-tight mt-0.5">
            {pendingCount} <span className="text-base font-bold text-[#00271D]/50">reports</span>
          </p>
          <p className="text-[11px] font-medium text-[#00271D]/50 mt-3 pt-3 border-t border-[#00271D]/5">
            {pendingCount > 0 ? 'Awaiting Admin approval & MRF alert' : 'Queue clear — no pending verification'}
          </p>
        </div>
      </div>

      {/* 2. ITEMIZED MRF RECYCLABLES LOG SUMMARY (CRITICAL PROMPT REQ 2) */}
      <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold text-[#00271D] flex items-center gap-2">
              <Package size={18} className="text-[#00A77C]" />
              Itemized MRF Recyclables Collection Summary
            </h3>
            <p className="text-xs text-[#00271D]/50 mt-0.5">
              Verified inventory log recorded by MRF staff with unit counts, weights, and market values
            </p>
          </div>
          <span className="text-xs font-extrabold text-[#00A77C] bg-[#00A77C]/10 border border-[#00A77C]/20 px-3 py-1 rounded-full">
            Total Revenue Generated: ₱{totalMRFRevenuePhp.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Itemized Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-2">
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
                className={`p-4 rounded-2xl border ${item.bgColor} transition-all space-y-2.5 relative overflow-hidden ${
                  isApproved
                    ? 'border-emerald-500 ring-2 ring-emerald-400/50 shadow-md bg-emerald-50/50'
                    : isThresholdReached
                    ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-md bg-amber-50/40'
                    : item.borderColor
                }`}
              >
                {isApproved ? (
                  <div className="bg-[#00A77C] text-white font-black text-[8px] uppercase py-0.5 px-2 text-center font-mono tracking-wider -mx-4 -mt-4 mb-1 flex items-center justify-center gap-1">
                    <CheckCircle2 size={10} /> AUTHORIZED FOR SALE — DISPATCHED TO MRF
                  </div>
                ) : isThresholdReached ? (
                  <div className="bg-amber-400 text-amber-950 font-black text-[8px] uppercase py-0.5 px-2 text-center font-mono tracking-wider -mx-4 -mt-4 mb-1 animate-pulse">
                    SELLING THRESHOLD REACHED - READY FOR ADMIN SALE APPROVAL
                  </div>
                ) : null}

                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-xl bg-white/80 ${item.color}`}>
                    <ItemIcon size={18} />
                  </div>
                  <span className={`text-[10px] font-extrabold ${isApproved ? 'text-emerald-900 bg-emerald-200' : isThresholdReached ? 'text-amber-900 bg-amber-200' : 'text-gray-600 bg-white/80'} px-2 py-0.5 rounded-full uppercase tracking-wider`}>
                    {pct}% Batch
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-[#00271D] line-clamp-1">{item.category}</h4>
                  <p className="text-[10px] font-medium text-gray-500 mt-0.5">Rate: ₱{pricePerKg}/kg</p>
                </div>

                {/* Batch Weight Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-gray-500">{accumulatedKg.toFixed(1)} / {thresholdKg} kg</span>
                    <span className={isApproved ? 'text-emerald-700 font-black' : isThresholdReached ? 'text-amber-800 font-extrabold' : 'text-[#00A77C]'}>{pct}%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-200/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isApproved ? 'bg-[#00A77C]' : isThresholdReached ? 'bg-amber-500 animate-pulse' : 'bg-[#00A77C]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-black/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase block">Sold Revenue</span>
                      <span className={`text-xs font-black ${item.color}`}>
                        ₱{catRevenue.toLocaleString()}
                      </span>
                    </div>

                    {isApproved ? (
                      <span className="px-2 py-1 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-[9px] font-black uppercase flex items-center gap-1">
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
                        className="px-2.5 py-1.5 rounded-xl text-[10px] font-black bg-amber-500 hover:bg-amber-600 text-white cursor-pointer transition-all flex items-center gap-1 shadow-xs animate-bounce"
                      >
                        <Coins size={12} /> Approve Sale
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed flex items-center gap-1 opacity-70"
                      >
                        <Coins size={12} /> {accumulatedKg <= 0 ? 'No Payload' : 'Awaiting Threshold'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Residual Waste Card */}
          <div className={`p-4 rounded-2xl border ${residualWaste.bgColor} ${residualWaste.borderColor} space-y-2 hover:scale-[1.02] transition-transform`}>
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-xl bg-white/80 ${residualWaste.color}`}>
                <Trash2 size={18} />
              </div>
              <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Non-Recyclable
              </span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#00271D]">{residualWaste.category}</h4>
              <p className="text-[11px] font-semibold text-rose-700 mt-0.5">{residualWaste.countLabel}</p>
            </div>
            <div className="pt-2 border-t border-black/5 flex items-baseline justify-between">
              <span className="text-lg font-black text-[#00271D]">{residualWaste.weightKg.toFixed(1)} kg</span>
              <span className="text-[10px] font-bold text-rose-700">Landfill Track</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. DISPATCH & VERIFICATION TASK TABLE (ACTION CENTER) */}
      <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-4">
        {/* Table Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold text-[#00271D] flex items-center gap-2">
              <Truck size={18} className="text-[#0091EA]" />
              Dispatch & Verification Task Center
            </h3>
            <p className="text-xs text-[#00271D]/50 mt-0.5">
              Review reports, verify coordinates/location type, approve MRF dispatches, or audit collection records
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Tabs */}
            <div className="bg-[#F9F3F0] p-1 rounded-xl border border-[#00271D]/10 flex items-center gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'ALL' ? 'bg-[#00A77C] text-white shadow-sm' : 'text-[#00271D]/60 hover:text-[#00271D]'
                }`}
              >
                All ({allReportsList.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('PENDING')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'PENDING' ? 'bg-[#00A77C] text-white shadow-sm' : 'text-[#00271D]/60 hover:text-[#00271D]'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('DISPATCHED')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'DISPATCHED' ? 'bg-[#00A77C] text-white shadow-sm' : 'text-[#00271D]/60 hover:text-[#00271D]'
                }`}
              >
                Dispatched ({activeDispatchesCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('COLLECTED')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'COLLECTED' ? 'bg-[#00A77C] text-white shadow-sm' : 'text-[#00271D]/60 hover:text-[#00271D]'
                }`}
              >
                Collected ({completedDispatchesCount})
              </button>
            </div>

            {/* Search */}
            <div className="relative flex-1 sm:w-56">
              <Search size={14} className="absolute left-3 top-2.5 text-[#00271D]/40" />
              <input
                type="text"
                placeholder="Search report ID, student..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#F9F3F0] border border-[#00271D]/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#00271D] outline-none focus:border-[#00A77C]"
              />
            </div>
          </div>
        </div>

        {/* Task Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#00271D]/8 text-[#00271D]/40 font-bold uppercase tracking-wider bg-gray-50/70">
                <th className="py-3.5 px-4">Report ID & Time</th>
                <th className="py-3.5 px-4">Reporter & Role</th>
                <th className="py-3.5 px-4">Location Type</th>
                <th className="py-3.5 px-4 text-center">Photo Evidence</th>
                <th className="py-3.5 px-4">Live Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#00271D]/5 font-medium">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#00271D]/40 font-semibold">
                    No reports match the current filter or search criteria.
                  </td>
                </tr>
              ) : (
                filteredReports.map((rpt) => {
                  const isOffGrid = (rpt.locationName || '').includes('Off-Grid Pin') || (rpt.coordinates && rpt.coordinates.lat !== 0);
                  const isTeacher = rpt.reporterRole === 'teacher';
                  const matchedUser = users.find(
                    (u) => u.id === rpt.reporterId || u.name.toLowerCase() === rpt.reporterName?.toLowerCase()
                  );
                  const gradeLabel = isTeacher 
                    ? 'Teacher (Faculty)' 
                    : matchedUser?.classroomSection 
                    ? `Student (${matchedUser.classroomSection})`
                    : matchedUser?.gradeLevel 
                    ? `Student (${matchedUser.gradeLevel}${matchedUser.sectionName ? ' - ' + matchedUser.sectionName : ''})`
                    : 'Student';

                  return (
                    <tr key={rpt.id} className="hover:bg-gray-50/60 transition-colors">
                      {/* 1. Report ID & Timestamp */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-[#00271D] flex items-center gap-1.5">
                            #{rpt.id}
                            {rpt.urgency === 'HIGH' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-100 text-rose-700 uppercase">
                                High Priority
                              </span>
                            )}
                          </span>
                          <p className="text-[11px] text-[#00271D]/50 flex items-center gap-1 font-mono">
                            <Calendar size={11} /> {formatTimestamp(rpt.timestamp)}
                          </p>
                        </div>
                      </td>

                      {/* 2. User Role & Grade Level */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-[#00271D] flex items-center gap-1.5">
                            <UserIcon size={13} className={isTeacher ? 'text-purple-600' : 'text-[#00A77C]'} />
                            {rpt.reporterName}
                          </p>
                          <p className="text-[11px] font-semibold text-[#00271D]/60">{gradeLabel}</p>
                        </div>
                      </td>

                      {/* 3. Location Type (Standard Bin vs Off-Grid Pinned) */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {isOffGrid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                              <Navigation size={11} /> Off-Grid Pinned
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                              <Building size={11} /> Standard Station
                            </span>
                          )}
                          <p className="text-[11px] font-medium text-[#00271D]/70 line-clamp-1 max-w-xs">
                            {cleanLocationName(rpt.locationName)}
                          </p>
                        </div>
                      </td>

                      {/* 4. Photo Evidence (Thumbnail with Modal View) */}
                      <td className="py-3.5 px-4 text-center">
                        {rpt.imageUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewImage({ url: rpt.imageUrl!, title: rpt.title, id: rpt.id })
                            }
                            className="relative group inline-block rounded-xl overflow-hidden border border-gray-200 hover:border-[#00A77C] transition-all cursor-pointer"
                          >
                            <img
                              src={rpt.imageUrl}
                              alt="Evidence"
                              className="w-12 h-10 object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-[#00271D]/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                              <Eye size={14} />
                            </div>
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#00271D]/40 italic">No image</span>
                        )}
                      </td>

                      {/* 5. Live Status Badge */}
                      <td className="py-3.5 px-4">{getStatusBadge(rpt.status)}</td>

                      {/* 6. Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {rpt.status === 'PENDING' && (
                            <>
                              <button
                                type="button"
                                onClick={() => setDispatchModalReport(rpt)}
                                className="px-3 py-1.5 bg-[#00A77C] hover:bg-[#008f6a] text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                              >
                                <Send size={12} />
                                <span>Approve & Dispatch</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setFlagOffenseReport(rpt)}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                                title="Flag as false submission and deduct student points"
                              >
                                <ShieldAlert size={12} />
                                <span>Flag Offense</span>
                              </button>
                            </>
                          )}

                          {rpt.status === 'DISPATCHED' && (
                            <span className="text-[11px] font-semibold text-sky-700 flex items-center gap-1">
                              <Truck size={12} /> MRF En Route ({rpt.assignedMrfName || 'MRF'})
                            </span>
                          )}

                          {(rpt.status === 'COLLECTED' || rpt.status === 'RESOLVED') && (
                            <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 size={12} /> Cleared ({rpt.weightCollected ? `${rpt.weightCollected.toFixed(1)} kg` : 'Logged'})
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
