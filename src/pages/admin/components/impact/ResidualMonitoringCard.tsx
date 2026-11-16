import React from 'react';
import { ArrowRight, MapPin, Trash2 } from 'lucide-react';
import type { Report } from '../../../../types';
import { useResidualMetrics } from '../../../../hooks/useResidualMetrics';

interface ResidualMonitoringCardProps {
  reports: Report[];
  onNavigate?: (tab: string) => void;
}

/**
 * Residual waste is not weighed in SORT, so this card monitors it by volume and
 * pickup activity: report counts, completed pickups, backlog age, a weekly
 * trend and the busiest stations. Kilos are intentionally absent.
 */
export const ResidualMonitoringCard: React.FC<ResidualMonitoringCardProps> = ({
  reports,
  onNavigate,
}) => {
  const metrics = useResidualMetrics(reports);
  const maxReports = Math.max(...metrics.weekly.map((week) => week.reports), 1);

  const stats = [
    { label: 'Residual reports', value: String(metrics.totalReports) },
    { label: 'Pickups completed', value: String(metrics.completedPickups) },
    {
      label: 'Awaiting pickup',
      value: String(metrics.awaitingPickup),
      hint:
        metrics.awaitingPickup > 0 && metrics.oldestAwaitingDays !== null
          ? `oldest ${Math.floor(metrics.oldestAwaitingDays)}d`
          : undefined,
    },
    {
      label: 'Share of reports',
      value: `${Math.round(metrics.shareOfAllReports * 100)}%`,
      hint:
        metrics.avgDaysToCollect !== null
          ? `~${metrics.avgDaysToCollect.toFixed(1)}d to collect`
          : undefined,
    },
  ];

  return (
    <div className="lg:col-span-12 space-y-5 rounded-3xl border border-white/80 bg-white/90 p-6 shadow-sm backdrop-blur-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-[var(--text-strong)]/10 p-2 text-[var(--text-strong)]/60">
            <Trash2 size={18} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[var(--text-strong)]">
              Residual Waste Monitoring
            </h3>
            <p className="text-xs text-[var(--text-strong)]/50">
              Non-biodegradable activity — tracked by volume &amp; pickups, not kilos
            </p>
          </div>
        </div>
        <span className="hidden shrink-0 rounded-full border border-[var(--primary)]/15 bg-[var(--background)] px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-strong)]/50 sm:inline-flex">
          Not weighed
        </span>
      </div>

      {metrics.totalReports === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--primary)]/15 bg-[var(--background)]/40 px-6 py-10 text-center">
          <p className="text-xs font-semibold text-[var(--text-strong)]/55">
            No residual reports yet — full non-biodegradable bins will show up here.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-[var(--primary)]/10 bg-[var(--background)]/50 px-3.5 py-3"
              >
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-strong)]/45">
                  {stat.label}
                </p>
                <p className="mt-1 text-xl font-heading font-black text-[var(--text-strong)]">
                  {stat.value}
                </p>
                {stat.hint && (
                  <p className="mt-0.5 text-[10px] font-semibold text-[var(--text-strong)]/45">
                    {stat.hint}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>Residual reports per week</span>
                <span className="text-[10px] font-semibold text-[var(--text-strong)]/45">
                  Last {metrics.weekly.length} weeks
                </span>
              </div>
              <div className="mt-3 flex items-end gap-2">
                {metrics.weekly.map((week, index) => {
                  const isLatest = index === metrics.weekly.length - 1;
                  const height = Math.max(6, Math.round((week.reports / maxReports) * 72));
                  return (
                    <div key={week.label} className="flex flex-1 flex-col items-center gap-1.5">
                      <span className="text-[10px] font-black text-[var(--text-strong)]/60">
                        {week.reports}
                      </span>
                      <div
                        className={`w-full rounded-t-md transition-all ${
                          isLatest ? 'bg-[var(--primary)]' : 'bg-[var(--text-strong)]/20'
                        }`}
                        style={{ height: `${height}px` }}
                        title={`${week.reports} reports · ${week.pickups} pickups`}
                      />
                      <span className="text-[9px] font-semibold text-[var(--text-strong)]/40">
                        {week.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-5">
              <p className="text-xs font-bold">Busiest stations</p>
              <div className="mt-3 space-y-2">
                {metrics.topStations.map((station) => (
                  <div
                    key={station.locationName}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--primary)]/10 bg-[var(--background)]/50 px-3 py-2"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-[11px] font-semibold text-[var(--text-strong)]">
                      <MapPin size={12} className="shrink-0 text-[var(--text-strong)]/40" />
                      <span className="truncate">{station.locationName}</span>
                    </span>
                    <span className="shrink-0 text-[11px] font-black text-[var(--text-strong)]/70">
                      {station.reports}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {onNavigate && (
        <div className="flex justify-end border-t border-[var(--primary)]/10 pt-3">
          <button
            type="button"
            onClick={() => onNavigate('admin-reports')}
            className="inline-flex cursor-pointer items-center gap-1 text-xs font-extrabold text-[var(--accent)] hover:underline"
          >
            View reports <ArrowRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
};
