import React from 'react';
import {
  Flame,
  Trophy,
  Camera,
  MapPin,
  Clock,
  Activity,
  Trees,
  Recycle,
  TrendingUp,
  CheckCircle2,
  ShieldCheck,
  Star,
  Newspaper,
  Award,
  Droplet,
  FlaskConical,
  Radio,
  AlertTriangle,
  ArrowRight,
  FileText
} from 'lucide-react';
import { User, Report } from '../../../types';

interface OverviewTabProps {
  currentUser: User;
  reports: Report[];
  setActiveTab?: (tab: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ currentUser, reports, setActiveTab }) => {
  const personalReports = reports.filter(r => r.reporterId === 'current' || r.reporterId === currentUser.id);
  const totalReports = personalReports.length || 1;
  const resolvedReports = personalReports.filter(r => r.status === 'RESOLVED').length;
  const pendingReports = personalReports.filter(r => r.status === 'PENDING').length;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">

      {/* ── 2026 Hero Welcome Card ── */}
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
                <span className="text-xs font-bold text-[#00A77C] bg-[#00A77C]/15 border border-[#00A77C]/30 px-3 py-0.5 rounded-full">
                  Active Eco-Reporter · Student
                </span>
              </div>
            </div>
          </div>

          {/* Stats Pod */}
          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-[#00271D]/10 pt-4 md:pt-0 md:pl-8">
            <div className="text-center">
              <p className="text-[10px] font-bold text-[#00271D]/50 uppercase tracking-wider mb-0.5">Rank</p>
              <p className="text-2xl font-heading font-black text-[#00271D]">
                <span className="text-[#C69B26] font-black mr-0.5">#</span>2
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold text-[#00271D]/50 uppercase tracking-wider mb-0.5">Eco-Points</p>
              <p className="text-2xl font-heading font-black text-[#00A77C] flex items-center justify-center">
                <Flame size={18} className="text-[#00A77C] mr-1 fill-[#00A77C]" />
                {currentUser.points}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold text-[#00271D]/50 uppercase tracking-wider mb-0.5">Reports</p>
              <p className="text-2xl font-heading font-black text-[#00271D]">
                {totalReports}
              </p>
            </div>
          </div>

        <        {/* Progress bar strip */}
        <div className="mt-6 pt-5 border-t border-[#00271D]/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs mb-2 font-bold gap-1">
            <span className="text-[#00271D]/60 uppercase text-[10px] tracking-wider">Quarterly Certificate Progress</span>
            <span className="text-[#C69B26]">Rank #2 — 82% Progress to Rank 1 (Quarterly Certificate Unlocks at Rank 1)</span>
          </div>
          <div className="h-2.5 w-full bg-[#C69B26]/15 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#C69B26] to-amber-500 rounded-full transition-all duration-700" style={{ width: '82%' }} />
          </div>
        </div>
      </div>

      {/* ── Campus Operational Overview (Replaces Environmental Offset Metrics) ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity size={18} className="text-[#00A77C]" />
          <h3 className="text-sm font-heading font-bold text-[#00271D]">Campus Operational Overview</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* 1. Grade Level Standing Card */}
          <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-[#00271D]/60">My Grade Standing</p>
              <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/10">
                <Award size={18} strokeWidth={2} />
              </div>
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/80 text-amber-900 border border-amber-200 text-xs font-black">
                Grade 10 — #2 out of Grades 7-10
              </span>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-[11px] text-[#00271D]/60 font-semibold">
                  <span>Junior High Activity</span>
                  <span>150 Reports</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full" style={{ width: '75%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Today's Campus Activity Card */}
          <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-[#00271D]/60">Today's Campus Reports</p>
              <div className="h-9 w-9 rounded-xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center shrink-0 shadow-sm shadow-sky-500/10">
                <FileText size={18} strokeWidth={2} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-heading font-black text-[#00271D]">24</p>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
                  Live Volume
                </span>
              </div>
              <p className="text-xs text-[#00271D]/60 mt-1 font-medium">Reports submitted across campus today</p>
            </div>
          </div>

          {/* 3. Top Recyclable Material Card */}
          <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-[#00271D]/60">Most Reported Material</p>
              <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/10">
                <Recycle size={18} strokeWidth={2} />
              </div>
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-900 border border-emerald-200 text-xs font-black">
                🍾 Plastic Bottles
              </span>
              <p className="text-xs text-[#00271D]/60 mt-2 font-medium">
                Plastic Bottles account for 45% of campus recyclables.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* ── Quick Actions Grid (Compact) ── */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <Activity size={16} className="text-[#00A77C]" />
          <h3 className="text-xs font-heading font-bold text-[#00271D] uppercase tracking-wider">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Report Bin', desc: 'Snap a full bin', tab: 'submit-report', gradient: 'from-orange-500 to-rose-500', shadow: 'shadow-orange-500/15', hover: 'hover:border-rose-300', icon: Camera },
            { label: 'Live Bin Map', desc: 'Campus bins status', tab: 'bin-map', gradient: 'from-sky-400 to-blue-600', shadow: 'shadow-sky-500/15', hover: 'hover:border-sky-300', icon: MapPin },
            { label: 'My Activity', desc: 'Track your reports', tab: 'report-history', gradient: 'from-purple-500 to-indigo-600', shadow: 'shadow-purple-500/15', hover: 'hover:border-purple-300', icon: Clock },
            { label: 'Leaderboard', desc: 'See top eco-champs', tab: 'gamification', gradient: 'from-amber-400 to-orange-500', shadow: 'shadow-amber-500/15', hover: 'hover:border-amber-300', icon: Trophy },
          ].map(action => {
            const Icon = action.icon;
            return (
              <button
                key={action.tab}
                onClick={() => setActiveTab?.(action.tab)}
                className={`bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-3.5 text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group ${action.hover}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${action.gradient} text-white flex items-center justify-center shrink-0 shadow-sm ${action.shadow} group-hover:scale-105 transition-transform`}>
                    <Icon size={17} strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#00271D] leading-tight">{action.label}</p>
                    <p className="text-[10px] text-[#00271D]/50 font-medium leading-tight mt-0.5">{action.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Two-column Split-View: Recent Submissions + Certificate Status ── */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">

        {/* Expanded Recent Submissions (3 cols) */}
        <div className="md:col-span-3 bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#00271D]/10">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 flex items-center justify-center rounded-xl bg-[#00A77C]/10 text-[#00A77C]">
                <FileText size={14} />
              </div>
              <h3 className="text-sm font-heading font-bold text-[#00271D]">Recent Submissions</h3>
            </div>
            <button
              onClick={() => setActiveTab?.('report-history')}
              className="flex items-center gap-1 text-[11px] font-bold text-[#00A77C] hover:text-[#008f6a] cursor-pointer"
            >
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-[#00271D]/5 flex-1">
            {personalReports.slice(0, 4).map(rep => (
              <div key={rep.id} className="flex items-center gap-3 px-6 py-3.5 hover:bg-[#00A77C]/5 transition-colors">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-base border border-gray-200/60 shadow-xs">📋</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-[#00271D]">{rep.title}</p>
                  <p className="text-[10px] text-[#00271D]/50 font-medium">{rep.locationName} · {rep.timestamp}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                  rep.status === 'RESOLVED' ? 'bg-[#00A77C]/15 text-[#00A77C] border-[#00A77C]/30' :
                  rep.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-gray-100 text-gray-600 border-gray-200'
                }`}>{rep.status}</span>
              </div>
            ))}
            {personalReports.length === 0 && (
              <div className="px-6 py-10 text-center">
                <AlertTriangle className="mx-auto mb-2 text-gray-300" size={24} />
                <p className="text-xs font-medium text-gray-400">No reports yet. Submit your first report!</p>
              </div>
            )}
          </div>
        </div>

        {/* Compact Claim Certificate / Status Card (2 cols) */}
        <div className="md:col-span-2 bg-gradient-to-br from-white/95 via-white/90 to-amber-50/40 border border-amber-200/80 rounded-3xl shadow-sm p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#C69B26]/15 text-[#C69B26] border border-[#C69B26]/30 text-[10px] font-black uppercase tracking-wider">
                <Trophy size={12} />
                Quarterly Certificate Track
              </span>
              <Award size={20} className="text-[#C69B26]" />
            </div>
            <h4 className="text-base font-heading font-black text-[#00271D]">Top Eco-Champion Certificate</h4>
            <p className="text-xs text-[#00271D]/60 mt-1 font-medium leading-relaxed">
              Awarded to the #1 ranked student reporter each quarter. Keep logging active reports to claim your official school recognition!
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-amber-100">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-[#00271D]/70">Status</span>
              <span className="text-amber-700 bg-amber-100/80 border border-amber-200 px-2.5 py-0.5 rounded-full text-[10px]">
                Locked (Rank #2)
              </span>
            </div>
            <button
              onClick={() => setActiveTab?.('gamification')}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold shadow-md shadow-amber-500/20 hover:from-amber-500 hover:to-orange-600 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>View Leaderboard Standing</span>
              <ArrowRight size={14} />
            </button>
          </div>
          </div>
        </div>

      </div>

      {/* ── Campus News Highlights ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Newspaper size={18} className="text-[#00A77C]" />
          <h3 className="text-sm font-heading font-bold text-[#00271D]">Campus News & Updates</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { tag: 'MRF UPDATE', tagColor: 'bg-[#00A77C]/15 text-[#00A77C] border-[#00A77C]/30', date: 'Feb 24, 2026', Icon: Radio, iconBg: 'bg-[#00A77C]', title: 'Extended Collection Hours Campus-Wide', body: 'Starting March 1, MRF collection trucks will operate from 6 AM to 8 PM on weekdays.' },
            { tag: 'NEW FACILITY', tagColor: 'bg-sky-100 text-sky-800 border-sky-200', date: 'Feb 20, 2026', Icon: Recycle, iconBg: 'bg-sky-500', title: '5 New Segregation Stations Installed', body: 'Color-coded recycling stations are now live near Science Hall, the Gym, and Admin Building.' },
            { tag: 'ACHIEVEMENT', tagColor: 'bg-[#C69B26]/15 text-[#C69B26] border-[#C69B26]/30', date: 'Feb 18, 2026', Icon: TrendingUp, iconBg: 'bg-[#C69B26]', title: 'Campus Hits 2,000+ Reports This Semester', body: 'Thanks to student participation, our campus filed over 2,000 waste reports — a 68% increase.' },
          ].map((item, i) => {
            const Icon = item.Icon;
            return (
              <div key={i} className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col justify-between space-y-3">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className={`px-3 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${item.tagColor}`}>{item.tag}</span>
                    <span className="text-[10px] text-[#00271D]/50 font-medium">{item.date}</span>
                  </div>
                  <div className={`h-10 w-10 rounded-2xl ${item.iconBg} text-white flex items-center justify-center shadow-sm`}>
                    <Icon size={18} strokeWidth={2} />
                  </div>
                  <h4 className="text-xs font-bold text-[#00271D] leading-snug">{item.title}</h4>
                  <p className="text-[11px] text-[#00271D]/60 font-medium leading-relaxed">{item.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
