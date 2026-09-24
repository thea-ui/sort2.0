/**
 * Shared date/time formatters (replaces the per-file implementations in
 * AdminReportsTab, AdminCollectionsTab, AdminReportDetailModal, AdminLedgerPage).
 * All formatters are null-safe and return an em-dash for invalid input.
 */

function toDate(input: string | number | Date | null | undefined): Date | null {
  if (input === null || input === undefined || input === '') return null;
  const date = input instanceof Date ? input : new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(input: string | number | Date | null | undefined): string {
  const date = toDate(input);
  if (!date) return '—';
  return date.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatShortDate(input: string | number | Date | null | undefined): string {
  const date = toDate(input);
  if (!date) return '—';
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(input: string | number | Date | null | undefined): string {
  const date = toDate(input);
  if (!date) return '—';
  return date.toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Local YYYY-MM-DD key (safe for day comparisons; no UTC shift). */
export function toDateKey(input: string | number | Date | null | undefined): string {
  const date = toDate(input);
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
