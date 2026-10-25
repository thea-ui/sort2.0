import React from 'react';

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  iconClassName?: string;
  footer: React.ReactNode;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  icon,
  iconClassName = 'bg-[var(--accent)]/10 text-[var(--accent)]',
  footer,
}) => (
  <div className="group flex h-full flex-col rounded-2xl border border-[var(--primary)]/10 bg-white p-4 transition-all duration-200 hover:border-[var(--primary)]/15 hover:shadow-sm sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <p className="pt-0.5 text-[11px] font-semibold uppercase leading-4 tracking-[0.08em] text-[var(--text-strong)]/45">
        {label}
      </p>
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${iconClassName}`}
      >
        {icon}
      </div>
    </div>
    <p className="mb-4 mt-2.5 text-2xl font-semibold leading-tight tracking-tight text-[var(--text-strong)] tabular-nums">
      {value}
    </p>
    <div className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--primary)]/10 pt-3 text-[11px] font-medium text-[var(--text-strong)]/50">
      {footer}
    </div>
  </div>
);
