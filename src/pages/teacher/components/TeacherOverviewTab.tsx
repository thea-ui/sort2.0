import React from 'react';
import { CampusNewsWidget } from '../../../components/common/CampusNewsWidget';
import {
  Trash2,
  Layers,
  Activity,
  Send,
  MapPin,
  Clock,
  ChevronRight,
  FileText,
  ArrowRight,
  GraduationCap,
  Recycle,
  Armchair,
  Monitor,
  Zap,
  Wrench,
} from 'lucide-react';
import { User, Report } from '../../../types';
import { cleanReportTitle, cleanLocationName } from '../../../utils/reportUtils';
import { getInitials } from '../../../utils/userDisplay';

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
  CAT_EMOJI?: Record<string, string>;
  setActiveTab: (tab: string) => void;
}

const CAT_ICON: Record<string, React.ComponentType<any>> = {
  'Waste/Bin': Recycle, Furniture: Armchair, Electronics: Monitor,
  Fixtures: Zap, Equipment: Wrench, Other: FileText,
};

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
      <div className="bg-gradient-to-br from-white/95 via-white/90 to-[var(--primary)]/5 border border-white/90 rounded-3xl p-7 md:p-8 shadow-xl shadow-[var(--primary)]/5 backdrop-blur-md relative overflow-hidden transition-all hover:shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 rounded-2xl bg-[var(--accent)] text-white font-heading font-black text-2xl flex items-center justify-center shadow-lg shadow-[var(--accent)]/25 shrink-0">
              {getInitials(currentUser.name)}
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text-strong)]/60">Welcome back,</p>
              <h2 className="text-2xl sm:text-3xl font-heading font-black text-[var(--text-strong)] tracking-tight mt-0.5">
                {currentUser.name}
              </h2>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse" />
                <span className="text-xs font-bold text-[var(--accent)] bg-[var(--accent)]/15 border border-[var(--accent)]/30 px-3 py-0.5 rounded-full flex items-center gap-1.5">
                  <GraduationCap size={14} />
                  Faculty Staff · Infrastructure Lead
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Reporting Summary — Color-coded Indicator Grid ── */}
      <div>
        <h3 className="text-sm font-heading font-bold text-[var(--text-strong)] mb-3">My Reporting Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Waste Reports */}
          <button
            type="button"
            onClick={() => setActiveTab('report-history')}
            className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-6 text-left shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-3 cursor-pointer group hover:border-emerald-300"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 shadow-xs group-hover:scale-105 transition-transform">
                <Trash2 size={20} strokeWidth={2} />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--primary)] bg-[var(--primary)]/10 px-3 py-0.5 rounded-full border border-[var(--primary)]/20">
                Waste Category
              </span>
            </div>
            <div>
              <p className="text-3xl font-heading font-extrabold text-[var(--text-strong)]">{myWasteReportsCount}</p>
              <p className="text-xs font-bold text-[var(--text-strong)] mt-0.5 group-hover:text-emerald-700 transition-colors">Waste & Litter Logs</p>
              <p className="text-[11px] text-[var(--text-strong)]/50 font-medium">{myWasteResolved} resolved by MRF</p>
            </div>
            <div className="h-2 w-full bg-[var(--primary)]/15 rounded-full overflow-hidden">
              <div className="h-full bg-[var(--primary)] rounded-full transition-all duration-700" style={{ width: `${myWasteReportsCount > 0 ? (myWasteResolved / myWasteReportsCount) * 100 : 0}%` }} />
            </div>
          </button>

          {/* Asset Reports */}
          <button
            type="button"
            onClick={() => setActiveTab('report-history')}
            className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-6 text-left shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-3 cursor-pointer group hover:border-amber-300"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 shadow-xs group-hover:scale-105 transition-transform">
                <Layers size={20} strokeWidth={2} />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-0.5 rounded-full border border-amber-200">
                Asset Category
              </span>
            </div>
            <div>
              <p className="text-3xl font-heading font-extrabold text-[var(--text-strong)]">{myAssetReportsCount}</p>
              <p className="text-xs font-bold text-[var(--text-strong)] mt-0.5 group-hover:text-amber-700 transition-colors">Asset & Facility Logs</p>
              <p className="text-[11px] text-[var(--text-strong)]/50 font-medium">{myAssetResolved} resolved by MRF</p>
            </div>
            <div className="h-2 w-full bg-amber-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all duration-700" style={{ width: `${myAssetReportsCount > 0 ? (myAssetResolved / myAssetReportsCount) * 100 : 0}%` }} />
            </div>
          </button>

          {/* MRF Response Speed */}
          <button
            type="button"
            onClick={() => setActiveTab('bin-map')}
            className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-6 text-left shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-3 cursor-pointer group hover:border-[var(--primary)]/25"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--text-strong)] border border-[var(--primary)]/25 shadow-xs group-hover:scale-105 transition-transform">
                <Activity size={20} strokeWidth={2} />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-strong)] bg-[var(--primary)]/10 px-3 py-0.5 rounded-full border border-[var(--primary)]/25">
                Response Time
              </span>
            </div>
            <div>
              <p className="text-3xl font-heading font-extrabold text-[var(--text-strong)]">18m</p>
              <p className="text-xs font-bold text-[var(--text-strong)] mt-0.5 group-hover:text-[var(--text-strong)] transition-colors">Average Response Time</p>
              <p className="text-[11px] text-[var(--text-strong)]/50 font-medium flex items-center gap-1">
                <Zap size={11} className="text-[var(--accent)]" />
                <span>Typical time to resolve a report</span>
              </p>
            </div>
            <div className="h-2 w-full bg-[var(--primary)]/10 rounded-full overflow-hidden">
              <div className="h-full bg-[var(--primary)] rounded-full" style={{ width: '92%' }} />
            </div>
          </button>

        </div>
      </div>



      {/* ── Quick Actions Grid ── */}
      <div>
        <h3 className="text-sm font-heading font-bold text-[var(--text-strong)] mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'File a Report', desc: 'Submit structural or waste logs', tab: 'submit-report', iconBg: 'bg-gradient-to-br from-orange-500 to-rose-500', shadow: 'shadow-orange-500/20', hover: 'hover:border-rose-300', icon: Send },
            { label: 'View Live Map', desc: 'Monitor node status & capacity', tab: 'bin-map', iconBg: 'bg-gradient-to-br from-[var(--primary)] to-[var(--primary)]', shadow: 'shadow-[var(--primary)]/20', hover: 'hover:border-[var(--primary)]/25', icon: MapPin },
            { label: 'Track My Activity', desc: 'Inspect personal reporting ledger', tab: 'report-history', iconBg: 'bg-gradient-to-br from-[var(--gold)] to-[var(--primary)]', shadow: 'shadow-[var(--gold)]/20', hover: 'hover:border-[var(--gold)]/25', icon: Clock },
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
                <p className="text-sm font-bold text-[var(--text-strong)]">{action.label}</p>
                <p className="text-[11px] text-[var(--text-strong)]/60 mt-0.5 font-medium">{action.desc}</p>
                <ChevronRight size={14} className="mt-2 text-gray-400 group-hover:text-[var(--accent)] transition-colors" />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Recent Submissions Feed ── */}
      <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--primary)]/10">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 flex items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
              <FileText size={14} />
            </div>
            <h3 className="text-sm font-heading font-bold text-[var(--text-strong)]">Recent Faculty Submissions</h3>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('report-history')}
            className="flex items-center gap-1 text-[11px] font-bold text-[var(--accent)] hover:text-[var(--accent-dark)] cursor-pointer"
          >
            View All <ArrowRight size={12} />
          </button>
        </div>
        <div className="divide-y divide-[var(--primary)]/5">
          {personalReports.slice(0, 4).map(rep => {
            const ds = getDisplayStatus(rep.status, rep.title);
            const dc = getDisplayCategory(rep.description);
            return (
              <button
                key={rep.id}
                type="button"
                onClick={() => setActiveTab('report-history')}
                className="w-full text-left flex items-center gap-3 px-6 py-3.5 hover:bg-[var(--accent)]/5 transition-colors cursor-pointer group"
              >
                {(() => {
                  const IconComp = CAT_ICON[dc] || FileText;
                  return (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-white transition-colors">
                      <IconComp size={16} />
                    </div>
                  );
                })()}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-[var(--text-strong)] group-hover:text-[var(--accent)] transition-colors">{cleanReportTitle(rep.title)}</p>
                  <p className="text-[10px] text-[var(--text-strong)]/50 font-medium">{cleanLocationName(rep.locationName)} · {rep.timestamp}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${STATUS_BADGE[ds]}`}>
                  {ds}
                </span>
              </button>
            );
          })}
          {personalReports.length === 0 && (
            <div className="px-6 py-10 text-center">
              <p className="text-xs font-medium text-gray-400">No submissions yet. File your first report!</p>
            </div>
          )}
        </div>
      </div>

      {/* Campus News */}
      <CampusNewsWidget />

    </div>
  );
};
