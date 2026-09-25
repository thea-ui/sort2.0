import React from 'react';
import { Armchair, FileText, Recycle } from 'lucide-react';
import { SearchInput } from '../../../../components/layout/SearchInput';
import type { ReportQueueScope } from '../../../../utils/reportQueueUtils';

const SCOPE_TABS: Array<{ scope: ReportQueueScope; label: string; icon: React.ReactNode }> = [
  { scope: 'ALL', label: 'All Reports', icon: <FileText size={15} /> },
  { scope: 'WASTE', label: 'Waste', icon: <Recycle size={15} /> },
  { scope: 'ASSET', label: 'Assets', icon: <Armchair size={15} /> },
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Status' },
  { value: 'UNVERIFIED', label: 'Unverified' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'DISMISSED', label: 'Dismissed' },
  { value: 'DONE', label: 'Done / Completed' },
];

interface ReportsFilterBarProps {
  activeFilter: ReportQueueScope;
  onFilterChange: (scope: ReportQueueScope) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
}

export const ReportsFilterBar: React.FC<ReportsFilterBarProps> = ({
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
}) => (
  <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      {SCOPE_TABS.map(({ scope, label, icon }) => (
        <button
          key={scope}
          type="button"
          onClick={() => onFilterChange(scope)}
          className={`px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
            activeFilter === scope
              ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/20'
              : 'bg-white border border-[var(--primary)]/10 text-[var(--text-strong)]/70 hover:bg-[color-mix(in_srgb,var(--primary)_5%,white)]'
          }`}
        >
          {icon} {label}
        </button>
      ))}
    </div>

    <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
      <SearchInput
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Search reports..."
        className="flex-1 w-full"
        inputClassName="py-2.5 bg-[color-mix(in_srgb,var(--primary)_5%,white)] border-transparent focus:bg-white"
      />
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
        aria-label="Filter reports by status"
        className="w-full sm:w-48 px-3 py-2.5 text-xs bg-[color-mix(in_srgb,var(--primary)_5%,white)] border border-transparent rounded-xl outline-none focus:border-[var(--accent)] font-semibold text-[var(--text-strong)] cursor-pointer"
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  </div>
);
