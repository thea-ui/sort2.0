import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Table primitives (SMART master handoff Part 2 §13, merged with the DataTable
 * overrides in §2 so there is no conflicting padding/typography between the
 * primitive defaults and the table component).
 */

export const Table: React.FC<React.ComponentProps<'table'>> = ({ className, ...props }) => (
  <table
    data-slot="table"
    className={cn('w-full caption-bottom text-[13px] border-collapse', className)}
    {...props}
  />
);

export const TableHeader: React.FC<React.ComponentProps<'thead'>> = ({ className, ...props }) => (
  <thead data-slot="table-header" className={cn('[&_tr]:border-b', className)} {...props} />
);

export const TableBody: React.FC<React.ComponentProps<'tbody'>> = ({ className, ...props }) => (
  <tbody data-slot="table-body" className={cn('[&_tr:last-child]:border-0', className)} {...props} />
);

export const TableFooter: React.FC<React.ComponentProps<'tfoot'>> = ({ className, ...props }) => (
  <tfoot
    data-slot="table-footer"
    className={cn('border-t border-[var(--table-border)] bg-[var(--table-header-bg)] font-medium', className)}
    {...props}
  />
);

export const TableRow: React.FC<React.ComponentProps<'tr'>> = ({ className, ...props }) => (
  <tr
    data-slot="table-row"
    className={cn(
      'border-b border-[var(--table-border)] transition-colors hover:bg-[var(--table-row-hover)] data-[state=selected]:bg-[var(--table-header-bg)]',
      className,
    )}
    {...props}
  />
);

export const TableHead: React.FC<React.ComponentProps<'th'>> = ({ className, ...props }) => (
  <th
    data-slot="table-head"
    className={cn(
      'h-11 px-5 py-3 text-left align-middle text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--table-muted)] whitespace-nowrap',
      className,
    )}
    {...props}
  />
);

export const TableCell: React.FC<React.ComponentProps<'td'>> = ({ className, ...props }) => (
  <td
    data-slot="table-cell"
    className={cn('px-5 py-4 align-middle text-[13px] leading-relaxed text-[var(--table-text)] whitespace-nowrap', className)}
    {...props}
  />
);
