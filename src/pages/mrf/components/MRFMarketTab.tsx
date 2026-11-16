import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  FolderTree,
  Package,
  Scale,
} from 'lucide-react';
import { RECYCLABLE_CATEGORIES, ItemizedRecyclableCategory } from '../MRFDashboard';
import { MarketStockItem, SaleTransaction } from '../../../hooks/useRecycleMarket';
import { RECYCLABLE_CATEGORY_ICONS } from '../../../utils/materialMeta';
import { formatLongDate } from '../../../utils/dateFormat';
import { LedgerSheetTable, SheetColumn } from '../../admin/components/LedgerSheetTable';
import { AppModal } from '../../../components/common/AppModal';

interface MRFMarketTabProps {
  stocksRecord: Record<string, MarketStockItem>;
  salesHistory: SaleTransaction[];
  handleSellBatch: (
    cat: ItemizedRecyclableCategory,
    buyerName?: string,
    pricePerKg?: number,
  ) => Promise<boolean>;
}

const MICRO_LABEL =
  'block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-strong)]/40';
const NUMBER = 'font-mono font-bold tabular-nums';
const SUCCESS_CHIP =
  'inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--success)]/25 bg-[var(--success)]/10 px-2.5 py-1 text-[10px] font-bold text-[var(--success-strong)]';
const WARNING_CHIP =
  'inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--warning)]/25 bg-[var(--warning)]/10 px-2.5 py-1 text-[10px] font-bold text-[var(--warning-strong)]';
const PRIMARY_BUTTON =
  'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-[11px] font-bold text-white shadow-sm shadow-[var(--accent)]/25 transition-colors hover:bg-[var(--accent-dark)]';

function formatKg(kg: number): string {
  return Number(kg.toFixed(1)).toLocaleString();
}

function formatPeso(amount: number): string {
  return `₱${Math.round(amount).toLocaleString()}`;
}

