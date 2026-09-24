import React from 'react';
import { Calendar } from 'lucide-react';

export interface MonthlyVolumeItem {
  month: string;
  weight: number;
  items: number;
}

interface MonthlyVolumeChartProps {
  monthlyData: MonthlyVolumeItem[];
  totalCollectedKg: number;
  collectedCount: number;
}

export const MonthlyVolumeChart: React.FC<MonthlyVolumeChartProps> = ({
  monthlyData,
  totalCollectedKg,
  collectedCount,
}) => (
  <div className="lg:col-span-7 bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-4">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <div className="p-2 bg-[var(--primary)]/10 rounded-xl text-[var(--accent)]">
          <Calendar size={18} />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-[var(--text-strong)]">
            Monthly Collection Volume
          </h3>
          <p className="text-xs text-[var(--text-strong)]/50">
            Actual weight (kg) and item count per month
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs font-bold">
        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          {totalCollectedKg.toFixed(1)} kg Collected
        </span>
        <span className="px-2.5 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--text-strong)] border border-[var(--primary)]/25">
          {collectedCount} Verified Reports
        </span>
      </div>
    </div>

    {/* Bar Chart */}
    <div className="h-52 flex items-end justify-between gap-3 pt-8 pb-2 border-b border-[var(--primary)]/10">
      {monthlyData.map((m) => {
        const heightPct = Math.min(100, Math.round((m.weight / 250) * 100));
        const hasData = m.weight > 0;
        return (
          <div key={m.month} className="flex-1 flex flex-col items-center gap-2 group relative">
            {/* Tooltip on hover */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-[var(--primary)] text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-md pointer-events-none whitespace-nowrap z-10">
              {m.weight} kg • {m.items} items
            </div>

            {hasData ? (
              <div className="w-full h-36 flex items-end justify-center">
                <div
                  className="w-7 bg-[var(--accent)] group-hover:bg-[var(--accent-dark)] rounded-t-md transition-all duration-500 shadow-sm"
                  style={{ height: `${Math.max(heightPct, 8)}%` }}
                />
              </div>
            ) : (
              <div className="w-full h-36 flex items-end justify-center">
                <div className="h-1 w-7 bg-gray-200 rounded-full" />
              </div>
            )}
            <span className="text-xs font-bold text-[var(--text-strong)]/70">{m.month}</span>
          </div>
        );
      })}
    </div>

    <div className="flex items-center justify-between text-xs text-[var(--text-strong)]/60 pt-1 font-medium">
      <span>
        Current Collection: <strong>{totalCollectedKg.toFixed(1)} kg</strong>
      </span>
      <span className="text-[var(--accent)] font-bold">
        Total Processed: {totalCollectedKg.toFixed(1)} kg
      </span>
    </div>
  </div>
);
