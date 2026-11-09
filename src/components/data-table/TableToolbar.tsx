import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import type { TableFilter } from './types';

interface TableToolbarProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: TableFilter[];
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Table toolbar (master handoff Part 2 §7, recipe 1): search with a 16px icon
 * inset 16px left, 144px filter selects, actions right-aligned on desktop.
 */
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
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        {hasSearch && (
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--table-muted)] pointer-events-none" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              className="h-10 w-full rounded-xl pl-10 text-[13px] sm:w-80"
            />
          </div>
        )}

        {filters.map((filter) => (
          <Select
            key={filter.label}
            aria-label={filter.label}
            value={filter.value}
            onValueChange={filter.onChange}
            options={filter.options}
            size="sm"
            className="w-36"
          />
        ))}
      </div>

      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
};
