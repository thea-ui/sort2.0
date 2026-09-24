import React from 'react';
import {
  CalendarClock,
  Download,
  FileSpreadsheet,
  Pencil,
  Power,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { SchoolYear } from '../../../../hooks/useSchoolYear';
import { SearchInput } from '../../../../components/layout/SearchInput';

const BUTTON =
  'px-3 py-2 rounded-xl bg-white border border-[var(--primary)]/10 text-xs font-bold text-[var(--text-strong)]/70 hover:bg-[var(--primary)]/5 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors';

interface LedgerToolbarProps {
  years: SchoolYear[];
  selectedId: string | null;
  onSelectYear: (id: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  importing: boolean;
  loading: boolean;
  onImport: () => void;
  onRefresh: () => void;
  onExport: () => void;
  canExport: boolean;
  selectedYear: SchoolYear | null;
  onEdit: () => void;
  onActivate: () => void;
  actionLoading: boolean;
  onDetails: () => void;
}

export const LedgerToolbar: React.FC<LedgerToolbarProps> = ({
  years,
  selectedId,
  onSelectYear,
  search,
  onSearchChange,
  importing,
  loading,
  onImport,
  onRefresh,
  onExport,
  canExport,
  selectedYear,
  onEdit,
  onActivate,
  actionLoading,
  onDetails,
}) => {
  const canManage = Boolean(selectedYear && !selectedYear.isActive && !selectedYear.isArchived);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <CalendarClock
          size={13}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-strong)]/40 pointer-events-none"
        />
        <select
          value={selectedId || ''}
          onChange={(e) => onSelectYear(e.target.value)}
          className="pl-8 pr-8 py-2 rounded-xl border border-[var(--primary)]/10 bg-white text-xs font-bold text-[var(--text-strong)] outline-none focus:border-[var(--accent)] cursor-pointer appearance-none"
          aria-label="Select school year"
        >
          {years.map((sy) => (
            <option key={sy.id} value={sy.id}>
              SY {sy.label}
              {sy.isActive ? ' (Active)' : sy.isArchived ? ' (Archived)' : ' (Inactive)'}
            </option>
          ))}
          {years.length === 0 && <option value="">No school years</option>}
        </select>
      </div>

      <SearchInput
        value={search}
        onChange={onSearchChange}
        placeholder="Search rows…"
        className="w-44"
        inputClassName="py-2"
      />

      <button
        type="button"
        onClick={onImport}
        disabled={importing}
        className={BUTTON}
        title="Fetch all school years from EnrollPro (sync only — never activates or rolls over)"
      >
        <Upload size={13} className={importing ? 'animate-pulse' : ''} /> Sync
      </button>

      <button type="button" onClick={onRefresh} disabled={loading} className={BUTTON}>
        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
      </button>

      <button
        type="button"
        onClick={onExport}
        disabled={!canExport}
        className="px-3 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
      >
        <Download size={13} /> Export CSV
      </button>

      {canManage && (
        <button type="button" onClick={onEdit} className={BUTTON}>
          <Pencil size={13} /> Edit
        </button>
      )}

      {canManage && (
        <button
          type="button"
          onClick={onActivate}
          disabled={selectedYear ? actionLoading : false}
          className="px-3 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
        >
          <Power size={13} /> Activate
        </button>
      )}

      <button
        type="button"
        onClick={onDetails}
        disabled={!selectedYear}
        className="px-3 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50 transition-colors"
      >
        <FileSpreadsheet size={13} /> Details
      </button>
    </div>
  );
};
