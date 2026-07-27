import React from 'react';
import {
  Trash2,
  Layers,
  Activity,
  Building2,
  Send,
  MapPin,
  Clock,
  ChevronRight,
  FileText
} from 'lucide-react';
import { User, Report } from '../../../types';

interface TeacherOverviewTabProps {
  currentUser: User;
  personalReports: Report[];
  myWasteReportsCount: number;
  myWasteResolved: number;
  myAssetReportsCount: number;
  myAssetResolved: number;
  totalKgDiverted: number;
  treesSaved: string;
  ecoRingPct: number;
  ecoCircumference: number;
  ecoOffset: number;
  getAvatarColor: (name: string) => string;
  setActiveTab: (tab: string) => void;
  getDisplayStatus: (status: string, title: string) => string;
  getDisplayCategory: (desc: string) => string;
  STATUS_BADGE: Record<string, string>;
  CAT_EMOJI: Record<string, string>;
}

export const TeacherOverviewTab: React.FC<TeacherOverviewTabProps> = ({
  currentUser,
  personalReports,
  myWasteReportsCount,
  myWasteResolved,
  myAssetReportsCount,
  myAssetResolved,
  totalKgDiverted,
  treesSaved,
  ecoRingPct,
  ecoCircumference,
  ecoOffset,
  getAvatarColor,
  setActiveTab,
  getDisplayStatus,
  getDisplayCategory,
  STATUS_BADGE,
  CAT_EMOJI
}) => {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">

      {/* ── Profile Banner ── */}
      <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 0% 50%, rgba(99,102,241,0.06), transparent)' }}
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-white shadow-md ${getAvatarColor(currentUser.name)}`}>
              {currentUser.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-extrabold tracking-tight text-gray-900">{currentUser.name}</h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  Faculty Reporter
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-gray-400">{currentUser.email} • Employee ID: {currentUser.employeeId}</p>
              <p className="mt-1 text-[11px] font-semibold text-gray-600">Science Department — Infrastructure Lead</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-5 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
              <Building2 size={16} className="text-indigo-600" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Department</p>
              <p className="text-xs font-black text-gray-800">Science Hall</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

        {/* Waste Reports Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-l-4 border-gray-200 border-l-emerald-500 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
              <Trash2 size={16} className="text-emerald-600" strokeWidth={2} />
            </div>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600">
              Operations
            </span>
          </div>
          <p className="mt-4 text-3xl font-black tabular-nums text-gray-900">{myWasteReportsCount}</p>
          <p className="mt-0.5 text-[12px] font-semibold text-gray-700">Waste & Litter Reports</p>
          <p className="mt-0.5 text-[10px] text-gray-400">{myWasteResolved} resolved of {myWasteReportsCount}</p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-700"
              style={{ width: myWasteReportsCount > 0 ? `${(myWasteResolved / myWasteReportsCount) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {/* Asset Reports Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-l-4 border-gray-200 border-l-amber-500 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
              <Layers size={16} className="text-amber-600" strokeWidth={2} />
            </div>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700">
              Infrastructure
            </span>
          </div>
          <p className="mt-4 text-3xl font-black tabular-nums text-gray-900">{myAssetReportsCount}</p>
          <p className="mt-0.5 text-[12px] font-semibold text-gray-700">Asset Recovery Reports</p>
          <p className="mt-0.5 text-[10px] text-gray-400">{myAssetResolved} resolved of {myAssetReportsCount}</p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-700"
              style={{ width: myAssetReportsCount > 0 ? `${(myAssetResolved / myAssetReportsCount) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {/* Operational SLA Telemetry Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-l-4 border-gray-200 border-l-indigo-500 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
              <Activity size={16} className="text-indigo-600" strokeWidth={2} />
            </div>
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-600">
              Operational SLA
            </span>
          </div>
          <p className="mt-4 text-3xl font-black tabular-nums text-gray-900">18 <span className="text-xs font-bold text-gray-400">Mins</span></p>
          <p className="mt-0.5 text-[12px] font-semibold text-gray-700">Avg MRF Response Time</p>
          <p className="mt-0.5 text-[10px] text-emerald-600 font-semibold">⚡ -4m faster recovery rate</p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-indigo-500" style={{ width: '92%' }} />
          </div>
        </div>
      </div>

      {/* ── Operational Analytics Section (Added from Student side) ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-emerald-500" />
          <h3 className="text-sm font-bold text-gray-900">Campus Operational Analytics</h3>
        </div>

        {/* Module 1: STUDENT REPORTING FREQUENCY (Quick-Stat Counter Cards) */}
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

        {/* 2-Column Grid: Grade Level & Materials Breakdown Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Module 2: REPORTS BY GRADE LEVEL (Grades 7–10) */}
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

          {/* Module 3: TOP RECYCLED MATERIALS */}
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

      {/* ── Quick Actions ── */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Quick Actions</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

          <button
            type="button"
            onClick={() => setActiveTab('submit-report')}
            className="group relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-indigo-100/60 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-indigo-100/50 cursor-pointer"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-sm shadow-indigo-200 transition-transform group-hover:scale-105">
              <Send size={16} className="text-white" strokeWidth={2} />
            </div>
            <p className="mt-3 text-sm font-bold text-gray-900">File a Report</p>
            <p className="mt-0.5 text-[10px] text-gray-500">Submit structural or waste logs</p>
            <ChevronRight size={14} className="absolute bottom-4 right-4 text-indigo-300 transition-transform group-hover:translate-x-0.5" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bin-map')}
            className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-emerald-100/60 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-emerald-100/50 cursor-pointer"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 shadow-sm shadow-emerald-200 transition-transform group-hover:scale-105">
              <MapPin size={16} className="text-white" strokeWidth={2} />
            </div>
            <p className="mt-3 text-sm font-bold text-gray-900">View Live Map</p>
            <p className="mt-0.5 text-[10px] text-gray-500">Monitor node status & capacity</p>
            <ChevronRight size={14} className="absolute bottom-4 right-4 text-emerald-300 transition-transform group-hover:translate-x-0.5" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('report-history')}
            className="group relative overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-amber-100/60 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-amber-100/50 cursor-pointer"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 shadow-sm shadow-amber-200 transition-transform group-hover:scale-105">
              <Clock size={16} className="text-white" strokeWidth={2} />
            </div>
            <p className="mt-3 text-sm font-bold text-gray-900">Track My Activity</p>
            <p className="mt-0.5 text-[10px] text-gray-500">Inspect personal reporting ledger</p>
            <ChevronRight size={14} className="absolute bottom-4 right-4 text-amber-300 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      {/* ── Recent Submissions Feed ── */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
              <FileText size={13} className="text-gray-500" strokeWidth={2} />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Recent Submissions</p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('report-history')}
            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
          >
            View All →
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {personalReports.slice(0, 3).map(rep => {
            const ds = getDisplayStatus(rep.status, rep.title);
            const dc = getDisplayCategory(rep.description);
            return (
              <div key={rep.id} className="flex items-center gap-3 px-6 py-3.5 hover:bg-gray-50/60 transition-colors">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-sm">
                  {CAT_EMOJI[dc] || '📁'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-gray-800">{rep.title}</p>
                  <p className="text-[10px] text-gray-400">{rep.locationName} · {rep.timestamp}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider ${STATUS_BADGE[ds]}`}>
                  {ds}
                </span>
              </div>
            );
          })}
          {personalReports.length === 0 && (
            <div className="px-6 py-8 text-center">
              <p className="text-xs text-gray-400">No submissions yet. File your first report!</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
