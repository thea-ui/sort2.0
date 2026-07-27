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
  FileText,
  ArrowRight,
  GraduationCap
} from 'lucide-react';
import { User, Report } from '../../../types';

interface TeacherOverviewTabProps {
  currentUser: User;
  personalReports: Report[];
  myWasteReportsCount: number;
  myWasteResolved: number;
  myAssetReportsCount: number;
  myAssetResolved: number;
  getDisplayStatus: (status: string, title: string) => string;
  getDisplayCategory: (desc: string) => string;
  STATUS_BADGE: Record<string, string>;
  CAT_EMOJI: Record<string, string>;
  setActiveTab: (tab: string) => void;
}

export const TeacherOverviewTab: React.FC<TeacherOverviewTabProps> = ({
  currentUser,
  personalReports,
  myWasteReportsCount,
  myWasteResolved,
  myAssetReportsCount,
  myAssetResolved,
  setActiveTab,
  getDisplayStatus,
  getDisplayCategory,
  STATUS_BADGE,
  CAT_EMOJI
}) => {
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">

      {/* ── 2026 Faculty Hero Card ── */}
      <div className="bg-gradient-to-br from-white/95 via-white/90 to-[#e0f2ec]/60 border border-white/90 rounded-3xl p-7 md:p-8 shadow-xl shadow-[#00271D]/5 backdrop-blur-md relative overflow-hidden transition-all hover:shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 rounded-2xl bg-[#00A77C] text-white font-heading font-black text-2xl flex items-center justify-center shadow-lg shadow-[#00A77C]/25 shrink-0">
              {currentUser.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <p className="text-xs font-semibold text-[#00271D]/60">Welcome back,</p>
              <h2 className="text-2xl sm:text-3xl font-heading font-black text-[#00271D] tracking-tight mt-0.5">
                {currentUser.name}
              </h2>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="h-2 w-2 rounded-full bg-[#00A77C] animate-pulse" />
                <span className="text-xs font-bold text-[#00A77C] bg-[#00A77C]/15 border border-[#00A77C]/30 px-3 py-0.5 rounded-full flex items-center gap-1.5">
                  <GraduationCap size={14} />
                  Faculty Staff · Infrastructure Lead
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/80 border border-white/90 rounded-2xl px-6 py-4 shadow-sm shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00A77C]/15 text-[#00A77C] border border-[#00A77C]/30 shadow-xs">
              <Building2 size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#00271D]/50">Assigned Department</p>
              <p className="text-sm font-black text-[#00271D]">Science Hall</p>
            </div>
          </div>

        </div>
      </div>

      {/* ── Reporting Summary — Color-coded Indicator Grid ── */}
      <div>
        <h3 className="text-sm font-heading font-bold text-[#00271D] mb-3">My Reporting Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Waste Reports */}
          <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-xs">
                <Trash2 size={20} strokeWidth={2} />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-0.5 rounded-full border border-emerald-200">
                Waste Category
              </span>
            </div>
            <div>
              <p className="text-3xl font-heading font-extrabold text-[#00271D]">{myWasteReportsCount}</p>
              <p className="text-xs font-bold text-[#00271D] mt-0.5">Waste & Litter Logs</p>
              <p className="text-[11px] text-[#00271D]/50 font-medium">{myWasteResolved} resolved by MRF</p>
            </div>
            <div className="h-2 w-full bg-emerald-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${myWasteReportsCount > 0 ? (myWasteResolved / myWasteReportsCount) * 100 : 0}%` }} />
            </div>
          </div>

          {/* Asset Reports */}
          <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 shadow-xs">
                <Layers size={20} strokeWidth={2} />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-0.5 rounded-full border border-amber-200">
                Asset Category
              </span>
            </div>
            <div>
              <p className="text-3xl font-heading font-extrabold text-[#00271D]">{myAssetReportsCount}</p>
              <p className="text-xs font-bold text-[#00271D] mt-0.5">Asset & Facility Logs</p>
              <p className="text-[11px] text-[#00271D]/50 font-medium">{myAssetResolved} resolved by MRF</p>
            </div>
            <div className="h-2 w-full bg-amber-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all duration-700" style={{ width: `${myAssetReportsCount > 0 ? (myAssetResolved / myAssetReportsCount) * 100 : 0}%` }} />
            </div>
          </div>

          {/* MRF Response Speed */}
          <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 border border-sky-200 shadow-xs">
                <Activity size={20} strokeWidth={2} />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700 bg-sky-50 px-3 py-0.5 rounded-full border border-sky-200">
                Response Time
              </span>
            </div>
            <div>
              <p className="text-3xl font-heading font-extrabold text-[#00271D]">18m</p>
              <p className="text-xs font-bold text-[#00271D] mt-0.5">Average Response Time</p>
              <p className="text-[11px] text-[#00271D]/50 font-medium">⚡ 4 minutes faster than avg</p>
            </div>
            <div className="h-2 w-full bg-sky-100 rounded-full overflow-hidden">
              <div className="h-full bg-sky-500 rounded-full" style={{ width: '92%' }} />
            </div>
          </div>

        </div>
      </div>

      {/* ── Campus Analytics Breakdown ── */}
      <div>
        <h3 className="text-sm font-heading font-bold text-[#00271D] mb-3">Campus Operational Analytics</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Grade Level Distribution */}
          <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <h4 className="text-xs font-bold text-[#00271D] uppercase tracking-wider">Reports by Grade Level</h4>
              <p className="text-[11px] text-[#00271D]/50 font-medium">Student reporting volume per department</p>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Grade 7', pct: 28, count: 120, color: 'bg-[#00A77C]' },
                { label: 'Grade 8', pct: 25, count: 108, color: 'bg-sky-500' },
                { label: 'Grade 9', pct: 22, count: 95, color: 'bg-[#C69B26]' },
                { label: 'Grade 10', pct: 25, count: 105, color: 'bg-purple-500' },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center text-xs font-bold mb-1">
                    <span className="text-[#00271D]">{item.label}</span>
                    <span className="text-[#00271D]/60">{item.pct}% ({item.count} reports)</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reported Materials Breakdown */}
          <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <h4 className="text-xs font-bold text-[#00271D] uppercase tracking-wider">Most Reported Materials</h4>
              <p className="text-[11px] text-[#00271D]/50 font-medium">Waste types captured across campus nodes</p>
            </div>
            <div className="space-y-3">
              {[
                { label: '🥤 Plastic Bottles', pct: 45, count: 210, color: 'bg-[#00A77C]' },
                { label: '🥫 Aluminum Cans', pct: 30, count: 140, color: 'bg-sky-500' },
                { label: '📦 Paper / Cardboard', pct: 15, count: 70, color: 'bg-[#C69B26]' },
                { label: '🍾 Glass & Miscellaneous', pct: 10, count: 45, color: 'bg-purple-500' },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center text-xs font-bold mb-1">
                    <span className="text-[#00271D]">{item.label}</span>
                    <span className="text-[#00271D]/60">{item.pct}% ({item.count} items)</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Quick Actions Grid ── */}
      <div>
        <h3 className="text-sm font-heading font-bold text-[#00271D] mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'File a Report', desc: 'Submit structural or waste logs', tab: 'submit-report', iconBg: 'bg-gradient-to-br from-orange-500 to-rose-500', shadow: 'shadow-orange-500/20', hover: 'hover:border-rose-300', icon: Send },
            { label: 'View Live Map', desc: 'Monitor node status & capacity', tab: 'bin-map', iconBg: 'bg-gradient-to-br from-sky-400 to-blue-600', shadow: 'shadow-sky-500/20', hover: 'hover:border-sky-300', icon: MapPin },
            { label: 'Track My Activity', desc: 'Inspect personal reporting ledger', tab: 'report-history', iconBg: 'bg-gradient-to-br from-purple-500 to-indigo-600', shadow: 'shadow-purple-500/20', hover: 'hover:border-purple-300', icon: Clock },
          ].map(action => {
            const Icon = action.icon;
            return (
              <button
                key={action.tab}
                type="button"
                onClick={() => setActiveTab(action.tab)}
                className={`bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 text-left shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group ${action.hover}`}
              >
                <div className={`h-11 w-11 rounded-2xl ${action.iconBg} text-white flex items-center justify-center mb-3 shadow-md ${action.shadow} group-hover:scale-105 transition-transform`}>
                  <Icon size={20} strokeWidth={2} />
                </div>
                <p className="text-sm font-bold text-[#00271D]">{action.label}</p>
                <p className="text-[11px] text-[#00271D]/60 mt-0.5 font-medium">{action.desc}</p>
                <ChevronRight size={14} className="mt-2 text-gray-400 group-hover:text-[#00A77C] transition-colors" />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Recent Submissions Feed ── */}
      <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#00271D]/10">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 flex items-center justify-center rounded-xl bg-[#00A77C]/10 text-[#00A77C]">
              <FileText size={14} />
            </div>
            <h3 className="text-sm font-heading font-bold text-[#00271D]">Recent Faculty Submissions</h3>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('report-history')}
            className="flex items-center gap-1 text-[11px] font-bold text-[#00A77C] hover:text-[#008f6a] cursor-pointer"
          >
            View All <ArrowRight size={12} />
          </button>
        </div>
        <div className="divide-y divide-[#00271D]/5">
          {personalReports.slice(0, 4).map(rep => {
            const ds = getDisplayStatus(rep.status, rep.title);
            const dc = getDisplayCategory(rep.description);
            return (
              <div key={rep.id} className="flex items-center gap-3 px-6 py-3.5 hover:bg-[#00A77C]/5 transition-colors">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-base border border-gray-200/60 shadow-xs">
                  {CAT_EMOJI[dc] || '📁'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-[#00271D]">{rep.title}</p>
                  <p className="text-[10px] text-[#00271D]/50 font-medium">{rep.locationName} · {rep.timestamp}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${STATUS_BADGE[ds]}`}>
                  {ds}
                </span>
              </div>
            );
          })}
          {personalReports.length === 0 && (
            <div className="px-6 py-10 text-center">
              <p className="text-xs font-medium text-gray-400">No submissions yet. File your first report!</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
