import React, { useEffect, useMemo, useState } from 'react';
import { Coins, Loader2, RotateCcw, Save, ShieldAlert } from 'lucide-react';
import { apiService } from '../../../../services/api';
import { toast } from '../../../../hooks/useToast';
import { LoadingState } from '../../../../components/common/LoadingState';

interface RateRow {
  kind: 'MARKET' | 'SCRAP';
  code: string;
  name: string;
  pricePerKg: number;
  hazmat?: boolean;
}

/** Refresh every open market/scrap surface (MRF tabs, Collections cards). */
function broadcastRateChange(): void {
  window.dispatchEvent(new CustomEvent('sort_market_updated'));
  window.dispatchEvent(new CustomEvent('sort_scrap_updated'));
}

const parsePrice = (raw: string): number | null => {
  const value = Number(String(raw).replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100) / 100;
};

/**
 * Admin → Settings → Market Rates: the ₱/kg selling prices used when MRF
 * batches are sold (recyclables market + asset scrap). Prices persist per
 * material and refresh open MRF/Collections screens immediately on save.
 */
export const MarketRatesPage: React.FC = () => {
  const [rows, setRows] = useState<RateRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [market, scrap] = await Promise.all([
        apiService.getMarketStocks().catch(() => []),
        apiService.getAssetScrapStocks().catch(() => []),
      ]);
      const marketRows: RateRow[] = (market ?? []).map((stock: any) => ({
        kind: 'MARKET' as const,
        code: stock.categoryCode,
        name: stock.categoryName,
        pricePerKg: Number(stock.marketPricePerKg) || 0,
      }));
      const scrapRows: RateRow[] = (scrap ?? []).map((stock: any) => ({
        kind: 'SCRAP' as const,
        code: stock.materialCode,
        name: stock.materialName,
        pricePerKg: Number(stock.marketPricePerKg) || 0,
        hazmat: stock.hazmat === true,
      }));
      setRows([...marketRows, ...scrapRows]);
      setDrafts({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const valueOf = (row: RateRow) => drafts[row.code] ?? String(row.pricePerKg);

  const changes = useMemo(
    () =>
      rows
        .map((row) => {
          const draft = drafts[row.code];
          if (draft === undefined) return null;
          const parsed = parsePrice(draft);
          if (parsed === null || parsed === row.pricePerKg) return null;
          return { kind: row.kind, code: row.code, value: parsed };
        })
        .filter((change): change is NonNullable<typeof change> => change !== null),
    [rows, drafts],
  );

  const hasInvalidDraft = useMemo(
    () =>
      rows.some((row) => {
        const draft = drafts[row.code];
        return draft !== undefined && parsePrice(draft) === null;
      }),
    [rows, drafts],
  );

  const dirty = Object.keys(drafts).length > 0;
  const marketRows = rows.filter((row) => row.kind === 'MARKET');
  const scrapRows = rows.filter((row) => row.kind === 'SCRAP');

  const handleSave = async () => {
    if (saving || changes.length === 0 || hasInvalidDraft) return;
    setSaving(true);
    try {
      await Promise.all(
        changes.map((change) =>
          change.kind === 'MARKET'
            ? apiService.updateMarketStock(change.code, { marketPricePerKg: change.value })
            : apiService.updateAssetScrapStock(change.code, { marketPricePerKg: change.value }),
        ),
      );
      toast.success(
        `Updated ${changes.length} material price${changes.length === 1 ? '' : 's'} — live for MRF batches.`,
      );
      broadcastRateChange();
      await load();
    } catch {
      toast.error('Failed to save some prices. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderRow = (row: RateRow) => {
    const value = valueOf(row);
    const invalid = drafts[row.code] !== undefined && parsePrice(value) === null;
    const changed = drafts[row.code] !== undefined && parsePrice(value) !== row.pricePerKg;
    return (
      <div
        key={row.code}
        className="p-3.5 bg-[var(--background)] rounded-2xl flex flex-wrap items-center justify-between gap-3 border border-gray-200/60"
      >
        <div className="min-w-0">
          <p className="font-extrabold text-sm text-[var(--text-strong)] flex items-center gap-2">
            {row.name}
            {row.hazmat && (
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-[var(--danger-strong)] bg-[var(--danger)]/10 border border-[var(--danger)]/25 px-2 py-0.5 rounded-full">
                <ShieldAlert size={10} /> Handler disposal
              </span>
            )}
          </p>
          <p className="text-[11px] text-[var(--text-strong)]/50 font-medium mt-0.5">
            Current rate: ₱{row.pricePerKg.toLocaleString(undefined, { maximumFractionDigits: 2 })} / kg
          </p>
        </div>

        <label className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-strong)]/40">
            ₱ / kg
          </span>
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            aria-label={`${row.name} price per kilogram`}
            value={value}
            onChange={(e) => setDrafts((prev) => ({ ...prev, [row.code]: e.target.value }))}
            className={`w-28 h-10 px-3 rounded-xl border text-sm font-bold text-right tabular-nums outline-none transition-colors bg-white ${
              invalid
                ? 'border-[var(--danger)]/50 focus:border-[var(--danger)]'
                : changed
                  ? 'border-[var(--gold)]/50 focus:border-[var(--gold)]'
                  : 'border-gray-200 focus:border-[var(--accent)]'
            }`}
          />
        </label>
      </div>
    );
  };

  return (
    <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-8 shadow-sm space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Coins size={22} className="text-[var(--accent)]" />
            Material Selling Prices
          </h3>
          <p className="text-sm text-[var(--text-strong)]/50 mt-1">
            Set the ₱/kg market rate used when MRF sells each batch. Changes apply to new sales
            immediately and never alter recorded revenue.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setDrafts({})}
            disabled={!dirty || saving}
            className="px-4 h-10 rounded-xl border border-[var(--primary)]/15 text-xs font-bold text-[var(--text-strong)] hover:bg-[var(--primary)]/5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            <RotateCcw size={14} /> Discard
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saving || hasInvalidDraft || changes.length === 0}
            className="px-5 h-10 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white text-xs font-extrabold shadow-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving…' : `Save changes${changes.length > 0 ? ` (${changes.length})` : ''}`}
          </button>
        </div>
      </div>

      {hasInvalidDraft && (
        <p className="text-xs font-bold text-[var(--danger-strong)] bg-[var(--danger)]/10 border border-[var(--danger)]/25 rounded-xl px-3.5 py-2.5">
          Some prices are not valid numbers — fix the highlighted fields before saving.
        </p>
      )}

      {loading ? (
        <LoadingState label="Loading material rates…" />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className="space-y-3">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-strong)]/50">
                Recyclable Materials — Recycle Market
              </h4>
              <p className="text-[11px] text-[var(--text-strong)]/40 font-medium mt-0.5">
                Used by the recyclables market batches (PET, aluminum, cardboard, glass).
              </p>
            </div>
            <div className="space-y-2.5">{marketRows.map(renderRow)}</div>
          </section>

          <section className="space-y-3">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-strong)]/50">
                Asset Scrap Materials
              </h4>
              <p className="text-[11px] text-[var(--text-strong)]/40 font-medium mt-0.5">
                Used by unserviceable-asset scrap batches (metals, e-waste, wood, glass, mixed).
              </p>
            </div>
            <div className="space-y-2.5">{scrapRows.map(renderRow)}</div>
          </section>
        </div>
      )}
    </div>
  );
};
