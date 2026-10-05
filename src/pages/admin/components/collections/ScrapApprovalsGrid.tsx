import React from 'react';
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Coins,
  Cpu,
  Package,
  Scale,
  ShieldAlert,
  Sparkles,
  TreePine,
  Wine,
  Wrench,
} from 'lucide-react';
import type { ScrapStockItem } from '../../../../hooks/useAssetScrap';

interface ScrapApprovalsGridProps {
  materials: ScrapStockItem[];
  totalScrapSales: number;
  onApproveSale: (material: ScrapStockItem) => void;
}

const SCRAP_META: Record<string, { icon: React.ElementType; bgColor: string; color: string }> = {
  ferrous_metal: { icon: Wrench, bgColor: 'bg-[var(--primary)]/10', color: 'text-[var(--text-strong)]' },
  non_ferrous_metal: { icon: Sparkles, bgColor: 'bg-amber-50', color: 'text-amber-600' },
  e_waste: { icon: Cpu, bgColor: 'bg-rose-50', color: 'text-rose-600' },
  plastic: { icon: Package, bgColor: 'bg-[var(--primary)]/10', color: 'text-[var(--accent)]' },
  wood: { icon: TreePine, bgColor: 'bg-[color-mix(in_srgb,var(--gold)_10%,white)]', color: 'text-[var(--gold)]' },
  glass: { icon: Wine, bgColor: 'bg-[var(--primary)]/10', color: 'text-[var(--accent)]' },
  mixed: { icon: Boxes, bgColor: 'bg-gray-100', color: 'text-gray-600' },
};

const FALLBACK_META = SCRAP_META.mixed;

export const ScrapApprovalsGrid: React.FC<ScrapApprovalsGridProps> = ({
  materials,
  totalScrapSales,
  onApproveSale,
}) => (
  <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-5">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h3 className="text-base font-bold text-[var(--text-strong)] flex items-center gap-2">
          <Scale size={18} className="text-[var(--accent)]" />
          Asset Scrap Disposal Approvals
        </h3>
        <p className="text-xs text-[var(--text-strong)]/50 mt-0.5">
          Disposal Committee authorization required before MRF can sell each unserviceable asset scrap batch
        </p>
      </div>
      <span className="text-xs font-extrabold text-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_10%,white)] border border-[var(--gold)]/20 px-3 py-1.5 rounded-full whitespace-nowrap">
        Total Scrap Revenue: ₱{totalScrapSales.toLocaleString()}
      </span>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {materials.map((material) => {
        const meta = SCRAP_META[material.materialCode] || FALLBACK_META;
        const MaterialIcon = meta.icon;
        const currentKg = material.accumulatedKg || 0;
        const thresholdKg = material.thresholdLimitKg || 1;
        const pricePerKg = material.marketPricePerKg || 0;
        const isApproved = material.isApprovedForSale === true;
        const isThresholdReached = currentKg >= thresholdKg;
        const isHazmat = material.hazmat === true;
        const pct = Math.min(100, Math.round((currentKg / thresholdKg) * 100));

        return (
          <div
            key={material.materialCode}
            className={`flex flex-col rounded-2xl border bg-white/90 p-4 transition-all hover:shadow-sm ${
              isHazmat
                ? 'border-rose-200 ring-1 ring-rose-100'
                : isApproved
                  ? 'border-emerald-300 ring-1 ring-emerald-200'
                  : isThresholdReached
                    ? 'border-amber-300 ring-1 ring-amber-200'
                    : 'border-[var(--primary)]/10 hover:border-[var(--primary)]/20'
            }`}
          >
            {(isHazmat || isApproved || isThresholdReached) && (
              <div
                className={`-mx-4 -mt-4 mb-3 py-1 px-2 text-center text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 ${
                  isHazmat
                    ? 'bg-rose-500 text-white'
                    : isApproved
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-amber-400 text-amber-950'
                }`}
              >
                {isHazmat ? (
                  <>
                    <ShieldAlert size={10} /> Handler Disposal Only
                  </>
                ) : isApproved ? (
                  <>
                    <CheckCircle2 size={10} /> Authorized for Sale
                  </>
                ) : (
                  <>
                    <AlertTriangle size={10} /> Ready to Sell — Awaiting Approval
                  </>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-xl ${meta.bgColor} ${meta.color}`}>
                <MaterialIcon size={18} />
              </div>
              <span className="text-[10px] font-bold text-[var(--text-strong)]/40 uppercase tracking-wider">
                {currentKg.toFixed(1)} / {thresholdKg} kg
              </span>
            </div>

            <div className="mt-3">
              <h4 className="text-xs font-bold text-[var(--text-strong)] leading-tight">
                {material.materialName}
              </h4>
              <p className="text-[10px] font-medium text-[var(--text-strong)]/40 mt-0.5">
                Rate ₱{pricePerKg}/kg
              </p>
            </div>

            <div className="mt-3 space-y-1.5">
              <div className="h-1.5 w-full bg-[color-mix(in_srgb,var(--primary)_10%,white)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isHazmat
                      ? 'bg-rose-400'
                      : isApproved
                        ? 'bg-[var(--accent)]'
                        : isThresholdReached
                          ? 'bg-amber-500'
                          : 'bg-[var(--accent)]'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-[var(--text-strong)]/40">
                {pct}% of batch
              </span>
            </div>

            <div className="mt-auto pt-3 border-t border-[var(--primary)]/5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-bold text-[var(--text-strong)]/40 uppercase tracking-wider whitespace-nowrap">
                  Est. Value
                </span>
                <span className="text-sm font-black text-[var(--text-strong)] whitespace-nowrap">
                  ₱{Math.round(currentKg * pricePerKg).toLocaleString()}
                </span>
              </div>
              {isApproved && material.approvalReference && (
                <span className="block text-[9px] font-semibold text-[var(--text-strong)]/40 truncate">
                  Ref: {material.approvalReference}
                </span>
              )}

              <div className="flex justify-end">
                {isHazmat ? (
                  <span className="px-2 py-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-[9px] font-black uppercase flex items-center gap-1">
                    <ShieldAlert size={10} /> Handler disposal
                  </span>
                ) : isApproved ? (
                  <span className="px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-[9px] font-black uppercase flex items-center gap-1">
                    <CheckCircle2 size={10} /> Authorized
                  </span>
                ) : isThresholdReached ? (
                  <button
                    type="button"
                    onClick={() => onApproveSale(material)}
                    className="px-2.5 py-1.5 rounded-xl text-[10px] font-black bg-amber-500 hover:bg-amber-600 text-white cursor-pointer transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <Coins size={12} /> Approve Sale
                  </button>
                ) : (
                  <span className="text-[10px] font-semibold text-[var(--text-strong)]/35">
                    Awaiting threshold
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
