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
    className={cn('w-full caption-bottom text-sm border-collapse', className)}
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
    className={cn('border-t border-border bg-muted/50 font-medium', className)}
    {...props}
  />
);

export const TableRow: React.FC<React.ComponentProps<'tr'>> = ({ className, ...props }) => (
  <tr
    data-slot="table-row"
    className={cn(
      'border-b border-border/20 transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
      className,
    )}
    {...props}
  />
);

export const TableHead: React.FC<React.ComponentProps<'th'>> = ({ className, ...props }) => (
  <th
    data-slot="table-head"
    className={cn(
      'py-3.5 px-4 text-left align-middle text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap',
      className,
    )}
    {...props}
  />
);

export const TableCell: React.FC<React.ComponentProps<'td'>> = ({ className, ...props }) => (
  <td
    data-slot="table-cell"
    className={cn('py-3.5 px-4 align-middle text-sm text-foreground whitespace-nowrap', className)}
    {...props}
  />
);
