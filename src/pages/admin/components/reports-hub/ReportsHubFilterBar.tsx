import React, { useState } from 'react';
import { ChevronDown, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { SearchInput } from '../../../../components/layout/SearchInput';
import { toDateKey } from '../../../../utils/dateFormat';
import type { HubSort, ReportHubFilters } from './reportHubTypes';
import { DEFAULT_HUB_FILTERS } from './reportHubTypes';

// Pending/Dispatched are operational states handled in Verify Reports; the
// archive focuses on finished records.
const STATUS_OPTIONS = ['COLLECTED', 'RESOLVED', 'DISMISSED', 'EXPIRED'];

const SORT_OPTIONS: Array<{ value: HubSort; label: string }> = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'weight', label: 'Weight high–low' },
];

export interface HubYearOption {
  id: string;
  label: string;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}

interface ReportsHubFilterBarProps {
  filters: ReportHubFilters;
  onChange: (next: ReportHubFilters) => void;
  years: HubYearOption[];
  /** Total records represented by the current filter selection. */
  resultCount: number;
  /** Optional location refinement (print page); hidden when omitted. */
  locations?: string[];
  location?: string;
  onLocationChange?: (value: string) => void;
  /** Hides the status chips for sections without statuses (e.g. walk-ins). */
  hideStatuses?: boolean;
  /** Grade levels present in the reports; chips only render when provided. */
  gradeOptions?: string[];
  /** Year the Clear button resets to (the active school year). */
  defaultYearId?: string;
  /** Overrides the trailing counter text (defaults to the hub wording). */
  resultLabel?: string;
}

const dayStamp = (input?: string) => (input ? input.slice(0, 10) : '');

/**
 * Compact filter bar: only the everyday controls stay visible (search, school
 * year, date preset, sort); status chips, exact dates and location live behind
 * the "Filters" toggle with an active-count badge.
 */
