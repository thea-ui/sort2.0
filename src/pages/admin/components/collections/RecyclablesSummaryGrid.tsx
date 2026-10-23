import React, { useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Coins,
  Package,
  Trash2,
} from 'lucide-react';
import type { ItemizedRecyclable, ResidualWasteSummary } from './useCollectionsMetrics';
import type { MaterialLedgerTarget } from './MaterialLedgerDrawer';

interface RecyclablesSummaryGridProps {
  items: ItemizedRecyclable[];
  residual: ResidualWasteSummary;
  totalRevenuePhp: number;
  onApproveSale: (item: ItemizedRecyclable) => void;
  /** Opens the per-material sales ledger drawer. */
  onOpenLedger?: (target: MaterialLedgerTarget) => void;
}

/* Folder rows: collapsed shows the material name plus a state hint; rows that
   need authorization (threshold reached, not yet approved) carry an amber
   highlight. Clicking opens the folder — details and the action buttons
   (Approve Sale / View Sales Ledger) live inside the expanded panel. */
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
const GHOST_BUTTON =
  'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--primary)]/15 bg-white px-3.5 py-2 text-[11px] font-bold text-[var(--text-strong)]/70 transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--accent)]';

export const RecyclablesSummaryGrid: React.FC<RecyclablesSummaryGridProps> = ({
  items,
  residual,
  totalRevenuePhp,
  onApproveSale,
  onOpenLedger,
}) => {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const weighedBatches = Math.max(0, residual.count - residual.unweighed);
  const weighedPct =
    residual.count > 0 ? Math.round((weighedBatches / residual.count) * 100) : 0;
  const residualOpen = openKey === 'residual';

  return (
    <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-[var(--text-strong)] flex items-center gap-2">
            <Package size={18} className="text-[var(--accent)]" />
            Itemized MRF Recyclables Collection Summary
          </h3>
          <p className="text-xs text-[var(--text-strong)]/50 mt-0.5">
            Verified inventory log recorded by MRF staff with unit counts, weights, and market values
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-[var(--accent)]/15 bg-[var(--accent)]/5 px-4 py-2.5">
          <Coins size={16} className="text-[var(--accent)]" aria-hidden />
          <div className="leading-tight">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-strong)]/50">
              Total Revenue Generated
            </span>
            <span className="block font-mono text-sm font-bold tabular-nums text-[var(--text-strong)]">
              ₱{totalRevenuePhp.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const ItemIcon = item.icon;
          const stock = item.stock;
          const accumulatedKg = stock ? stock.accumulatedKg : 0;
          const thresholdKg = stock ? stock.thresholdLimitKg : 50;
          const pricePerKg = stock ? stock.marketPricePerKg : 15;
          const isApproved = stock ? stock.isApprovedForSale === true : false;
          const pct = Math.min(100, Math.round((accumulatedKg / thresholdKg) * 100));
          const isThresholdReached = accumulatedKg >= thresholdKg;
          const needsAuthorization = isThresholdReached && !isApproved;
          const remainingKg = Math.max(0, thresholdKg - accumulatedKg);
          const isOpen = openKey === item.code;
          const panelId = `mrf-folder-${item.code}`;
          const ledgerTarget: MaterialLedgerTarget = {
            kind: 'MARKET',
            code: item.code,
            name: item.category,
            icon: item.icon,
            bgColor: item.bgColor,
            color: item.color,
            strongColor: item.strongColor,
            currentKg: accumulatedKg,
            pricePerKg,
            status: isApproved
              ? 'Authorized for sale'
              : needsAuthorization
                ? 'Ready to sell'
                : 'Awaiting threshold',
            statusTone: isApproved ? 'success' : needsAuthorization ? 'warning' : 'neutral',
          };

          return (
            <div
              key={item.category}
              className={`${ROW_SHELL} ${
                needsAuthorization
                  ? 'border-[var(--warning)]/40'
                  : 'border-[var(--primary)]/10 hover:border-[var(--primary)]/20'
              }`}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenKey(isOpen ? null : item.code)}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.bgColor} ${item.color}`}
                >
                  <ItemIcon size={17} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text-strong)]">
                  {item.category}
                </span>
                <span className="flex shrink-0 items-center gap-2.5">
                  {isApproved ? (
                    <span className={SUCCESS_CHIP}>
                      <CheckCircle2 size={11} /> Authorized
                    </span>
                  ) : needsAuthorization ? (
                    <span className={WARNING_CHIP}>
                      <AlertTriangle size={11} /> Ready to sell
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
                          {accumulatedKg.toFixed(1)}
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
                              needsAuthorization ? 'bg-[var(--warning)]' : item.barColor
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
                      <span className={MICRO_LABEL}>Sold revenue</span>
                      <p className={`mt-1 text-sm ${NUMBER} ${item.strongColor}`}>
                        ₱{(item.soldRevenuePhp ?? 0).toLocaleString()}
                      </p>
                      {isApproved && item.stock?.approvalReference && (
                        <span className="mt-1 block truncate font-mono text-[10px] font-medium text-[var(--text-strong)]/40">
                          Ref {item.stock.approvalReference}
                        </span>
                      )}
                    </div>
                  </div>

                  {(needsAuthorization || onOpenLedger) && (
                    <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--primary)]/5 pt-3">
                      {needsAuthorization && (
                        <button
                          type="button"
                          onClick={() => onApproveSale(item)}
                          className={PRIMARY_BUTTON}
                        >
                          <Coins size={13} /> Approve Sale
                        </button>
                      )}
                      {onOpenLedger && (
                        <button
                          type="button"
                          onClick={() => onOpenLedger(ledgerTarget)}
                          className={GHOST_BUTTON}
                        >
                          <BookOpen size={13} /> View Sales Ledger
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <div className={`${ROW_SHELL} border-[var(--primary)]/10 hover:border-[var(--primary)]/20`}>
          <button
            type="button"
            aria-expanded={residualOpen}
            aria-controls="mrf-folder-residual"
            onClick={() => setOpenKey(residualOpen ? null : 'residual')}
            className="flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
              <Trash2 size={17} />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text-strong)]">
              {residual.category}
            </span>
            <span className="flex shrink-0 items-center gap-2.5">
              <span className="font-mono text-[11px] font-semibold tabular-nums text-[var(--text-strong)]/35">
                {residual.count} batches
              </span>
              <ChevronDown
                size={16}
                className={`text-[var(--text-strong)]/35 transition-transform duration-200 ${
                  residualOpen ? 'rotate-180' : ''
                }`}
              />
            </span>
          </button>

          {residualOpen && (
            <div id="mrf-folder-residual" className={PANEL}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <span className={MICRO_LABEL}>Weighed batches</span>
                  <p className="mt-1 text-sm">
                    <span className={`${NUMBER} text-[var(--text-strong)]`}>
                      {weighedBatches}
                    </span>
                    <span className="text-[var(--text-strong)]/35"> / {residual.count}</span>
                  </p>
                  <div className="mt-2 flex items-center gap-2.5">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,white)]">
                      <div
                        className="h-full rounded-full bg-rose-400 transition-all duration-500"
                        style={{ width: `${weighedPct}%` }}
                      />
                    </div>
                    <span className={`${NUMBER} text-[11px] text-[var(--text-strong)]/70`}>
                      {weighedPct}%
                    </span>
                  </div>
                </div>
                <div>
                  <span className={MICRO_LABEL}>Total volume</span>
                  <p className={`mt-1 text-sm ${NUMBER} text-[var(--text-strong)]`}>
                    {residual.weightKg.toFixed(1)} kg
                  </p>
                </div>
                <div>
                  <span className={MICRO_LABEL}>Avg per weighed batch</span>
                  <p className={`mt-1 text-sm ${NUMBER} text-[var(--text-strong)]`}>
                    {residual.avgKg.toFixed(1)} kg
                  </p>
                  {residual.unweighed > 0 && (
                    <span className={`${WARNING_CHIP} mt-1`}>
                      <AlertTriangle size={11} /> {residual.unweighed} unweighed
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
