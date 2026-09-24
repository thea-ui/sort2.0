import React, { useState, useEffect } from 'react';
import {
  Flame,
  Trophy,
  Camera,
  MapPin,
  Clock,
  Activity,
  Recycle,
  Newspaper,
  Award,
  AlertTriangle,
  ArrowRight,
  FileText
} from 'lucide-react';
import { User, Report, Offense, SystemSettings } from '../../../types';
import { cleanReportTitle, cleanLocationName } from '../../../utils/reportUtils';
import { getInitials } from '../../../utils/userDisplay';
import { apiService } from '../../../services/api';

interface OverviewTabProps {
  currentUser: User;
  reports: Report[];
  offenses?: Offense[];
  settings?: SystemSettings | null;
  setActiveTab?: (tab: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ currentUser, reports, offenses = [], settings, setActiveTab }) => {
  const [campusNews, setCampusNews] = useState<any[]>([]);

  useEffect(() => {
    apiService.getCampusNews().then(data => {
      if (Array.isArray(data)) setCampusNews(data.filter((n: any) => n.isPublished));
    }).catch(() => {});
  }, []);

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

  return (
    <div className="max-w-6xl mx-auto space-y-9 pb-12">

      {/* ── 2026 Hero Welcome Card ── */}
      <div className="bg-gradient-to-br from-white/95 via-white/90 to-[var(--primary)]/5 border border-white/90 rounded-3xl p-7 md:p-8 shadow-xl shadow-[var(--primary)]/5 backdrop-blur-md relative overflow-hidden transition-all hover:shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          
          {/* User Profile Info */}
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
                <span className="text-xs font-bold text-[var(--accent)] bg-[var(--accent)]/15 border border-[var(--accent)]/30 px-3 py-0.5 rounded-full">
                  Active Eco-Reporter · Student
                </span>
              </div>
            </div>
          </div>

          {/* Stats Pod */}
          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-[var(--primary)]/10 pt-4 md:pt-0 md:pl-8">
            <div className="text-center min-w-[60px]">
              <p className="text-[10px] font-bold text-[var(--text-strong)]/50 uppercase tracking-wider mb-0.5">Rank</p>
              <p className="text-2xl font-heading font-black text-[var(--text-strong)]">
                <span className="text-[var(--gold)] font-black mr-0.5">#</span>{currentUser.points === 0 ? '-' : '1'}
              </p>
            </div>
            <div className="text-center min-w-[80px]">
              <p className="text-[10px] font-bold text-[var(--text-strong)]/50 uppercase tracking-wider mb-0.5">Eco-Points</p>
              <p className="text-2xl font-heading font-black text-[var(--accent)] flex items-center justify-center">
                <Flame size={18} className="text-[var(--accent)] mr-1 fill-[var(--accent)]" />
                {currentUser.points}
              </p>
            </div>
            <div className="text-center min-w-[60px]">
              <p className="text-[10px] font-bold text-[var(--text-strong)]/50 uppercase tracking-wider mb-0.5">Reports</p>
              <p className="text-2xl font-heading font-black text-[var(--text-strong)]">
                {totalReports}
              </p>
            </div>
          </div>

        </div>

        {/* Progress bar strip */}
        <div className="mt-6 pt-5 border-t border-[var(--primary)]/10 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-bold gap-1">
            <span className="text-[var(--text-strong)]/60 uppercase text-[10px] tracking-wider">Quarterly Certificate Progress</span>
            <span className="text-[var(--gold)]">
              {currentUser.points > 0 ? `Progress: ${progressPercent}%` : '0 Points — Submit reports to start earning points and certificates!'}
            </span>
          </div>
          <div className="h-2.5 w-full bg-[var(--gold)]/15 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[var(--gold)] to-amber-500 rounded-full transition-all duration-700" style={{ width: `${progressPercent}%` }} />
          </div>

          {/* Certificate CTA */}
          <div className="mt-4 pt-4 border-t border-[var(--gold)]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-[11px] text-[var(--text-strong)]/60 font-semibold">
              {currentUser.points >= certThreshold
                ? 'You\u2019ve reached the certificate threshold \u2014 claim your Eco-Milestone award and check your ranked standing.'
                : `Earn ${Math.max(0, certThreshold - currentUser.points)} more eco-points to unlock your Eco-Milestone certificate.`}
            </p>
            <button
              type="button"
              onClick={() => setActiveTab?.('gamification')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/25 text-[var(--gold)] text-[11px] font-extrabold hover:bg-[var(--gold)]/20 transition-colors cursor-pointer shrink-0"
            >
              <Award size={12} />
              Certificate Vault
            </button>
          </div>
        </div>
      </div>

      {/* Warnings / Offenses */}
      {userOffenses.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-amber-500" />
            <h3 className="text-sm font-bold text-amber-800">Offenses ({userOffenses.length})</h3>
          </div>
          <div className="space-y-2">
            {userOffenses.slice(0, 3).map((offense) => {
              const isExpiredSuspension = offense.severity === 'SUSPENSION' && offense.expiresAt && new Date(offense.expiresAt) <= new Date();
              return (
                <div key={offense.id} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-amber-100">
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                    offense.severity === 'SUSPENSION' ? 'bg-red-100 text-red-600' :
                    offense.severity === 'DEDUCT' ? 'bg-orange-100 text-orange-600' :
                    'bg-amber-100 text-amber-600'
                  }`}>
                    <AlertTriangle size={13} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-800">{offense.description}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {offense.severity === 'WARNING' ? 'Warning' : offense.severity === 'DEDUCT' ? 'Points Deducted' : 'Account Suspension'}
                      {offense.severity === 'SUSPENSION' && offense.expiresAt && !isExpiredSuspension && (
                        <span className="text-red-500 font-bold"> · Until {new Date(offense.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                      {offense.severity === 'SUSPENSION' && isExpiredSuspension && (
                        <span className="text-gray-400 italic"> · Expired</span>
                      )}
                      {' · '}{offense.timestamp}
                    </p>
                  </div>
                </div>
              );
            })}
            {userOffenses.length > 3 && (
              <p className="text-[10px] text-amber-600 font-bold text-center">+{userOffenses.length - 3} more offenses</p>
            )}
          </div>
        </div>
      )}

      {/* ── Campus Operational Overview ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Activity size={18} className="text-[var(--accent)]" />
          <h3 className="text-base font-heading font-bold text-[var(--text-strong)]">Campus Operational Overview</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

          {/* 1. Grade Level Standing Card */}
          <button
            type="button"
            onClick={() => setActiveTab?.('report-history')}
            className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-6 text-left shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-4 cursor-pointer group hover:border-amber-300"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-[var(--text-strong)]/60 group-hover:text-amber-700 transition-colors">My Grade Level Standing</p>
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/10 group-hover:scale-105 transition-transform">
                <Award size={20} strokeWidth={2} />
              </div>
            </div>
            <div className="space-y-3 w-full">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100/80 text-amber-900 border border-amber-200 text-xs font-black">
                Grade Level {(currentUser as any).gradeLevel ? `${(currentUser as any).gradeLevel} — ${(currentUser as any).sectionName}` : currentUser.classroomSection || 'N/A'}
              </span>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-[var(--text-strong)]/60 font-semibold">
                  <span>My Submissions</span>
                  <span>{totalReports} {totalReports === 1 ? 'Report' : 'Reports'}</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full" style={{ width: `${Math.min(100, totalReports * 10)}%` }} />
                </div>
              </div>
            </div>
          </button>

          {/* 2. Today's Campus Activity Card */}
          <button
            type="button"
            onClick={() => setActiveTab?.('bin-map')}
            className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-6 text-left shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-4 cursor-pointer group hover:border-[var(--primary)]/25"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-[var(--text-strong)]/60 group-hover:text-[var(--text-strong)] transition-colors">Today's Campus Reports</p>
              <div className="h-10 w-10 rounded-xl bg-[var(--primary)]/10 text-[var(--text-strong)] border border-[var(--primary)]/25 flex items-center justify-center shrink-0 shadow-sm shadow-[var(--primary)]/10 group-hover:scale-105 transition-transform">
                <FileText size={20} strokeWidth={2} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2.5">
                <p className="text-3xl sm:text-4xl font-heading font-black text-[var(--text-strong)]">{reports.length}</p>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
                  Live Volume
                </span>
              </div>
              <p className="text-xs text-[var(--text-strong)]/60 mt-1.5 font-medium">Reports submitted across campus today</p>
            </div>
          </button>

          {/* 3. Top Recyclable Material Card */}
          <button
            type="button"
            onClick={() => setActiveTab?.('submit-report')}
            className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-6 text-left shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-4 cursor-pointer group hover:border-emerald-300"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-[var(--text-strong)]/60 group-hover:text-emerald-700 transition-colors">Most Reported Material</p>
              <div className="h-10 w-10 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/10 group-hover:scale-105 transition-transform">
                <Recycle size={20} strokeWidth={2} />
              </div>
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100/80 text-emerald-900 border border-emerald-200 text-xs font-black">
                <Recycle size={13} className="text-emerald-700" /> {reports.length > 0 ? (reports[0].category || 'Recyclables') : 'None Logged Yet'}
              </span>
              <p className="text-xs text-[var(--text-strong)]/60 mt-2.5 font-medium leading-relaxed">
                {reports.length > 0 ? 'Top material category from active campus reports.' : 'Submit new waste reports to track campus material trends.'}
              </p>
            </div>
          </button>

        </div>
      </div>

      {/* ── Quick Actions Grid (Spacious Vertical Layout) ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Activity size={18} className="text-[var(--accent)]" />
          <h3 className="text-base font-heading font-bold text-[var(--text-strong)]">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
          {[
            { label: 'Report Bin', desc: 'Snap a full bin', tab: 'submit-report', gradient: 'from-orange-500 to-rose-500', shadow: 'shadow-orange-500/20', hover: 'hover:border-rose-300', icon: Camera },
            { label: 'Live Bin Map', desc: 'Campus bins status', tab: 'bin-map', gradient: 'from-[var(--primary)] to-[var(--primary)]', shadow: 'shadow-[var(--primary)]/20', hover: 'hover:border-[var(--primary)]/25', icon: MapPin },
            { label: 'My Activity', desc: 'Track your reports', tab: 'report-history', gradient: 'from-[var(--gold)] to-[var(--primary)]', shadow: 'shadow-[var(--gold)]/20', hover: 'hover:border-[var(--gold)]/25', icon: Clock },
            { label: 'Leaderboard', desc: 'See top eco-champs', tab: 'gamification', gradient: 'from-amber-400 to-orange-500', shadow: 'shadow-amber-500/20', hover: 'hover:border-amber-300', icon: Trophy },
          ].map(action => {
            const Icon = action.icon;
            return (
              <button
                key={action.tab}
                onClick={() => setActiveTab?.(action.tab)}
                className={`bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 text-left shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group ${action.hover}`}
              >
                <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${action.gradient} text-white flex items-center justify-center mb-3 shadow-md ${action.shadow} group-hover:scale-105 transition-transform`}>
                  <Icon size={20} strokeWidth={2} />
                </div>
                <p className="text-xs font-bold text-[var(--text-strong)]">{action.label}</p>
                <p className="text-[11px] text-[var(--text-strong)]/60 mt-0.5 font-medium">{action.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Two-column Split-View: Recent Submissions + Certificate Status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Expanded Recent Submissions (3 cols) */}
        <div className="lg:col-span-3 bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-[var(--primary)]/10">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 flex items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
                <FileText size={16} />
              </div>
              <h3 className="text-base font-heading font-bold text-[var(--text-strong)]">Recent Submissions</h3>
            </div>
            <button
              onClick={() => setActiveTab?.('report-history')}
              className="flex items-center gap-1 text-xs font-bold text-[var(--accent)] hover:text-[var(--accent-dark)] cursor-pointer"
            >
              View all <ArrowRight size={13} />
            </button>
          </div>
          <div className="divide-y divide-[var(--primary)]/5 flex-1">
            {personalReports.slice(0, 4).map(rep => (
              <button
                key={rep.id}
                type="button"
                onClick={() => setActiveTab?.('report-history')}
                className="w-full text-left flex items-center gap-3.5 px-6 py-4 hover:bg-[var(--accent)]/5 transition-colors cursor-pointer group"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-white transition-colors">
                  <FileText size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-[var(--text-strong)] group-hover:text-[var(--accent)] transition-colors">{cleanReportTitle(rep.title)}</p>
                  <p className="text-[11px] text-[var(--text-strong)]/50 font-medium mt-0.5">{cleanLocationName(rep.locationName)} · {rep.timestamp}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider border ${
                  rep.status === 'RESOLVED' ? 'bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/30' :
                  rep.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-gray-100 text-gray-600 border-gray-200'
                }`}>{rep.status}</span>
              </button>
            ))}
            {personalReports.length === 0 && (
              <div className="px-6 py-12 text-center">
                <AlertTriangle className="mx-auto mb-2 text-gray-300" size={28} />
                <p className="text-xs font-medium text-gray-400">No reports yet. Submit your first report!</p>
              </div>
            )}
          </div>
        </div>

        {/* Compact Claim Certificate / Status Card (2 cols) */}
        <button
          type="button"
          onClick={() => setActiveTab?.('gamification')}
          className="lg:col-span-2 bg-gradient-to-br from-white/95 via-white/90 to-amber-50/50 border border-amber-200/80 rounded-3xl shadow-sm p-6 sm:p-7 flex flex-col justify-between space-y-5 text-left cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
        >
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--gold)]/15 text-[var(--gold)] border border-[var(--gold)]/30 text-[10px] font-black uppercase tracking-wider">
                <Trophy size={12} />
                Quarterly Certificate Track
              </span>
              <Award size={22} className="text-[var(--gold)] group-hover:scale-110 transition-transform" />
            </div>
            <h4 className="text-lg font-heading font-black text-[var(--text-strong)] group-hover:text-amber-700 transition-colors">Top Eco-Champion Certificate</h4>
            <p className="text-xs text-[var(--text-strong)]/60 mt-1.5 font-medium leading-relaxed">
              Awarded to the #1 ranked student reporter each quarter. Keep logging active reports to claim your official school recognition!
            </p>
          </div>

          <div className="space-y-3 pt-3 border-t border-amber-100 w-full">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-[var(--text-strong)]/70">Status</span>
              <span className="text-emerald-800 bg-emerald-100/80 border border-emerald-200 px-3 py-0.5 rounded-full text-[10px] font-extrabold">
                {currentUser.points === 0 ? 'Rank #1 (Tied)' : 'Rank #1'}
              </span>
            </div>
            <div
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold shadow-md shadow-amber-500/20 group-hover:from-amber-500 group-hover:to-orange-600 transition-all flex items-center justify-center gap-2"
            >
              <span>View Leaderboard Standing</span>
              <ArrowRight size={14} />
            </div>
          </div>
        </button>

      </div>

      {/* ── Campus News Highlights ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Newspaper size={18} className="text-[var(--accent)]" />
          <h3 className="text-base font-heading font-bold text-[var(--text-strong)]">Campus News & Updates</h3>
        </div>
        {campusNews.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-8 shadow-sm text-center">
            <Newspaper size={28} className="text-[var(--text-strong)]/20 mx-auto mb-3" />
            <p className="text-sm text-[var(--text-strong)]/40 font-medium">No campus news yet. Check back later!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {campusNews.map((item: any) => (
              <div key={item.id} className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`px-3 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${item.tagColor}`}>{item.tag}</span>
                    <span className="text-[10px] text-[var(--text-strong)]/50 font-medium">{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className={`h-10 w-10 rounded-2xl ${item.iconColor} text-white flex items-center justify-center shadow-sm`}>
                    <Newspaper size={18} strokeWidth={2} />
                  </div>
                  <h4 className="text-xs font-bold text-[var(--text-strong)] leading-snug">{item.title}</h4>
                  <p className="text-[11px] text-[var(--text-strong)]/60 font-medium leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
