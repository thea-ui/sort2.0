import React from 'react';
import { SearchInput } from '../layout/SearchInput';
import type { TableFilter } from './types';

interface TableToolbarProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: TableFilter[];
  actions?: React.ReactNode;
  className?: string;
}

/** Search + filters + actions row (SMART `TableToolbar` parity, SORT tokens). */
export const TableToolbar: React.FC<TableToolbarProps> = ({
  searchPlaceholder = 'Search...',
  searchValue,
  onSearchChange,
  filters = [],
  actions,
  className = '',
}) => {
  const hasSearch = searchValue !== undefined && onSearchChange !== undefined;

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto ${className}`}>
      {hasSearch && (
        <SearchInput
          value={searchValue}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          className="flex-1 sm:w-64"
        />
      )}

      {filters.map((filter) => (
        <select
          key={filter.label}
          aria-label={filter.label}
          value={filter.value}
          onChange={(event) => filter.onChange(event.target.value)}
          className="bg-white border border-[var(--primary)]/10 rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-strong)] outline-none cursor-pointer focus:border-[var(--accent)] shadow-xs"
        >
          {filter.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ))}

      {actions}
    </div>
  );
};
