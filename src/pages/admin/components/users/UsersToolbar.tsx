import React from 'react';
import { Building2, Filter, GraduationCap, ShieldCheck, Truck, Users } from 'lucide-react';
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
  shownCount: number;
  totalCount: number;
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
  shownCount,
  totalCount,
}) => {
  const roleFilters: Array<{
    key: Role | 'ALL';
    label: string;
    count: number;
    Icon: React.ElementType;
  }> = [
    { key: 'ALL', label: 'All Accounts', count: counts.ALL, Icon: Users },
    { key: 'ADMIN', label: 'Admins', count: counts.ADMIN, Icon: ShieldCheck },
    { key: 'MRF', label: 'MRF Logistics', count: counts.MRF, Icon: Truck },
    { key: 'TEACHER', label: 'Faculty', count: counts.TEACHER, Icon: Building2 },
    { key: 'STUDENT', label: 'Students', count: counts.STUDENT, Icon: GraduationCap },
  ];

  return (
    <div className="space-y-2">
      <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center gap-1.5 p-3 border-b border-[var(--primary)]/5">
          <span className="text-[11px] font-bold text-[var(--text-strong)]/40 uppercase tracking-wider px-1.5 mr-1">
            Role:
          </span>
          {roleFilters.map(({ key, label, count, Icon }) => {
            const active = selectedRole === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onRoleChange(key)}
                aria-pressed={active}
                className={`flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                  active
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm'
                    : 'bg-[color-mix(in_srgb,var(--primary)_5%,white)] text-[var(--text-strong)]/60 border-transparent hover:text-[var(--text-strong)] hover:border-[var(--accent)]/30'
                }`}
              >
                <Icon size={14} className={active ? 'text-[var(--accent)]' : 'text-[var(--text-strong)]/40'} />
                {label}
                <span
                  className={`text-[10px] font-black min-w-[20px] text-center px-1.5 py-0.5 rounded-full ${
                    active ? 'bg-white/15 text-white' : 'bg-white text-[var(--text-strong)]/50'
                  }`}
                >
                  {isLoading ? '—' : count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <SearchInput
            value={searchTerm}
            onChange={onSearchChange}
            placeholder="Search by user name, email, employee ID, section..."
            className="flex-1"
            inputClassName="py-2.5 bg-[color-mix(in_srgb,var(--primary)_5%,white)] border-transparent focus:bg-white"
          />

          <div className="flex items-center gap-1.5 bg-[color-mix(in_srgb,var(--primary)_5%,white)] px-3 py-1.5 rounded-xl border border-[var(--primary)]/10">
            <Filter size={13} className="text-[var(--text-strong)]/50" />
            <span className="text-[11px] font-bold text-[var(--text-strong)]/60 uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value as UserStatusFilter)}
              aria-label="Filter by account status"
              className="bg-transparent text-xs font-extrabold text-[var(--text-strong)] outline-none cursor-pointer"
            >
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
              <option value="ALL">All</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-[var(--text-strong)]/50 px-1">
        <span>
          Showing <strong className="text-[var(--text-strong)]">{shownCount}</strong> of{' '}
          <strong className="text-[var(--text-strong)]">{totalCount}</strong> users
          {selectedRole !== 'ALL' && (
            <span>
              {' '}
              (Filtered by role: <strong>{selectedRole}</strong>)
            </span>
          )}
        </span>
        <span className="hidden sm:inline">Click a column header to sort</span>
      </div>
    </div>
  );
};
