import React, { useState } from 'react';
import { useMockData } from '../../hooks/useMockData';
import { Report } from '../../types';
import {
  Truck,
  Scale,
  MapPin,
  CheckCircle2,
  Play,
  History,
  X,
  Wrench,
  PackageCheck,
  AlertCircle,
  ArrowRight,
  Activity,
  LayoutDashboard,
  Zap,
  Recycle,
  Armchair,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

interface MRFDashboardProps {
  activeTab: string;
}

export const MRFDashboard: React.FC<MRFDashboardProps> = ({ activeTab }) => {
  const {
    reports,
    bins,
    updateReportStatus,
    currentUser
  } = useMockData();

  // Completion Modal States
  const [completeModalReport, setCompleteModalReport] = useState<Report | null>(null);
  const [weightKg, setWeightKg] = useState<string>('');
  const [assetOutcome, setAssetOutcome] = useState<'Repaired On-Site' | 'Transported to MRF Workshop' | 'Needs Replacement'>('Repaired On-Site');
  const [completionNotes, setCompletionNotes] = useState<string>('');

  // Toast Notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Filter Dispatches
  const activeDispatches = reports.filter(r => r.status === 'PENDING' || r.status === 'DISPATCHED');
  const completedDispatches = reports.filter(r => r.status === 'COLLECTED' || r.status === 'RESOLVED');

  // Stats calculation
  const totalKgCollected = completedDispatches.reduce((sum, r) => sum + (r.weightCollected || 0), 0);
  const totalAssetsProcessed = completedDispatches.filter(r =>
    r.reportType === 'ASSET' ||
    r.description.toUpperCase().includes('FURNITURE') ||
    r.description.toUpperCase().includes('ELECTRONICS') ||
    r.description.toUpperCase().includes('FIXTURES') ||
    r.description.toUpperCase().includes('EQUIPMENT')
  ).length;

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

  const handleCompleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeModalReport) return;

    const isRecyclable = completeModalReport.category === 'RECYCLABLE' ||
      completeModalReport.description.toUpperCase().includes('WASTE');

    const isAsset = completeModalReport.reportType === 'ASSET' ||
      completeModalReport.description.toUpperCase().includes('FURNITURE') ||
      completeModalReport.description.toUpperCase().includes('ELECTRONICS') ||
      completeModalReport.description.toUpperCase().includes('FIXTURES') ||
      completeModalReport.description.toUpperCase().includes('EQUIPMENT');

    if (isRecyclable) {
      const parsedWeight = parseFloat(weightKg) || 0;
      updateReportStatus(completeModalReport.id, 'COLLECTED', parsedWeight);
      showToast(`Logged ${parsedWeight} kg payload! Reports resolved and points awarded to reporters based on rank (1st: 15pts, 2nd: 10pts, 3rd: 5pts).`);
    } else if (isAsset) {
      updateReportStatus(completeModalReport.id, 'RESOLVED');
      showToast(`Asset status updated to "${assetOutcome}". Admin and reporters notified!`);
    } else {
      updateReportStatus(completeModalReport.id, 'COLLECTED');
      showToast(`Job finished! Final cleanup verified. Points awarded to reporters based on rank order (1st: 15pts, 2nd: 10pts, 3rd: 5pts).`);
    }

    setCompleteModalReport(null);
    setWeightKg('');
    setCompletionNotes('');
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-[#00271D] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-[#00A77C]/40 flex items-center gap-3 animate-pulse">
          <CheckCircle2 size={18} className="text-[#00A77C]" />
          <span className="text-xs font-bold">{toastMsg}</span>
        </div>
      )}

      {/* ── 1. DASHBOARD OVERVIEW VIEW ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Header Subtitle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#00A77C] bg-[#00A77C]/10 border border-[#00A77C]/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                Control Hub Telemetry
              </span>
              <h3 className="text-xl font-heading font-black text-[#00271D] mt-1.5">
                Facility Operational Overview
              </h3>
              <p className="text-xs text-[#00271D]/50 mt-0.5">Live operational statistics, active dispatches status, and campus bin monitor.</p>
            </div>
          </div>

          {/* ── Basic MRF Operational Statistics ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Card 1: MRF Needed (Action Required) */}
            <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm space-y-2 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  MRF Needed
                </span>
                <div className="h-9 w-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                  <AlertCircle size={18} />
                </div>
              </div>
              <div>
                <p className="text-3xl font-heading font-black text-[#00271D]">
                  {mrfNeededCount}
                </p>
                <p className="text-xs font-bold text-[#00271D]/70 mt-0.5">Dispatches Needing Attention</p>
                <p className="text-[11px] text-[#00271D]/50 font-medium">
                  {reports.filter(r => r.status === 'PENDING').length} unconfirmed · {reports.filter(r => r.status === 'DISPATCHED').length} in progress
                </p>
              </div>
            </div>

            {/* Card 2: Waste & Bin Pickups */}
            <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm space-y-2 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Recyclables & Waste
                </span>
                <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                  <Scale size={18} />
                </div>
              </div>
              <div>
                <p className="text-3xl font-heading font-black text-[#00271D]">
                  {wasteTaskCount}
                </p>
                <p className="text-xs font-bold text-[#00271D]/70 mt-0.5">Waste Collection Tasks</p>
                <p className="text-[11px] text-[#00271D]/50 font-medium">Bins requiring payload weigh-in</p>
              </div>
            </div>

            {/* Card 3: Asset Repair & Transport */}
            <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm space-y-2 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Asset Incidents
                </span>
                <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                  <Wrench size={18} />
                </div>
              </div>
              <div>
                <p className="text-3xl font-heading font-black text-[#00271D]">
                  {assetTaskCount}
                </p>
                <p className="text-xs font-bold text-[#00271D]/70 mt-0.5">Asset Maintenance Tasks</p>
                <p className="text-[11px] text-[#00271D]/50 font-medium">Classroom furniture & fixtures</p>
              </div>
            </div>

          </div>

          {/* 2-Column Split View: Recent Dispatches Preview + Campus Bin Monitor Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Active Dispatches Stream Preview */}
            <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap size={16} className="text-[#00A77C]" />
                    <h4 className="text-sm font-heading font-bold text-[#00271D]">Dispatches Needing Attention</h4>
                  </div>
                  <span className="text-xs font-bold text-[#00A77C] bg-[#00A77C]/10 px-2.5 py-0.5 rounded-full">
                    {activeDispatches.length} Active
                  </span>
                </div>

                <div className="space-y-2.5 divide-y divide-gray-100">
                  {activeDispatches.slice(0, 3).map(rep => (
                    <div key={rep.id} className="pt-2.5 first:pt-0 flex items-center justify-between text-xs">
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <p className="font-bold text-[#00271D] truncate">{rep.title}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{rep.locationName}</p>
                      </div>
                      <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        rep.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}>
                        {rep.status === 'PENDING' ? 'Unconfirmed' : 'Ongoing'}
                      </span>
                    </div>
                  ))}
                  {activeDispatches.length === 0 && (
                    <p className="text-xs text-gray-400 py-6 text-center">No pending dispatches.</p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <p className="text-[11px] text-[#00271D]/60 font-medium mb-2">Switch to the dedicated Dispatches tab to manage actions and kilo logs.</p>
              </div>
            </div>

            {/* Live Bin Monitor Quick Status */}
            <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-[#00A77C]" />
                  <h4 className="text-sm font-heading font-bold text-[#00271D]">Campus Bins Live Monitor</h4>
                </div>
                <span className="text-[10px] text-gray-400 font-semibold">{bins.length} Total Bins</span>
              </div>

              <div className="space-y-3">
                {bins.slice(0, 4).map(bin => {
                  const isCrit = bin.fillLevel >= 85;
                  const fillBarColor = isCrit ? 'bg-red-500' : bin.fillLevel >= 60 ? 'bg-amber-400' : 'bg-[#00A77C]';
                  const textLvlColor = isCrit ? 'text-red-600' : bin.fillLevel >= 60 ? 'text-amber-600' : 'text-[#00A77C]';

                  return (
                    <div key={bin.id} className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-[#00271D] truncate">{bin.name}</span>
                        <span className={`font-bold ${textLvlColor}`}>{bin.fillLevel}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${fillBarColor} rounded-full`} style={{ width: `${bin.fillLevel}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ── 2. ACTIVE DISPATCHES DEDICATED VIEW ── */}
      {activeTab === 'dispatches' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] font-bold text-[#00A77C] bg-[#00A77C]/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                Active Dispatches
              </span>
              <h3 className="text-xl font-heading font-black text-[#00271D] tracking-tight mt-1.5 flex items-center gap-2">
                <Truck size={20} className="text-[#00A77C]" />
                Assigned Dispatches & Pickups
              </h3>
              <p className="text-xs text-[#00271D]/50 mt-0.5">Manage tasks assigned by Admin, confirm ongoing dispatches, and complete with kilo payload logs.</p>
            </div>
            <span className="hidden sm:flex text-xs font-bold text-[#00271D]/50 bg-white/80 px-3 py-1.5 rounded-full shadow-sm">
              {activeDispatches.length} tasks
            </span>
          </div>

          {activeDispatches.length === 0 ? (
            <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-12 text-center space-y-3">
              <div className="h-14 w-14 mx-auto rounded-2xl bg-[#00A77C]/10 text-[#00A77C] flex items-center justify-center">
                <CheckCircle2 size={28} />
              </div>
              <p className="text-base font-bold text-[#00271D]">All clear! No active dispatches assigned.</p>
              <p className="text-xs text-[#00271D]/50">When the Admin dispatches a pickup task, it will pop up right here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {activeDispatches.map(rep => {
                const isRecyclable = rep.category === 'RECYCLABLE' || rep.description.toUpperCase().includes('WASTE');
                const isAsset = rep.reportType === 'ASSET' ||
                  rep.description.toUpperCase().includes('FURNITURE') ||
                  rep.description.toUpperCase().includes('ELECTRONICS') ||
                  rep.description.toUpperCase().includes('FIXTURES') ||
                  rep.description.toUpperCase().includes('EQUIPMENT');

                const CategoryIcon = isRecyclable ? Recycle : isAsset ? Armchair : Trash2;
                const categoryLabel = isRecyclable ? 'Recyclables' : isAsset ? 'Asset Task' : 'General Waste';
                const categoryStyle = isRecyclable
                  ? 'bg-emerald-100/80 text-emerald-700'
                  : isAsset
                    ? 'bg-amber-100/80 text-amber-700'
                    : 'bg-zinc-100 text-zinc-600';

                const isPending = rep.status === 'PENDING';
                const cardAccent = isPending ? 'border-l-amber-400' : 'border-l-[#00A77C]';

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
                          isPending ? 'bg-amber-100/80 text-amber-700' : 'bg-indigo-100/80 text-indigo-700'
                        }`}>
                          {isPending ? 'Unconfirmed' : 'Ongoing'}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-base font-bold text-[#00271D] tracking-tight leading-snug">{rep.title}</h4>

                      {/* Location */}
                      <div className="flex items-center gap-1.5 text-xs">
                        <MapPin size={13} className="text-[#00A77C] shrink-0" />
                        <span className="font-semibold text-[#00271D]/70">{rep.locationName}</span>
                      </div>

                      {/* Description — clean, no box */}
                      <p className="text-xs text-[#00271D]/60 leading-relaxed">
                        {rep.description}
                      </p>

                      {/* Reporter */}
                      <p className="text-[11px] text-[#00271D]/40 font-medium">
                        Reported by <span className="font-bold text-[#00271D]/60">{rep.reporterName}</span> ({rep.reporterRole || 'student'}) · {rep.timestamp}
                      </p>
                    </div>

                    {/* Action button */}
                    <div className="shrink-0 w-full sm:w-auto self-center">
                      {isPending ? (
                        <button
                          onClick={() => handleConfirmDispatch(rep)}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#00A77C] hover:bg-[#008f6a] text-white text-xs font-bold shadow-md shadow-[#00A77C]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Play size={13} /> Confirm Dispatch
                        </button>
                      ) : (
                        <button
                          onClick={() => setCompleteModalReport(rep)}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#1D61E8] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
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

      {/* ── 3. COLLECTION HISTORY VIEW ── */}
      {activeTab === 'mrf-history' && (
        <div className="space-y-6 animate-fade-in">

          {/* Quick Summary Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-[#00A77C] mb-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Completed Jobs</span>
                <PackageCheck size={18} />
              </div>
              <p className="text-3xl font-black text-[#00271D]">{completedDispatches.length}</p>
              <p className="text-[11px] font-semibold text-[#00A77C]">Dispatches finished</p>
            </div>

            <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-emerald-600 mb-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Recyclables Gathered</span>
                <Scale size={18} />
              </div>
              <p className="text-3xl font-black text-[#00271D]">{totalKgCollected} <span className="text-base font-normal">kg</span></p>
              <p className="text-[11px] font-semibold text-emerald-600">Total weight logged</p>
            </div>

            <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-amber-600 mb-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Assets Handled</span>
                <Wrench size={18} />
              </div>
              <p className="text-3xl font-black text-[#00271D]">{totalAssetsProcessed}</p>
              <p className="text-[11px] font-semibold text-amber-600">Asset tasks processed</p>
            </div>
          </div>

          {/* History Log List */}
          <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-heading font-bold text-[#00271D] flex items-center gap-2">
              <History size={16} className="text-[#00A77C]" />
              <span>MRF Collection Ledger & Log History</span>
            </h3>

            {completedDispatches.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No completed collection logs yet.</p>
            ) : (
              <div className="divide-y divide-gray-150">
                {completedDispatches.map(rep => (
                  <div key={rep.id} className="py-3.5 flex justify-between items-center text-xs">
                    <div className="space-y-0.5">
                      <p className="font-bold text-gray-800">{rep.title}</p>
                      <p className="text-[10px] text-gray-400">
                        {rep.locationName} · Reporter: {rep.reporterName} · Completed: {rep.timestamp}
                      </p>
                    </div>
                    {rep.weightCollected ? (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-black text-[11px]">
                        <Scale size={11} /> {rep.weightCollected} kg
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-sky-50 text-sky-700 border border-sky-200 rounded-full font-black text-[10px] uppercase">
                        Done / Finished
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── JOB COMPLETION MODAL (Category-Tailored) ── */}
      {completeModalReport && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setCompleteModalReport(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="h-10 w-10 rounded-2xl bg-[#00A77C]/15 text-[#00A77C] flex items-center justify-center font-bold">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-heading font-black text-[#00271D]">Complete Task Assignment</h3>
                <p className="text-[11px] text-gray-500 font-medium">{completeModalReport.locationName}</p>
              </div>
            </div>

            <form onSubmit={handleCompleteSubmit} className="space-y-4 text-xs">

              {/* 1. IF RECYCLABLE: Prompts for Kilo (Kg) Weight */}
              {(completeModalReport.category === 'RECYCLABLE' || completeModalReport.description.toUpperCase().includes('WASTE')) && (
                <div className="space-y-2 bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <Scale size={16} />
                    <span className="font-black text-xs uppercase tracking-wider">Log Recyclable Weight (Kg)</span>
                  </div>
                  <p className="text-[11px] text-emerald-900/70">
                    Entering weight calculates bonus eco-points for <strong>{completeModalReport.reporterName}</strong>.
                  </p>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="e.g. 15.5"
                    value={weightKg}
                    onChange={e => setWeightKg(e.target.value)}
                    className="w-full rounded-xl border border-emerald-300 bg-white px-3.5 py-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#00A77C]"
                  />
                </div>
              )}

              {/* 2. IF ASSET: Prompts for Outcome Dropdown */}
              {(completeModalReport.reportType === 'ASSET' ||
                completeModalReport.description.toUpperCase().includes('FURNITURE') ||
                completeModalReport.description.toUpperCase().includes('ELECTRONICS') ||
                completeModalReport.description.toUpperCase().includes('FIXTURES') ||
                completeModalReport.description.toUpperCase().includes('EQUIPMENT')) && (
                <div className="space-y-3 bg-amber-50/70 p-4 rounded-2xl border border-amber-200">
                  <div className="flex items-center gap-2 text-amber-800">
                    <Wrench size={16} />
                    <span className="font-black text-xs uppercase tracking-wider">Select Asset Outcome</span>
                  </div>

                  <select
                    value={assetOutcome}
                    onChange={e => setAssetOutcome(e.target.value as any)}
                    className="w-full rounded-xl border border-amber-300 bg-white px-3.5 py-2.5 text-xs font-bold text-gray-900 outline-none cursor-pointer"
                  >
                    <option value="Repaired On-Site">Repaired On-Site</option>
                    <option value="Transported to MRF Workshop">Transported to MRF Workshop</option>
                    <option value="Needs Replacement">Decommissioned / Needs Replacement</option>
                  </select>

                  <textarea
                    rows={2}
                    placeholder="Optional notes for Admin & Reporter..."
                    value={completionNotes}
                    onChange={e => setCompletionNotes(e.target.value)}
                    className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none resize-none"
                  />
                </div>
              )}

              {/* 3. GENERAL TRASH: Standard Completion Notice */}
              {completeModalReport.category !== 'RECYCLABLE' &&
                completeModalReport.reportType !== 'ASSET' &&
                !completeModalReport.description.toUpperCase().includes('WASTE') &&
                !completeModalReport.description.toUpperCase().includes('FURNITURE') && (
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs text-gray-600">
                  <p className="font-bold text-gray-800 mb-1">Standard Waste Collection</p>
                  <p>Clicking Confirm will update the Admin status to Done and notify {completeModalReport.reporterName}.</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#00A77C] hover:bg-[#008f6a] text-white text-xs font-bold shadow-md shadow-[#00A77C]/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 size={16} /> Confirm Completion & Notify
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
