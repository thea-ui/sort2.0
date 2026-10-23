import React, { useMemo } from 'react';
import { FileDown, X } from 'lucide-react';
import { RightDrawer } from '../../../../components/common/RightDrawer';
import { LoadingState } from '../../../../components/common/LoadingState';
import { useSalesLedger } from '../reports-hub/useSalesLedger';
import { buildPrintUrl } from '../reports-hub/printUrl';
import { DEFAULT_HUB_FILTERS } from '../reports-hub/reportHubTypes';

export type LedgerStatusTone = 'success' | 'warning' | 'danger' | 'neutral';

/** Presentation + stock snapshot for the clicked material card. */
export interface MaterialLedgerTarget {
  kind: 'MARKET' | 'SCRAP';
  code: string;
  name: string;
  icon: React.ElementType;
  bgColor: string;
  color: string;
  strongColor: string;
  currentKg: number;
  pricePerKg: number;
  status: string;
  statusTone: LedgerStatusTone;
}

interface MaterialLedgerDrawerProps {
  target: MaterialLedgerTarget | null;
  onClose: () => void;
}

const STATUS_TONE_CLASS: Record<LedgerStatusTone, string> = {
  success: 'bg-[var(--success)]/10 text-[var(--success-strong)] border-[var(--success)]/25',
  warning: 'bg-[var(--warning)]/10 text-[var(--warning-strong)] border-[var(--warning)]/25',
  danger: 'bg-[var(--danger)]/10 text-[var(--danger-strong)] border-[var(--danger)]/25',
  neutral: 'bg-[var(--text-strong)]/5 text-[var(--text-strong)]/60 border-[var(--text-strong)]/10',
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * Per-material sales ledger sheet, opened from the Collections category cards.
 * Reuses the Reports hub ledger source (`useSalesLedger`) so the rows match the
 * printable ledger exactly; "Print ledger (PDF)" opens the same report route.
 */
export const MaterialLedgerDrawer: React.FC<MaterialLedgerDrawerProps> = ({ target, onClose }) => {
  const { rows, loading } = useSalesLedger('ALL');

  const ledgerRows = useMemo(() => {
    if (!target) return [];
    return rows
      .filter((row) => row.kind === target.kind && row.materialCode === target.code)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [rows, target]);

  const totalKg = ledgerRows.reduce((sum, row) => sum + row.weightKg, 0);
  const totalRevenue = ledgerRows.reduce((sum, row) => sum + row.revenue, 0);

  const handlePrint = () => {
    if (!target) return;
    const url = buildPrintUrl(
      {
        section: target.kind === 'MARKET' ? 'ledger-market' : 'ledger-scrap',
        material: target.code,
      },
      DEFAULT_HUB_FILTERS,
    );
    window.open(url, '_blank', 'noopener');
  };

  const Icon = target?.icon;

  return (
    <RightDrawer open={target !== null} onClose={onClose} className="sm:max-w-[560px]">
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && target && (
            <div className={`p-2 rounded-lg shrink-0 ${target.bgColor} ${target.color}`}>
              <Icon size={18} />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {target?.kind === 'SCRAP' ? 'Asset Scrap Ledger' : 'Recyclables Market Ledger'}
            </p>
            <h3 className="text-sm font-bold text-[var(--text-strong)] truncate">
              {target?.name ?? ''}
            </h3>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close ledger"
          className="shrink-0 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {target && (
        <div className="flex-1 overflow-y-auto smart-scrollbar p-5 space-y-5">
          {/* Stock snapshot */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: 'On hand', value: `${target.currentKg.toFixed(1)} kg` },
              { label: 'Market rate', value: `₱${target.pricePerKg}/kg` },
              {
                label: 'Est. value',
                value: `₱${Math.round(target.currentKg * target.pricePerKg).toLocaleString()}`,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-[var(--primary)]/10 bg-white/90 px-3 py-2.5"
              >
                <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-strong)]/40">
                  {stat.label}
                </p>
                <p className={`text-sm font-black mt-0.5 ${target.strongColor}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Sales Records
            </span>
            <span
              className={`text-[10px] font-black uppercase tracking-wider border px-2 py-0.5 rounded-full ${STATUS_TONE_CLASS[target.statusTone]}`}
            >
              {target.status}
            </span>
          </div>

          {loading ? (
            <LoadingState label="Loading ledger…" />
          ) : ledgerRows.length === 0 ? (
            <p className="text-xs text-[var(--text-strong)]/50 font-medium text-center py-10 rounded-xl border border-dashed border-[var(--primary)]/15">
              No sales recorded for this material yet.
            </p>
          ) : (
            <div className="rounded-xl border border-[var(--primary)]/10 overflow-hidden">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[color-mix(in_srgb,var(--primary)_5%,white)]">
                    {['Date', 'Buyer', 'Weight', 'Amount'].map((header) => (
                      <th
                        key={header}
                        scope="col"
                        className={`px-3 py-2 text-[9px] font-black uppercase tracking-wider text-[var(--text-strong)]/50 ${
                          header === 'Weight' || header === 'Amount' ? 'text-right' : ''
                        }`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--primary)]/5">
                  {ledgerRows.map((row) => (
                    <tr key={row.id} className="bg-white">
                      <td className="px-3 py-2.5 text-[11px] font-semibold text-[var(--text-strong)]/70 whitespace-nowrap">
                        {formatDate(row.date)}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] font-bold text-[var(--text-strong)]">
                        {row.buyerName || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] font-bold text-[var(--text-strong)] text-right tabular-nums whitespace-nowrap">
                        {row.weightKg.toFixed(1)} kg
                      </td>
                      <td className={`px-3 py-2.5 text-[11px] font-black text-right tabular-nums whitespace-nowrap ${target.strongColor}`}>
                        ₱{row.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[color-mix(in_srgb,var(--primary)_5%,white)] border-t border-[var(--primary)]/10">
                    <td className="px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-[var(--text-strong)]/60">
                      Total
                    </td>
                    <td className="px-3 py-2.5 text-[10px] font-bold text-[var(--text-strong)]/50">
                      {ledgerRows.length} sale{ledgerRows.length === 1 ? '' : 's'}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] font-black text-[var(--text-strong)] text-right tabular-nums">
                      {totalKg.toFixed(1)} kg
                    </td>
                    <td className={`px-3 py-2.5 text-[11px] font-black text-right tabular-nums ${target.strongColor}`}>
                      ₱{totalRevenue.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="shrink-0 border-t border-border px-5 py-4 bg-card">
        <button
          type="button"
          onClick={handlePrint}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg h-9 px-4 text-xs font-bold bg-[color-mix(in_srgb,var(--accent)_10%,white)] hover:bg-[color-mix(in_srgb,var(--accent)_20%,white)] text-[var(--accent)] transition-colors cursor-pointer"
        >
          <FileDown size={14} /> Print ledger (PDF)
        </button>
      </div>
    </RightDrawer>
  );
};
