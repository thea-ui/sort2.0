import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
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
 * Generic table (SMART `DataTable` parity, SORT tokens): card shell, optional
 * header band + toolbar, loading/error/empty switching, and pagination that
 * hides itself for small result sets.
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
    <div
      className={`bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl shadow-sm overflow-hidden ${className}`}
    >
      {showHeader && (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-6 pt-5 pb-4 border-b border-[var(--primary)]/5">
          <div>
            {title && <h3 className="text-base font-semibold text-[var(--text-strong)]">{title}</h3>}
            {description && (
              <p className="text-xs tracking-wide font-medium uppercase text-[var(--text-strong)]/50 mt-0.5">
                {description}
              </p>
            )}
          </div>
          {showToolbar && (
            <TableToolbar
              searchValue={searchable ? search : undefined}
              onSearchChange={searchable ? setSearch : undefined}
              searchPlaceholder={searchPlaceholder}
              filters={filters}
              actions={toolbarActions}
            />
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table
          className="w-full text-left text-sm border-collapse"
          style={minWidth ? { minWidth } : undefined}
        >
          <thead>
            <tr className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-strong)]/40 bg-[var(--primary)]/5 border-b border-[var(--primary)]/10">
              {columns.map((column) => {
                const isSorted = sort?.key === column.key;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    onClick={column.value ? () => toggleSort(column) : undefined}
                    aria-sort={
                      isSorted ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                    className={`py-3 px-4 ${ALIGN_CLASS[column.align ?? 'left']} ${
                      column.value
                        ? 'cursor-pointer select-none hover:text-[var(--text-strong)]/70 transition-colors'
                        : ''
                    } ${column.className ?? ''}`}
                  >
                    <span
                      className={`inline-flex items-center gap-1.5 ${
                        column.align === 'right'
                          ? 'justify-end'
                          : column.align === 'center'
                            ? 'justify-center'
                            : ''
                      }`}
                    >
                      {column.header}
                      {column.value &&
                        (isSorted ? (
                          sort!.dir === 'asc' ? (
                            <ArrowUp size={12} className="text-[var(--accent)]" />
                          ) : (
                            <ArrowDown size={12} className="text-[var(--accent)]" />
                          )
                        ) : (
                          <ChevronsUpDown size={12} className="opacity-30" />
                        ))}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--primary)]/5">
            {loading ? (
              <LoadingSkeleton columns={columns} />
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
                <tr
                  key={rowKey(row, index)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`transition-colors hover:bg-[var(--accent)]/5 ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`py-3.5 px-4 text-sm text-[var(--text-strong)] whitespace-nowrap ${
                        ALIGN_CLASS[column.align ?? 'left']
                      } ${column.className ?? ''}`}
                    >
                      {column.cell
                        ? column.cell(row)
                        : column.value
                          ? String(column.value(row))
                          : ''}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {hasFooter && !loading && !error && sortedRows.length > 0 && (
            <tfoot className="border-t border-[var(--primary)]/10 bg-[var(--primary)]/5">
              <tr>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`py-3 px-4 text-sm font-bold text-[var(--text-strong)] whitespace-nowrap ${
                      ALIGN_CLASS[column.align ?? 'left']
                    } ${column.className ?? ''}`}
                  >
                    {column.footer ? column.footer(sortedRows) : ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {paginate && (
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
    </div>
  );
}
