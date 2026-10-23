import React from 'react';
import type { ReportStatus } from '../../types';

/**
 * Single source of truth for report status pills (replaces 4 inline renderers).
 *
 * Statuses map to the universal semantic tokens (AGENTS.md §3) — success green,
 * warning amber, failure red, info blue, neutral muted — so status meaning
 * never depends on the tenant's brand colors.
 */
const STATUS_STYLES: Record<ReportStatus, { label: string; className: string }> = {
  PENDING: {
    label: 'Pending',
    className: 'bg-[var(--warning)]/10 text-[var(--warning-strong)] border-[var(--warning)]/25',
  },
  DISPATCHED: {
    label: 'Dispatched',
    className: 'bg-[var(--info)]/10 text-[var(--info-strong)] border-[var(--info)]/25',
  },
  COLLECTED: {
    label: 'Collected',
    className: 'bg-[var(--success)]/10 text-[var(--success-strong)] border-[var(--success)]/25',
  },
  RESOLVED: {
    label: 'Resolved',
    className: 'bg-[var(--success)]/10 text-[var(--success-strong)] border-[var(--success)]/25',
  },
  DISMISSED: {
    label: 'Dismissed',
    className: 'bg-[var(--danger)]/10 text-[var(--danger-strong)] border-[var(--danger)]/25',
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
