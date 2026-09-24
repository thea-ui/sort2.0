import React from 'react';
import { Layers } from 'lucide-react';

export interface WasteCompositionItem {
  id: string;
  name: string;
  pct: number;
  weightKg: number;
  estValuePhp: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  bgColor: string;
  textColor: string;
  barColor: string;
}

interface WasteCompositionCardProps {
  wasteComposition: WasteCompositionItem[];
  totalCollectedKg: number;
  totalValuePhp: number;
}

export const WasteCompositionCard: React.FC<WasteCompositionCardProps> = ({
  wasteComposition,
  totalCollectedKg,
  totalValuePhp,
}) => (
  <div className="lg:col-span-5 bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-5 flex flex-col justify-between">
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[var(--primary)]/10 rounded-xl text-[var(--text-strong)]">
            <Layers size={18} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[var(--text-strong)]">
              Recyclable Waste Composition
            </h3>
            <p className="text-xs text-[var(--text-strong)]/50">
              Itemized breakdown by material volume &amp; value
            </p>
          </div>
        </div>
      </div>

      {/* Visual Segmented Distribution Bar */}
      <div className="mt-5 space-y-2">
        <div className="flex justify-between text-xs font-bold">
          <span>Material Distribution</span>
          <span className="text-[var(--accent)]">{totalCollectedKg.toFixed(1)} kg Total</span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex gap-0.5 p-0.5">
          {wasteComposition.map((item) => (
            <div
              key={item.id}
              className={`h-full ${item.barColor} rounded-sm transition-all`}
              style={{ width: `${item.pct}%` }}
              title={`${item.name}: ${item.pct}%`}
            />
          ))}
        </div>
      </div>

      {/* Itemized Material List */}
      <div className="space-y-3 mt-4">
        {wasteComposition.map((item) => {
          const ItemIcon = item.icon;
          return (
            <div
              key={item.id}
              className="p-3 bg-gray-50/80 hover:bg-white rounded-2xl border border-gray-100 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${item.bgColor} ${item.textColor}`}>
                  <ItemIcon size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--text-strong)]">{item.name}</p>
                  <p className="text-[11px] text-[var(--text-strong)]/50 font-medium">
                    {item.weightKg.toFixed(1)} kg collected
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs font-black text-[var(--text-strong)]">{item.pct}%</p>
                <p className="text-[11px] font-bold text-[var(--accent)]">
                  ₱{item.estValuePhp.toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>

    <div className="pt-3 border-t border-[var(--primary)]/10 flex items-center justify-between text-xs">
      <span className="text-[var(--text-strong)]/60 font-semibold">Total Estimated Value</span>
      <span className="font-extrabold text-[var(--text-strong)] text-sm">
        ₱{totalValuePhp.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </span>
    </div>
  </div>
);
