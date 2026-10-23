import React, { useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Coins,
  Scale,
  ShieldAlert,
} from 'lucide-react';
import type { ScrapStockItem } from '../../../../hooks/useAssetScrap';
import { FALLBACK_SCRAP_META, SCRAP_MATERIAL_META } from '../../../../utils/materialMeta';
import type { MaterialLedgerTarget } from './MaterialLedgerDrawer';

interface ScrapApprovalsGridProps {
  materials: ScrapStockItem[];
  totalScrapSales: number;
  onApproveSale: (material: ScrapStockItem) => void;
  /** Opens the per-material sales ledger drawer. */
  onOpenLedger?: (target: MaterialLedgerTarget) => void;
}

/* Folder rows mirroring the recyclables grid: amber highlight when a batch
   needs authorization, danger tint for hazmat; details and buttons live in
   the expanded panel. */
const ROW_SHELL = 'overflow-hidden rounded-2xl border bg-white transition-colors';
const PANEL = 'border-t border-[var(--primary)]/5 px-4 pb-4 pt-4';
const MICRO_LABEL =
  'block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-strong)]/40';
const NUMBER = 'font-mono font-bold tabular-nums';
const SUCCESS_CHIP =
  'inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--success)]/25 bg-[var(--success)]/10 px-2.5 py-1 text-[10px] font-bold text-[var(--success-strong)]';
const WARNING_CHIP =
  'inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--warning)]/25 bg-[var(--warning)]/10 px-2.5 py-1 text-[10px] font-bold text-[var(--warning-strong)]';
const DANGER_CHIP =
  'inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--danger)]/25 bg-[var(--danger)]/10 px-2.5 py-1 text-[10px] font-bold text-[var(--danger-strong)]';
const PRIMARY_BUTTON =
  'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-[11px] font-bold text-white shadow-sm shadow-[var(--accent)]/25 transition-colors hover:bg-[var(--accent-dark)]';
const GHOST_BUTTON =
  'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--primary)]/15 bg-white px-3.5 py-2 text-[11px] font-bold text-[var(--text-strong)]/70 transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--accent)]';

export const ScrapApprovalsGrid: React.FC<ScrapApprovalsGridProps> = ({
  materials,
  totalScrapSales,
  onApproveSale,
  onOpenLedger,
}) => {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-[var(--text-strong)] flex items-center gap-2">
            <Scale size={18} className="text-[var(--accent)]" />
            Asset Scrap Disposal Approvals
          </h3>
          <p className="text-xs text-[var(--text-strong)]/50 mt-0.5">
            Disposal Committee authorization required before MRF can sell each unserviceable asset scrap batch
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-[var(--accent)]/15 bg-[var(--accent)]/5 px-4 py-2.5">
          <Coins size={16} className="text-[var(--accent)]" aria-hidden />
          <div className="leading-tight">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-strong)]/50">
              Total Scrap Revenue
            </span>
            <span className="block font-mono text-sm font-bold tabular-nums text-[var(--text-strong)]">
              ₱{totalScrapSales.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {materials.map((material) => {
          const meta = SCRAP_MATERIAL_META[material.materialCode] || FALLBACK_SCRAP_META;
          const MaterialIcon = meta.icon;
          const currentKg = material.accumulatedKg || 0;
          const thresholdKg = material.thresholdLimitKg || 1;
          const pricePerKg = material.marketPricePerKg || 0;
          const isApproved = material.isApprovedForSale === true;
          const isThresholdReached = currentKg >= thresholdKg;
          const isHazmat = material.hazmat === true;
          const needsAuthorization = isThresholdReached && !isApproved && !isHazmat;
          const pct = Math.min(100, Math.round((currentKg / thresholdKg) * 100));
          const remainingKg = Math.max(0, thresholdKg - currentKg);
          const isOpen = openKey === material.materialCode;
          const panelId = `scrap-folder-${material.materialCode}`;
          const ledgerTarget: MaterialLedgerTarget = {
            kind: 'SCRAP',
            code: material.materialCode,
            name: material.materialName,
            icon: meta.icon,
            bgColor: meta.bgColor,
            color: meta.color,
            strongColor: meta.strongColor,
            currentKg,
            pricePerKg,
            status: isHazmat
              ? 'Handler disposal only'
              : isApproved
                ? 'Authorized for sale'
                : needsAuthorization
                  ? 'Ready to sell'
                  : 'Awaiting threshold',
            statusTone: isHazmat ? 'danger' : isApproved ? 'success' : needsAuthorization ? 'warning' : 'neutral',
          };

          return (
            <div
              key={material.materialCode}
              className={`${ROW_SHELL} ${
                isHazmat
                  ? 'border-[var(--danger)]/30'
                  : needsAuthorization
                    ? 'border-[var(--warning)]/40'
                    : 'border-[var(--primary)]/10 hover:border-[var(--primary)]/20'
              }`}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenKey(isOpen ? null : material.materialCode)}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.bgColor} ${meta.color}`}
                >
                  <MaterialIcon size={17} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text-strong)]">
                  {material.materialName}
                </span>
                <span className="flex shrink-0 items-center gap-2.5">
                  {isHazmat ? (
                    <span className={DANGER_CHIP}>
                      <ShieldAlert size={11} /> Handler disposal
                    </span>
                  ) : isApproved ? (
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
                              needsAuthorization ? 'bg-[var(--warning)]' : meta.barColor
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
                      <span className={MICRO_LABEL}>Est. value</span>
                      <p className={`mt-1 text-sm ${NUMBER} ${meta.strongColor}`}>
                        ₱{Math.round(currentKg * pricePerKg).toLocaleString()}
                      </p>
                      {isApproved && material.approvalReference && (
                        <span className="mt-1 block truncate font-mono text-[10px] font-medium text-[var(--text-strong)]/40">
                          Ref {material.approvalReference}
                        </span>
                      )}
                    </div>
                  </div>

                  {isHazmat && (
                    <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-[var(--danger-strong)]">
                      <ShieldAlert size={12} /> Hazardous stream — handler disposal only, not eligible
                      for sale.
                    </p>
                  )}

                  {(needsAuthorization || onOpenLedger) && (
                    <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--primary)]/5 pt-3">
                      {needsAuthorization && (
                        <button
                          type="button"
                          onClick={() => onApproveSale(material)}
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
      </div>
    </div>
  );
};
