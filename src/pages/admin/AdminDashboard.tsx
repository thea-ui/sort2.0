import React, { useState } from 'react';
import { useMockData } from '../../hooks/useMockData';
import { AdminReportsTab } from './components/AdminReportsTab';
import { AdminImpactTab } from './components/AdminImpactTab';
import { AdminLeaderboardTab } from './components/AdminLeaderboardTab';
import { AdminCollectionsTab } from './components/AdminCollectionsTab';
import { AdminBinMapTab } from './components/AdminBinMapTab';
import { AdminSettingsTab } from './components/AdminSettingsTab';
import { AdminCampusNewsTab } from './components/AdminCampusNewsTab';
import { AdminUsersTab } from './components/AdminUsersTab';
import { AdminAuditLogsTab } from './components/AdminAuditLogsTab';
import { AdminLedgerPage } from './components/AdminLedgerPage';
import { SETTINGS_SUBITEMS } from '../../components/layout/DashboardLayout';

import {
  Settings,
  AlertOctagon,
  RefreshCw,
  Trash2,
  CheckCircle,
  Activity,
  BarChart2,
  CalendarDays,
  Clock,
  GraduationCap,
  Recycle,
  Droplets,
  Layers,
  FileText,
  Package,
} from 'lucide-react';

import { useRecycleMarket } from '../../hooks/useRecycleMarket';

