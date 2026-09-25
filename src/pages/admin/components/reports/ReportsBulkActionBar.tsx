import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ReportsBulkActionBarProps {
  totalCount: number;
  selectedCount: number;
  selectedUnverifiedCount: number;
  allSelected: boolean;
  onToggleSelectAll: () => void;
  onVerifySelected: () => void;
  onClearSelection: () => void;
}

export const ReportsBulkActionBar: React.FC<ReportsBulkActionBarProps> = ({
  totalCount,
  selectedCount,
  selectedUnverifiedCount,
  allSelected,
  onToggleSelectAll,
  onVerifySelected,
  onClearSelection,
}) => (
  <div className="bg-white/90 border border-[var(--primary)]/10 rounded-2xl p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
    <div className="flex items-center gap-2 font-semibold text-[var(--text-strong)]">
      <input
        type="checkbox"
        id="selectAll"
        checked={allSelected}
        onChange={onToggleSelectAll}
        className="rounded text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
      />
      <label htmlFor="selectAll" className="cursor-pointer font-bold">
        Select All ({totalCount})
      </label>
      {selectedCount > 0 && (
        <span className="text-[11px] font-bold text-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_15%,white)] px-2.5 py-0.5 rounded-full ml-1 border border-[var(--accent)]/30">
          {selectedCount} Selected
        </span>
      )}
    </div>

    {selectedCount > 0 && (
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <button
          type="button"
          onClick={onVerifySelected}
          className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white text-xs font-bold shadow-md shadow-[var(--accent)]/20 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <CheckCircle2 size={14} /> Verify Selected ({selectedUnverifiedCount})
        </button>
        <button
          type="button"
          onClick={onClearSelection}
          className="px-3.5 py-2 rounded-xl border border-[var(--primary)]/10 bg-white hover:bg-[color-mix(in_srgb,var(--primary)_5%,white)] text-xs font-bold text-[var(--text-strong)]/60 transition-colors cursor-pointer"
        >
          Deselect All
        </button>
      </div>
    )}
  </div>
);
