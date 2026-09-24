import React from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp';

interface StatTrend {
  value: string;
  direction: 'up' | 'down' | 'neutral';
  hint?: string;
}

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  numericValue?: number;
  icon?: React.ReactNode;
  /** Replaces the default accent icon tile styling when provided. */
  iconClassName?: string;
  trend?: StatTrend;
  badge?: React.ReactNode;
  badgeClassName?: string;
  footer?: React.ReactNode;
  className?: string;
}

const TREND_STYLES: Record<StatTrend['direction'], string> = {
  up: 'text-emerald-600',
  down: 'text-rose-600',
  neutral: 'text-[var(--text-strong)]/50',
};

/** Stat tile (SMART `StatCard` parity): count-up when `numericValue` is given. */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  numericValue,
  icon,
  iconClassName,
  trend,
  badge,
  badgeClassName = 'bg-[var(--primary)]/5 text-[var(--text-strong)]/60 border-[var(--primary)]/10',
  footer,
  className = '',
}) => {
  const animated = useCountUp(numericValue ?? 0);
  const display = numericValue !== undefined ? animated : value;

  const TrendIcon =
    trend?.direction === 'up' ? ArrowUpRight : trend?.direction === 'down' ? ArrowDownRight : Minus;

  return (
    <div
      className={`bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        {icon && (
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              iconClassName || 'bg-[var(--accent)]/10 text-[var(--accent)]'
            }`}
          >
            {icon}
          </div>
        )}
        {trend ? (
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-bold ${TREND_STYLES[trend.direction]}`}
            title={trend.hint}
          >
            <TrendIcon size={12} />
            {trend.value}
          </span>
        ) : (
          badge && (
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider border px-2.5 py-1 rounded-full whitespace-nowrap ${badgeClassName}`}
            >
              {badge}
            </span>
          )
        )}
      </div>
      <p className="mt-4 text-xs font-medium text-[var(--text-strong)]/50">{label}</p>
      <p className="text-2xl font-bold text-[var(--text-strong)] tabular-nums">{display}</p>
      {footer && (
        <p
          className="text-[11px] font-medium text-[var(--text-strong)]/50 mt-4 pt-3 border-t border-[var(--primary)]/5 truncate"
          title={typeof footer === 'string' ? footer : undefined}
        >
          {footer}
        </p>
      )}
    </div>
  );
};
