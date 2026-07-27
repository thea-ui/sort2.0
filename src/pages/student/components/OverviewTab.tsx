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

        </div>

        {/* Progress bar strip */}
        <div className="mt-6 pt-5 border-t border-[#00271D]/10">
          <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
            <span className="text-[#00271D]/60 uppercase text-[10px] tracking-wider">Quarterly Certificate Progress</span>
            <span className="text-[#C69B26]">Rank #2 · 82% to Top Eco-Champion Certificate</span>
          </div>
          <div className="h-2.5 w-full bg-[#C69B26]/15 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#C69B26] to-amber-500 rounded-full transition-all duration-700" style={{ width: '82%' }} />
          </div>
        </div>
      </div>

      {/* ── Campus Impact Cards (Color Indicator System) ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Trees size={18} className="text-[#10B981]" />
          <h3 className="text-sm font-heading font-bold text-[#00271D]">Campus Impact</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Impact Card 1: Trees Saved */}
          <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#00271D]/60">Trees Saved</p>
              <p className="text-2xl font-heading font-extrabold text-[#00271D] mt-1">0 <span className="text-xs font-normal text-[#00271D]/50">Trees</span></p>
              <p className="text-[11px] text-[#00271D]/50 mt-1 font-medium">Equivalent environmental impact</p>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/10">
              <Trees size={22} strokeWidth={2} />
            </div>
          </div>

          {/* Impact Card 2: Recycled KG */}
          <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#00271D]/60">Recycled Waste</p>
              <p className="text-2xl font-heading font-extrabold text-[#00271D] mt-1">0 <span className="text-xs font-normal text-[#00271D]/50">KG</span></p>
              <p className="text-[11px] text-[#00271D]/50 mt-1 font-medium">Diverted from campus landfill</p>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center shrink-0 shadow-sm shadow-sky-500/10">
              <Recycle size={22} strokeWidth={2} />
            </div>
          </div>

          {/* Impact Card 3: Campus Progress */}
          <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#00271D]/60">Campus Progress</p>
              <p className="text-2xl font-heading font-extrabold text-[#00271D] mt-1">87.5 <span className="text-xs font-normal text-[#00271D]/50">%</span></p>
              <p className="text-[11px] text-[#00271D]/50 mt-1 font-medium">Overall recycling rate target</p>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/10">
              <TrendingUp size={22} strokeWidth={2} />
            </div>
          </div>

        </div>
      </div>

      {/* ── Quick Actions Grid ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity size={18} className="text-[#00A77C]" />
          <h3 className="text-sm font-heading font-bold text-[#00271D]">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Report Bin', desc: 'Snap a full bin', tab: 'submit-report', gradient: 'from-orange-500 to-rose-500', shadow: 'shadow-orange-500/20', hover: 'hover:border-rose-300', icon: Camera },
            { label: 'Live Bin Map', desc: 'Campus bins status', tab: 'bin-map', gradient: 'from-sky-400 to-blue-600', shadow: 'shadow-sky-500/20', hover: 'hover:border-sky-300', icon: MapPin },
            { label: 'My Activity', desc: 'Track your reports', tab: 'report-history', gradient: 'from-purple-500 to-indigo-600', shadow: 'shadow-purple-500/20', hover: 'hover:border-purple-300', icon: Clock },
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
                <p className="text-xs font-bold text-[#00271D]">{action.label}</p>
                <p className="text-[11px] text-[#00271D]/60 mt-0.5 font-medium">{action.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Two-column: My Stats + Recent Reports ── */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">

        {/* My Stats */}
        <div className="md:col-span-2 bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl shadow-sm p-6">
          <h3 className="text-sm font-heading font-bold text-[#00271D] mb-4">My Stats</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Reports', value: totalReports, Icon: CheckCircle2, bg: 'bg-[#00A77C]/15', color: 'text-[#00A77C]', ring: 'border-[#00A77C]/30' },
              { label: 'Pending', value: pendingReports, Icon: Clock, bg: 'bg-amber-50', color: 'text-amber-600', ring: 'border-amber-200' },
              { label: 'Resolved', value: resolvedReports, Icon: ShieldCheck, bg: 'bg-sky-50', color: 'text-sky-600', ring: 'border-sky-200' },
              { label: 'Points Today', value: '+45', Icon: Star, bg: 'bg-[#C69B26]/15', color: 'text-[#C69B26]', ring: 'border-[#C69B26]/30' },
            ].map((s, i) => {
              const Icon = s.Icon;
              return (
                <div key={i} className="flex flex-col items-center justify-center bg-white/60 border border-gray-100 rounded-2xl p-4 text-center shadow-xs">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.bg} border ${s.ring} mb-2`}>
                    <Icon size={16} className={s.color} />
                  </div>
                  <p className="text-xl font-heading font-black text-[#00271D]">{s.value}</p>
                  <p className="text-[10px] text-[#00271D]/50 font-bold uppercase mt-0.5">{s.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Reports */}
        <div className="md:col-span-3 bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl shadow-sm overflow-hidden">
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
          <div className="divide-y divide-[#00271D]/5">
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
