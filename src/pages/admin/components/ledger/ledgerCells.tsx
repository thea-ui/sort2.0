import React from 'react';
import { num } from './ledgerFormatters';

/** Weight/points cell: number when recorded, workflow label when still open. */
export const MetricCell: React.FC<{ value: number; status: string }> = ({ value, status }) => {
  if (value > 0) return <span className="font-semibold">{num(value)}</span>;
  const label =
    status === 'PENDING' ? 'Awaiting' : status === 'DISPATCHED' ? 'In transit' : '—';
  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-wider ${
        label === '—' ? 'text-[var(--text-strong)]/20' : 'text-[var(--text-strong)]/35'
      }`}
    >
      {label}
    </span>
  );
};
