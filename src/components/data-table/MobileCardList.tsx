import React from 'react';
import { AlertTriangle, Inbox } from 'lucide-react';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import type { TableColumn } from './types';

export interface MobileCardListProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  renderCard?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyHint?: string;
  searchTerm?: string;
  skeletonRows?: number;
}

const CARD_SHELL =
  'rounded-2xl border border-[var(--table-border)] bg-[var(--table-card)] p-4 shadow-xs';

function columnLabel<T>(column: TableColumn<T>): string {
  return typeof column.header === 'string' && column.header.trim() !== ''
    ? column.header
    : column.key;
}

function DefaultCardBody<T>({ row, columns }: { row: T; columns: TableColumn<T>[] }) {
  return (
    <dl className="flex flex-col gap-2.5">
      {columns.map((column) => {
        const content = column.cell
          ? column.cell(row)
          : column.value
            ? String(column.value(row))
            : null;
        if (content === null || content === undefined || content === '') return null;
        const label = columnLabel(column);

        if (label === column.key) {
          return (
            <dd key={column.key} className="flex justify-end text-[12.5px] text-[var(--table-text)]">
              {content}
            </dd>
          );
        }

        return (
          <div key={column.key} className="min-w-0">
            <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--table-muted)]">
              {label}
            </dt>
            <dd className="mt-0.5 min-w-0 break-words text-[12.5px] leading-relaxed text-[var(--table-text)] [overflow-wrap:anywhere]">
              {content}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function MobileLoadingCards({ count }: { count: number }) {
  return (
    <ul className="flex flex-col gap-3 p-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <li key={index} className={`${CARD_SHELL} animate-pulse space-y-3`}>
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-3/5" />
          <Skeleton className="h-3 w-1/2" />
        </li>
      ))}
    </ul>
  );
}

interface MobileStateProps {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}

function MobileState({ icon, title, hint, action }: MobileStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">{icon}</div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {hint && <p className="max-w-xs text-sm text-muted-foreground">{hint}</p>}
      {action}
    </div>
  );
}

/**
 * Mobile fallback for {@link DataTable}: the same sorted/paginated rows rendered
 * as a card list below the `md` breakpoint, paired with the desktop table.
 * A custom `renderCard` can be supplied for first-class mobile layouts;
 * otherwise cards are derived from the table columns.
 */
export function MobileCardList<T>({
  columns,
  rows,
  rowKey,
  renderCard,
  onRowClick,
  loading = false,
  error = null,
  onRetry,
  emptyTitle,
  emptyHint,
  searchTerm,
  skeletonRows = 6,
}: MobileCardListProps<T>) {
  if (loading) {
    return <MobileLoadingCards count={Math.min(Math.max(skeletonRows, 3), 6)} />;
  }

  if (error) {
    return (
      <MobileState
        icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
        title={error}
        action={
          onRetry ? (
            <Button variant="outline" size="sm" className="h-10 px-4" onClick={onRetry}>
              Retry
            </Button>
          ) : undefined
        }
      />
    );
  }

  if (rows.length === 0) {
    return (
      <MobileState
        icon={<Inbox className="h-5 w-5 text-muted-foreground/60" />}
        title={searchTerm ? `No results for "${searchTerm}"` : emptyTitle ?? 'No results found'}
        hint={
          searchTerm
            ? emptyHint ?? 'Try adjusting your search or filter criteria.'
            : emptyHint
        }
      />
    );
  }

  return (
    <ul className="flex list-none flex-col gap-3 p-3">
      {rows.map((row, index) => {
        const key = rowKey(row, index);
        const body = renderCard ? renderCard(row) : <DefaultCardBody row={row} columns={columns} />;

        return (
          <li key={key} className={CARD_SHELL}>
            {onRowClick ? (
              <button
                type="button"
                onClick={() => onRowClick(row)}
                className="-m-1 flex min-h-11 w-[calc(100%+0.5rem)] cursor-pointer flex-col rounded-xl p-1 text-left outline-none transition-colors hover:bg-[var(--table-row-hover)] focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                {body}
              </button>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ul>
  );
}
