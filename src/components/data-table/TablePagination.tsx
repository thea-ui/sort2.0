import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { getPageWindow, ROWS_PER_PAGE_OPTIONS } from './usePagination';

interface TablePaginationProps {
  page: number;
  totalPages: number;
  totalRows: number;
  rowsPerPage: number;
  rangeStart: number;
  rangeEnd: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
}

const NAV_BUTTON =
  'p-2 rounded-lg text-[var(--text-strong)]/50 hover:bg-[var(--primary)]/5 hover:text-[var(--text-strong)] disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors';

export const TablePagination: React.FC<TablePaginationProps> = ({
  page,
  totalPages,
  totalRows,
  rowsPerPage,
  rangeStart,
  rangeEnd,
  onPageChange,
  onRowsPerPageChange,
}) => {
  // SMART parity: the footer is hidden entirely for small result sets.
  if (totalRows <= 10) return null;

  const pages = getPageWindow(page, totalPages);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-[var(--primary)]/5">
      <p className="text-xs text-[var(--text-strong)]/50 font-medium">
        Showing{' '}
        <span className="font-bold text-[var(--text-strong)]">
          {rangeStart}–{rangeEnd}
        </span>{' '}
        of <span className="font-bold text-[var(--text-strong)]">{totalRows}</span>
      </p>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-xs text-[var(--text-strong)]/50 font-medium">
          Rows per page:
          <select
            value={rowsPerPage}
            onChange={(event) => onRowsPerPageChange(Number(event.target.value))}
            className="bg-white border border-[var(--primary)]/10 rounded-xl px-2.5 py-1.5 text-xs font-bold text-[var(--text-strong)] outline-none cursor-pointer focus:border-[var(--accent)]"
          >
            {ROWS_PER_PAGE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <nav className="flex items-center gap-1" aria-label="Table pagination">
          <button
            type="button"
            className={NAV_BUTTON}
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            aria-label="First page"
          >
            <ChevronsLeft size={14} />
          </button>
          <button
            type="button"
            className={NAV_BUTTON}
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft size={14} />
          </button>

          {pages.map((pageNumber, index) => {
            const previous = pages[index - 1];
            const showGap = previous !== undefined && pageNumber - previous > 1;
            return (
              <React.Fragment key={pageNumber}>
                {showGap && <span className="px-1 text-xs text-[var(--text-strong)]/30">…</span>}
                <button
                  type="button"
                  onClick={() => onPageChange(pageNumber)}
                  aria-current={pageNumber === page ? 'page' : undefined}
                  className={`min-w-7 h-7 px-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    pageNumber === page
                      ? 'bg-[var(--accent)] text-white'
                      : 'text-[var(--text-strong)]/60 hover:bg-[var(--primary)]/5 hover:text-[var(--text-strong)]'
                  }`}
                >
                  {pageNumber}
                </button>
              </React.Fragment>
            );
          })}

          <button
            type="button"
            className={NAV_BUTTON}
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            <ChevronRight size={14} />
          </button>
          <button
            type="button"
            className={NAV_BUTTON}
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
            aria-label="Last page"
          >
            <ChevronsRight size={14} />
          </button>
        </nav>
      </div>
    </div>
  );
};
