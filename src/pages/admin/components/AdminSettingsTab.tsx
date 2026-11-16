import React, { useEffect, useState } from 'react';
import { SystemSettings } from '../../../types';
import { CampusBlueprintEditor } from './map/CampusBlueprintEditor';
import { SchoolSettingsPage } from './settings/SchoolSettingsPage';
import { ReportSetupPage } from './settings/ReportSetupPage';
import { PointsRewardsPage } from './settings/PointsRewardsPage';
import { AdminDangerZoneTab } from './settings/AdminDangerZoneTab';

type MergedPageId = 'school-sync' | 'report-setup' | 'points-rewards';

/**
 * Old flat sub-tab ids still resolve to their merged page + section so
 * bookmarks, deep links and specs written before the merge keep working.
 */
const LEGACY_SECTION: Record<string, { page: MergedPageId; section: string }> = {
  branding: { page: 'school-sync', section: 'branding' },
  'sync-integrations': { page: 'school-sync', section: 'sync-integrations' },
  'academic-calendar': { page: 'school-sync', section: 'academic-calendar' },
  'asset-categories': { page: 'report-setup', section: 'asset-categories' },
  'item-presets': { page: 'report-setup', section: 'item-presets' },
  'waste-types': { page: 'report-setup', section: 'waste-types' },
  'urgency-levels': { page: 'report-setup', section: 'urgency-levels' },
  'asset-conditions': { page: 'report-setup', section: 'asset-conditions' },
  'points-system': { page: 'points-rewards', section: 'points-system' },
  certificates: { page: 'points-rewards', section: 'certificates' },
  challenges: { page: 'points-rewards', section: 'challenges' },
};

interface AdminSettingsTabProps {
  subTab?: string;
  settings: SystemSettings;
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  resetDatabase: () => void;
}

/**
 * Settings router. Sub-pages are grouped into five destinations (Locations,
 * School & Sync, Report Setup, Points & Rewards, Danger Zone) with in-page
 * section tabs instead of one 13-item sidebar list.
 */
export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({
  subTab = 'locations',
  settings,
  updateSettings,
  resetDatabase,
}) => {
  const [activeSubTab, setActiveSubTab] = useState(subTab);

  // Synchronize internal active tab when parent tab changes
  useEffect(() => {
    if (subTab) setActiveSubTab(subTab);
  }, [subTab]);

  const legacy = LEGACY_SECTION[activeSubTab] as
    | { page: MergedPageId; section: string }
    | undefined;
  const page: string = legacy ? legacy.page : activeSubTab;
  const section = legacy?.section;

  return (
    <div className="space-y-6 animate-fade-in">
      {page === 'locations' && <CampusBlueprintEditor />}
      {page === 'school-sync' && <SchoolSettingsPage initialSection={section} />}
      {page === 'report-setup' && <ReportSetupPage initialSection={section} />}
      {page === 'points-rewards' && (
        <PointsRewardsPage
          settings={settings}
          updateSettings={updateSettings}
          initialSection={section}
        />
      )}
      {page === 'danger-zone' && <AdminDangerZoneTab onReset={resetDatabase} />}
    </div>
  );
};
