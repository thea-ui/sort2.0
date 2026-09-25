import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { Card } from '../ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/Table';
import { cn } from '../../utils/cn';
import { EmptyState, ErrorState, LoadingSkeleton } from './TableStates';
import { TablePagination } from './TablePagination';
import { TableToolbar } from './TableToolbar';
import { usePagination } from './usePagination';
import type { TableColumn, TableFilter } from './types';

interface TableSort {
  key: string;
  dir: 'asc' | 'desc';
}

export interface DataTableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyHint?: string;
  onRowClick?: (row: T) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchText?: (row: T) => string;
  filters?: TableFilter[];
  toolbarActions?: React.ReactNode;
  paginate?: boolean;
  /** Minimum table width (e.g. `1100px`) for wide ledgers inside the scroller. */
  minWidth?: string;
  className?: string;
}

const ALIGN_CLASS: Record<'left' | 'center' | 'right', string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

/**
 * Generic table (SMART master handoff Part 2, SORT content): card shell with a
 * 16.8px-class radius and zero inner padding, optional muted header band with
 * the toolbar, loading/error/empty states inside the body, and a pagination
 * footer that hides itself for small result sets. Sorting and footer totals are
 * SORT additions on top of the reference behavior.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  error = null,
  onRetry,
  title,
  description,
  emptyTitle,
  emptyHint,
  onRowClick,
  searchable = false,
  searchPlaceholder,
  searchText,
  filters = [],
  toolbarActions,
  paginate = true,
  minWidth,
  className = '',
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<TableSort | null>(null);

  const filteredRows = useMemo(() => {
    if (!searchable || !searchText || search.trim() === '') return rows;
    const query = search.trim().toLowerCase();
    return rows.filter((row) => searchText(row).toLowerCase().includes(query));
  }, [rows, searchable, searchText, search]);

  const sortedRows = useMemo(() => {
    if (!sort) return filteredRows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.value) return filteredRows;
    const copy = [...filteredRows];
    copy.sort((a, b) => {
      const av = column.value!(a);
      const bv = column.value!(b);
      if (typeof av === 'number' && typeof bv === 'number') {
        return sort.dir === 'asc' ? av - bv : bv - av;
      }
      return sort.dir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return copy;
  }, [filteredRows, sort, columns]);

  const pagination = usePagination({ totalRows: sortedRows.length });
  const visibleRows = paginate ? pagination.slice(sortedRows) : sortedRows;
  const { setPage } = pagination;

  useEffect(() => {
    setPage(1);
  }, [search, sort, setPage]);

  const toggleSort = (column: TableColumn<T>) => {
    if (!column.value) return;
    setSort((prev) => {
      if (!prev || prev.key !== column.key) return { key: column.key, dir: 'asc' };
      if (prev.dir === 'asc') return { key: column.key, dir: 'desc' };
      return null;
    });
  };

  const hasFooter = columns.some((column) => column.footer);
  const showToolbar = searchable || filters.length > 0 || toolbarActions !== undefined;
  const showHeader = Boolean(title || description || showToolbar);
  const colSpan = Math.max(columns.length, 1);

  return (
    <Card className={cn('border border-border shadow-sm bg-card rounded-xl p-0 overflow-hidden', className)}>
      {showHeader && (
        <div className="px-6 py-4 border-b border-border flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {(title || description) && (
            <div>
              {title && <h3 className="text-base font-semibold text-foreground">{title}</h3>}
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
          )}
          {showToolbar && (
            <div className="min-w-0">
              <TableToolbar
                searchValue={searchable ? search : undefined}
                onSearchChange={searchable ? setSearch : undefined}
                searchPlaceholder={searchPlaceholder}
                filters={filters}
                actions={toolbarActions}
              />
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <Table style={minWidth ? { minWidth } : undefined}>
          <TableHeader>
            <TableRow className="bg-muted/50 border-b border-border">
              {columns.map((column) => {
                const isSorted = sort?.key === column.key;
                return (
                  <TableHead
                    key={column.key}
                    scope="col"
                    onClick={column.value ? () => toggleSort(column) : undefined}
                    aria-sort={
                      isSorted ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                    className={cn(
                      ALIGN_CLASS[column.align ?? 'left'],
                      column.value &&
                        'cursor-pointer select-none hover:text-foreground transition-colors',
                      column.className,
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5',
                        column.align === 'right' && 'justify-end',
                        column.align === 'center' && 'justify-center',
                      )}
                    >
                      {column.header}
                      {column.value &&
                        (isSorted ? (
                          sort!.dir === 'asc' ? (
                            <ArrowUp size={12} className="text-foreground" />
                          ) : (
                            <ArrowDown size={12} className="text-foreground" />
                          )
                        ) : (
                          <ChevronsUpDown size={12} className="opacity-30" />
                        ))}
                    </span>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <LoadingSkeleton columns={columns} rows={pagination.rowsPerPage} />
            ) : error ? (
              <ErrorState colSpan={colSpan} message={error} onRetry={onRetry} />
            ) : sortedRows.length === 0 ? (
              <EmptyState
                colSpan={colSpan}
                title={emptyTitle}
                hint={emptyHint}
                searchTerm={searchable ? search : undefined}
              />
            ) : (
              visibleRows.map((row, index) => (
                <TableRow
                  key={rowKey(row, index)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(onRowClick && 'cursor-pointer')}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(ALIGN_CLASS[column.align ?? 'left'], column.className)}
                    >
                      {column.cell
                        ? column.cell(row)
                        : column.value
                          ? String(column.value(row))
                          : ''}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
          {hasFooter && !loading && !error && sortedRows.length > 0 && (
            <TableFooter>
              <TableRow className="border-0 hover:bg-transparent">
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={cn(
                      'font-bold',
                      ALIGN_CLASS[column.align ?? 'left'],
                      column.className,
                    )}
                  >
                    {column.footer ? column.footer(sortedRows) : ''}
                  </TableCell>
                ))}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      {paginate && !loading && !error && sortedRows.length > 0 && (
        <TablePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalRows={pagination.totalRows}
          rowsPerPage={pagination.rowsPerPage}
          rangeStart={pagination.rangeStart}
          rangeEnd={pagination.rangeEnd}
          onPageChange={pagination.setPage}
          onRowsPerPageChange={pagination.setRowsPerPage}
        />
      )}
    </Card>
  );
}
