import React from 'react';
import { Grid, List, Sparkles } from 'lucide-react';
import { PageHeader } from '../../../../components/layout/PageHeader';

interface UsersHeaderProps {
  accountCount: number;
  isLoading: boolean;
  viewMode: 'table' | 'grouped';
  onViewModeChange: (mode: 'table' | 'grouped') => void;
}

export const UsersHeader: React.FC<UsersHeaderProps> = ({
  accountCount,
  isLoading,
  viewMode,
  onViewModeChange,
}) => (
  <PageHeader
    title="User & Role Management"
    description="Audit user accounts sorted by system role hierarchy (Admin → MRF → Faculty → Student)."
    badge={
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] font-bold text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
          <Sparkles size={11} />
          Role Database Audit
        </span>
        <span className="text-[10px] font-bold text-[var(--gold)] bg-[var(--gold)]/10 border border-[var(--gold)]/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
          {isLoading ? 'Loading accounts…' : `${accountCount} Registered Accounts`}
        </span>
      </div>
    }
    actions={
      <div className="flex items-center gap-1 bg-white/80 border border-white/80 p-1 rounded-full shadow-sm">
        {(
          [
            { mode: 'table' as const, label: 'Table View', icon: List },
            { mode: 'grouped' as const, label: 'Grouped by Role', icon: Grid },
          ]
        ).map(({ mode, label, icon: Icon }) => (
          <button
            key={mode}
            type="button"
            onClick={() => onViewModeChange(mode)}
            aria-pressed={viewMode === mode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              viewMode === mode
                ? 'bg-[var(--primary)] text-white shadow'
                : 'text-[var(--text-strong)]/60 hover:text-[var(--text-strong)] hover:bg-[var(--primary)]/5'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>
    }
  />
);
