import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  Coins,
  Package,
  Scale,
} from 'lucide-react';
import { RECYCLABLE_CATEGORIES, ItemizedRecyclableCategory } from '../MRFDashboard';
import { MarketStockItem, SaleTransaction } from '../../../hooks/useRecycleMarket';
import { RECYCLABLE_CATEGORY_ICONS } from '../../../utils/materialMeta';

interface MRFMarketTabProps {
  stocksRecord: Record<string, MarketStockItem>;
  salesHistory: SaleTransaction[];
  totalVendorSales: number;
  handleSellBatch: (cat: ItemizedRecyclableCategory) => void;
}

/* Folder rows: collapsed shows the material name plus a state hint; an
   admin-approved batch (this terminal's action) carries a success highlight.
   Clicking opens the folder — details and "Complete Vendor Sale" live inside. */
const ROW_SHELL = 'overflow-hidden rounded-2xl border bg-white transition-colors';
const PANEL = 'border-t border-[var(--primary)]/5 px-4 pb-4 pt-4';
const MICRO_LABEL =
  'block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-strong)]/40';
const NUMBER = 'font-mono font-bold tabular-nums';
const SUCCESS_CHIP =
  'inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--success)]/25 bg-[var(--success)]/10 px-2.5 py-1 text-[10px] font-bold text-[var(--success-strong)]';
const WARNING_CHIP =
  'inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--warning)]/25 bg-[var(--warning)]/10 px-2.5 py-1 text-[10px] font-bold text-[var(--warning-strong)]';
const PRIMARY_BUTTON =
  'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-[11px] font-bold text-white shadow-sm shadow-[var(--accent)]/25 transition-colors hover:bg-[var(--accent-dark)]';

