import React from 'react';
import { CampusNewsCard } from '../../../components/common/CampusNewsCard';
import {
  Trash2,
  Layers,
  Activity,
  Send,
  MapPin,
  Clock,
  FileText,
  ArrowRight,
  Recycle,
  Armchair,
  Monitor,
  Zap,
  Wrench,
  CheckCircle2,
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
    <div className="w-full space-y-4 pb-8 sm:space-y-6">

      {/* ── 2026 Faculty Hero Card ── */}
      <div className="rounded-2xl border border-[var(--primary)]/10 bg-white p-4 sm:p-6">
        <div className="flex min-w-0 items-center gap-3.5 sm:gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-base font-black text-white sm:h-14 sm:w-14 sm:text-lg">
            {getInitials(currentUser.name)}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[var(--text-strong)]/55">Welcome back,</p>
            <h2 className="line-clamp-2 text-lg font-heading font-black leading-tight tracking-tight text-[var(--text-strong)] sm:line-clamp-1 sm:text-2xl">
              {currentUser.name}
            </h2>
            <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-2.5 py-0.5 text-[10px] font-extrabold text-[var(--accent)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              Faculty Staff
            </span>
          </div>
        </div>
      </div>

      {/* ── Reporting Summary ── */}
      <div>
        <div className="mb-2.5 flex items-center gap-2 px-1">
          <Activity size={16} className="text-[var(--accent)]" />
          <h3 className="text-[13px] font-heading font-extrabold tracking-tight text-[var(--text-strong)]">My reporting summary</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">

          {/* Waste Reports */}
          <button
            type="button"
            onClick={() => setActiveTab('report-history')}
            className="rounded-2xl border border-[var(--primary)]/10 bg-white p-3.5 text-left transition-colors hover:border-[var(--accent)]/30 hover:bg-[var(--accent)]/[0.02] space-y-3 cursor-pointer sm:p-5"
          >
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--ramp-1)]/10 text-[var(--ramp-1-strong)] sm:h-10 sm:w-10">
                <Trash2 size={18} strokeWidth={2} />
              </div>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-[var(--ramp-1-strong)] bg-[var(--ramp-1)]/10 px-2 py-0.5 rounded-full border border-[var(--ramp-1)]/25 sm:px-3 sm:text-[10px]">
                Waste Category
              </span>
            </div>
            <div>
              <p className="text-2xl font-heading font-extrabold text-[var(--text-strong)] sm:text-3xl">{myWasteReportsCount}</p>
              <p className="text-xs font-bold text-[var(--text-strong)] mt-0.5">Waste &amp; Litter Logs</p>
              <p className="text-[10px] text-[var(--text-strong)]/50 font-medium sm:text-[11px]">{myWasteResolved} resolved by MRF</p>
            </div>
            <div className="h-1.5 w-full bg-[var(--ramp-1)]/10 rounded-full overflow-hidden sm:h-2">
              <div className="h-full bg-[var(--ramp-1)] rounded-full transition-all duration-700" style={{ width: `${myWasteReportsCount > 0 ? (myWasteResolved / myWasteReportsCount) * 100 : 0}%` }} />
            </div>
          </button>

          {/* Asset Reports */}
          <button
            type="button"
            onClick={() => setActiveTab('report-history')}
            className="rounded-2xl border border-[var(--primary)]/10 bg-white p-3.5 text-left transition-colors hover:border-[var(--accent)]/30 hover:bg-[var(--accent)]/[0.02] space-y-3 cursor-pointer sm:p-5"
          >
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--ramp-2)]/10 text-[var(--ramp-2-strong)] sm:h-10 sm:w-10">
                <Layers size={18} strokeWidth={2} />
              </div>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-[var(--ramp-2-strong)] bg-[var(--ramp-2)]/10 px-2 py-0.5 rounded-full border border-[var(--ramp-2)]/25 sm:px-3 sm:text-[10px]">
                Asset Category
              </span>
            </div>
            <div>
              <p className="text-2xl font-heading font-extrabold text-[var(--text-strong)] sm:text-3xl">{myAssetReportsCount}</p>
              <p className="text-xs font-bold text-[var(--text-strong)] mt-0.5">Asset &amp; Facility Logs</p>
              <p className="text-[10px] text-[var(--text-strong)]/50 font-medium sm:text-[11px]">{myAssetResolved} resolved by MRF</p>
            </div>
            <div className="h-1.5 w-full bg-[var(--ramp-2)]/10 rounded-full overflow-hidden sm:h-2">
              <div className="h-full bg-[var(--ramp-2)] rounded-full transition-all duration-700" style={{ width: `${myAssetReportsCount > 0 ? (myAssetResolved / myAssetReportsCount) * 100 : 0}%` }} />
            </div>
          </button>

          {/* MRF Response Speed */}
          <button
            type="button"
            onClick={() => setActiveTab('bin-map')}
            className="col-span-2 rounded-2xl border border-[var(--primary)]/10 bg-white p-3.5 text-left transition-colors hover:border-[var(--accent)]/30 hover:bg-[var(--accent)]/[0.02] space-y-3 cursor-pointer sm:col-span-1 sm:p-5"
          >
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--ramp-3)]/10 text-[var(--ramp-3-strong)] sm:h-10 sm:w-10">
                <Activity size={18} strokeWidth={2} />
              </div>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-[var(--ramp-3-strong)] bg-[var(--ramp-3)]/10 px-2 py-0.5 rounded-full border border-[var(--ramp-3)]/25 sm:px-3 sm:text-[10px]">
                Response Time
              </span>
            </div>
            <div>
              <p className="text-2xl font-heading font-extrabold text-[var(--text-strong)] sm:text-3xl">18m</p>
              <p className="text-xs font-bold text-[var(--text-strong)] mt-0.5">Average Response Time</p>
              <p className="text-[10px] text-[var(--text-strong)]/50 font-medium flex items-center gap-1 sm:text-[11px]">
                <Zap size={11} className="text-[var(--accent)]" />
                <span>Typical time to resolve a report</span>
              </p>
            </div>
            <div className="h-1.5 w-full bg-[var(--ramp-3)]/10 rounded-full overflow-hidden sm:h-2">
              <div className="h-full bg-[var(--ramp-3)] rounded-full" style={{ width: '92%' }} />
            </div>
          </button>

        </div>
      </div>



      {/* ── Quick Actions Grid ── */}
      <div>
        <div className="mb-2.5 flex items-center gap-2 px-1">
          <CheckCircle2 size={16} className="text-[var(--accent)]" />
          <h3 className="text-[13px] font-heading font-extrabold tracking-tight text-[var(--text-strong)]">Quick actions</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {[
            { label: 'File a Report', desc: 'Submit structural or waste logs', tab: 'submit-report', iconClass: 'bg-[var(--ramp-1)]/10 text-[var(--ramp-1-strong)]', icon: Send },
            { label: 'View Live Map', desc: 'Monitor node status & capacity', tab: 'bin-map', iconClass: 'bg-[var(--ramp-2)]/10 text-[var(--ramp-2-strong)]', icon: MapPin },
            { label: 'Track My Activity', desc: 'Inspect personal reporting ledger', tab: 'report-history', iconClass: 'bg-[var(--ramp-3)]/10 text-[var(--ramp-3-strong)]', icon: Clock },
          ].map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={action.tab}
                type="button"
                onClick={() => setActiveTab(action.tab)}
                className={`group flex flex-col items-start gap-2.5 rounded-2xl border border-[var(--primary)]/10 bg-white p-3.5 text-left transition-colors hover:border-[var(--accent)]/30 hover:bg-[var(--accent)]/[0.02] cursor-pointer sm:flex-row sm:items-center sm:gap-3.5 sm:p-5 ${index === 2 ? 'col-span-2 sm:col-span-1' : ''}`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${action.iconClass} transition-transform duration-200 group-hover:scale-105`}>
                  <Icon size={19} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[var(--text-strong)] sm:text-sm">{action.label}</p>
                  <p className="mt-0.5 hidden text-[11px] font-medium text-[var(--text-strong)]/60 sm:block">{action.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Recent Submissions Feed ── */}
      <div className="rounded-2xl border border-[var(--primary)]/10 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--primary)]/10 sm:px-5">
          <div className="flex items-center gap-2">
            <FileText size={15} className="text-[var(--accent)]" />
            <h3 className="text-[13px] font-heading font-extrabold tracking-tight text-[var(--text-strong)]">Recent faculty submissions</h3>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('report-history')}
            className="flex items-center gap-1 text-[11px] font-bold text-[var(--accent)] hover:text-[var(--accent-dark)] cursor-pointer"
          >
            View all <ArrowRight size={12} />
          </button>
        </div>
        <div className="divide-y divide-[var(--primary)]/10">
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
      <CampusNewsCard />

    </div>
  );
};