export const ReportsHubFilterBar: React.FC<ReportsHubFilterBarProps> = ({
  filters,
  onChange,
  years,
  resultCount,
  locations,
  location = '',
  onLocationChange,
  hideStatuses = false,
  gradeOptions,
  defaultYearId,
  resultLabel,
}) => {
  const [expanded, setExpanded] = useState(false);
  const activeYear = years.find((year) => year.isActive);
  const set = (patch: Partial<ReportHubFilters>) => onChange({ ...filters, ...patch });

  const today = toDateKey(new Date());
  const monthStart = `${today.slice(0, 7)}-01`;

  const presetValue = (() => {
    if (!filters.from && !filters.to) return 'ALL';
    if (filters.from === today && filters.to === today) return 'TODAY';
    if (filters.from === monthStart && filters.to === today) return 'MONTH';
    if (activeYear?.startDate && filters.from === dayStamp(activeYear.startDate) && filters.to === dayStamp(activeYear.endDate)) {
      return 'YEAR';
    }
    return 'CUSTOM';
  })();

  const applyPreset = (value: string) => {
    if (value === 'ALL') set({ from: '', to: '' });
    else if (value === 'TODAY') set({ from: today, to: today });
    else if (value === 'MONTH') set({ from: monthStart, to: today });
    else if (value === 'YEAR' && activeYear?.startDate && activeYear?.endDate) {
      set({ from: dayStamp(activeYear.startDate), to: dayStamp(activeYear.endDate) });
    }
  };

  const toggleStatus = (status: string) => {
    const next = filters.statuses.includes(status)
      ? filters.statuses.filter((value) => value !== status)
      : [...filters.statuses, status];
    set({ statuses: next });
  };

  const toggleGrade = (grade: string) => {
    const next = filters.gradeLevels.includes(grade)
      ? filters.gradeLevels.filter((value) => value !== grade)
      : [...filters.gradeLevels, grade];
    set({ gradeLevels: next });
  };

  const hiddenActiveCount =
    (filters.statuses.length > 0 ? 1 : 0) +
    (filters.gradeLevels.length > 0 ? 1 : 0) +
    (filters.from || filters.to ? 1 : 0) +
    (location ? 1 : 0);
  const hasAnyFilter =
    hiddenActiveCount > 0 || filters.query.trim() !== '' || filters.sort !== DEFAULT_HUB_FILTERS.sort || filters.yearId !== (defaultYearId ?? DEFAULT_HUB_FILTERS.yearId);

  const clearAll = () => {
    onChange({ ...DEFAULT_HUB_FILTERS, yearId: defaultYearId ?? DEFAULT_HUB_FILTERS.yearId });
    onLocationChange?.('');
  };

  const controlClass =
    'px-3 py-2 text-xs font-semibold text-[var(--text-strong)] bg-[color-mix(in_srgb,var(--primary)_5%,white)] border border-transparent rounded-xl outline-none focus:border-[var(--accent)] cursor-pointer';

  return (
    <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl px-4 py-3 shadow-sm space-y-3">
      {/* Always-visible controls */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={filters.query}
          onChange={(value) => set({ query: value })}
          placeholder="Search title, reporter, location..."
          className="w-full sm:w-64 lg:w-72"
          inputClassName="py-2 bg-[color-mix(in_srgb,var(--primary)_5%,white)] border-transparent focus:bg-white"
        />

        <select
          value={filters.yearId}
          onChange={(event) => set({ yearId: event.target.value })}
          aria-label="Filter by school year"
          className={controlClass}
        >
          <option value="ALL">All school years</option>
          {years.map((year) => (
            <option key={year.id} value={year.id}>
              {year.label}
              {year.isActive ? ' (Active)' : ''}
            </option>
          ))}
        </select>

        <select
          value={presetValue}
          onChange={(event) => applyPreset(event.target.value)}
          aria-label="Filter by date"
          className={controlClass}
        >
          <option value="ALL">All time</option>
          <option value="TODAY">Today</option>
          <option value="MONTH">This month</option>
          {activeYear && <option value="YEAR">This school year</option>}
          {presetValue === 'CUSTOM' && <option value="CUSTOM">Custom range</option>}
        </select>

        <select
          value={filters.sort}
          onChange={(event) => set({ sort: event.target.value as HubSort })}
          aria-label="Sort reports"
          className={controlClass}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          aria-controls="reports-filter-panel"
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border shadow-xs transition cursor-pointer ${
            expanded
              ? 'bg-[var(--accent)] border-transparent text-white'
              : 'bg-[var(--accent)]/10 border-[var(--accent)]/35 text-[var(--text-strong)] hover:bg-[var(--accent)]/20'
          }`}
        >
          <SlidersHorizontal size={14} className={expanded ? 'text-white' : 'text-[var(--accent)]'} /> Filters
          {hiddenActiveCount > 0 && (
            <span
              className={`ml-0.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-bold ${
                expanded ? 'bg-white text-[var(--accent)]' : 'bg-[var(--accent)] text-white'
              }`}
            >
              {hiddenActiveCount}
            </span>
          )}
          <ChevronDown
            size={14}
            className={`transition-transform ${expanded ? 'rotate-180 text-white' : 'text-[var(--text-strong)]/50'}`}
          />
        </button>

        {hasAnyFilter && (
          <button
            type="button"
            onClick={clearAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[var(--text-strong)]/60 hover:text-[var(--text-strong)] hover:bg-[color-mix(in_srgb,var(--primary)_5%,white)] transition cursor-pointer"
          >
            <RotateCcw size={13} /> Clear
          </button>
        )}

        <span className="ml-auto text-[11px] font-semibold text-[var(--text-strong)]/50 whitespace-nowrap">
          {resultCount} {resultLabel ?? (resultCount === 1 ? 'record in folders' : 'records in folders')}
        </span>
      </div>

      {/* Advanced filters, revealed on demand */}
      {expanded && (
        <div
          id="reports-filter-panel"
          className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-3 border-t border-[var(--primary)]/10"
        >
          {!hideStatuses && (
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by status">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-strong)]/45 mr-1">
                Status
              </span>
              {STATUS_OPTIONS.map((status) => {
                const active = filters.statuses.includes(status);
                return (
                  <button
                    key={status}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleStatus(status)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                      active
                        ? 'bg-[var(--accent)] text-white border-transparent shadow-sm'
                        : 'bg-white border-[var(--primary)]/10 text-[var(--text-strong)]/60 hover:bg-[color-mix(in_srgb,var(--primary)_5%,white)]'
                    }`}
                  >
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </button>
                );
              })}
            </div>
          )}

          {gradeOptions && gradeOptions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by grade level">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-strong)]/45 mr-1">
                Grade
              </span>
              {gradeOptions.map((grade) => {
                const active = filters.gradeLevels.includes(grade);
                return (
                  <button
                    key={grade}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleGrade(grade)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                      active
                        ? 'bg-[var(--accent)] text-white border-transparent shadow-sm'
                        : 'bg-white border-[var(--primary)]/10 text-[var(--text-strong)]/60 hover:bg-[color-mix(in_srgb,var(--primary)_5%,white)]'
                    }`}
                  >
                    {grade}
                  </button>
                );
              })}
            </div>
          )}

          <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-strong)]/70">
            From
            <input
              type="date"
              value={filters.from}
              onChange={(event) => set({ from: event.target.value })}
              aria-label="Reports from date"
              className={controlClass}
            />
          </label>

          <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-strong)]/70">
            To
            <input
              type="date"
              value={filters.to}
              onChange={(event) => set({ to: event.target.value })}
              aria-label="Reports to date"
              className={controlClass}
            />
          </label>

          {locations && locations.length > 0 && onLocationChange && (
            <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-strong)]/70">
              Location
              <select
                value={location}
                onChange={(event) => onLocationChange(event.target.value)}
                aria-label="Filter by location"
                className={`${controlClass} max-w-[220px] truncate`}
              >
                <option value="">All locations</option>
                {locations.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
    </div>
  );
};
