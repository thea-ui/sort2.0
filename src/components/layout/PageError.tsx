import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface PageErrorProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  icon?: React.ReactNode;
}

/** Canonical route/page error block (SMART `PageError` parity, SORT tokens). */
export const PageError: React.FC<PageErrorProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try Again',
  icon,
}) => (
  <div className="h-64 flex flex-col items-center justify-center text-center px-6">
    <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
      {icon ?? <AlertTriangle size={22} />}
    </div>
    <h3 className="mt-3 text-base font-bold text-[var(--text-strong)]">{title}</h3>
    <p className="mt-1 text-sm text-[var(--text-strong)]/50 max-w-md">{message}</p>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[var(--primary)]/10 hover:bg-[var(--primary)]/5 text-xs font-bold text-[var(--text-strong)] cursor-pointer transition-colors"
      >
        <RotateCcw size={13} />
        {retryLabel}
      </button>
    )}
  </div>
);
