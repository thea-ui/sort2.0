import React from 'react';

interface PageHeaderProps {
  /**
   * Retained for callers: the page title now renders once, in the shell
   * topbar's upper-left (EnrollPro-style).
   */
  title: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

/**
 * Page toolbar: page-level badges and the actions cluster.
 *
 * Page titles no longer render here — they live in the shell topbar
 * (`AppShell`) so every page shows its title once at the upper left.
 * Layout: badges on the left, actions pushed to the right edge and wrapped
 * onto their own line when the row runs out of width — pages that put a full
 * toolbar in `actions` (e.g. School Years) simply get a second, still
 * right-aligned, control row. Renders nothing when neither is provided.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ actions, badge, className = '' }) => {
  if (!badge && !actions) return null;

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-3 ${className}`}>
      {badge && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">{badge}</div>
      )}
      {actions && (
        <div className="flex flex-wrap items-center justify-end gap-3 ml-auto min-w-0">
          {actions}
        </div>
      )}
    </div>
  );
};
