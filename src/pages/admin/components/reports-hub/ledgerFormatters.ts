export const peso = (n: number) =>
  `₱${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const num = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

export const shortDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  DISPATCHED: 'bg-[var(--primary)]/10 text-[var(--text-strong)] border-[var(--primary)]/25',
  COLLECTED: 'bg-[var(--primary)]/10 text-[var(--text-strong)] border-[var(--primary)]/25',
  RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DISMISSED: 'bg-[var(--primary)]/5 text-[var(--text-strong)]/50 border-[var(--primary)]/10',
  EXPIRED: 'bg-rose-50 text-rose-600 border-rose-200',
};

export const ledgerStatusClass = (status: string): string =>
  STATUS_STYLES[status] ||
  'bg-[var(--primary)]/5 text-[var(--text-strong)]/60 border-[var(--primary)]/10';
