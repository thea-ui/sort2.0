import React, { useMemo, useState, useEffect } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

export interface SheetColumn<T = any> {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  width?: string;
  /** Raw value used for sorting and CSV export. */
  value?: (row: T) => string | number;
  /** Optional custom cell renderer (badges, formatting). */
  render?: (row: T) => React.ReactNode;
  /** Optional totals-row renderer. */
  total?: (rows: T[]) => React.ReactNode;
  totalAlign?: 'left' | 'right' | 'center';
}

interface LedgerSheetTableProps<T = any> {
  columns: SheetColumn<T>[];
  rows: T[];
  getRowId: (row: T, index: number) => string;
  emptyMessage?: string;
  minWidth?: string;
  defaultPageSize?: number;
  hideIndex?: boolean;
  borderless?: boolean;
  onRowClick?: (row: T) => void;
}

const alignClass = (a?: string) =>
  a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';

export function LedgerSheetTable<T = any>({
  columns,
  rows,
  getRowId,
  emptyMessage = 'No records found',
  minWidth,
  defaultPageSize = 15,
  hideIndex = false,
  borderless = false,
  onRowClick,
}: LedgerSheetTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [pageSize, setPageSize] = useState<number | 'all'>(defaultPageSize);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page to 1 when rows length or sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [rows.length, sort?.key, sort?.dir]);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.value) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = col.value!(a);
      const bv = col.value!(b);
      if (typeof av === 'number' && typeof bv === 'number') {
        return sort.dir === 'asc' ? av - bv : bv - av;
      }
      return sort.dir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return copy;
  }, [rows, sort, columns]);

  const totalRows = sortedRows.length;
  const totalPages =
    pageSize === 'all' ? 1 : Math.max(1, Math.ceil(totalRows / pageSize));

  // Clamping
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [totalPages, currentPage]);

  const startIdx =
    pageSize === 'all' ? 0 : (currentPage - 1) * pageSize;
  const endIdx =
    pageSize === 'all' ? totalRows : Math.min(startIdx + pageSize, totalRows);

  const displayedRows = useMemo(() => {
    if (pageSize === 'all') return sortedRows;
    return sortedRows.slice(startIdx, endIdx);
  }, [sortedRows, pageSize, startIdx, endIdx]);

  const toggleSort = (key: string) => {
    const col = columns.find((c) => c.key === key);
    if (!col?.value) return;
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  const hasTotals = columns.some((c) => c.total);

  // Generate page pill list with dots
  const pagePills = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, '...', totalPages];
    }
    if (currentPage >= totalPages - 2) {
      return [1, '...', totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage, '...', totalPages];
  }, [currentPage, totalPages]);

  return (
    <div
      className={`bg-white flex flex-col ${
        borderless
          ? 'w-full'
          : 'border border-gray-100 rounded-2xl shadow-xs overflow-hidden'
      }`}
    >
      <div className="overflow-auto max-h-[64vh]">
        <table
          className="w-full border-collapse text-xs"
          style={{ minWidth: minWidth || '100%' }}
        >
          <thead className="sticky top-0 z-20 bg-[#FAF8F5] border-b border-gray-100/90 backdrop-blur-xs">
            <tr>
              {!hideIndex && (
                <th className="w-12 px-4 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider sticky left-0 z-30 bg-[#FAF8F5]">
                  #
                </th>
              )}
              {columns.map((c) => {
                const isSorted = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    onClick={() => toggleSort(c.key)}
                    style={c.width ? { width: c.width } : undefined}
                    className={`px-4 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap ${alignClass(
                      c.align
                    )} ${
                      c.value
                        ? 'cursor-pointer select-none hover:text-slate-600 hover:bg-slate-100/50 transition-colors'
                        : ''
                    }`}
                  >
                    <span
                      className={`inline-flex items-center gap-1.5 ${
                        c.align === 'right'
                          ? 'justify-end'
                          : c.align === 'center'
                          ? 'justify-center'
                          : ''
                      }`}
                    >
                      {c.label}
                      {c.value &&
                        (isSorted ? (
                          sort!.dir === 'asc' ? (
                            <ArrowUp size={12} className="text-[#00A77C]" />
                          ) : (
                            <ArrowDown size={12} className="text-[#00A77C]" />
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
          <tbody className="divide-y divide-gray-100/80 bg-white">
            {displayedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (hideIndex ? 0 : 1)}
                  className="px-4 py-16 text-center text-slate-400 text-xs"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              displayedRows.map((row, i) => {
                const globalIndex = startIdx + i + 1;
                return (
                  <tr
                    key={getRowId(row, i)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={`hover:bg-slate-50/70 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    {!hideIndex && (
                      <td className="w-12 px-4 py-3.5 text-left text-slate-400 font-mono text-[11px] select-none sticky left-0 bg-white">
                        {globalIndex}
                      </td>
                    )}
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={`px-4 py-3.5 text-xs text-[#00271D] ${alignClass(
                          c.align
                        )} ${c.align === 'right' ? 'tabular-nums font-mono' : ''}`}
                      >
                        {c.render ? c.render(row) : String(c.value ? c.value(row) : '')}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
          {hasTotals && sortedRows.length > 0 && (
            <tfoot className="sticky bottom-0 z-10 border-t-2 border-slate-200/80 bg-[#FAF8F5]/95 backdrop-blur-xs">
              <tr>
                {!hideIndex && (
                  <td className="px-4 py-3 text-left font-bold text-xs text-slate-400 sticky left-0 bg-[#FAF8F5]/95">
                    Total
                  </td>
                )}
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-4 py-3 font-bold text-xs text-[#00271D] ${alignClass(
                      c.totalAlign ?? c.align
                    )} ${(c.totalAlign ?? c.align) === 'right' ? 'tabular-nums font-mono' : ''}`}
                  >
                    {c.total ? c.total(sortedRows) : ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination Bar Matching Image 1 */}
      <div className="border-t border-gray-100 px-4 py-3 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 select-none">
        {/* Left: Record count */}
        <div className="text-slate-400 font-medium">
          Showing{' '}
          <span className="font-semibold text-slate-600">
            {totalRows === 0 ? 0 : startIdx + 1}–{endIdx}
          </span>{' '}
          of <span className="font-semibold text-slate-600">{totalRows}</span> records
        </div>

        {/* Center & Right Controls */}
        <div className="flex items-center gap-4">
          {/* Rows selector */}
          <div className="flex items-center gap-1.5 text-slate-500">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                setPageSize(val);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-slate-700 font-semibold outline-none cursor-pointer hover:border-gray-300 transition-colors shadow-2xs"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value="all">All</option>
            </select>
          </div>

          {/* Page pills & navigation */}
          {pageSize !== 'all' && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
                title="First page"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft size={16} />
              </button>

              {pagePills.map((p, idx) =>
                p === '...' ? (
                  <span
                    key={`dots-${idx}`}
                    className="px-1 text-slate-400 text-xs select-none"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCurrentPage(Number(p))}
                    className={`min-w-[28px] h-7 text-xs font-bold rounded-lg transition-colors flex items-center justify-center cursor-pointer ${
                      currentPage === p
                        ? 'bg-[#00271D] text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Next page"
              >
                <ChevronRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Last page"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
