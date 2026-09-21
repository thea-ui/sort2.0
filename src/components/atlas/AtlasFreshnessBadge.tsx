import React from 'react';
import { CloudOff, RefreshCw, Wifi } from 'lucide-react';

interface AtlasFreshnessBadgeProps {
  syncedAt: string | null;
  stale: boolean;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'unknown';
  const diffMs = Math.max(0, Date.now() - then);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const AtlasFreshnessBadge: React.FC<AtlasFreshnessBadgeProps> = ({ syncedAt, stale }) => {
  if (!syncedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-bold text-gray-500">
        <RefreshCw size={12} />
        Not synced yet
      </span>
    );
  }

  const label = `Updated ${relativeTime(syncedAt)}`;

  if (stale) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-800"
        aria-live="polite"
        title="ATLAS sync may be behind — showing the last stored snapshot"
      >
        <CloudOff size={12} />
        Offline snapshot · {label}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700"
      aria-live="polite"
    >
      <Wifi size={12} />
      Live · {label}
    </span>
  );
};
