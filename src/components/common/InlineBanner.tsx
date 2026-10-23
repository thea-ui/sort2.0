import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';

/**
 * Inline banners (SMART master handoff Part 4 §6).
 * - `FormBanner`: form-level success/error block, 220ms enter animation.
 * - `PageStatusRow`: page-level status row with 5%/20% tints and a 2px border.
 *
 * Success/error states always use the universal semantic tokens (AGENTS.md §3)
 * — never tenant brand colors, so a red-branded school never shows a red
 * "success" banner.
 */

export const FormBanner: React.FC<{
  variant: 'error' | 'success';
  title: string;
  sub?: string;
  className?: string;
}> = ({ variant, title, sub, className = '' }) =>
  variant === 'error' ? (
    <div
      role="alert"
      className={`mb-4 p-3 rounded-xl bg-red-50 border border-red-100 animate-banner-in ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-4 h-4 text-red-600" />
        </div>
        <p className="text-sm font-bold text-red-700">{title}</p>
      </div>
    </div>
  ) : (
    <div
      role="status"
      className={`mb-4 p-3 rounded-xl border bg-[var(--success)]/10 border-[var(--success)]/25 animate-banner-in ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[var(--success)]/15 flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-4 h-4 text-[var(--success)]" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--success-strong)]">{title}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </div>
    </div>
  );

export const PageStatusRow: React.FC<{
  variant: 'success' | 'destructive';
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}> = ({ variant, children, onDismiss, className = '' }) => {
  const isSuccess = variant === 'success';
  return (
    <div
      className={`p-4 rounded-xl flex items-center gap-2 border-2 ${
        isSuccess
          ? 'bg-[var(--success)]/5 border-[var(--success)]/20 text-[var(--success-strong)]'
          : 'bg-destructive/5 border-destructive/20 text-destructive'
      } ${className}`}
    >
      {isSuccess ? (
        <CheckCircle2 className="w-4 h-4 shrink-0" />
      ) : (
        <AlertTriangle className="w-4 h-4 shrink-0" />
      )}
      <span className="text-sm font-medium">{children}</span>
      {onDismiss && (
        <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={onDismiss}>
          Dismiss
        </Button>
      )}
    </div>
  );
};
