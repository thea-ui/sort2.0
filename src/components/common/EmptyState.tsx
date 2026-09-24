import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  hint?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/** Canonical page/section empty state (icon tile + title + hint + action). */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  hint,
  icon,
  action,
  className = '',
}) => (
  <div className={`text-center py-12 space-y-2 ${className}`}>
    <div className="h-12 w-12 mx-auto rounded-2xl bg-[var(--primary)]/5 text-[var(--text-strong)]/40 flex items-center justify-center">
      {icon ?? <Inbox size={22} />}
    </div>
    <p className="text-sm font-bold text-[var(--text-strong)]">{title}</p>
    {hint && <p className="text-xs text-[var(--text-strong)]/50">{hint}</p>}
    {action && <div className="pt-1 flex justify-center">{action}</div>}
  </div>
);
