import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { LedgerSheet } from './ledgerSheets';

interface LedgerRowDetailDrawerProps {
  view: { row: any; sheet: LedgerSheet } | null;
  onClose: () => void;
}

export const LedgerRowDetailDrawer: React.FC<LedgerRowDetailDrawerProps> = ({
  view,
  onClose,
}) => {
  if (!view) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-[var(--primary)]/40 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${view.sheet.label} record details`}
        className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] px-6 py-5 text-white">
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
      </div>
    </div>,
    document.body,
  );
};
