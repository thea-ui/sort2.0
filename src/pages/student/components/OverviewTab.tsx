import React, { useState, useEffect } from 'react';
import {
  Flame,
  Trophy,
  Camera,
  MapPin,
  Clock,
  Activity,
  Recycle,
  Award,
  AlertTriangle,
  ArrowRight,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { User, Report, Offense, SystemSettings } from '../../../types';
import { cleanReportTitle, cleanLocationName } from '../../../utils/reportUtils';
import { getInitials } from '../../../utils/userDisplay';
import { apiService } from '../../../services/api';
import { CampusNewsCard } from '../../../components/common/CampusNewsCard';
import {
  studentPanel,
  studentPanelHeader,
  studentSectionTitle,
} from './ui/StudentPrimitives';

interface OverviewTabProps {
  currentUser: User;
  reports: Report[];
  offenses?: Offense[];
  settings?: SystemSettings | null;
  setActiveTab?: (tab: string) => void;
}

const QUICK_ACTIONS = [
  {
    label: 'Report Bin',
    desc: 'Snap a full bin',
    tab: 'submit-report',
    icon: Camera,
    iconClass: 'bg-[var(--ramp-1)]/10 text-[var(--ramp-1-strong)]',
  },
  {
    label: 'Live Bin Map',
    desc: 'Campus bin status',
    tab: 'bin-map',
    icon: MapPin,
    iconClass: 'bg-[var(--ramp-2)]/10 text-[var(--ramp-2-strong)]',
  },
  {
    label: 'My Activity',
    desc: 'Track your reports',
    tab: 'report-history',
    icon: Clock,
    iconClass: 'bg-[var(--ramp-3)]/10 text-[var(--ramp-3-strong)]',
  },
  {
    label: 'Leaderboard',
    desc: 'Top eco-champions',
    tab: 'gamification',
    icon: Trophy,
    iconClass: 'bg-[var(--ramp-4)]/10 text-[var(--ramp-4-strong)]',
  },
];

const STATUS_STYLES: Record<string, string> = {
  RESOLVED: 'border-[var(--accent)]/25 bg-[var(--accent)]/10 text-[var(--accent)]',
  PENDING: 'border-[var(--warning)]/25 bg-[var(--warning)]/10 text-[var(--warning-strong)]',
  DISPATCHED: 'border-[var(--info)]/25 bg-[var(--info)]/10 text-[var(--info-strong)]',
  COLLECTED: 'border-[var(--accent)]/25 bg-[var(--accent)]/10 text-[var(--accent)]',
  DISMISSED: 'border-[var(--danger)]/25 bg-[var(--danger)]/10 text-[var(--danger-strong)]',
  EXPIRED: 'border-[var(--danger)]/25 bg-[var(--danger)]/10 text-[var(--danger-strong)]',
};

export const OverviewTab: React.FC<OverviewTabProps> = ({ currentUser, reports, offenses = [], settings, setActiveTab }) => {
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiService.getLeaderboard()
      .then(list => {
        if (cancelled || !Array.isArray(list)) return;
        const idx = list.findIndex((u: any) => u.id === currentUser.id);
        setLeaderboardRank(idx >= 0 ? idx + 1 : null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [currentUser.id, currentUser.points]);

  const personalReports = reports.filter(r =>
    r.reporterId === currentUser.id ||
    r.reporterName?.toLowerCase() === currentUser.name?.toLowerCase()
  );
  const totalReports = personalReports.length;
  const certThreshold = settings?.certificatePointThreshold ?? 500;
  const progressPercent = Math.min(100, Math.round((currentUser.points / certThreshold) * 100));
  const userOffenses = offenses.filter(
    o => o.userId === currentUser.id || (currentUser.email && o.userId === currentUser.email)
  );

  const todayKey = new Date().toDateString();
  const reportsToday = reports.filter(r => {
    if (!r.timestamp) return false;
    const d = new Date(r.timestamp);
    return !Number.isNaN(d.getTime()) && d.toDateString() === todayKey;
  }).length;

  const categoryCounts = reports.reduce<Record<string, number>>((acc, r) => {
    const key = r.category || 'GENERAL';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const gradeLabel = (currentUser as any).gradeLevel
    ? `${(currentUser as any).gradeLevel} — ${(currentUser as any).sectionName}`
    : currentUser.classroomSection || 'N/A';

  return (
    <div className="w-full space-y-4 pb-8 animate-fade-in sm:space-y-6">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl border border-[var(--primary)]/10 bg-white">
        <div className="grid gap-4 p-4 sm:gap-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
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
                Student
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-[var(--primary)]/10 rounded-xl border border-[var(--primary)]/10 bg-[var(--background)]/50 py-2.5 sm:py-3 xl:min-w-[300px]">
            <div className="px-2 text-center sm:px-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-strong)]/45">Rank</p>
              <p className="mt-0.5 text-lg font-heading font-black text-[var(--text-strong)] sm:text-xl">
                <span className="mr-0.5 text-[var(--gold)]">#</span>
                {currentUser.points === 0 ? '—' : (leaderboardRank ?? '—')}
              </p>
            </div>
            <div className="px-2 text-center sm:px-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-strong)]/45">Eco-Points</p>
              <p className="mt-0.5 flex items-center justify-center text-lg font-heading font-black text-[var(--accent)] sm:text-xl">
                <Flame size={14} className="mr-1 fill-[var(--accent)] sm:size-[15px]" />
                {currentUser.points}
              </p>
            </div>
            <div className="px-2 text-center sm:px-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-strong)]/45">Reports</p>
              <p className="mt-0.5 text-lg font-heading font-black text-[var(--text-strong)] sm:text-xl">{totalReports}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t border-[var(--primary)]/10 bg-[var(--background)]/35 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--text-strong)]/50">
              Quarterly Certificate Progress
            </span>
            <span className="text-[11px] font-extrabold text-[var(--gold-strong)]">
              {currentUser.points > 0 ? `${progressPercent}% complete` : 'Submit reports to start earning points'}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--gold)]/15">
            <div
              className="h-full rounded-full bg-[var(--gold)] transition-[width] duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] font-semibold leading-relaxed text-[var(--text-strong)]/55">
              {currentUser.points >= certThreshold
                ? 'You\u2019ve reached the certificate threshold \u2014 claim your Eco-Milestone award.'
                : `Earn ${Math.max(0, certThreshold - currentUser.points)} more eco-points to unlock your Eco-Milestone certificate.`}
            </p>
            <button
              type="button"
              onClick={() => setActiveTab?.('gamification')}
              className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 self-start rounded-full border border-[var(--gold)]/30 bg-[var(--gold)]/10 px-3.5 text-[11px] font-extrabold text-[var(--gold-strong)] transition-colors hover:bg-[var(--gold)]/20 sm:self-auto"
            >
              <Award size={13} />
              Certificate Vault
            </button>
          </div>
        </div>
      </section>

      {userOffenses.length > 0 && (
        <section className="rounded-2xl border border-[var(--warning)]/30 bg-[var(--warning)]/5 p-4 sm:p-5">
          <div className="mb-2.5 flex items-center gap-2">
            <AlertTriangle size={16} className="text-[var(--warning-strong)]" />
            <h3 className="text-[13px] font-bold text-[var(--warning-strong)]">Offenses ({userOffenses.length})</h3>
          </div>
          <div className="divide-y divide-[var(--warning)]/15">
            {userOffenses.slice(0, 3).map((offense) => {
              const isExpiredSuspension = offense.severity === 'SUSPENSION' && offense.expiresAt && new Date(offense.expiresAt) <= new Date();
              return (
                <div key={offense.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--warning)]/15 text-[var(--warning-strong)]">
                    <AlertTriangle size={13} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[var(--text-strong)]">{offense.description}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--text-strong)]/55">
                      {offense.severity === 'WARNING' ? 'Warning' : offense.severity === 'DEDUCT' ? 'Points Deducted' : 'Account Suspension'}
                      {offense.severity === 'SUSPENSION' && offense.expiresAt && !isExpiredSuspension && (
                        <span className="font-bold text-[var(--danger)]"> · Until {new Date(offense.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                      {offense.severity === 'SUSPENSION' && isExpiredSuspension && (
                        <span className="italic text-[var(--text-strong)]/40"> · Expired</span>
                      )}
                      {' · '}{offense.timestamp}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          {userOffenses.length > 3 && (
            <p className="mt-2 text-center text-[10px] font-bold text-[var(--warning-strong)]">
              +{userOffenses.length - 3} more offenses
            </p>
          )}
        </section>
      )}

      <div className="space-y-5 xl:space-y-6">

          {/* Operational overview */}
          <div>
            <div className="mb-2.5 flex items-center gap-2 px-1">
              <Activity size={16} className="text-[var(--accent)]" />
              <h3 className={studentSectionTitle}>Campus operational overview</h3>
            </div>
            <div className="grid divide-y divide-[var(--primary)]/10 overflow-hidden rounded-2xl border border-[var(--primary)]/10 bg-white md:grid-cols-3 md:divide-x md:divide-y-0">
              <button
                type="button"
                onClick={() => setActiveTab?.('report-history')}
                className="p-4 text-left transition-colors hover:bg-[var(--background)]/50 sm:p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold text-[var(--text-strong)]/55">My grade level</p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--gold)]/10 text-[var(--gold-strong)]">
                    <Award size={16} />
                  </span>
                </div>
                <p className="mt-2 inline-flex rounded-full border border-[var(--gold)]/25 bg-[var(--gold)]/10 px-2.5 py-0.5 text-[11px] font-black text-[var(--gold-strong)]">
                  {gradeLabel}
                </p>
                <div className="mt-2.5 flex items-center justify-between text-[10px] font-semibold text-[var(--text-strong)]/50">
                  <span>My submissions</span>
                  <span>{totalReports} {totalReports === 1 ? 'report' : 'reports'}</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--primary)]/10">
                  <div className="h-full rounded-full bg-[var(--gold)]" style={{ width: `${Math.min(100, totalReports * 10)}%` }} />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab?.('bin-map')}
                className="p-4 text-left transition-colors hover:bg-[var(--background)]/50 sm:p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold text-[var(--text-strong)]/55">Today's campus reports</p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
                    <FileText size={16} />
                  </span>
                </div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <p className="text-2xl font-heading font-black text-[var(--text-strong)]">{reportsToday}</p>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--success)]/25 bg-[var(--success)]/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[var(--success-strong)]">
                    <span className="h-1 w-1 rounded-full bg-[var(--success)]" />
                    Live
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-medium text-[var(--text-strong)]/50">Submitted across campus today</p>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab?.('submit-report')}
                className="p-4 text-left transition-colors hover:bg-[var(--background)]/50 sm:p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold text-[var(--text-strong)]/55">Most reported material</p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
                    <Recycle size={16} />
                  </span>
                </div>
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-2.5 py-0.5 text-[11px] font-black text-[var(--accent-dark)]">
                  <Recycle size={12} /> {topCategory || 'None logged yet'}
                </p>
                <p className="mt-2 text-[11px] font-medium leading-relaxed text-[var(--text-strong)]/50">
                  {reports.length > 0 ? 'Top category from active campus reports.' : 'Submit a report to track campus trends.'}
                </p>
              </button>
            </div>
          </div>

          {/* Quick actions */}
          <div>
            <div className="mb-2.5 flex items-center gap-2 px-1">
              <CheckCircle2 size={16} className="text-[var(--accent)]" />
              <h3 className={studentSectionTitle}>Quick actions</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              {QUICK_ACTIONS.map(action => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.tab}
                    type="button"
                    onClick={() => setActiveTab?.(action.tab)}
                    className="group flex flex-col items-start gap-2.5 rounded-2xl border border-[var(--primary)]/10 bg-white p-3.5 text-left transition-colors hover:border-[var(--accent)]/30 hover:bg-[var(--accent)]/[0.02] sm:flex-row sm:items-center sm:gap-3.5 sm:p-5"
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${action.iconClass} transition-transform duration-200 group-hover:scale-105`}>
                      <Icon size={19} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-bold leading-tight text-[var(--text-strong)] sm:text-sm">{action.label}</span>
                      <span className="mt-0.5 hidden text-[11px] font-medium leading-tight text-[var(--text-strong)]/50 sm:block">{action.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2 xl:gap-6">
          {/* Recent submissions */}
          <section className={studentPanel}>
            <div className={studentPanelHeader}>
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-[var(--accent)]" />
                <h3 className={studentSectionTitle}>Recent submissions</h3>
              </div>
              <button
                onClick={() => setActiveTab?.('report-history')}
                className="flex items-center gap-1 text-[11px] font-bold text-[var(--accent)] hover:text-[var(--accent-dark)]"
              >
                View all <ArrowRight size={13} />
              </button>
            </div>
            <div className="divide-y divide-[var(--primary)]/10">
              {personalReports.slice(0, 4).map(rep => (
                <button
                  key={rep.id}
                  type="button"
                  onClick={() => setActiveTab?.('report-history')}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--accent)]/5 sm:px-5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
                    <FileText size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-[var(--text-strong)]">{cleanReportTitle(rep.title)}</span>
                    <span className="mt-0.5 block truncate text-[11px] font-medium text-[var(--text-strong)]/50">
                      {cleanLocationName(rep.locationName)} · {rep.timestamp}
                    </span>
                  </span>
                  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wide ${STATUS_STYLES[rep.status] || 'border-[var(--primary)]/15 bg-[var(--primary)]/[0.04] text-[var(--text-strong)]/60'}`}>
                    {rep.status}
                  </span>
                </button>
              ))}
              {personalReports.length === 0 && (
                <div className="px-5 py-10 text-center">
                  <FileText className="mx-auto mb-2 text-[var(--text-strong)]/20" size={24} />
                  <p className="text-xs font-medium text-[var(--text-strong)]/45">No reports yet. Submit your first report!</p>
                </div>
              )}
            </div>
          </section>

          {/* Campus news */}
          <CampusNewsCard className="h-full" />
          </div>
      </div>
    </div>
  );
};
