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
            <p className="font-bold text-[var(--text-strong)] leading-tight">{u.name}</p>
          </div>
        );
      },
    },
    {
      key: 'role',
      header: 'Role & Type',
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
      value: (u) => u.email,
      skeleton: 'text',
      cell: (u) => (
        <>
          <div className="font-mono text-[11px] text-[var(--text-strong)]/70">{u.email}</div>
          <div className="font-mono text-[10px] text-[var(--text-strong)]/40 mt-0.5">{u.employeeId}</div>
        </>
      ),
    },
    {
      key: 'section',
      header: 'Section / Dept',
      value: (u) => getUserSectionLabel(u) || '',
      skeleton: 'text',
      cell: (u) => {
        const section = getUserSectionLabel(u);
        if (!section) {
          return <span className="text-[var(--text-strong)]/30 italic text-[11px]">—</span>;
        }
        return (
          <span className="px-2 py-0.5 bg-[var(--primary)]/5 border border-[var(--primary)]/10 rounded-md text-[10px] font-bold text-[var(--text-strong)]/70">
            {section}
          </span>
        );
      },
    },
    {
      key: 'warnings',
      header: 'Warnings',
      align: 'center',
      value: (u) => u.warningsCount,
      skeleton: 'number',
      cell: (u) =>
        u.warningsCount > 0 ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-50 text-rose-600 border border-rose-200">
            <BadgeAlert size={12} />
            {u.warningsCount}
          </span>
        ) : (
          <span className="text-[var(--text-strong)]/30 font-medium text-[11px]">0</span>
        ),
    },
    {
      key: 'points',
      header: 'Points',
      align: 'right',
      value: (u) => u.points,
      skeleton: 'number',
      cell: (u) =>
        u.role === 'STUDENT' ? (
          <span className="text-[var(--accent)] font-black">{u.points.toLocaleString()} pts</span>
        ) : (
          <span className="text-[var(--text-strong)]/30 italic font-medium">—</span>
        ),
    },
    {
      key: 'action',
      header: 'Action',
      align: 'center',
      skeleton: 'pill',
      cell: (u) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onInspect(u);
          }}
          className="p-1.5 text-[var(--text-strong)]/60 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-xl transition-all cursor-pointer"
          title="Inspect User Profile"
        >
          <Eye size={16} />
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
