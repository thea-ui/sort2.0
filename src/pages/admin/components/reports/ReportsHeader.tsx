import React from 'react';
import { PageHeader } from '../../../../components/layout/PageHeader';

/**
 * Queue header. The previous "Refresh" / "Clear All" buttons were dead
 * controls (both only fired a hardcoded unrelated toast) and were removed.
 */
export const ReportsHeader: React.FC = () => <PageHeader title="All Reports" />;
