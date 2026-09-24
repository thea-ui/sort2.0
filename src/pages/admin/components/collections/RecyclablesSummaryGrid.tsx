import React from 'react';
import { AlertTriangle, CheckCircle2, Coins, Package, Trash2 } from 'lucide-react';
import type { ItemizedRecyclable, ResidualWasteSummary } from './useCollectionsMetrics';

interface RecyclablesSummaryGridProps {
  items: ItemizedRecyclable[];
  residual: ResidualWasteSummary;
  totalRevenuePhp: number;
  onApproveSale: (item: ItemizedRecyclable) => void;
}

export const RecyclablesSummaryGrid: React.FC<RecyclablesSummaryGridProps> = ({
  items,
  residual,
  totalRevenuePhp,
  onApproveSale,
}) => (
  <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-5">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h3 className="text-base font-bold text-[var(--text-strong)] flex items-center gap-2">
          <Package size={18} className="text-[var(--accent)]" />
          Itemized MRF Recyclables Collection Summary
        </h3>
        <p className="text-xs text-[var(--text-strong)]/50 mt-0.5">
          Verified inventory log recorded by MRF staff with unit counts, weights, and market values
        </p>
      </div>
      <span className="text-xs font-extrabold text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-3 py-1.5 rounded-full whitespace-nowrap">
        Total Revenue Generated: ₱{totalRevenuePhp.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </span>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
      {items.map((item) => {
        const ItemIcon = item.icon;
        const stock = item.stock;
        const accumulatedKg = stock ? stock.accumulatedKg : 0;
        const thresholdKg = stock ? stock.thresholdLimitKg : 50;
        const pricePerKg = stock ? stock.marketPricePerKg : 15;
        const isApproved = stock ? stock.isApprovedForSale === true : false;
        const pct = Math.min(100, Math.round((accumulatedKg / thresholdKg) * 100));
        const isThresholdReached = accumulatedKg >= thresholdKg;

        return (
          <div
            key={item.category}
            className={`flex flex-col rounded-2xl border bg-white/90 p-4 transition-all hover:shadow-sm ${
              isApproved
                ? 'border-emerald-300 ring-1 ring-emerald-200'
                : isThresholdReached
                  ? 'border-amber-300 ring-1 ring-amber-200'
                  : 'border-[var(--primary)]/10 hover:border-[var(--primary)]/20'
            }`}
          >
            {(isApproved || isThresholdReached) && (
              <div
                className={`-mx-4 -mt-4 mb-3 py-1 px-2 text-center text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 ${
                  isApproved ? 'bg-[var(--accent)] text-white' : 'bg-amber-400 text-amber-950'
                }`}
              >
                {isApproved ? (
                  <>
                    <CheckCircle2 size={10} /> Authorized for Sale
                  </>
                ) : (
                  <>
                    <AlertTriangle size={10} /> Ready to Sell
                  </>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-xl ${item.bgColor} ${item.color}`}>
                <ItemIcon size={18} />
              </div>
              <span className="text-[10px] font-bold text-[var(--text-strong)]/40 uppercase tracking-wider">
                {accumulatedKg.toFixed(1)} / {thresholdKg} kg
              </span>
            </div>

            <div className="mt-3">
              <h4 className="text-xs font-bold text-[var(--text-strong)] leading-tight">
                {item.category}
              </h4>
              <p className="text-[10px] font-medium text-[var(--text-strong)]/40 mt-0.5">
                Rate ₱{pricePerKg}/kg
              </p>
            </div>

            <div className="mt-3 space-y-1.5">
              <div className="h-1.5 w-full bg-[var(--primary)]/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isApproved
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

            <div className="mt-auto pt-3 border-t border-[var(--primary)]/5 flex items-end justify-between gap-2">
              <div>
                <span className="text-[9px] font-bold text-[var(--text-strong)]/40 uppercase tracking-wider block">
                  Sold Revenue
                </span>
                <span className={`text-sm font-black ${item.color}`}>
                  ₱{(item.soldRevenuePhp ?? 0).toLocaleString()}
                </span>
              </div>

              {isApproved ? (
                <span className="px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-[9px] font-black uppercase flex items-center gap-1">
                  <CheckCircle2 size={10} /> Authorized
                </span>
              ) : isThresholdReached ? (
                <button
                  type="button"
                  onClick={() => onApproveSale(item)}
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
        );
      })}

      <div className="flex flex-col rounded-2xl border border-[var(--primary)]/10 bg-white/90 p-4 transition-all hover:shadow-sm hover:border-[var(--primary)]/20">
        <div className="flex items-center justify-between">
          <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
            <Trash2 size={18} />
          </div>
          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
            Non-Recyclable
          </span>
        </div>
        <div className="mt-3">
          <h4 className="text-xs font-bold text-[var(--text-strong)] leading-tight">
            {residual.category}
          </h4>
          <p className="text-[10px] font-semibold text-rose-700 mt-0.5">{residual.countLabel}</p>
        </div>
        <div className="mt-auto pt-3 border-t border-[var(--primary)]/5 space-y-1.5">
          <span className="text-lg font-black text-[var(--text-strong)] block">
            {residual.weightKg.toFixed(1)} kg
          </span>
          <div className="flex items-center justify-between text-[10px] font-semibold">
            <span className="text-[var(--text-strong)]/50">
              Avg {residual.avgKg.toFixed(1)} kg / weighed batch
            </span>
            {residual.unweighed > 0 && (
              <span className="text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                {residual.unweighed} unweighed
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);