export interface AdminDashboardProps {
  activeTab: string;
  setActiveTab?: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ activeTab, setActiveTab }) => {
  const {
    users,
    reports,
    bins,
    offenses,
    settings,
    syncLogs,
    updateSettings,
    resetDatabase,
    addOffense,
    deductPoints,
    triggerSync,
    verifyReport,
    verifyReportsBatch,
    dispatchReport,
    updateReportStatus
  } = useMockData();

  const {
    stocksRecord,
    totalVendorSales,
    rewardsReservedPhp,
  } = useRecycleMarket();

  const [purgedAlert, setPurgedAlert] = useState(false);
  const [adminToast, setAdminToast] = useState<string | null>(null);

  const showAdminToast = (msg: string) => {
    setAdminToast(msg);
    setTimeout(() => setAdminToast(null), 4000);
  };

  const handlePurgeDatabase = () => {
    if (window.confirm('Wipe all test reports, student points, history, and reset recycle market inventory?')) {
      resetDatabase();
      // Notify market subscribers to refresh after the purge round-trip completes
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('sort_market_updated'));
      }, 600);
      setPurgedAlert(true);
      setTimeout(() => setPurgedAlert(false), 3000);
    }
  };

  // Dynamic calculations from real reports
  const totalReportsCount = reports.length;
  const collectedReports = reports.filter(r => r.status === 'COLLECTED' || r.status === 'RESOLVED');
  const dispatchedReports = reports.filter(r => r.status === 'DISPATCHED');
  // Total collected weight from market stocks (MRF-verified data)
  const totalCollectedWeightKg = Object.values(stocksRecord).reduce((sum, stock) => sum + (stock?.accumulatedKg || 0), 0);
  const resolutionRatePct = totalReportsCount > 0 ? Math.round((collectedReports.length / totalReportsCount) * 100) : 100;

  // Compute reports today / this week dynamically
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const reportsToday = reports.filter(r => r.timestamp && r.timestamp.slice(0, 10) === todayStr).length;

  // Reports this week (Monday to Sunday)
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const reportsThisWeek = reports.filter(r => {
    if (!r.timestamp) return false;
    const rDate = r.timestamp.slice(0, 10);
    return rDate >= weekStartStr && rDate <= todayStr;
  }).length;

  // Peak activity time - compute from actual report timestamps
  const hourCounts: Record<number, number> = {};
  reports.forEach(r => {
    if (r.timestamp) {
      try {
        const h = new Date(r.timestamp).getHours();
        hourCounts[h] = (hourCounts[h] || 0) + 1;
      } catch { /* skip */ }
    }
  });
  const peakHour = Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0];
  const peakHourNum = peakHour ? parseInt(peakHour[0]) : 12;
  const peakStart = peakHourNum > 12 ? `${peakHourNum - 12}:00 PM` : peakHourNum === 12 ? '12:00 PM' : `${peakHourNum}:00 AM`;
  const peakEnd = peakHourNum + 1 > 12 ? `${peakHourNum + 1 - 12}:00 PM` : peakHourNum + 1 === 12 ? '12:00 PM' : `${peakHourNum + 1}:00 AM`;
  const peakTimeStr = peakHour ? `${peakStart} – ${peakEnd}` : 'No data yet';
  const peakDispatchTime = peakHour ? `${String(Math.min(peakHourNum + 2, 23)).padStart(2, '0')}:15` : '2:15 PM';

  // Grade level distribution dynamically from reports — Students only, derived from EnrollPro-synced gradeLevel
  const gradeColors = ['bg-emerald-500', 'bg-sky-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500', 'bg-indigo-500', 'bg-teal-500', 'bg-pink-500'];
  const gradeBgColors = ['bg-emerald-50/60', 'bg-sky-50/60', 'bg-amber-50/60', 'bg-purple-50/60', 'bg-rose-50/60', 'bg-indigo-50/60', 'bg-teal-50/60', 'bg-pink-50/60'];
  const gradeTextColors = ['text-emerald-700', 'text-sky-700', 'text-amber-700', 'text-purple-700', 'text-rose-700', 'text-indigo-700', 'text-teal-700', 'text-pink-700'];
  const gradeBorderColors = ['border-emerald-100', 'border-sky-100', 'border-amber-100', 'border-purple-100', 'border-rose-100', 'border-indigo-100', 'border-teal-100', 'border-pink-100'];

  const gradeCountMap: Record<string, number> = {};
  reports.forEach((r) => {
    const u = users.find((usr) => usr.id === r.reporterId || usr.name.toLowerCase() === r.reporterName?.toLowerCase());
    if (!u || u.role !== 'STUDENT') return;
    const grade = (u as any)?.gradeLevel || 'Unknown';
    gradeCountMap[grade] = (gradeCountMap[grade] || 0) + 1;
  });

  const gradeBreakdownList = Object.entries(gradeCountMap)
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([grade, count], idx) => ({
      grade,
      count,
      barBg: gradeColors[idx % gradeColors.length],
      bg: gradeBgColors[idx % gradeBgColors.length],
      text: gradeTextColors[idx % gradeTextColors.length],
      border: gradeBorderColors[idx % gradeBorderColors.length],
      pct: totalReportsCount > 0 ? Math.round((count / totalReportsCount) * 100) : 0,
    }));

  // Material distribution from market stock accumulatedKg (MRF-verified data)
  const plasticCount = Math.round((stocksRecord['pet_plastic']?.accumulatedKg || 0) * 10) / 10;
  const canCount = Math.round((stocksRecord['aluminum_cans']?.accumulatedKg || 0) * 10) / 10;
  const paperCount = Math.round((stocksRecord['cardboard']?.accumulatedKg || 0) * 10) / 10;
  const glassCount = Math.round((stocksRecord['glass']?.accumulatedKg || 0) * 10) / 10;

  const totalMaterialReports = plasticCount + canCount + paperCount + glassCount;

  const materialBreakdownList = [
    { name: 'Plastic Bottles', count: plasticCount, Icon: Droplets, barBg: 'bg-emerald-500', bg: 'bg-emerald-50/60', text: 'text-emerald-700', border: 'border-emerald-100', iconColor: 'text-emerald-600' },
    { name: 'Aluminum Cans', count: canCount, Icon: Layers, barBg: 'bg-sky-500', bg: 'bg-sky-50/60', text: 'text-sky-700', border: 'border-sky-100', iconColor: 'text-sky-600' },
    { name: 'Paper / Cardboard', count: paperCount, Icon: FileText, barBg: 'bg-amber-500', bg: 'bg-amber-50/60', text: 'text-amber-700', border: 'border-amber-100', iconColor: 'text-amber-600' },
    { name: 'Glass / Beverage Bottles', count: glassCount, Icon: Package, barBg: 'bg-purple-500', bg: 'bg-purple-50/60', text: 'text-purple-700', border: 'border-purple-100', iconColor: 'text-purple-600' },
  ].map(item => ({
    ...item,
    pct: totalMaterialReports > 0 ? Math.round((item.count / totalMaterialReports) * 100) : 0,
  }));

  // Estimated economic value from market stocks
  const petKg = stocksRecord['pet_plastic']?.accumulatedKg || 0;
  const aluKg = stocksRecord['aluminum_cans']?.accumulatedKg || 0;
  const paperKgVal = stocksRecord['cardboard']?.accumulatedKg || 0;
  const glassKg = stocksRecord['glass']?.accumulatedKg || 0;

  const totalEstimatedValuePhp = 
    (petKg * (stocksRecord['pet_plastic']?.marketPricePerKg || 18)) +
    (aluKg * (stocksRecord['aluminum_cans']?.marketPricePerKg || 45)) +
    (paperKgVal * (stocksRecord['cardboard']?.marketPricePerKg || 12)) +
    (glassKg * (stocksRecord['glass']?.marketPricePerKg || 15));

  // Settings forms local states
  const [ptsPerRep, setPtsPerRep] = useState(settings?.pointsPerReport?.toString() || '50');
  const [ptsPerKg, setPtsPerKg] = useState(settings?.pointsPerKgRecyclable?.toString() || '10');
  const [warnLimit, setWarnLimit] = useState(settings?.warningThreshold?.toString() || '3');
  const [certLimit, setCertLimit] = useState(settings?.certificatePointThreshold?.toString() || '500');
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Warning Form States
  const [targetUserId, setTargetUserId] = useState('');
  const [warnDesc, setWarnDesc] = useState('');
  const [warningSuccess, setWarningSuccess] = useState(false);

  // Sync state
  const [syncing, setSyncing] = useState(false);

  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      pointsPerReport: parseInt(ptsPerRep) || 50,
      pointsPerKgRecyclable: parseInt(ptsPerKg) || 10,
      warningThreshold: parseInt(warnLimit) || 3,
      certificatePointThreshold: parseInt(certLimit) || 500,
    });
    setSettingsSuccess(true);
    setTimeout(() => setSettingsSuccess(false), 3000);
  };

  const handleWarningSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId || !warnDesc.trim()) return;

    addOffense(targetUserId, warnDesc);
    setWarningSuccess(true);
    setWarnDesc('');
    setTargetUserId('');

    setTimeout(() => setWarningSuccess(false), 3000);
  };

  const handleSyncClick = () => {
    setSyncing(true);
    setTimeout(() => {
      triggerSync('MAIN_SERVER');
      setSyncing(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">

      {/* Toast Notification */}
      {adminToast && (
        <div className="fixed top-20 right-6 z-50 bg-[#00271D] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-[#00A77C]/40 flex items-center gap-3 animate-pulse">
          <CheckCircle size={18} className="text-[#00A77C]" />
          <span className="text-xs font-bold">{adminToast}</span>
        </div>
      )}

      {/* OVERVIEW / ANALYTICS DASHBOARD VIEW FOR ADMIN */}
      {(activeTab === 'overview' || activeTab === 'admin-analytics') && (
        <div className="space-y-6 animate-fade-in">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#00A77C] bg-[#00A77C]/10 border border-[#00A77C]/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                Operational Telemetry
              </span>
              <h2 className="text-xl font-extrabold text-[#00271D] tracking-tight mt-1.5">Campus Operational Analytics</h2>
              <p className="text-xs text-[#00271D]/50 mt-0.5">Real-time reporting frequency, grade level distribution, and material breakdowns.</p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-[#00271D] bg-white border border-[#00271D]/10 px-3 py-1.5 rounded-xl shadow-sm">
              <BarChart2 size={13} className="text-[#00A77C]" /> Live Status Hub
            </span>
          </div>

          {/* Module 2: STUDENT REPORTING FREQUENCY (Summary Quick-Stat Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => setActiveTab?.('admin-reports')}
              className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 text-left shadow-sm space-y-1 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group hover:border-emerald-300"
            >
              <div className="flex items-center justify-between text-[#00A77C] mb-1">
                <span className="text-[10px] font-bold text-[#00271D]/50 uppercase tracking-wider group-hover:text-[#00A77C] transition-colors">Reports Today</span>
                <div className="p-1.5 bg-[#00A77C]/10 rounded-lg text-[#00A77C] group-hover:scale-105 transition-transform">
                  <BarChart2 size={15} />
                </div>
              </div>
              <p className="text-3xl font-black text-[#00271D]">{reportsToday}</p>
              <p className="text-[11px] font-semibold text-[#00A77C]">Active verified incidents</p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab?.('admin-reports')}
              className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 text-left shadow-sm space-y-1 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group hover:border-sky-300"
            >
              <div className="flex items-center justify-between text-sky-600 mb-1">
                <span className="text-[10px] font-bold text-[#00271D]/50 uppercase tracking-wider group-hover:text-sky-600 transition-colors">This Week</span>
                <div className="p-1.5 bg-sky-50 rounded-lg text-sky-500 group-hover:scale-105 transition-transform">
                  <CalendarDays size={15} />
                </div>
              </div>
              <p className="text-3xl font-black text-[#00271D]">{reportsThisWeek}</p>
              <p className="text-[11px] font-semibold text-sky-600">Active campus submissions</p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab?.('admin-collections')}
              className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 text-left shadow-sm space-y-1 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group hover:border-amber-300"
            >
              <div className="flex items-center justify-between text-amber-600 mb-1">
                <span className="text-[10px] font-bold text-[#00271D]/50 uppercase tracking-wider group-hover:text-amber-600 transition-colors">Peak Activity Time</span>
                <div className="p-1.5 bg-amber-50 rounded-lg text-amber-500 group-hover:scale-105 transition-transform">
                  <Clock size={15} />
                </div>
              </div>
              <p className="text-xl font-black text-[#00271D] mt-1">{peakTimeStr}</p>
              <p className="text-[11px] font-semibold text-amber-600">Highest daily traffic window</p>
              <div className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-xl">
                <Clock size={11} className="text-amber-500 shrink-0" />
                <span className="text-[10px] font-bold text-amber-700 leading-tight">Optimal MRF Staff Dispatch Window: <span className="text-amber-900">{peakDispatchTime}</span></span>
              </div>
            </button>
          </div>

          {/* 2-Column Grid: Grade Level Breakdown & Most Reported Materials */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-4 hover:shadow-md transition-shadow">
              <div>
                <h4 className="text-xs font-extrabold text-[#00271D] flex items-center gap-2">
                  <GraduationCap size={14} className="text-emerald-500" />
                  <span>Reports by Grade Level</span>
                </h4>
                <p className="text-[11px] text-[#00271D]/40 font-medium mt-0.5">
                  Report distribution volume across academic grade levels
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {gradeBreakdownList.map((item) => (
                  <div key={item.grade} className={`p-3 rounded-2xl border ${item.bg} ${item.border} space-y-1.5`}>
                    <div className="flex justify-between items-center text-xs font-bold text-gray-900">
                      <span>{item.grade}</span>
                      <span className={item.text}>{item.pct}% · {item.count} report{item.count === 1 ? '' : 's'}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200/80 rounded-full overflow-hidden">
                      <div className={`h-full ${item.barBg} transition-all duration-500`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Module 3: TOP RECYCLED MATERIALS */}
            <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-4 hover:shadow-md transition-shadow">
              <div>
                <h4 className="text-xs font-extrabold text-[#00271D] flex items-center gap-2">
                  <Recycle size={14} className="text-emerald-500" />
                  <span>Most Reported Materials</span>
                </h4>
                <p className="text-[11px] text-[#00271D]/40 font-medium mt-0.5">
                  Item categories submitted by students across campus
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {materialBreakdownList.map((item) => (
                  <div key={item.name} className={`p-3 rounded-2xl border ${item.bg} ${item.border} space-y-1.5`}>
                    <div className="flex justify-between items-center text-xs font-bold text-gray-900">
                      <span className="flex items-center gap-1.5">
                        <item.Icon size={13} className={item.iconColor} />
                        <span>{item.name}</span>
                      </span>
                      <span className={item.text}>{item.pct}% · {item.count} report{item.count === 1 ? '' : 's'}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200/80 rounded-full overflow-hidden">
                      <div className={`h-full ${item.barBg} transition-all duration-500`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* OPERATIONAL ANALYTICS / IMPACT TAB */}
      {activeTab === 'admin-impact' && <AdminImpactTab reports={reports} users={users} />}

      {/* LEADERBOARD TAB */}
      {activeTab === 'admin-leaderboard' && <AdminLeaderboardTab users={users} reports={reports} />}

      {/* 1. ALL REPORTS MANAGEMENT VIEW (MATCHES SCREENSHOT 714) */}
      {activeTab === 'admin-reports' && (
        <AdminReportsTab
          reports={reports}
          users={users}
          settings={settings}
          verifyReport={verifyReport}
          verifyReportsBatch={verifyReportsBatch}
          dispatchReport={dispatchReport}
          updateReportStatus={updateReportStatus}
          addOffense={addOffense}
          deductPoints={deductPoints}
        />
      )}

      {/* COLLECTIONS MANAGEMENT TAB */}
      {activeTab === 'admin-collections' && (
        <AdminCollectionsTab
          reports={reports}
          users={users}
          settings={settings}
          dispatchReport={dispatchReport}
          updateReportStatus={updateReportStatus}
          addOffense={addOffense}
          deductPoints={deductPoints}
        />
      )}

      {/* BIN MAP MANAGEMENT TAB */}
      {activeTab === 'admin-bin-map' && <AdminBinMapTab bins={bins} reports={reports} />}

      {/* CAMPUS NEWS TAB */}
      {activeTab === 'admin-campus-news' && <AdminCampusNewsTab />}

      {/* SCHOOL YEAR LEDGER + MANAGEMENT */}
      {activeTab === 'admin-ledger' && (
        <AdminLedgerPage showToast={showAdminToast} />
      )}

      {/* 2. LEADERBOARD / USER ACCOUNTS & ROLE MANAGEMENT */}
      {activeTab === 'admin-users' && (
        <AdminUsersTab
          users={users}
        />
      )}

      {activeTab === 'admin-audit-logs' && <AdminAuditLogsTab />}

      {/* 2. WARNINGS & OFFENSES */}
      {activeTab === 'admin-warnings' && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Sanctions Desk
            </span>
            <h3 className="text-xl font-heading font-black text-[#00271D] tracking-tight mt-1.5">Offenses & Warnings</h3>
            <p className="text-xs text-[#00271D]/50 mt-0.5">Register improper sorting offenses and manage sanction notices.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

            {/* File Warning Form */}
            <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm self-start">
              <h4 className="text-sm font-heading font-bold text-[#00271D] mb-4 flex items-center gap-2">
                <AlertOctagon size={16} className="text-rose-500" />
                Log Warning Offense
              </h4>

              {warningSuccess && (
                <div className="p-3 bg-[#00A77C]/10 border border-[#00A77C]/20 text-[#00A77C] rounded-xl text-xs flex gap-2 mb-4">
                  <CheckCircle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Sanction Registered!</p>
                    <p className="text-[10px] opacity-80 mt-0.5">Offense logged to database successfully.</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleWarningSubmit} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#00271D]/40 uppercase tracking-wider">Target User Account</label>
                  <select
                    value={targetUserId}
                    onChange={e => setTargetUserId(e.target.value)}
                    required
                    className="w-full rounded-xl border border-[#00271D]/10 bg-[#F9F3F0] px-3.5 py-2.5 text-xs text-[#00271D] outline-none cursor-pointer focus:border-[#00A77C] focus:bg-white transition-colors"
                  >
                    <option value="">-- Choose account --</option>
                    {users.filter(u => u.role === 'STUDENT' || u.role === 'TEACHER').map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.employeeId})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#00271D]/40 uppercase tracking-wider">Notice Offense Description</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. Mixed food scraps inside plastic sorting containers..."
                    value={warnDesc}
                    onChange={e => setWarnDesc(e.target.value)}
                    className="w-full rounded-xl border border-[#00271D]/10 bg-[#F9F3F0] px-3.5 py-2.5 text-xs text-[#00271D] outline-none resize-none focus:border-[#00A77C] focus:bg-white transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#00271D]/40 uppercase tracking-wider">Offense Level (Auto-determined)</label>
                  <div className="flex gap-2">
                    {(['WARNING', 'DEDUCT', 'SUSPENSION'] as const).map((sev, i) => {
                      const targetUser = users.find(u => u.id === targetUserId);
                      const nextLevel = targetUser ? (targetUser.warningsCount ?? 0) + 1 : 1;
                      const isActive = (i + 1) === nextLevel;
                      return (
                        <div
                          key={sev}
                          className={`flex-1 py-2 text-center rounded-xl border font-bold text-[9px] ${
                            isActive
                              ? 'bg-rose-500 border-rose-500 text-white shadow-sm shadow-rose-200'
                              : 'bg-gray-50 border-gray-200 text-gray-400 opacity-50'
                          }`}
                        >
                          {sev === 'WARNING' ? 'Warning' : sev === 'DEDUCT' ? 'Deduct' : 'Suspend'}
                          {isActive && <span className="block text-[8px] font-normal mt-0.5">Next offense</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-rose-600 shadow-md shadow-rose-200 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <AlertOctagon size={13} />
                  <span>Log Notice of Sanction</span>
                </button>
              </form>
            </div>

            {/* Offense Logs List */}
            <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm lg:col-span-2">
              <h4 className="text-sm font-heading font-bold text-[#00271D] mb-4 flex items-center gap-2">
                <AlertOctagon size={15} className="text-rose-500" />
                Recent Sanction Incidents
              </h4>

              {offenses.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <div className="h-12 w-12 mx-auto rounded-2xl bg-rose-50 text-rose-400 flex items-center justify-center">
                    <AlertOctagon size={24} />
                  </div>
                  <p className="text-sm font-bold text-[#00271D]">No warning incidents on record.</p>
                  <p className="text-xs text-[#00271D]/40">All clear — no sanctions have been filed yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#00271D]/5">
                  {offenses.map(off => (
                    <div key={off.id} className="flex justify-between items-start py-3.5 first:pt-0 last:pb-0 gap-3">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-[#00271D]">{off.description}</p>
                        <p className="text-[10px] text-[#00271D]/50 font-semibold">User: {off.userName} · {off.timestamp}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase shrink-0 ${
                        off.severity === 'SUSPENSION' ? 'bg-rose-100 border border-rose-300 text-rose-700' :
                        off.severity === 'DEDUCT'     ? 'bg-amber-50 border border-amber-200 text-amber-700' :
                        'bg-orange-50 border border-orange-200 text-orange-700'
                      }`}>
                        {off.severity === 'WARNING' ? 'Warning' : off.severity === 'DEDUCT' ? 'Deduct' : 'Suspended'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 3. SYSTEM CONFIGS & SETTINGS TABS */}
      {(activeTab === 'admin-settings' || SETTINGS_SUBITEMS.some(sub => sub.id === activeTab)) && (
        <AdminSettingsTab
          subTab={activeTab === 'admin-settings' ? 'academic-calendar' : activeTab}
          settings={settings}
          updateSettings={updateSettings}
          resetDatabase={resetDatabase}
        />
      )}

      {/* 4. SYNC LOGS VIEW */}
      {activeTab === 'admin-sync' && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <span className="text-[10px] font-bold text-[#00A77C] bg-[#00A77C]/10 border border-[#00A77C]/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Sync Logs
            </span>
            <h3 className="text-xl font-heading font-black text-[#00271D] tracking-tight mt-1.5">Simulated Sync Transmissions</h3>
            <p className="text-xs text-[#00271D]/50 mt-0.5">Monitor and trigger data synchronization between campus systems and the main server.</p>
          </div>

          <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-[#00A77C]" />
                <h4 className="text-sm font-heading font-bold text-[#00271D]">Database Transmissions Log</h4>
              </div>

              <button
                type="button"
                onClick={handleSyncClick}
                disabled={syncing}
                className="px-4 py-2 bg-[#00A77C] hover:bg-[#008f6a] disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-md shadow-[#00A77C]/20 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing...' : 'Simulate Synchronization'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#00271D]/8 text-[#00271D]/40 font-bold uppercase tracking-wider bg-[#00A77C]/5">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Target System</th>
                    <th className="py-3 px-4">Records Synced</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#00271D]/5">
                  {syncLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center">
                        <div className="space-y-2">
                          <div className="h-10 w-10 mx-auto rounded-xl bg-[#00A77C]/10 text-[#00A77C] flex items-center justify-center">
                            <RefreshCw size={20} />
                          </div>
                          <p className="text-sm font-bold text-[#00271D]">No sync tasks logged yet.</p>
                          <p className="text-xs text-[#00271D]/40">Trigger a sync above to see logs appear here.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    syncLogs.map(log => (
                      <tr key={log.id} className="hover:bg-[#00A77C]/5 transition-colors">
                        <td className="py-3 px-4 font-mono text-[#00271D]/60 text-[11px]">{log.timestamp}</td>
                        <td className="py-3 px-4 font-bold text-[#00271D]">{log.system}</td>
                        <td className="py-3 px-4 font-mono text-[#00271D]/70">{log.recordsSynced}</td>
                        <td className="py-3 px-4 text-right">
                          <span className="rounded-full bg-[#00A77C]/10 border border-[#00A77C]/20 px-2.5 py-0.5 text-[9px] font-black uppercase text-[#00A77C]">
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
