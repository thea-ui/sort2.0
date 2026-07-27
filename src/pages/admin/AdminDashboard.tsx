import React, { useState } from 'react';
import { useMockData } from '../../hooks/useMockData';
import { Role } from '../../types';
import {
  Settings,
  Users,
  AlertOctagon,
  RefreshCw,
  Trash2,
  CheckCircle,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Activity
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
    triggerSync
  } = useMockData();

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
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
                Operational Telemetry
              </span>
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight mt-1.5">Campus Operational Analytics</h2>
              <p className="text-xs text-gray-500 mt-0.5">Real-time reporting frequency, grade level distribution, and material breakdowns.</p>
            </div>
            <span className="hidden sm:inline-flex text-xs font-bold text-slate-700 bg-white border border-gray-200 px-3 py-1.5 rounded-xl shadow-xs">
              📊 Live Status Hub
            </span>
          </div>

          {/* Module 2: STUDENT REPORTING FREQUENCY (Summary Quick-Stat Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-1 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-emerald-600 mb-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Reports Today</span>
                <span className="p-1.5 bg-emerald-50 rounded-lg">📊</span>
              </div>
              <p className="text-3xl font-black text-gray-900">24</p>
              <p className="text-[11px] font-semibold text-emerald-600">+8% vs yesterday</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-1 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-sky-600 mb-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">This Week</span>
                <span className="p-1.5 bg-sky-50 rounded-lg">📅</span>
              </div>
              <p className="text-3xl font-black text-gray-900">142</p>
              <p className="text-[11px] font-semibold text-sky-600">Active campus submissions</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-1 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-amber-600 mb-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Peak Activity Time</span>
                <span className="p-1.5 bg-amber-50 rounded-lg">⏰</span>
              </div>
              <p className="text-xl font-black text-gray-900 mt-1">12:00 PM - 2:00 PM</p>
              <p className="text-[11px] font-semibold text-amber-600">Highest daily traffic window</p>
            </div>
          </div>

          {/* 2-Column Grid: Grade Level Breakdown & Most Reported Materials */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Module 1: REPORTS BY GRADE LEVEL (Breakdown Card) */}
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-4 hover:shadow-md transition-shadow">
              <div>
                <h4 className="text-xs font-extrabold text-gray-900 flex items-center gap-2">
                  <span className="text-emerald-500 text-sm">🎓</span>
                  <span>Reports by Grade Level</span>
                </h4>
                <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                  Report distribution volume across academic grade levels
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {[
                  { grade: 'Grade 7', pct: 28, count: 120, barBg: 'bg-emerald-500', bg: 'bg-emerald-50/60', text: 'text-emerald-700', border: 'border-emerald-100' },
                  { grade: 'Grade 8', pct: 25, count: 108, barBg: 'bg-sky-500', bg: 'bg-sky-50/60', text: 'text-sky-700', border: 'border-sky-100' },
                  { grade: 'Grade 9', pct: 22, count: 95, barBg: 'bg-amber-500', bg: 'bg-amber-50/60', text: 'text-amber-700', border: 'border-amber-100' },
                  { grade: 'Grade 10', pct: 25, count: 105, barBg: 'bg-purple-500', bg: 'bg-purple-50/60', text: 'text-purple-700', border: 'border-purple-100' },
                ].map((item) => (
                  <div key={item.grade} className={`p-3 rounded-2xl border ${item.bg} ${item.border} space-y-1.5`}>
                    <div className="flex justify-between items-center text-xs font-bold text-gray-900">
                      <span>{item.grade}</span>
                      <span className={item.text}>{item.pct}% · {item.count} reports</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.barBg} transition-all duration-500`}
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Module 3: TOP RECYCLED MATERIALS (Breakdown List) */}
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-4 hover:shadow-md transition-shadow">
              <div>
                <h4 className="text-xs font-extrabold text-gray-900 flex items-center gap-2">
                  <span className="text-emerald-500 text-sm">♻️</span>
                  <span>Most Reported Materials</span>
                </h4>
                <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                  Item categories submitted by students across campus
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {[
                  { name: 'Plastic Bottles', pct: 45, count: 210, icon: '🥤', barBg: 'bg-emerald-500', bg: 'bg-emerald-50/60', text: 'text-emerald-700', border: 'border-emerald-100' },
                  { name: 'Aluminum Cans', pct: 30, count: 140, icon: '🥫', barBg: 'bg-sky-500', bg: 'bg-sky-50/60', text: 'text-sky-700', border: 'border-sky-100' },
                  { name: 'Paper / Cardboard', pct: 15, count: 70, icon: '📦', barBg: 'bg-amber-500', bg: 'bg-amber-50/60', text: 'text-amber-700', border: 'border-amber-100' },
                  { name: 'Glass / Others', pct: 10, count: 45, icon: '🍾', barBg: 'bg-purple-500', bg: 'bg-purple-50/60', text: 'text-purple-700', border: 'border-purple-100' },
                ].map((item) => (
                  <div key={item.name} className={`p-3 rounded-2xl border ${item.bg} ${item.border} space-y-1.5`}>
                    <div className="flex justify-between items-center text-xs font-bold text-gray-900">
                      <span className="flex items-center gap-1.5">
                        <span>{item.icon}</span>
                        <span>{item.name}</span>
                      </span>
                      <span className={item.text}>{item.pct}% · {item.count} reports</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.barBg} transition-all duration-500`}
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 1. LEADERBOARD / USER LIST VIEW */}
      {activeTab === 'admin-users' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="mb-4">
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded uppercase tracking-wider">
              Ecology Database
            </span>
            <h3 className="text-base font-bold text-gray-900 mt-2">Active Accounts Management</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Audit global points allocation and warning histories.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase tracking-wider bg-gray-50">
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Badge ID</th>
                  <th className="py-2.5 px-3 text-right">Warnings</th>
                  <th className="py-2.5 px-3 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-3 font-bold text-gray-800">{u.name}</td>
                    <td className="py-3 px-3 text-gray-500 font-mono">{u.email}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                        u.role === 'ADMIN' ? 'bg-zinc-50 border-zinc-200 text-zinc-600' :
                        u.role === 'MRF' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' :
                        u.role === 'TEACHER' ? 'bg-violet-50 border-violet-100 text-violet-600' :
                        'bg-sky-50 border-sky-100 text-sky-600'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-500 font-mono">{u.employeeId}</td>
                    <td className="py-3 px-3 text-right font-bold text-red-500">{u.warningsCount}</td>
                    <td className="py-3 px-3 text-right font-black text-emerald-600">{u.points.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. WARNINGS & OFFENSES */}
      {activeTab === 'admin-warnings' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          
          {/* File Warning Form */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm self-start">
            <div className="mb-4">
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded uppercase tracking-wider">
                Sanctions Desk
              </span>
              <h3 className="text-base font-bold text-gray-900 mt-2">Log Warning Offense</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">Register improper sorting offenses or warning notices.</p>
            </div>

            {warningSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs flex gap-2 mb-4">
                <CheckCircle size={16} className="shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  <p className="font-bold">Sanction Registered!</p>
                  <p className="text-[10px] text-emerald-600/90 mt-0.5">Offense logged to database successfully.</p>
                </div>
              </div>
            )}

            <form onSubmit={handleWarningSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Target User Account</label>
                <select
                  value={targetUserId}
                  onChange={e => setTargetUserId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-900 outline-none cursor-pointer focus:border-emerald-500 focus:bg-white"
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
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Notice Offense Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Mixed food scraps inside plastic sorting containers..."
                  value={warnDesc}
                  onChange={e => setWarnDesc(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-900 outline-none resize-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Severity Level</label>
                <div className="flex gap-2">
                  {(['WARNING', 'STRIKE', 'SUSPENSION'] as const).map(sev => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setSeverity(sev)}
                      className={`flex-1 py-2 text-center rounded-lg border font-bold transition-all text-[9px] ${
                        severity === sev
                          ? 'bg-rose-500 border-rose-500 text-white shadow-sm'
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
                className="w-full py-2.5 bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-rose-600 shadow-md shadow-rose-100 flex items-center justify-center gap-1.5"
              >
                <AlertOctagon size={13} />
                <span>Log Notice of Sanction</span>
              </button>
            </form>
          </div>

          {/* Offense Logs List */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm lg:col-span-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <AlertOctagon size={14} className="text-rose-500" />
              Recent Sanction Incidents
            </h3>

            {offenses.length === 0 ? (
              <p className="text-xs text-gray-450 text-center py-8">No warning incidents on record.</p>
            ) : (
              <div className="divide-y divide-gray-150">
                {offenses.map(off => (
                  <div key={off.id} className="flex justify-between items-start py-3.5 first:pt-0 last:pb-0 gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-gray-800">{off.description}</p>
                      <p className="text-[10px] text-gray-400 font-semibold">User: {off.userName} | Date: {off.timestamp}</p>
                    </div>
                    <span className="rounded-full bg-rose-50 border border-rose-100 px-2 py-0.5 text-[8px] font-black uppercase text-rose-600 shrink-0">
                      {off.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* 3. SYSTEM CONFIGS */}
      {activeTab === 'admin-settings' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm self-start">
            <div className="mb-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Settings size={15} className="text-emerald-500" />
                Waste Rules Parameters
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">Customize default points allocations and threshold requirements.</p>
            </div>

            {settingsSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs flex gap-2 mb-4">
                <CheckCircle size={16} className="shrink-0 mt-0.5 text-emerald-600" />
                <span>Parameters saved successfully.</span>
              </div>
            )}

            <form onSubmit={handleSettingsSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Points Awarded Per Incident Report</label>
                <input
                  type="number"
                  required
                  value={ptsPerRep}
                  onChange={e => setPtsPerRep(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-900 outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Points Multiplier Per Kg Recyclables</label>
                <input
                  type="number"
                  required
                  value={ptsPerKg}
                  onChange={e => setPtsPerKg(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-900 outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Warning Threshold Cap (to trigger Admin Audit)</label>
                <input
                  type="number"
                  required
                  value={warnLimit}
                  onChange={e => setWarnLimit(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-900 outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ambassador Certificate Tier Requirement</label>
                <input
                  type="number"
                  required
                  value={certLimit}
                  onChange={e => setCertLimit(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-900 outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-emerald-600 shadow-md shadow-emerald-100 flex items-center justify-center"
              >
                Save System Parameters
              </button>
            </form>
          </div>

          {/* Danger Zone */}
          <div className="bg-white border border-red-200 rounded-2xl p-5 shadow-sm self-start">
            <h3 className="text-base font-bold text-red-600 flex items-center gap-2 mb-2">
              <Trash2 size={15} />
              Database Danger Zone
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-4">
              Resetting will clear out all current mock waste entries, incident dispatches, points transaction histories, and sanctions on record, restoring defaults.
            </p>
            <button
              type="button"
              onClick={resetDatabase}
              className="w-full py-2.5 bg-red-650 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-100"
            >
              Flush Database & Seed Defaults
            </button>
          </div>

        </div>
      )}

      {/* 4. SYNC LOGS VIEW */}
      {activeTab === 'admin-sync' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Activity size={14} className="text-indigo-600" />
                  Sync Database Transmissions
                </h3>

                <button
                  type="button"
                  onClick={handleSyncClick}
                  disabled={syncing}
                  className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-[10px] font-bold shadow-md shadow-indigo-100 flex items-center gap-1"
                >
                  <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Syncing...' : 'Simulate Synchronization'}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase tracking-wider bg-gray-50">
                      <th className="py-2 px-3">Timestamp</th>
                      <th className="py-2 px-3">Target System</th>
                      <th className="py-2 px-3">Records Synced</th>
                      <th className="py-2 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    {syncLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400">No sync tasks logged yet.</td>
                      </tr>
                    ) : (
                      syncLogs.map(log => (
                        <tr key={log.id} className="hover:bg-gray-50/50">
                          <td className="py-2.5 px-3 font-mono text-gray-500">{log.timestamp}</td>
                          <td className="py-2.5 px-3 font-bold text-gray-700">{log.system}</td>
                          <td className="py-2.5 px-3 font-mono text-gray-700">{log.recordsSynced}</td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="rounded bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-600">
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

        </div>
      )}

    </div>
  );
};