export const MRFMarketTab: React.FC<MRFMarketTabProps> = ({
  stocksRecord,
  salesHistory,
  totalVendorSales,
  handleSellBatch,
}) => {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Market Overview Header */}
      <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-[color-mix(in_srgb,var(--gold)_15%,white)] text-[var(--gold)] flex items-center justify-center shrink-0">
            <Scale size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black text-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_15%,white)] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Market Inventory Ledger
            </span>
            <p className="text-xs text-[var(--text-strong)]/60 mt-1">Track accumulated recyclable weights toward market selling limit thresholds.</p>
          </div>
        </div>
        <div className="bg-[var(--background)] p-3 rounded-2xl border border-[var(--primary)]/10 text-right shrink-0">
          <span className="text-[10px] font-bold text-gray-400 uppercase block">Total Vendor Revenue</span>
          <span className="text-xl font-heading font-black text-[var(--accent)]">
            ₱{totalVendorSales.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Itemized recyclable folders */}
      <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-4">
        <h4 className="text-sm font-heading font-bold text-[var(--text-strong)] flex items-center gap-2">
          <Package size={16} className="text-[var(--accent)]" />
          <span>Recyclable Market Batches</span>
        </h4>

        <div className="space-y-3">
          {RECYCLABLE_CATEGORIES.map((cat) => {
            const CategoryIcon = RECYCLABLE_CATEGORY_ICONS[cat.id] ?? Package;
            const stock = stocksRecord[cat.id];
            const currentKg = stock ? stock.accumulatedKg : 0;
            const thresholdKg = stock ? stock.thresholdLimitKg : cat.thresholdLimitKg;
            const pricePerKg = stock ? stock.marketPricePerKg : cat.marketPricePerKg;
            const isApproved = stock ? stock.isApprovedForSale === true : false;
            const isThresholdReached = currentKg >= thresholdKg;
            const awaitingApproval = isThresholdReached && !isApproved;
            const pct = Math.min(100, Math.round((currentKg / thresholdKg) * 100));
            const remainingKg = Math.max(0, thresholdKg - currentKg);
            const isOpen = openKey === cat.id;
            const panelId = `market-folder-${cat.id}`;

            return (
              <div
                key={cat.id}
                className={`${ROW_SHELL} ${
                  isApproved
                    ? 'border-[var(--success)]/40'
                    : 'border-[var(--primary)]/10 hover:border-[var(--primary)]/20'
                }`}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenKey(isOpen ? null : cat.id)}
                  className="flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cat.bgLight} ${cat.color}`}
                  >
                    <CategoryIcon size={17} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text-strong)]">
                    {cat.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-2.5">
                    {isApproved ? (
                      <span className={SUCCESS_CHIP}>
                        <CheckCircle2 size={11} /> Ready to sell
                      </span>
                    ) : awaitingApproval ? (
                      <span className={WARNING_CHIP}>
                        <Clock size={11} /> Awaiting admin approval
                      </span>
                    ) : (
                      <span className="hidden sm:inline font-mono text-[11px] font-semibold tabular-nums text-[var(--text-strong)]/35">
                        {remainingKg.toFixed(1)} kg to go
                      </span>
                    )}
                    <ChevronDown
                      size={16}
                      className={`text-[var(--text-strong)]/35 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </span>
                </button>

                {isOpen && (
                  <div id={panelId} className={PANEL}>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <span className={MICRO_LABEL}>Batch stock</span>
                        <p className="mt-1 text-sm">
                          <span className={`${NUMBER} text-[var(--text-strong)]`}>
                            {currentKg.toFixed(1)}
                          </span>
                          <span className="text-[var(--text-strong)]/35">
                            {' '}
                            / {thresholdKg} kg threshold
                          </span>
                        </p>
                        <div className="mt-2 flex items-center gap-2.5">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,white)]">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                awaitingApproval ? 'bg-[var(--warning)]' : cat.barColor
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`${NUMBER} text-[11px] text-[var(--text-strong)]/70`}>
                            {pct}%
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className={MICRO_LABEL}>Market rate</span>
                        <p className="mt-1 text-sm font-semibold text-[var(--text-strong)]">
                          <span className={NUMBER}>₱{pricePerKg}</span>
                          <span className="font-medium text-[var(--text-strong)]/40"> / kg</span>
                        </p>
                      </div>
                      <div>
                        <span className={MICRO_LABEL}>Est. batch value</span>
                        <p className={`mt-1 text-sm ${NUMBER} text-[var(--text-strong)]`}>
                          ₱{Math.round(currentKg * pricePerKg).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--primary)]/5 pt-3">
                      {isApproved ? (
                        <button
                          type="button"
                          onClick={() => handleSellBatch(cat)}
                          className={PRIMARY_BUTTON}
                        >
                          <Coins size={13} /> Complete Vendor Sale
                        </button>
                      ) : awaitingApproval ? (
                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-strong)]/45">
                          <Clock size={12} /> Waiting for the admin&apos;s authorization reference —
                          this batch can be sold once approved.
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-strong)]/45">
                          <Clock size={12} /> {remainingKg.toFixed(1)} kg to go before this batch
                          reaches the selling threshold.
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sales Ledger History */}
      <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-4">
        <h4 className="text-sm font-heading font-bold text-[var(--text-strong)] flex items-center gap-2">
          <Coins size={16} className="text-[var(--gold)]" />
          <span>Recycling Market Vendor Sales Ledger</span>
        </h4>

        {salesHistory.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">No recycling sales recorded yet.</p>
        ) : (
          <div className="divide-y divide-gray-150 text-xs">
            {salesHistory.map(sale => (
              <div key={sale.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-[var(--text-strong)]">{sale.categoryName}</p>
                  <p className="text-[10px] text-gray-400">
                    {sale.buyerName} · {sale.soldAt}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-black text-[var(--accent)] block text-sm">₱{sale.totalRevenue.toLocaleString()}</span>
                  <span className="text-[10px] text-gray-400 font-semibold">{sale.weightKg} kg batch sold</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
