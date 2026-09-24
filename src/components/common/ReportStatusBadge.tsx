import React from 'react';
import type { ReportStatus } from '../../types';

const STATUS_STYLES: Record<ReportStatus, { label: string; className: string }> = {
  PENDING: {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  DISPATCHED: {
    label: 'Dispatched',
    className: 'bg-[var(--primary)]/10 text-[var(--text-strong)] border-[var(--primary)]/25',
  },
  COLLECTED: {
    label: 'Collected',
    className: 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20',
  },
  RESOLVED: {
    label: 'Resolved',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  DISMISSED: {
    label: 'Dismissed',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  EXPIRED: {
    label: 'Expired',
    className: 'bg-[var(--text-strong)]/5 text-[var(--text-strong)]/50 border-[var(--text-strong)]/10',
  },
};

interface ReportStatusBadgeProps {
  status: ReportStatus;
  className?: string;
}

/** Single source of truth for report status pills (replaces 4 inline renderers). */
export const ReportStatusBadge: React.FC<ReportStatusBadgeProps> = ({ status, className = '' }) => {
  const config = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
};
