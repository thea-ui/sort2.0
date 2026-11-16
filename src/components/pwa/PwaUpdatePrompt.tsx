import React from 'react';
import { RefreshCw } from 'lucide-react';

interface PwaUpdatePromptProps {
  open: boolean;
  onRefresh: () => void;
  onLater: () => void;
}

/**
 * User-triggered update only. The page must never reload on its own while a
 * form or modal is open.
 */
export const PwaUpdatePrompt: React.FC<PwaUpdatePromptProps> = ({ open, onRefresh, onLater }) => {
  if (!open) return null;

  return (
    <div
      data-testid="pwa-update-prompt"
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[80] mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-[#00271D]/10 bg-white p-4 shadow-xl print-hide lg:bottom-6"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
        <RefreshCw size={16} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[var(--text-strong)]">A new version of SORT is available</p>
        <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-strong)]/60">
          Refresh when you&apos;re ready — open forms are not submitted automatically.
        </p>
        <div className="mt-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-xl bg-[var(--accent)] px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[var(--accent-dark)] cursor-pointer"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={onLater}
            className="rounded-xl px-2.5 py-1.5 text-xs font-bold text-[var(--text-strong)]/60 transition-colors hover:bg-[var(--text-strong)]/5 cursor-pointer"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
};
