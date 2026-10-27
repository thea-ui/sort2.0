import React from 'react';
import { AlertTriangle, BadgeAlert, Eye } from 'lucide-react';
import { User } from '../../../../types';
import { DataTable } from '../../../../components/data-table';
import type { TableColumn } from '../../../../components/data-table';
import { ROLE_CONFIG, ROLE_ORDER, getUserSectionLabel } from './userRoleConfig';

interface UsersTableViewProps {
  users: User[];
  loading: boolean;
  onInspect: (user: User) => void;
}

export const UsersTableView: React.FC<UsersTableViewProps> = ({ users, loading, onInspect }) => {
  const columns: TableColumn<User>[] = [
    {
      key: 'name',
      header: 'User Name',
      className: 'w-[22%]',
      value: (u) => u.name,
      skeleton: 'avatar',
      cell: (u) => {
        const roleCfg = ROLE_CONFIG[u.role];
        return (
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full ${roleCfg.bg} ${roleCfg.text} font-black flex items-center justify-center text-xs shrink-0 border ${roleCfg.border}`}
            >
              {u.name.charAt(0)}
            </div>
            <p className="max-w-[260px] truncate font-bold leading-tight text-[var(--text-strong)]">
              {u.name}
            </p>
          </div>
        );
      },
    },
    {
      key: 'role',
      header: 'Role & Type',
      className: 'w-[12%]',
      value: (u) => ROLE_ORDER[u.role],
      skeleton: 'pill',
      cell: (u) => {
        const roleCfg = ROLE_CONFIG[u.role];
        const IconComponent = roleCfg.icon;
        return (
          <>
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border inline-flex items-center gap-1.5 ${roleCfg.badgeBg}`}
            >
              <IconComponent size={12} />
              {u.role}
            </span>
            {u.role === 'STUDENT' && u.portalAccountActive === false && (
              <span className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <AlertTriangle size={10} />
                Not login-ready
              </span>
            )}
          </>
        );
      },
    },
    {
      key: 'contact',
      header: 'Contact & Employee ID',
      className: 'w-[26%]',
      value: (u) => u.email,
      skeleton: 'text',
      cell: (u) => (
        <>
          <div className="max-w-[260px] truncate font-mono text-[11px] text-[var(--text-strong)]/70">
            {u.email}
          </div>
          <div className="mt-0.5 font-mono text-[10px] text-[var(--text-strong)]/40">
            {u.employeeId}
          </div>
        </>
      ),
    },
    {
      key: 'section',
      header: 'Section / Dept',
      className: 'w-[18%]',
      value: (u) => getUserSectionLabel(u) || '',
      skeleton: 'text',
      cell: (u) => {
        const section = getUserSectionLabel(u);
        if (!section) {
          return <span className="text-[11px] font-medium text-[var(--text-strong)]/30">—</span>;
        }
        return (
          <span className="rounded-md border border-[var(--primary)]/10 bg-[color-mix(in_srgb,var(--primary)_5%,white)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-strong)]/70">
            {section}
          </span>
        );
      },
    },
    {
      key: 'warnings',
      header: 'Warnings',
      className: 'w-[8%]',
      align: 'center',
      value: (u) => u.warningsCount,
      skeleton: 'number',
      cell: (u) =>
        u.warningsCount > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--warning)]/25 bg-[var(--warning)]/10 px-2 py-0.5 text-[11px] font-extrabold text-[var(--warning-strong)]">
            <BadgeAlert size={12} />
            {u.warningsCount}
          </span>
        ) : (
          <span className="text-[11px] font-medium text-[var(--text-strong)]/30">0</span>
        ),
    },
    {
      key: 'points',
      header: 'Points',
      className: 'w-[8%]',
      align: 'right',
      value: (u) => u.points,
      skeleton: 'number',
      cell: (u) =>
        u.role === 'STUDENT' ? (
          <span className="font-semibold text-[var(--accent)]">
            {u.points.toLocaleString()} pts
          </span>
        ) : (
          <span className="font-medium text-[var(--text-strong)]/30">—</span>
        ),
    },
    {
      key: 'action',
      header: 'Action',
      className: 'w-[6%]',
      align: 'center',
      skeleton: 'pill',
      cell: (u) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onInspect(u);
          }}
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[var(--primary)]/10 bg-white text-[var(--text-strong)]/50 transition-colors hover:border-[var(--accent)]/25 hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]"
          title="Inspect user profile"
          aria-label={`Inspect ${u.name}`}
        >
          <Eye size={15} />
        </button>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={users}
      rowKey={(u) => u.id}
      loading={loading}
      emptyTitle="No user accounts found"
      emptyHint="No accounts match your current filter criteria."
      minWidth="980px"
    />
  );
};
