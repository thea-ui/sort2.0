import type { ReactNode } from 'react';

/** Shape hints used by the loading skeleton so it mirrors the real cells. */
export type SkeletonHint = 'name' | 'pill' | 'badge' | 'number' | 'date' | 'avatar' | 'text';

export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  /** Custom cell renderer. Falls back to `String(value(row))` when omitted. */
  cell?: (row: T) => ReactNode;
  /**
   * Raw value accessor: enables column sorting and is the canonical value for
   * exports (CSV). Cells may still render custom content via `cell`.
   */
  value?: (row: T) => string | number;
  /** Optional totals-row renderer; a footer row appears when any column has one. */
  footer?: (rows: T[]) => ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  skeleton?: SkeletonHint;
}

export interface TableFilterOption {
  label: string;
  value: string;
}

/**
 * A controlled filter control rendered in the table toolbar. Row filtering for
 * filters is owned by the caller (pass already-filtered rows); DataTable only
 * renders the control.
 */
export interface TableFilter {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: TableFilterOption[];
}
