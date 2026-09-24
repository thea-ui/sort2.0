import React from 'react';
import { AlertTriangle, Inbox, RotateCcw } from 'lucide-react';
import type { SkeletonHint, TableColumn } from './types';

const HINT_WIDTH: Record<SkeletonHint, string> = {
  name: 'w-32',
  pill: 'w-16 h-5 rounded-full',
  badge: 'w-20 h-5 rounded-full',
  number: 'w-10',
  date: 'w-24',
  avatar: 'w-8 h-8 rounded-full',
  text: 'w-full max-w-48',
};

export function LoadingSkeleton<T>({
  columns,
  rows = 6,
}: {
  columns: TableColumn<T>[];
  rows?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b border-[var(--primary)]/5 last:border-0">
          {columns.map((column) => (
            <td key={column.key} className="py-3.5 px-4">
              <div
                className={`h-4 bg-[var(--primary)]/10 rounded animate-pulse opacity-60 ${
                  HINT_WIDTH[column.skeleton ?? 'text']
                }`}
              />
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
}

export const EmptyState: React.FC<EmptyStateProps> = ({ colSpan, title, hint, searchTerm }) => {
  const resolvedTitle =
    title ?? (searchTerm ? `No results for "${searchTerm}"` : 'Nothing here yet');

  return (
    <tr>
      <td colSpan={colSpan} className="py-12 text-center">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-[var(--primary)]/5 text-[var(--text-strong)]/40 flex items-center justify-center">
          <Inbox size={22} />
        </div>
        <p className="mt-3 text-sm font-bold text-[var(--text-strong)]">{resolvedTitle}</p>
        {hint && <p className="mt-1 text-xs text-[var(--text-strong)]/50">{hint}</p>}
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
    <td colSpan={colSpan} className="py-12 text-center">
      <div className="mx-auto h-12 w-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
        <AlertTriangle size={22} />
      </div>
      <p className="mt-3 text-sm font-bold text-[var(--text-strong)]">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[var(--primary)]/10 hover:bg-[var(--primary)]/5 text-xs font-bold text-[var(--text-strong)] cursor-pointer transition-colors"
        >
          <RotateCcw size={13} />
          Try Again
        </button>
      )}
    </td>
  </tr>
);
