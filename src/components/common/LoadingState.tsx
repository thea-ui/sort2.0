import React from 'react';

interface LoadingStateProps {
  label?: string;
  className?: string;
}

/** Canonical page/section loading block (replaces plain "Loading..." text). */
export const LoadingState: React.FC<LoadingStateProps> = ({
  label = 'Loading…',
  className = '',
}) => (
  <div
    className={`bg-white/90 border border-white/80 rounded-3xl p-12 text-center ${className}`}
    role="status"
    aria-live="polite"
  >
    <div className="h-6 w-6 mx-auto rounded-full border-2 border-[var(--accent)]/30 border-t-[var(--accent)] animate-spin" />
    <p className="text-xs text-[var(--text-strong)]/50 font-semibold mt-3">{label}</p>
  </div>
);
