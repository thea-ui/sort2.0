import { useCallback, useState } from 'react';

/** SMART parity: 1-based pagination, these exact options, default 10. */
export const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
export const DEFAULT_ROWS_PER_PAGE = 10;

export function getTotalPages(totalRows: number, rowsPerPage: number): number {
  if (rowsPerPage <= 0) return 1;
  return Math.max(1, Math.ceil(totalRows / rowsPerPage));
}

export function clampPage(page: number, totalPages: number): number {
  return Math.min(Math.max(1, page), Math.max(1, totalPages));
}

/**
 * Page numbers to render (master handoff Part 2 §6): up to 7 pages are all
 * shown; beyond that the window is first, last, the current page and its
 * immediate neighbours, deduped and sorted. Gaps render as ellipses in the
 * pagination component.
 */
export function getPageWindow(page: number, totalPages: number): number[] {
  const MAX_VISIBLE = 7;
  if (totalPages <= MAX_VISIBLE) {
    return Array.from({ length: Math.max(1, totalPages) }, (_, index) => index + 1);
  }
  const candidates = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  return Array.from(candidates)
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b);
}

export interface UsePaginationArgs {
  totalRows: number;
  initialRowsPerPage?: number;
}

export function usePagination({
  totalRows,
  initialRowsPerPage = DEFAULT_ROWS_PER_PAGE,
}: UsePaginationArgs) {
  const [page, setPageState] = useState(1);
  const [rowsPerPage, setRowsPerPageState] = useState(initialRowsPerPage);

  const totalPages = getTotalPages(totalRows, rowsPerPage);
  const safePage = clampPage(page, totalPages);

  const setPage = useCallback(
    (next: number) => setPageState(clampPage(next, totalPages)),
    [totalPages],
  );

  const setRowsPerPage = useCallback((next: number) => {
    setRowsPerPageState(next);
    setPageState(1);
  }, []);

  const slice = <T,>(rows: T[]): T[] => {
    const start = (safePage - 1) * rowsPerPage;
    return rows.slice(start, start + rowsPerPage);
  };

  return {
    page: safePage,
    totalPages,
    rowsPerPage,
    totalRows,
    rangeStart: totalRows === 0 ? 0 : (safePage - 1) * rowsPerPage + 1,
    rangeEnd: Math.min(safePage * rowsPerPage, totalRows),
    setPage,
    setRowsPerPage,
    slice,
  };
}
