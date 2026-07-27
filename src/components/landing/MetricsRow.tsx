import React from 'react';
import { useMockData } from '../../hooks/useMockData';
import { Recycle, Truck, FileText, TrendingUp } from 'lucide-react';

export const MetricsRow: React.FC = () => {
  const { reports, bins } = useMockData();

  const totalWeight = reports.reduce((acc, r) => acc + (r.weightCollected || 0), 0);
  const activeDispatches = bins.filter((b) => b.activeDispatch).length;
  const resolvedCount = reports.filter((r) => r.status === 'RESOLVED').length;
  const pendingCount = reports.filter((r) => r.status === 'PENDING').length;

  const metrics = [
    {
      label: 'Total Waste Recovered',
      value: `${totalWeight.toFixed(1)} kg`,
      sub: 'Across all campus bins',
      icon: Recycle,
      accent: 'emerald',
      trend: '+14% vs last quarter',
    },
    {
      label: 'Active Dispatches',
      value: `${activeDispatches}`,
      sub: `${pendingCount} report${pendingCount !== 1 ? 's' : ''} pending`,
      icon: Truck,
      accent: 'violet',
      trend: 'MRF en route',
    },
    {
      label: 'Reports Filed',
      value: `${reports.length}`,
      sub: `${resolvedCount} resolved`,
      icon: FileText,
      accent: 'amber',
      trend: 'Last 7 days',
    },
    {
      label: 'Eco Points Awarded',
      value: '2,760',
      sub: 'Total across all students',
      icon: TrendingUp,
      accent: 'sky',
      trend: '+320 this week',
    },
  ];

  const accentMap: Record<string, { iconBg: string; iconText: string; badgeBg: string; badgeText: string }> = {
    emerald: { iconBg: 'bg-emerald-50', iconText: 'text-emerald-600', badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-600' },
    violet:  { iconBg: 'bg-violet-50',  iconText: 'text-violet-600',  badgeBg: 'bg-violet-50',  badgeText: 'text-violet-600' },
    amber:   { iconBg: 'bg-amber-50',   iconText: 'text-amber-600',   badgeBg: 'bg-amber-50',   badgeText: 'text-amber-700' },
    sky:     { iconBg: 'bg-sky-50',     iconText: 'text-sky-600',     badgeBg: 'bg-sky-50',     badgeText: 'text-sky-600' },
  };

  return (
    <section className="border-b border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="mb-5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
          Real-Time Campus Metrics
        </p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metrics.map((m) => {
            const Icon = m.icon;
            const c = accentMap[m.accent];
            return (
              <div
                key={m.label}
                className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${c.iconBg}`}>
                    <Icon size={16} className={c.iconText} strokeWidth={2} />
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${c.badgeBg} ${c.badgeText}`}>
                    {m.trend}
                  </span>
                </div>
                <p className="mt-4 text-2xl font-black tabular-nums text-gray-900">{m.value}</p>
                <p className="mt-0.5 text-[12px] font-semibold text-gray-700">{m.label}</p>
                <p className="mt-0.5 text-[10px] text-gray-400">{m.sub}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
