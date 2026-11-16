import React from 'react';
import { WifiOff } from 'lucide-react';

interface OfflineBannerProps {
  offline: boolean;
}

/**
 * Informational only: SORT is online-only and does not queue changes.
 * Fixed placement avoids layout shift; the mobile offset clears the bottom nav.
 */
export const OfflineBanner: React.FC<OfflineBannerProps> = ({ offline }) => {
  if (!offline) return null;

  return (
    <div
      data-testid="offline-banner"
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[70] mx-auto flex max-w-md items-center gap-2.5 rounded-2xl border border-[var(--warning)]/40 bg-[var(--warning)]/10 px-4 py-2.5 text-xs font-semibold text-[var(--warning-strong)] shadow-lg backdrop-blur-sm print-hide lg:bottom-6"
    >
      <WifiOff size={15} className="shrink-0" />
      <span>You&apos;re offline. SORT needs a connection to load and submit changes.</span>
    </div>
  );
};
