import React from 'react';
import { AlertTriangle, BadgeAlert, Eye } from 'lucide-react';
import { Role, User } from '../../../../types';
import { ROLE_ORDER } from './userRoleConfig';
import type { UserRoleGroup } from './useUserDirectory';

interface UsersGroupedViewProps {
  groups: UserRoleGroup[];
  selectedRole: Role | 'ALL';
  onInspect: (user: User) => void;
}

export const UsersGroupedView: React.FC<UsersGroupedViewProps> = ({
  groups,
  selectedRole,
  onInspect,
}) => (
  <div className="space-y-6">
    {groups.map((group) => {
      if (selectedRole !== 'ALL' && group.role !== selectedRole) return null;
      const IconComponent = group.config.icon;

      return (
        <div
          key={group.role}
          className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[var(--primary)]/5 pb-3">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-2xl ${group.config.bg} ${group.config.text} border ${group.config.border}`}
              >
                <IconComponent size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-strong)]">
                  {group.config.label}s ({group.role})
                </h3>
                <p className="text-xs text-[var(--text-strong)]/40 font-medium">
                  {group.list.length} accounts found
                </p>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${group.config.badgeBg}`}
            >
              Priority Rank #{ROLE_ORDER[group.role]}
            </span>
          </div>

          {group.list.length === 0 ? (
            <p className="text-xs text-[var(--text-strong)]/40 italic py-4">
              No users match this role query.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {group.list.map((u) => (
                <div
                  key={u.id}
                  className="p-4 bg-[var(--primary)]/5 border border-[var(--primary)]/5 rounded-2xl flex flex-col justify-between space-y-3 hover:border-[var(--accent)]/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-full ${group.config.bg} ${group.config.text} font-black flex items-center justify-center text-xs shrink-0 border ${group.config.border}`}
                      >
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[var(--text-strong)]">{u.name}</h4>
                        <p className="text-[10px] font-mono text-[var(--text-strong)]/50">{u.email}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onInspect(u)}
                      aria-label={`Inspect ${u.name}`}
                      className="p-1 text-[var(--text-strong)]/40 hover:text-[var(--accent)] rounded-lg cursor-pointer transition-colors"
                    >
                      <Eye size={15} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[var(--primary)]/5">
                    <span className="font-mono text-[var(--text-strong)]/50 text-[10px]">
                      {u.employeeId}
                    </span>
                    <div className="flex items-center gap-2">
                      {u.role === 'STUDENT' && u.portalAccountActive === false && (
                        <span className="inline-flex items-center gap-0.5 text-amber-700 font-extrabold text-[10px] bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                          <AlertTriangle size={10} /> Not login-ready
                        </span>
                      )}
                      {u.warningsCount > 0 && (
                        <span className="text-rose-600 font-extrabold text-[10px] flex items-center gap-0.5 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full">
                          <BadgeAlert size={10} /> {u.warningsCount}
                        </span>
                      )}
                      {u.role === 'STUDENT' && (
                        <span className="font-black text-[var(--accent)]">
                          {u.points.toLocaleString()} pts
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    })}
  </div>
);
