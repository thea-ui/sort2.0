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
  />
);
