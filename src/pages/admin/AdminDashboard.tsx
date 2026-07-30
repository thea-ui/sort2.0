import React, { useState } from 'react';
import { useMockData } from '../../hooks/useMockData';
import { AdminReportsTab } from './components/AdminReportsTab';
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
  RotateCcw,
} from 'lucide-react';

interface AdminDashboardProps {
  activeTab: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ activeTab }) => {
  const {
    users,
    reports,
    offenses,
    settings,
    syncLogs,
    updateSettings,
    resetDatabase,
    addOffense,
    triggerSync,
    verifyReport,
    dispatchReport,
    updateReportStatus
  } = useMockData();

  const [purgedAlert, setPurgedAlert] = useState(false);

  const handlePurgeDatabase = () => {
    if (window.confirm('Wipe all test reports, student points, and history for testing?')) {
      resetDatabase();
      setPurgedAlert(true);
      setTimeout(() => setPurgedAlert(false), 3000);
    }
  };

  // Analytics local timeframe state
  const [timeframe, setTimeframe] = useState<'Daily' | 'Weekly' | 'Monthly'>('Weekly');

  // Operational Trend Data
  const trendData = {
    Daily: [
      { label: '8 AM', count: 4 },
      { label: '10 AM', count: 12 },
      { label: '12 PM', count: 28, isPeak: true },
      { label: '2 PM', count: 22 },
      { label: '4 PM', count: 16 },
      { label: '6 PM', count: 8 },
    ],
    Weekly: [
      { label: 'Mon', count: 14 },
      { label: 'Tue', count: 22 },
      { label: 'Wed', count: 35 },
      { label: 'Thu', count: 28 },
      { label: 'Fri', count: 42, isPeak: true },
      { label: 'Sat', count: 18 },
      { label: 'Sun', count: 11 },
    ],
    Monthly: [
      { label: 'Wk 1', count: 65 },
      { label: 'Wk 2', count: 88 },
      { label: 'Wk 3', count: 124, isPeak: true },
      { label: 'Wk 4', count: 95 },
    ],
  };

  const currentTrend = trendData[timeframe];
  const maxCount = Math.max(...currentTrend.map(t => t.count));
  const totalTrendReports = currentTrend.reduce((sum, item) => sum + item.count, 0);

  // Operational Materials Breakdown
  const materialsBreakdown = [
    { name: 'Plastic Bottles', pct: 45, count: 142, color: 'bg-emerald-500', barColor: '#10b981', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { name: 'Aluminum Cans', pct: 30, count: 95, color: 'bg-sky-500', barColor: '#0284c7', text: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200' },
    { name: 'Paper & Cardboard', pct: 15, count: 47, color: 'bg-amber-500', barColor: '#f59e0b', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
    { name: 'Glass Bottles', pct: 10, count: 32, color: 'bg-purple-500', barColor: '#a855f7', text: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  ];

  // Settings forms local states
  const [ptsPerRep, setPtsPerRep] = useState(settings?.pointsPerReport?.toString() || '50');
  const [ptsPerKg, setPtsPerKg] = useState(settings?.pointsPerKgRecyclable?.toString() || '10');
  const [warnLimit, setWarnLimit] = useState(settings?.warningThreshold?.toString() || '3');
  const [certLimit, setCertLimit] = useState(settings?.certificatePointThreshold?.toString() || '500');
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Warning Form States
  const [targetUserId, setTargetUserId] = useState('');
  const [warnDesc, setWarnDesc] = useState('');
  const [severity, setSeverity] = useState<'WARNING' | 'STRIKE' | 'SUSPENSION'>('WARNING');
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

    addOffense(targetUserId, warnDesc, severity);
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePurgeDatabase}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/10 text-rose-700 border border-rose-300 text-xs font-black hover:bg-rose-500 hover:text-white transition-all cursor-pointer shadow-sm"
                title="Flush all test reports, student points, and history"
              >
                <RotateCcw size={13} />
                <span>Purge Test Data</span>
              </button>
              {purgedAlert && (
                <span className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full animate-pulse">
                  Purged!
                </span>
              )}
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-[#00271D] bg-white border border-[#00271D]/10 px-3 py-1.5 rounded-xl shadow-sm">
                <BarChart2 size={13} className="text-[#00A77C]" /> Live Status Hub
              </span>
            </div>
          </div>

          {/* Module 2: STUDENT REPORTING FREQUENCY (Summary Quick-Stat Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm space-y-1 hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex items-center justify-between text-[#00A77C] mb-1">
                <span className="text-[10px] font-bold text-[#00271D]/50 uppercase tracking-wider">Reports Today</span>
                <div className="p-1.5 bg-[#00A77C]/10 rounded-lg text-[#00A77C]">
                  <BarChart2 size={15} />
                </div>
              </div>
              <p className="text-3xl font-black text-[#00271D]">24</p>
              <p className="text-[11px] font-semibold text-[#00A77C]">+8% vs yesterday</p>
            </div>

            <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm space-y-1 hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex items-center justify-between text-sky-600 mb-1">
                <span className="text-[10px] font-bold text-[#00271D]/50 uppercase tracking-wider">This Week</span>
                <div className="p-1.5 bg-sky-50 rounded-lg text-sky-500">
                  <CalendarDays size={15} />
                </div>
              </div>
              <p className="text-3xl font-black text-[#00271D]">142</p>
              <p className="text-[11px] font-semibold text-sky-600">Active campus submissions</p>
            </div>

            <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm space-y-1 hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex items-center justify-between text-amber-600 mb-1">
                <span className="text-[10px] font-bold text-[#00271D]/50 uppercase tracking-wider">Peak Activity Time</span>
                <div className="p-1.5 bg-amber-50 rounded-lg text-amber-500">
                  <Clock size={15} />
                </div>
              </div>
              <p className="text-xl font-black text-[#00271D] mt-1">12:00 PM – 2:00 PM</p>
              <p className="text-[11px] font-semibold text-amber-600">Highest daily traffic window</p>
            </div>
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
                {[
                  { grade: 'Grade 7',  pct: 28, count: 120, barBg: 'bg-emerald-500', bg: 'bg-emerald-50/60', text: 'text-emerald-700', border: 'border-emerald-100' },
                  { grade: 'Grade 8',  pct: 25, count: 108, barBg: 'bg-sky-500',     bg: 'bg-sky-50/60',     text: 'text-sky-700',     border: 'border-sky-100' },
                  { grade: 'Grade 9',  pct: 22, count: 95,  barBg: 'bg-amber-500',   bg: 'bg-amber-50/60',   text: 'text-amber-700',   border: 'border-amber-100' },
                  { grade: 'Grade 10', pct: 25, count: 105, barBg: 'bg-purple-500',  bg: 'bg-purple-50/60',  text: 'text-purple-700',  border: 'border-purple-100' },
                ].map((item) => (
                  <div key={item.grade} className={`p-3 rounded-2xl border ${item.bg} ${item.border} space-y-1.5`}>
                    <div className="flex justify-between items-center text-xs font-bold text-gray-900">
                      <span>{item.grade}</span>
                      <span className={item.text}>{item.pct}% · {item.count} reports</span>
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
                {[
                  { name: 'Plastic Bottles',  pct: 45, count: 210, Icon: Droplets,  barBg: 'bg-emerald-500', bg: 'bg-emerald-50/60', text: 'text-emerald-700', border: 'border-emerald-100', iconColor: 'text-emerald-600' },
                  { name: 'Aluminum Cans',    pct: 30, count: 140, Icon: Layers,    barBg: 'bg-sky-500',     bg: 'bg-sky-50/60',     text: 'text-sky-700',     border: 'border-sky-100',     iconColor: 'text-sky-600'     },
                  { name: 'Paper / Cardboard',pct: 15, count: 70,  Icon: FileText,  barBg: 'bg-amber-500',   bg: 'bg-amber-50/60',   text: 'text-amber-700',   border: 'border-amber-100',   iconColor: 'text-amber-600'   },
                  { name: 'Glass / Others',   pct: 10, count: 45,  Icon: Package,   barBg: 'bg-purple-500',  bg: 'bg-purple-50/60',  text: 'text-purple-700',  border: 'border-purple-100',  iconColor: 'text-purple-600'  },
                ].map((item) => (
                  <div key={item.name} className={`p-3 rounded-2xl border ${item.bg} ${item.border} space-y-1.5`}>
                    <div className="flex justify-between items-center text-xs font-bold text-gray-900">
                      <span className="flex items-center gap-1.5">
                        <item.Icon size={13} className={item.iconColor} />
                        <span>{item.name}</span>
                      </span>
                      <span className={item.text}>{item.pct}% · {item.count} reports</span>
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

      {/* 1. ALL REPORTS MANAGEMENT VIEW (MATCHES SCREENSHOT 714) */}
      {activeTab === 'admin-reports' && (
        <AdminReportsTab
          reports={reports}
          users={users}
          verifyReport={verifyReport}
          dispatchReport={dispatchReport}
          updateReportStatus={updateReportStatus}
          addOffense={addOffense}
        />
      )}

      {/* 2. LEADERBOARD / USER LIST VIEW */}
      {activeTab === 'admin-users' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#00A77C] bg-[#00A77C]/10 border border-[#00A77C]/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                Ecology Database
              </span>
              <h3 className="text-xl font-heading font-black text-[#00271D] tracking-tight mt-1.5">Active Accounts Management</h3>
              <p className="text-xs text-[#00271D]/50 mt-0.5">Audit global points allocation and warning histories across all users.</p>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#00271D]/8 text-[#00271D]/40 font-bold uppercase tracking-wider bg-[#00A77C]/5">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Badge ID</th>
                    <th className="py-3 px-4 text-right">Warnings</th>
                    <th className="py-3 px-4 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#00271D]/5">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-[#00A77C]/5 transition-colors">
                      <td className="py-3 px-4 font-bold text-[#00271D]">{u.name}</td>
                      <td className="py-3 px-4 text-[#00271D]/60 font-mono text-[11px]">{u.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          u.role === 'ADMIN'   ? 'bg-violet-50 border-violet-200 text-violet-700' :
                          u.role === 'MRF'     ? 'bg-sky-50 border-sky-200 text-sky-700' :
                          u.role === 'TEACHER' ? 'bg-purple-50 border-purple-200 text-purple-700' :
                          'bg-[#00A77C]/10 border-[#00A77C]/20 text-[#00A77C]'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#00271D]/50 font-mono text-[11px]">{u.employeeId}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-bold text-xs ${ u.warningsCount > 0 ? 'text-rose-600' : 'text-[#00271D]/30' }`}>{u.warningsCount}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-[#00A77C] text-xs">{u.points.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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
                  <label className="text-[10px] font-bold text-[#00271D]/40 uppercase tracking-wider">Severity Level</label>
                  <div className="flex gap-2">
                    {(['WARNING', 'STRIKE', 'SUSPENSION'] as const).map(sev => (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setSeverity(sev)}
                        className={`flex-1 py-2 text-center rounded-xl border font-bold transition-all text-[9px] cursor-pointer ${
                          severity === sev
                            ? 'bg-rose-500 border-rose-500 text-white shadow-sm shadow-rose-200'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
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
                        off.severity === 'STRIKE'     ? 'bg-amber-50 border border-amber-200 text-amber-700' :
                        'bg-orange-50 border border-orange-200 text-orange-700'
                      }`}>
                        {off.severity}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 3. SYSTEM CONFIGS */}
      {activeTab === 'admin-settings' && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <span className="text-[10px] font-bold text-[#00A77C] bg-[#00A77C]/10 border border-[#00A77C]/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
              System Configuration
            </span>
            <h3 className="text-xl font-heading font-black text-[#00271D] tracking-tight mt-1.5">Waste Rules & Parameters</h3>
            <p className="text-xs text-[#00271D]/50 mt-0.5">Customize default points allocations and system threshold requirements.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 max-w-4xl">

            <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm self-start">
              <h4 className="text-sm font-heading font-bold text-[#00271D] mb-4 flex items-center gap-2">
                <Settings size={15} className="text-[#00A77C]" />
                Points & Thresholds
              </h4>

              {settingsSuccess && (
                <div className="p-3 bg-[#00A77C]/10 border border-[#00A77C]/20 text-[#00A77C] rounded-xl text-xs flex gap-2 mb-4">
                  <CheckCircle size={16} className="shrink-0 mt-0.5" />
                  <span className="font-bold">Parameters saved successfully.</span>
                </div>
              )}

              <form onSubmit={handleSettingsSubmit} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#00271D]/40 uppercase tracking-wider">Points Awarded Per Incident Report</label>
                  <input
                    type="number"
                    required
                    value={ptsPerRep}
                    onChange={e => setPtsPerRep(e.target.value)}
                    className="w-full rounded-xl border border-[#00271D]/10 bg-[#F9F3F0] px-3.5 py-2.5 text-xs text-[#00271D] outline-none focus:border-[#00A77C] focus:bg-white transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#00271D]/40 uppercase tracking-wider">Points Multiplier Per Kg Recyclables</label>
                  <input
                    type="number"
                    required
                    value={ptsPerKg}
                    onChange={e => setPtsPerKg(e.target.value)}
                    className="w-full rounded-xl border border-[#00271D]/10 bg-[#F9F3F0] px-3.5 py-2.5 text-xs text-[#00271D] outline-none focus:border-[#00A77C] focus:bg-white transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#00271D]/40 uppercase tracking-wider">Warning Threshold Cap (triggers Admin Audit)</label>
                  <input
                    type="number"
                    required
                    value={warnLimit}
                    onChange={e => setWarnLimit(e.target.value)}
                    className="w-full rounded-xl border border-[#00271D]/10 bg-[#F9F3F0] px-3.5 py-2.5 text-xs text-[#00271D] outline-none focus:border-[#00A77C] focus:bg-white transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#00271D]/40 uppercase tracking-wider">Ambassador Certificate Tier Requirement</label>
                  <input
                    type="number"
                    required
                    value={certLimit}
                    onChange={e => setCertLimit(e.target.value)}
                    className="w-full rounded-xl border border-[#00271D]/10 bg-[#F9F3F0] px-3.5 py-2.5 text-xs text-[#00271D] outline-none focus:border-[#00A77C] focus:bg-white transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#00A77C] hover:bg-[#008f6a] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-[#00A77C]/20 flex items-center justify-center cursor-pointer transition-colors"
                >
                  Save System Parameters
                </button>
              </form>
            </div>

            {/* Danger Zone */}
            <div className="bg-white/90 backdrop-blur-md border border-rose-200/60 rounded-2xl p-5 shadow-sm self-start">
              <h4 className="text-sm font-heading font-bold text-rose-600 mb-2 flex items-center gap-2">
                <Trash2 size={15} />
                Database Danger Zone
              </h4>
              <p className="text-xs text-[#00271D]/60 leading-relaxed mb-4">
                Resetting will clear out all current mock waste entries, incident dispatches, points transaction histories, and sanctions on record, restoring defaults.
              </p>
              <button
                type="button"
                onClick={resetDatabase}
                className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-200 cursor-pointer"
              >
                Flush Database & Seed Defaults
              </button>
            </div>

          </div>
        </div>
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
