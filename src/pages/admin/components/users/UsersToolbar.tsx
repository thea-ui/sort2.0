import React from 'react';
import { Filter } from 'lucide-react';
import { Role } from '../../../../types';
import { SearchInput } from '../../../../components/layout/SearchInput';
import type { UserStatusFilter } from './useUserDirectory';

interface UsersToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedRole: Role | 'ALL';
  onRoleChange: (role: Role | 'ALL') => void;
  counts: Record<Role | 'ALL', number>;
  statusFilter: UserStatusFilter;
  onStatusChange: (status: UserStatusFilter) => void;
  isLoading: boolean;
}

export const UsersToolbar: React.FC<UsersToolbarProps> = ({
  searchTerm,
  onSearchChange,
  selectedRole,
  onRoleChange,
  counts,
  statusFilter,
  onStatusChange,
  isLoading,
}) => {
  const roleFilters: Array<{ key: Role | 'ALL'; label: string; count: number }> = [
    { key: 'ALL', label: 'All accounts', count: counts.ALL },
    { key: 'ADMIN', label: 'Admins', count: counts.ADMIN },
    { key: 'MRF', label: 'MRF logistics', count: counts.MRF },
    { key: 'TEACHER', label: 'Faculty', count: counts.TEACHER },
    { key: 'STUDENT', label: 'Students', count: counts.STUDENT },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--primary)]/10 bg-white shadow-sm">
      <div
        className="flex flex-wrap items-center gap-x-5 border-b border-[var(--primary)]/10 px-3 sm:px-4"
        role="tablist"
        aria-label="Filter by role"
      >
        {roleFilters.map(({ key, label, count }) => {
          const active = selectedRole === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onRoleChange(key)}
              className={`relative cursor-pointer whitespace-nowrap py-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]/40 ${
                active
                  ? 'text-[var(--primary)]'
                  : 'text-[var(--text-strong)]/45 hover:text-[var(--text-strong)]/70'
              }`}
            >
              {label}
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold tabular-nums ${
                  active
                    ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                    : 'bg-[var(--primary)]/5 text-[var(--text-strong)]/35'
                }`}
              >
                {isLoading ? '—' : count}
              </span>
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[var(--primary)]"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 p-3 sm:p-4 md:flex-row md:items-center md:justify-between">
        <SearchInput
          value={searchTerm}
          onChange={onSearchChange}
          placeholder="Search by user name, email, employee ID, section..."
          className="flex-1"
          inputClassName="bg-[var(--background)]/50 border-[var(--primary)]/10 focus:bg-white"
        />

        <div className="flex h-9 items-center gap-2 rounded-xl border border-[var(--primary)]/10 bg-[var(--background)]/50 px-3">
          <Filter size={13} className="text-[var(--text-strong)]/45" />
          <span className="text-[11px] font-semibold text-[var(--text-strong)]/45">Status</span>
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value as UserStatusFilter)}
            aria-label="Filter by account status"
            className="cursor-pointer bg-transparent pr-1 text-xs font-bold text-[var(--text-strong)] outline-none"
          >
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
            <option value="ALL">All</option>
          </select>
        </div>
      </div>
    </div>
  );
};
