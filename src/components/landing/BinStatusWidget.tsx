import React from 'react';
import { useMockData } from '../../hooks/useMockData';
import { Trash2 } from 'lucide-react';

const FILL_CONFIG = (level: number) => {
  if (level >= 85) return { bar: 'bg-red-500',   text: 'text-red-600',   label: 'Critical', badge: 'bg-red-50 text-red-600 border-red-100' };
  if (level >= 60) return { bar: 'bg-amber-400', text: 'text-amber-600', label: 'High',     badge: 'bg-amber-50 text-amber-700 border-amber-100' };
  return             { bar: 'bg-emerald-500', text: 'text-emerald-600', label: 'Normal',   badge: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
};

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  RECYCLABLE: { label: 'Recyclable', color: 'text-[var(--text-strong)]' },
  ORGANIC:    { label: 'Organic',    color: 'text-green-600' },
  HAZARDOUS:  { label: 'Hazardous',  color: 'text-red-600' },
  GENERAL:    { label: 'General',    color: 'text-gray-500' },
};

export const BinStatusWidget: React.FC = () => {
  const { bins } = useMockData();
  const sorted = [...bins].sort((a, b) => b.fillLevel - a.fillLevel).slice(0, 4);
  const criticalCount = bins.filter((b) => b.fillLevel >= 85).length;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-gray-100 bg-gray-50 px-5 py-4">
        <Trash2 size={14} className="text-gray-500" strokeWidth={2} />
        <h3 className="text-xs font-bold text-gray-800">Bin Fill Levels</h3>
        {criticalCount > 0 && (
          <span className="ml-auto rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-bold text-red-600 border border-red-100">
            {criticalCount} Critical
          </span>
        )}
      </div>
      <div className="space-y-4 p-5">
        {sorted.map((bin) => {
          const cfg = FILL_CONFIG(bin.fillLevel);
          const type = TYPE_LABELS[bin.type] || { label: bin.type, color: 'text-gray-400' };
          return (
            <div key={bin.id}>
              <div className="mb-2 flex items-center justify-between">
                <div className="min-w-0 flex-1 pr-4">
                  <p className="truncate text-[11px] font-semibold text-gray-700">{bin.locationName}</p>
                  <p className={`text-[9px] font-semibold uppercase tracking-wider ${type.color}`}>{type.label}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {bin.activeDispatch && (
                    <span className="rounded-full border border-[var(--gold)]/25 bg-[var(--gold)]/10 px-1.5 py-0.5 text-[8px] font-bold text-[var(--gold)]">
                      Dispatched
                    </span>
                  )}
                  <span className={`text-xs font-black tabular-nums ${cfg.text}`}>
                    {bin.fillLevel}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all ${cfg.bar}`}
                  style={{ width: `${bin.fillLevel}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
