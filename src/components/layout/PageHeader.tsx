import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

/**
 * Canonical page title block (SMART master handoff Part 1 §3).
 *
 * Layout: an identity block (title + inline badge + description) on the left and
 * the actions cluster on the right. The actions are pushed to the right edge and
 * wrap onto their own line when the row runs out of width, so neither the title
 * nor the description is ever squeezed into a narrow column — pages that put a
 * full toolbar in `actions` (e.g. School Years) simply get a second, still
 * right-aligned, control row.
 *
 * - `description` is 14px muted and hidden below 640px; keep it under ~80 chars.
 * - Actions keep 12px gaps (`gap-3`) and never shrink.
 * The `text-2xl` utility overrides the global h1 base size.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  badge,
  className = '',
}) => (
  <div className={`flex flex-wrap items-center gap-x-4 gap-y-3 ${className}`}>
    <div className="flex flex-col gap-1.5 grow min-w-0 sm:shrink-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>
      {description && (
        <p className="text-sm text-muted-foreground hidden sm:block max-w-[100ch]">{description}</p>
      )}
    </div>
    {actions && (
      <div className="flex flex-wrap items-center justify-end gap-3 ml-auto min-w-0">
        {actions}
      </div>
    )}
  </div>
);
