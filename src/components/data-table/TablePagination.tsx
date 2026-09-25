import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
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

/**
 * Pagination footer (master handoff Part 2 §6): hidden entirely at ≤10 rows,
 * 32px square outline buttons, active page on the primary variant, and an 80px
 * rows-per-page select that resets to page 1.
 */
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
  if (totalRows <= 10) return null;

  const pages = getPageWindow(page, totalPages);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4 border-t border-border">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{rangeStart}</span> to{' '}
        <span className="font-medium text-foreground">{rangeEnd}</span> of{' '}
        <span className="font-medium text-foreground">{totalRows}</span> results
      </p>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select
            aria-label="Rows per page"
            size="sm"
            className="w-20"
            value={String(rowsPerPage)}
            onValueChange={(value) => onRowsPerPageChange(Number(value))}
            options={ROWS_PER_PAGE_OPTIONS.map((option) => ({
              label: String(option),
              value: String(option),
            }))}
          />
        </div>

        <nav className="flex items-center gap-1" aria-label="Table pagination">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {pages.map((pageNumber, index) => {
            const previous = pages[index - 1];
            const showGap = previous !== undefined && pageNumber - previous > 1;
            return (
              <React.Fragment key={pageNumber}>
                {showGap && <span className="px-1 text-muted-foreground">...</span>}
                <Button
                  variant={pageNumber === page ? 'default' : 'outline'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPageChange(pageNumber)}
                  aria-current={pageNumber === page ? 'page' : undefined}
                >
                  {pageNumber}
                </Button>
              </React.Fragment>
            );
          })}

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
            aria-label="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </nav>
      </div>
    </div>
  );
};
