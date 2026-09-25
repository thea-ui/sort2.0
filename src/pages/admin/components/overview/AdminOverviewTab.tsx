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
import { StatCard } from '../../../../components/layout/StatCard';

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
  const dispatchHour = Math.min(peakHourNum + 2, 23);
  const peakDispatchTime =
    dispatchHour > 12
      ? `${dispatchHour - 12}:15 PM`
      : dispatchHour === 12
        ? '12:15 PM'
        : `${dispatchHour}:15 AM`;

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
    'bg-emerald-50',
    'bg-[color-mix(in_srgb,var(--primary)_10%,white)]',
    'bg-amber-50',
    'bg-[color-mix(in_srgb,var(--gold)_10%,white)]',
    'bg-rose-50',
    'bg-[color-mix(in_srgb,var(--primary)_10%,white)]',
    'bg-emerald-50',
    'bg-rose-50',
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
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      name: 'Aluminum Cans',
      count: canCount,
      Icon: Layers,
      barBg: 'bg-[var(--primary)]',
      bg: 'bg-[color-mix(in_srgb,var(--primary)_10%,white)]',
      text: 'text-[var(--text-strong)]',
      border: 'border-[var(--primary)]/25',
      iconColor: 'text-[var(--text-strong)]',
    },
    {
      name: 'Paper / Cardboard',
      count: paperCount,
      Icon: FileText,
      barBg: 'bg-amber-500',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-100',
      iconColor: 'text-amber-600',
    },
    {
      name: 'Glass / Beverage Bottles',
      count: glassCount,
      Icon: Package,
      barBg: 'bg-[var(--gold)]',
      bg: 'bg-[color-mix(in_srgb,var(--gold)_10%,white)]',
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
        title="Campus Analytics"
        description="Real-time reporting frequency, grade distribution, and material breakdowns."
        actions={
          <span className="hidden sm:inline-flex items-center gap-2 shrink-0 whitespace-nowrap text-xs font-semibold text-foreground bg-card border border-border px-3 py-1.5 rounded-full shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live Status Hub
          </span>
        }
      />

      {/* Summary Quick-Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Reports Today"
          numericValue={reportsToday}
          icon={<BarChart2 size={16} />}
          footer="Active verified incidents"
          onClick={() => onNavigate('admin-reports')}
        />
        <StatCard
          label="This Week"
          numericValue={reportsThisWeek}
          icon={<CalendarDays size={16} />}
          footer="Active campus submissions"
          onClick={() => onNavigate('admin-reports')}
        />
        <StatCard
          label="Peak Activity Time"
          value={peakTimeStr}
          icon={<Clock size={16} />}
          iconClassName="bg-amber-50 text-amber-600"
          footer="Highest daily traffic window"
          onClick={() => onNavigate('admin-collections')}
        />
      </div>

      {/* MRF dispatch advisory — kept out of the stat tile so all three stay equal height */}
      {peakHour && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200">
          <Clock size={14} className="text-amber-500 shrink-0" />
          <p className="text-xs font-bold text-amber-700">
            Optimal MRF Staff Dispatch Window:{' '}
            <span className="text-amber-900">{peakDispatchTime}</span>
          </p>
        </div>
      )}

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
                <div className="w-full h-2 bg-[color-mix(in_srgb,var(--primary)_10%,white)] rounded-full overflow-hidden">
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
                <div className="w-full h-2 bg-[color-mix(in_srgb,var(--primary)_10%,white)] rounded-full overflow-hidden">
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