export const MRFMarketTab: React.FC<MRFMarketTabProps> = ({
  stocksRecord,
  salesHistory,
  handleSellBatch,
}) => {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [buyerDraft, setBuyerDraft] = useState('');
  const [priceDraft, setPriceDraft] = useState('');
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [selling, setSelling] = useState(false);

  const selectedCategory = useMemo(
    () => RECYCLABLE_CATEGORIES.find((cat) => cat.id === activeCategoryId) ?? null,
    [activeCategoryId]
  );

  const categoryViews = useMemo(
    () =>
      RECYCLABLE_CATEGORIES.map((cat) => {
        const stock = stocksRecord[cat.id];
        const currentKg = stock ? stock.accumulatedKg : 0;
        const thresholdKg = stock ? stock.thresholdLimitKg : cat.thresholdLimitKg;
        const isApproved = stock ? stock.isApprovedForSale === true : false;
        const isThresholdReached = currentKg >= thresholdKg;
        const awaitingApproval = isThresholdReached && !isApproved;
        const pct =
          thresholdKg > 0 ? Math.min(100, Math.round((currentKg / thresholdKg) * 100)) : 0;
        const remainingKg = Math.max(0, thresholdKg - currentKg);
        return { cat, currentKg, thresholdKg, isApproved, awaitingApproval, pct, remainingKg };
      }),
    [stocksRecord]
  );

  const selectedView = useMemo(
    () => categoryViews.find((view) => view.cat.id === activeCategoryId) ?? null,
    [categoryViews, activeCategoryId]
  );

  const visibleSales = useMemo(
    () =>
      activeCategoryId
        ? salesHistory.filter((sale) => sale.categoryCode === activeCategoryId)
        : salesHistory,
    [salesHistory, activeCategoryId]
  );

  const totals = useMemo(() => {
    const collectedKg = activeCategoryId
      ? stocksRecord[activeCategoryId]?.accumulatedKg ?? 0
      : Object.values(stocksRecord).reduce((sum, stock) => sum + (stock.accumulatedKg || 0), 0);
    const soldKg = visibleSales.reduce((sum, sale) => sum + (sale.weightKg || 0), 0);
    const revenue = visibleSales.reduce((sum, sale) => sum + (sale.totalRevenue || 0), 0);
    return { collectedKg, soldKg, revenue };
  }, [activeCategoryId, stocksRecord, visibleSales]);

  const knownShops = useMemo(
    () => Array.from(new Set(salesHistory.map((sale) => sale.buyerName).filter(Boolean))),
    [salesHistory]
  );

  const latestSaleByCategory = useMemo(() => {
    const map: Record<string, string> = {};
    salesHistory.forEach((sale) => {
      if (!sale.soldAt) return;
      if (!map[sale.categoryCode] || sale.soldAt > map[sale.categoryCode]) {
        map[sale.categoryCode] = sale.soldAt;
      }
    });
    return map;
  }, [salesHistory]);

  const salesColumns = useMemo<SheetColumn<SaleTransaction>[]>(
    () => [
      {
        key: 'junkShop',
        label: 'Junk Shop',
        value: (sale) => sale.buyerName || '',
        render: (sale) => (
          <div className="min-w-0">
            <span className="block truncate font-bold text-[var(--text-strong)]">
              {sale.buyerName || 'Unrecorded shop'}
            </span>
            <span className="mt-0.5 block text-[10px] font-medium text-[var(--text-strong)]/45">
              {sale.soldAt}
            </span>
          </div>
        ),
      },
      {
        key: 'kilos',
        label: 'Total Kilos',
        align: 'right',
        value: (sale) => sale.weightKg,
        render: (sale) => (
          <span className={`${NUMBER} text-[var(--text-strong)]`}>{formatKg(sale.weightKg)} kg</span>
        ),
        total: (rows) => (
          <span className={NUMBER}>{formatKg(rows.reduce((sum, sale) => sum + sale.weightKg, 0))} kg</span>
        ),
      },
      {
        key: 'price',
        label: 'Price / kg',
        align: 'right',
        value: (sale) => sale.marketPriceKg,
        render: (sale) => (
          <span className={`${NUMBER} text-[var(--text-strong)]/70`}>₱{sale.marketPriceKg}</span>
        ),
      },
      {
        key: 'total',
        label: 'Total',
        align: 'right',
        value: (sale) => sale.totalRevenue,
        render: (sale) => (
          <span className={`${NUMBER} text-[var(--accent)]`}>₱{sale.totalRevenue.toLocaleString()}</span>
        ),
        total: (rows) => (
          <span className="text-[var(--accent)]">
            ₱{rows.reduce((sum, sale) => sum + sale.totalRevenue, 0).toLocaleString()}
          </span>
        ),
      },
    ],
    []
  );

  const collectedTone = selectedCategory ? selectedCategory.color : 'text-[var(--text-strong)]';
  const parsedPrice = Number(priceDraft);
  const priceValid = Number.isFinite(parsedPrice) && parsedPrice > 0 && priceDraft.trim() !== '';

  const sellableKg = selectedView
    ? selectedView.thresholdKg > 0 && selectedView.currentKg >= selectedView.thresholdKg
      ? selectedView.thresholdKg
      : selectedView.currentKg
    : 0;
  const saleTotal = Math.round(sellableKg * (priceValid ? parsedPrice : 0));

  const confirmSale = async () => {
    if (!selectedView || !buyerDraft.trim() || !priceValid) return;
    setSelling(true);
    try {
      const ok = await handleSellBatch(selectedView.cat, buyerDraft.trim(), parsedPrice);
      if (ok) {
        setSellModalOpen(false);
        setBuyerDraft('');
        setPriceDraft('');
      }
    } finally {
      setSelling(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <datalist id="mrf-junk-shops">
        {knownShops.map((shop) => (
          <option key={shop} value={shop} />
        ))}
      </datalist>

      {selectedCategory && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveCategoryId(null)}
            className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold text-[var(--text-strong)]/70 transition hover:bg-[color-mix(in_srgb,var(--primary)_6%,white)]"
          >
            <ArrowLeft size={13} /> Back
          </button>
          <span className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[var(--text-strong)]/60">
            <FolderTree size={14} className="text-[var(--accent)]" />
            <button
              type="button"
              onClick={() => setActiveCategoryId(null)}
              className="cursor-pointer transition hover:text-[var(--text-strong)]"
            >
              Recycle Market
            </button>
            <ChevronRight size={13} className="text-[var(--text-strong)]/30" />
            <span className="font-bold text-[var(--text-strong)]">{selectedCategory.name}</span>
          </span>
        </div>
      )}

      {/* Ledger banner — overall totals or the opened folder's totals + batch controls */}
      <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${
                selectedCategory
                  ? `${selectedCategory.bgLight} ${selectedCategory.color}`
                  : 'bg-[color-mix(in_srgb,var(--gold)_15%,white)] text-[var(--gold)]'
              }`}
            >
              {selectedCategory ? (
                (() => {
                  const CategoryIcon = RECYCLABLE_CATEGORY_ICONS[selectedCategory.id] ?? Package;
                  return <CategoryIcon size={24} />;
                })()
              ) : (
                <Scale size={24} />
              )}
            </div>
            <div>
              <span
                className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  selectedCategory
                    ? `${selectedCategory.bgLight} ${selectedCategory.color}`
                    : 'text-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_15%,white)]'
                }`}
              >
                {selectedCategory
                  ? `${selectedCategory.shortName} Ledger`
                  : 'Market Inventory Ledger'}
              </span>
              <p className="text-xs text-[var(--text-strong)]/60 mt-1">
                {selectedCategory
                  ? selectedCategory.name
                  : 'Track accumulated recyclable weights toward market selling limit thresholds.'}
              </p>
            </div>
          </div>

          <div className="grid w-full shrink-0 grid-cols-3 gap-2 sm:w-auto">
            <div className="rounded-2xl border border-[var(--primary)]/10 bg-[var(--background)] px-3 py-2.5 text-right">
              <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                Total collected
              </span>
              <span className={`block text-sm font-heading font-black ${collectedTone}`}>
                {formatKg(totals.collectedKg)} kg
              </span>
            </div>
            <div className="rounded-2xl border border-[var(--primary)]/10 bg-[var(--background)] px-3 py-2.5 text-right">
              <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                Total sold
              </span>
              <span className="block text-sm font-heading font-black text-[var(--text-strong)]">
                {formatKg(totals.soldKg)} kg
              </span>
            </div>
            <div className="rounded-2xl border border-[var(--primary)]/10 bg-[var(--background)] px-3 py-2.5 text-right">
              <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                Total revenue
              </span>
              <span className="block text-sm font-heading font-black text-[var(--accent)]">
                {formatPeso(totals.revenue)}
              </span>
            </div>
          </div>
        </div>

        {selectedView && (
          <div className="space-y-3 border-t border-[var(--primary)]/5 pt-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex min-w-40 flex-1 items-center gap-2.5">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,white)]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      selectedView.awaitingApproval
                        ? 'bg-[var(--warning)]'
                        : selectedView.cat.barColor
                    }`}
                    style={{ width: `${selectedView.pct}%` }}
                  />
                </div>
                <span className={`${NUMBER} shrink-0 text-[11px] text-[var(--text-strong)]/70`}>
                  {selectedView.pct}% of {selectedView.thresholdKg} kg threshold
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              {selectedView.isApproved ? (
                <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className={SUCCESS_CHIP}>
                    <CheckCircle2 size={11} /> Ready to sell — admin authorized
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setBuyerDraft('');
                      setPriceDraft('');
                      setSellModalOpen(true);
                    }}
                    className={PRIMARY_BUTTON}
                  >
                    <Coins size={13} /> Sell Batch
                  </button>
                </div>
              ) : selectedView.awaitingApproval ? (
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-strong)]/45">
                  <Clock size={12} /> Waiting for the admin&apos;s authorization reference — this
                  batch can be sold once approved.
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-strong)]/45">
                  <Clock size={12} /> {selectedView.remainingKg.toFixed(1)} kg to go before this
                  batch reaches the selling threshold.
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Root folder grid — opens a category ledger */}
      {!selectedCategory && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {categoryViews.map((view, index) => {
            const { cat, currentKg, thresholdKg, isApproved, awaitingApproval, pct, remainingKg } =
              view;
            const CategoryIcon = RECYCLABLE_CATEGORY_ICONS[cat.id] ?? Package;
            const latest = latestSaleByCategory[cat.id];
            const rampNumber = Math.min(index + 1, 4);

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategoryId(cat.id)}
                style={
                  {
                    '--ramp': `var(--ramp-${rampNumber})`,
                    '--ramp-strong': `var(--ramp-${rampNumber}-strong)`,
                  } as React.CSSProperties
                }
                className="flex h-full w-full cursor-pointer flex-col rounded-3xl border border-[var(--ramp)]/35 bg-white/95 p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-[var(--ramp)]/60 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold leading-tight text-[var(--text-strong)]">
                      {cat.shortName}
                    </p>
                    <p className="mt-1 truncate text-xs text-[var(--text-strong)]/50">{cat.name}</p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--ramp)] text-white shadow-xs">
                    <CategoryIcon size={17} />
                  </span>
                </div>

                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-strong)]/55">
                    <span>Collected</span>
                    <span className={`${NUMBER} text-[var(--text-strong)]`}>
                      {formatKg(currentKg)} / {thresholdKg} kg
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ramp)_15%,white)]">
                    <div
                      className="h-full rounded-full bg-[var(--ramp)] transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="mt-auto flex items-center gap-2 pt-4">
                  {isApproved ? (
                    <span className={SUCCESS_CHIP}>
                      <CheckCircle2 size={11} /> Ready to sell
                    </span>
                  ) : awaitingApproval ? (
                    <span className={WARNING_CHIP}>
                      <Clock size={11} /> Awaiting approval
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full border border-[var(--primary)]/10 bg-[color-mix(in_srgb,var(--primary)_4%,white)] px-3 py-1 text-[11px] font-bold text-[var(--text-strong)]/55">
                      {remainingKg.toFixed(1)} kg to go
                    </span>
                  )}
                  <span className="truncate text-[11px] text-[var(--text-strong)]/45">
                    {latest ? `Latest: ${formatLongDate(latest)}` : 'No sales yet'}
                  </span>
                  <ChevronRight size={16} className="ml-auto shrink-0 text-[var(--ramp-strong)]/70" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Category vendor sales ledger */}
      {selectedCategory && (
        <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-4">
          <h4 className="text-sm font-heading font-bold text-[var(--text-strong)] flex items-center gap-2">
            <Coins size={16} className="text-[var(--gold)]" />
            <span>{selectedCategory.shortName} Vendor Sales Ledger</span>
          </h4>

          {visibleSales.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">
              No {selectedCategory.shortName} sales recorded yet.
            </p>
          ) : (
            <div className="rounded-2xl border border-[var(--primary)]/10 overflow-hidden">
              <LedgerSheetTable
                columns={salesColumns}
                rows={visibleSales}
                getRowId={(sale) => sale.id}
                minWidth="640px"
                hideIndex
                borderless
                emptyMessage="No sales match this material."
              />
            </div>
          )}
        </div>
      )}

      {selectedView && (
        <AppModal
          open={sellModalOpen}
          onOpenChange={(open) => {
            if (!selling) setSellModalOpen(open);
          }}
          size="xl"
          icon={<Coins />}
          title={`Sell ${selectedView.cat.shortName} batch`}
          description={`Record the junk shop and their agreed rate. ${formatKg(sellableKg)} kg will be deducted from stock and the sale is logged in both the MRF and Admin sales histories.`}
          confirmLabel="Complete Vendor Sale"
          confirmDisabled={!buyerDraft.trim() || !priceValid || selling}
          loading={selling}
          onConfirm={confirmSale}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="market-sell-shop" className={MICRO_LABEL}>
                Junk shop / buyer *
              </label>
              <input
                id="market-sell-shop"
                type="text"
                list="mrf-junk-shops"
                value={buyerDraft}
                onChange={(e) => setBuyerDraft(e.target.value)}
                placeholder={knownShops[0] || 'e.g. Metro Junk Shop'}
                className="w-full rounded-xl border border-[var(--primary)]/15 bg-white px-3 py-2.5 text-sm font-semibold text-[var(--text-strong)] outline-none transition-colors placeholder:text-[var(--text-strong)]/30 focus:border-[var(--accent)]/60"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="market-sell-price" className={MICRO_LABEL}>
                Price per kg (₱) *
              </label>
              <input
                id="market-sell-price"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={priceDraft}
                onChange={(e) => setPriceDraft(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-[var(--primary)]/15 bg-white px-3 py-2.5 text-sm font-semibold text-[var(--text-strong)] outline-none transition-colors placeholder:text-[var(--text-strong)]/30 focus:border-[var(--accent)]/60"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 rounded-2xl border border-[var(--primary)]/10 bg-[var(--background)] p-4">
            <div>
              <span className={MICRO_LABEL}>Selling weight</span>
              <p className={`mt-1 ${NUMBER} text-lg text-[var(--text-strong)]`}>
                {formatKg(sellableKg)} kg
              </p>
            </div>
            <div className="text-right">
              <span className={MICRO_LABEL}>Total sale value</span>
              <p className={`mt-1 ${NUMBER} text-lg text-[var(--accent)]`}>{formatPeso(saleTotal)}</p>
            </div>
          </div>
        </AppModal>
      )}
    </div>
  );
};
