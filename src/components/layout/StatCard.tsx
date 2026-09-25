import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { cn } from '../../utils/cn';
import { useCountUp } from '../../hooks/useCountUp';

interface StatTrend {
  value: string;
  direction: 'up' | 'down' | 'neutral';
  hint?: string;
}

interface StatCardProps {
  label: string;
  /** Display value; omit when `numericValue` supplies the animated number. */
  value?: React.ReactNode;
  numericValue?: number;
  icon?: React.ReactNode;
  /** Replaces the default muted icon-tile styling when provided. */
  iconClassName?: string;
  trend?: StatTrend;
  /** SORT extra: a chip rendered beside the icon tile. */
  badge?: React.ReactNode;
  badgeClassName?: string;
  /** SORT extra: a muted line rendered in the bottom-bordered row. */
  footer?: React.ReactNode;
  /** SORT extra: makes the tile a navigable button with hover feedback. */
  onClick?: () => void;
  className?: string;
}

const TREND_STYLES: Record<StatTrend['direction'], string> = {
  up: 'text-emerald-600',
  down: 'text-red-600',
  neutral: 'text-muted-foreground',
};

/**
 * Stat tile (SMART master handoff Part 6 §4): borderless card with `shadow-lg`
 * in a muted tint, 16px padding, 12px muted label above a 24px bold value, an
 * optional 32px muted icon tile on the right, and an optional bottom-bordered
 * trend row. Numeric values count up over 800ms with cubic ease-out and skip
 * the animation under `prefers-reduced-motion`.
 *
 * Passing `onClick` renders the tile as a `<button>` with the identical surface
 * plus hover lift, so navigable KPIs stay in the same visual language.
 */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  numericValue,
  icon,
  iconClassName,
  trend,
  badge,
  badgeClassName = 'bg-muted text-muted-foreground border-border',
  footer,
  onClick,
  className = '',
}) => {
  const animated = useCountUp(numericValue ?? 0);
  const display = numericValue !== undefined ? animated : value;

  const surface = (
    <>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground tabular-nums">{display}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {badge && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider border px-2 py-0.5 rounded-full whitespace-nowrap',
                badgeClassName,
              )}
            >
              {badge}
            </span>
          )}
          {icon && (
            <div className={cn('p-2 rounded-lg bg-muted [&>svg]:w-4 [&>svg]:h-4', iconClassName)}>
              {icon}
            </div>
          )}
        </div>
      </div>

      {(trend || footer) && (
        <div className="mt-2 pt-2 border-t border-border">
          {trend && (
            <span className={cn('inline-flex items-center text-xs font-medium', TREND_STYLES[trend.direction])}>
              {trend.value}
            </span>
          )}
          {trend?.hint && <span className="text-xs text-muted-foreground ml-1">{trend.hint}</span>}
          {footer && (
            <p
              className="text-xs text-muted-foreground truncate"
              title={typeof footer === 'string' ? footer : undefined}
            >
              {footer}
            </p>
          )}
        </div>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex flex-col overflow-hidden rounded-xl bg-card text-sm text-card-foreground border-0 shadow-lg shadow-muted/50 p-0 gap-0 text-left w-full cursor-pointer',
          'transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          className,
        )}
      >
        <div className="p-4">{surface}</div>
      </button>
    );
  }

  return (
    <Card className={cn('border-0 shadow-lg shadow-muted/50 rounded-xl bg-card p-0', className)}>
      <CardContent className="p-4!">{surface}</CardContent>
    </Card>
  );
};
