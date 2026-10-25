import React from 'react';
import type { LucideIcon } from 'lucide-react';

export const studentPage = 'w-full space-y-5 sm:space-y-6 pb-8 animate-fade-in';

export const studentPanel = 'rounded-2xl border border-[var(--primary)]/10 bg-white';

export const studentPanelHeader =
  'flex items-center justify-between gap-3 border-b border-[var(--primary)]/10 px-4 py-3.5 sm:px-5';

export const studentSectionTitle =
  'text-[13px] font-heading font-extrabold tracking-tight text-[var(--text-strong)]';

interface StudentPageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: React.ReactNode;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}

export const StudentPageHeader: React.FC<StudentPageHeaderProps> = ({
  eyebrow,
  title,
  description,
  meta,
  icon: Icon,
  actions,
}) => (
  <header className="rounded-2xl border border-[var(--primary)]/10 bg-white px-4 py-4 sm:px-6 sm:py-5">
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
            <Icon size={19} />
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--accent)]">
              {eyebrow}
            </p>
          )}
          <h2 className="text-lg font-heading font-black tracking-tight text-[var(--text-strong)] sm:text-xl">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-xs font-medium leading-relaxed text-[var(--text-strong)]/60 sm:text-[13px]">
              {description}
            </p>
          )}
        </div>
      </div>
      {(meta || actions) && (
        <div className="flex shrink-0 items-center gap-2">
          {meta}
          {actions}
        </div>
      )}
    </div>
  </header>
);


