import React from 'react';
import { AlertTriangle, Inbox } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';
import { Button } from '../ui/Button';
import type { SkeletonHint, TableColumn } from './types';

/** Per-column skeleton shapes (master handoff Part 2 §5). */
const HINT_CLASS: Record<SkeletonHint, string> = {
  name: 'h-4 w-28',
  pill: 'h-6 w-16 rounded-full',
  badge: 'h-5 w-14 rounded-md',
  number: 'h-4 w-10',
  date: 'h-4 w-20',
  avatar: 'h-8 w-8 rounded-full',
  text: 'h-4 w-28',
};

function SkeletonCell({ hint }: { hint?: SkeletonHint }) {
  return <Skeleton className={HINT_CLASS[hint ?? 'name']} style={{ opacity: 0.6 }} />;
}

export function LoadingSkeleton<T>({
  columns,
  rows = 6,
}: {
  columns: TableColumn<T>[];
  rows?: number;
}) {
  const rowCount = Math.min(Math.max(rows, 6), 10);
  return (
    <>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-0 hover:bg-transparent">
          {columns.map((column) => (
            <td key={column.key} className="border-0 py-3.5 px-4">
              <SkeletonCell hint={column.skeleton} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

interface EmptyStateProps {
  colSpan: number;
  title?: string;
  hint?: string;
  searchTerm?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  colSpan,
  title,
  hint,
  searchTerm,
  icon,
  action,
}) => {
  const displayTitle = searchTerm ? `No results for "${searchTerm}"` : title ?? 'No results found';
  const displayHint = searchTerm
    ? hint ?? 'Try adjusting your search or filter criteria.'
    : hint;

  return (
    <tr>
      <td colSpan={colSpan} className="py-14 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            {icon ?? <Inbox className="h-5 w-5 text-muted-foreground/60" />}
          </div>
          <p className="text-sm font-semibold text-foreground">{displayTitle}</p>
          {displayHint && <p className="text-sm text-muted-foreground max-w-xs">{displayHint}</p>}
          {action}
        </div>
      </td>
    </tr>
  );
};

interface ErrorStateProps {
  colSpan: number;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ colSpan, message, onRetry }) => (
  <tr>
    <td colSpan={colSpan} className="py-14 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <p className="text-sm font-semibold text-foreground">{message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    </td>
  </tr>
);
