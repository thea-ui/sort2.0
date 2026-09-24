import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

/**
 * Canonical page title block (SMART `PageHeader` parity, SORT tokens).
 * The `text-2xl` utility overrides the global h1 base size.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  badge,
  className = '',
}) => (
  <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}>
    <div>
      {badge}
      <h1 className="text-2xl font-bold tracking-tight text-[var(--text-strong)]">{title}</h1>
      {description && (
        <p className="hidden sm:block text-sm text-[var(--text-strong)]/50 mt-0.5">{description}</p>
      )}
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
);
