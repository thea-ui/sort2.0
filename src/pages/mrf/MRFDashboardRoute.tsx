import React from 'react';

import { MRFDashboard } from './MRFDashboard';
import { MRFCampusNewsTab } from './components/MRFCampusNewsTab';

interface MRFDashboardRouteProps {
  activeTab: string;
  setActiveTab?: (tab: string) => void;
}

/**
 * MRF terminal entry point. Campus News is managed by the MRF team, so it is
 * routed here instead of being rendered inside the admin console.
 */
export const MRFDashboardRoute: React.FC<MRFDashboardRouteProps> = ({ activeTab, setActiveTab }) => {
  if (activeTab === 'mrf-campus-news') return <MRFCampusNewsTab />;
  return <MRFDashboard activeTab={activeTab} setActiveTab={setActiveTab} />;
};
