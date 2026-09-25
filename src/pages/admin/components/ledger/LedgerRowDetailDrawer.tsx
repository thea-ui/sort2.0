import React from 'react';
import { X } from 'lucide-react';
import { RightDrawer } from '../../../../components/common/RightDrawer';
import type { LedgerSheet } from './ledgerSheets';

interface LedgerRowDetailDrawerProps {
  view: { row: any; sheet: LedgerSheet } | null;
  onClose: () => void;
}

/**
 * Ledger record inspector — the standard 440px right sheet (master handoff
 * Part 3 §6.1) with the sheet's columns rendered as label/value rows.
 */
export const LedgerRowDetailDrawer: React.FC<LedgerRowDetailDrawerProps> = ({
  view,
  onClose,
}) => (
  <RightDrawer open={view !== null} onClose={onClose}>
    {view && (
      <>
        <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] px-6 py-5 text-white shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                {view.sheet.label}
              </span>
              <h3 className="text-lg font-bold mt-0.5 truncate">Ledger Record</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer transition-colors shrink-0"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 flex-1 overflow-y-auto">
          {view.sheet.columns
            .filter((c) => c.key !== 'view')
            .map((col) => {
              const raw = col.value ? col.value(view.row) : '';
              const content = col.cell
                ? col.cell(view.row)
                : raw === '' || raw == null
                  ? '—'
                  : String(raw);
              return (
                <div
                  key={col.key}
                  className="flex items-start justify-between gap-4 py-3 border-b border-[var(--primary)]/5 last:border-0"
                >
                  <span className="text-[10px] font-bold text-[var(--text-strong)]/45 uppercase tracking-wider shrink-0 pt-0.5">
                    {String(col.header)}
                  </span>
                  <span className="text-xs font-semibold text-[var(--text-strong)] text-right break-words">
                    {content ?? '—'}
                  </span>
                </div>
              );
            })}
        </div>
      </>
    )}
  </RightDrawer>
);
