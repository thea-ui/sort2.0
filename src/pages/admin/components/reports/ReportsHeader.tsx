import React from 'react';
import { PageHeader } from '../../../../components/layout/PageHeader';

interface ReportsHeaderProps {
  shownCount: number;
}

/**
 * Queue header. The previous "Refresh" / "Clear All" buttons were dead
 * controls (both only fired a hardcoded unrelated toast) and were removed.
 */
export const ReportsHeader: React.FC<ReportsHeaderProps> = ({ shownCount }) => (
  <PageHeader
    title="All Reports"
    description={`Today's action queue · ${shownCount} shown · expired & older reports are in Collections`}
    badge={
      <span className="inline-block text-[10px] font-black text-[var(--accent)] bg-[var(--accent)]/15 border border-[var(--accent)]/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-1.5">
        Management Portal
      </span>
    }
  />
);
