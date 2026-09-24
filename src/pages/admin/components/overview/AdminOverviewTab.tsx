import React from 'react';
import {
  BarChart2,
  CalendarDays,
  Clock,
  Droplets,
  FileText,
  GraduationCap,
  Layers,
  Package,
  Recycle,
} from 'lucide-react';
import type { Report, User } from '../../../../types';
import { useRecycleMarket } from '../../../../hooks/useRecycleMarket';
import { PageHeader } from '../../../../components/layout/PageHeader';

interface AdminOverviewTabProps {
  reports: Report[];
  users: User[];
  onNavigate: (tab: string) => void;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  reports,
  users,
  onNavigate,
}) => {
  const { stocksRecord } = useRecycleMarket();

  const totalReportsCount = reports.length;

  // Compute reports today / this week dynamically
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const reportsToday = reports.filter(
    (r) => r.timestamp && r.timestamp.slice(0, 10) === todayStr,
  ).length;

  // Reports this week (Monday to Sunday)
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const reportsThisWeek = reports.filter((r) => {
    if (!r.timestamp) return false;
    const rDate = r.timestamp.slice(0, 10);
    return rDate >= weekStartStr && rDate <= todayStr;
  }).length;

  // Peak activity time - compute from actual report timestamps
  const hourCounts: Record<number, number> = {};
  reports.forEach((r) => {
    if (r.timestamp) {
      try {
        const h = new Date(r.timestamp).getHours();
        hourCounts[h] = (hourCounts[h] || 0) + 1;
      } catch {
        /* skip */
      }
    }
  });
  const peakHour = Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0];
  const peakHourNum = peakHour ? parseInt(peakHour[0]) : 12;
  const peakStart =
    peakHourNum > 12
      ? `${peakHourNum - 12}:00 PM`
      : peakHourNum === 12
        ? '12:00 PM'
        : `${peakHourNum}:00 AM`;
  const peakEnd =
    peakHourNum + 1 > 12
      ? `${peakHourNum + 1 - 12}:00 PM`
      : peakHourNum + 1 === 12
        ? '12:00 PM'
        : `${peakHourNum + 1}:00 AM`;
  const peakTimeStr = peakHour ? `${peakStart} – ${peakEnd}` : 'No data yet';
  const peakDispatchTime = peakHour
    ? `${String(Math.min(peakHourNum + 2, 23)).padStart(2, '0')}:15`
    : '2:15 PM';

  // Grade level distribution dynamically from reports — Students only
  const gradeColors = [
    'bg-emerald-500',
    'bg-[var(--primary)]',
    'bg-amber-500',
    'bg-[var(--gold)]',
    'bg-rose-500',
    'bg-[var(--primary)]',
    'bg-emerald-500',
    'bg-amber-500',
  ];
  const gradeBgColors = [
    'bg-emerald-50/60',
    'bg-[var(--primary)]/10',
    'bg-amber-50/60',
    'bg-[var(--gold)]/10',
    'bg-rose-50/60',
    'bg-[var(--primary)]/10',
    'bg-emerald-50/60',
    'bg-rose-50/60',
  ];
  const gradeTextColors = [
    'text-emerald-700',
    'text-[var(--text-strong)]',
    'text-amber-700',
    'text-[var(--gold)]',
    'text-rose-700',
    'text-[var(--text-strong)]',
    'text-emerald-700',
    'text-amber-700',
  ];
  const gradeBorderColors = [
    'border-emerald-100',
    'border-[var(--primary)]/25',
    'border-amber-100',
    'border-[var(--gold)]/25',
    'border-rose-100',
    'border-[var(--primary)]/25',
    'border-emerald-100',
    'border-amber-100',
  ];

  const gradeCountMap: Record<string, number> = {};
  reports.forEach((r) => {
    const u = users.find(
      (usr) => usr.id === r.reporterId || usr.name.toLowerCase() === r.reporterName?.toLowerCase(),
    );
    if (!u || u.role !== 'STUDENT') return;
    const grade = (u as any)?.gradeLevel || 'Unknown';
    gradeCountMap[grade] = (gradeCountMap[grade] || 0) + 1;
  });

  const gradeBreakdownList = Object.entries(gradeCountMap)
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([grade, count], idx) => ({
      grade,
      count,
      barBg: gradeColors[idx % gradeColors.length],
      bg: gradeBgColors[idx % gradeBgColors.length],
      text: gradeTextColors[idx % gradeTextColors.length],
      border: gradeBorderColors[idx % gradeBorderColors.length],
      pct: totalReportsCount > 0 ? Math.round((count / totalReportsCount) * 100) : 0,
    }));

  // Material distribution from market stock accumulatedKg (MRF-verified data)
  const plasticCount = Math.round((stocksRecord['pet_plastic']?.accumulatedKg || 0) * 10) / 10;
  const canCount = Math.round((stocksRecord['aluminum_cans']?.accumulatedKg || 0) * 10) / 10;
  const paperCount = Math.round((stocksRecord['cardboard']?.accumulatedKg || 0) * 10) / 10;
  const glassCount = Math.round((stocksRecord['glass']?.accumulatedKg || 0) * 10) / 10;

  const totalMaterialReports = plasticCount + canCount + paperCount + glassCount;

  const materialBreakdownList = [
    {
      name: 'Plastic Bottles',
      count: plasticCount,
      Icon: Droplets,
      barBg: 'bg-emerald-500',
      bg: 'bg-emerald-50/60',
      text: 'text-emerald-700',
      border: 'border-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      name: 'Aluminum Cans',
      count: canCount,
      Icon: Layers,
      barBg: 'bg-[var(--primary)]',
      bg: 'bg-[var(--primary)]/10',
      text: 'text-[var(--text-strong)]',
      border: 'border-[var(--primary)]/25',
      iconColor: 'text-[var(--text-strong)]',
    },
    {
      name: 'Paper / Cardboard',
      count: paperCount,
      Icon: FileText,
      barBg: 'bg-amber-500',
      bg: 'bg-amber-50/60',
      text: 'text-amber-700',
      border: 'border-amber-100',
      iconColor: 'text-amber-600',
    },
    {
      name: 'Glass / Beverage Bottles',
      count: glassCount,
      Icon: Package,
      barBg: 'bg-[var(--gold)]',
      bg: 'bg-[var(--gold)]/10',
      text: 'text-[var(--gold)]',
      border: 'border-[var(--gold)]/25',
      iconColor: 'text-[var(--gold)]',
    },
  ].map((item) => ({
    ...item,
    pct: totalMaterialReports > 0 ? Math.round((item.count / totalMaterialReports) * 100) : 0,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Campus Operational Analytics"
        description="Real-time reporting frequency, grade level distribution, and material breakdowns."
        badge={
          <span className="inline-block text-[10px] font-bold text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-2.5 py-1 rounded-full uppercase tracking-wider mb-1.5">
            Operational Telemetry
          </span>
        }
        actions={
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-[var(--text-strong)] bg-white border border-[var(--primary)]/10 px-3 py-1.5 rounded-xl shadow-sm">
            <BarChart2 size={13} className="text-[var(--accent)]" /> Live Status Hub
          </span>
        }
      />

      {/* Summary Quick-Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('admin-reports')}
          className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 text-left shadow-sm space-y-1 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group hover:border-[var(--accent)]/40"
        >
          <div className="flex items-center justify-between text-[var(--accent)] mb-1">
            <span className="text-[10px] font-bold text-[var(--text-strong)]/50 uppercase tracking-wider group-hover:text-[var(--accent)] transition-colors">
              Reports Today
            </span>
            <div className="p-1.5 bg-[var(--accent)]/10 rounded-lg text-[var(--accent)] group-hover:scale-105 transition-transform">
              <BarChart2 size={15} />
            </div>
          </div>
          <p className="text-3xl font-black text-[var(--text-strong)]">{reportsToday}</p>
          <p className="text-[11px] font-semibold text-[var(--accent)]">Active verified incidents</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('admin-reports')}
          className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 text-left shadow-sm space-y-1 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group hover:border-[var(--primary)]/25"
        >
          <div className="flex items-center justify-between text-[var(--text-strong)] mb-1">
            <span className="text-[10px] font-bold text-[var(--text-strong)]/50 uppercase tracking-wider group-hover:text-[var(--text-strong)] transition-colors">
              This Week
            </span>
            <div className="p-1.5 bg-[var(--primary)]/10 rounded-lg text-[var(--text-strong)] group-hover:scale-105 transition-transform">
              <CalendarDays size={15} />
            </div>
          </div>
          <p className="text-3xl font-black text-[var(--text-strong)]">{reportsThisWeek}</p>
          <p className="text-[11px] font-semibold text-[var(--text-strong)]">Active campus submissions</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('admin-collections')}
          className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 text-left shadow-sm space-y-1 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group hover:border-amber-300"
        >
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-[10px] font-bold text-[var(--text-strong)]/50 uppercase tracking-wider group-hover:text-amber-600 transition-colors">
              Peak Activity Time
            </span>
            <div className="p-1.5 bg-amber-50 rounded-lg text-amber-500 group-hover:scale-105 transition-transform">
              <Clock size={15} />
            </div>
          </div>
          <p className="text-xl font-black text-[var(--text-strong)] mt-1">{peakTimeStr}</p>
          <p className="text-[11px] font-semibold text-amber-600">Highest daily traffic window</p>
          <div className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-xl">
            <Clock size={11} className="text-amber-500 shrink-0" />
            <span className="text-[10px] font-bold text-amber-700 leading-tight">
              Optimal MRF Staff Dispatch Window: <span className="text-amber-900">{peakDispatchTime}</span>
            </span>
          </div>
        </button>
      </div>

      {/* 2-Column Grid: Grade Level Breakdown & Most Reported Materials */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-4 hover:shadow-md transition-shadow">
          <div>
            <h4 className="text-xs font-extrabold text-[var(--text-strong)] flex items-center gap-2">
              <GraduationCap size={14} className="text-emerald-500" />
              <span>Reports by Grade Level</span>
            </h4>
            <p className="text-[11px] text-[var(--text-strong)]/40 font-medium mt-0.5">
              Report distribution volume across academic grade levels
            </p>
          </div>

          <div className="space-y-3 pt-1">
            {gradeBreakdownList.map((item) => (
              <div
                key={item.grade}
                className={`p-3 rounded-2xl border ${item.bg} ${item.border} space-y-1.5`}
              >
                <div className="flex justify-between items-center text-xs font-bold text-[var(--text-strong)]">
                  <span>{item.grade}</span>
                  <span className={item.text}>
                    {item.pct}% · {item.count} report{item.count === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="w-full h-2 bg-[var(--primary)]/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.barBg} transition-all duration-500`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-4 hover:shadow-md transition-shadow">
          <div>
            <h4 className="text-xs font-extrabold text-[var(--text-strong)] flex items-center gap-2">
              <Recycle size={14} className="text-emerald-500" />
              <span>Most Reported Materials</span>
            </h4>
            <p className="text-[11px] text-[var(--text-strong)]/40 font-medium mt-0.5">
              Item categories submitted by students across campus
            </p>
          </div>

          <div className="space-y-3 pt-1">
            {materialBreakdownList.map((item) => (
              <div
                key={item.name}
                className={`p-3 rounded-2xl border ${item.bg} ${item.border} space-y-1.5`}
              >
                <div className="flex justify-between items-center text-xs font-bold text-[var(--text-strong)]">
                  <span className="flex items-center gap-1.5">
                    <item.Icon size={13} className={item.iconColor} />
                    <span>{item.name}</span>
                  </span>
                  <span className={item.text}>
                    {item.pct}% · {item.count} report{item.count === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="w-full h-2 bg-[var(--primary)]/10 rounded-full overflow-hidden">
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
  );
};
