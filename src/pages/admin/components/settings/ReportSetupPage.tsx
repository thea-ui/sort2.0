import React, { useEffect, useState } from 'react';
import { AlertTriangle, ClipboardCheck, Layers, Package, Recycle } from 'lucide-react';
import { PageHeader } from '../../../../components/layout/PageHeader';
import { SettingsSectionTabs, SettingsSection } from './SettingsSectionTabs';
import { AdminAssetCategoriesTab } from './AdminAssetCategoriesTab';
import { AdminItemPresetsTab } from './AdminItemPresetsTab';
import { AdminWasteTypesTab } from './AdminWasteTypesTab';
import { AdminUrgencyLevelsTab } from './AdminUrgencyLevelsTab';
import { AdminAssetConditionsTab } from './AdminAssetConditionsTab';

const SECTIONS: SettingsSection[] = [
  { id: 'asset-categories', label: 'Asset Categories', icon: Layers },
  { id: 'item-presets', label: 'Item Presets', icon: Package },
  { id: 'waste-types', label: 'Waste Types', icon: Recycle },
  { id: 'urgency-levels', label: 'Urgency Levels', icon: AlertTriangle },
  { id: 'asset-conditions', label: 'Asset Conditions', icon: ClipboardCheck },
];

interface ReportSetupPageProps {
  /** Section to open first (e.g. from a legacy `item-presets` deep link). */
  initialSection?: string;
}

export const ReportSetupPage: React.FC<ReportSetupPageProps> = ({ initialSection }) => {
  const [section, setSection] = useState(initialSection ?? 'asset-categories');

  useEffect(() => {
    if (initialSection) setSection(initialSection);
  }, [initialSection]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Report Setup"
        description="Categories, item presets, waste types, urgency levels and asset conditions."
      />
      <SettingsSectionTabs sections={SECTIONS} active={section} onChange={setSection} />
      {section === 'asset-categories' && <AdminAssetCategoriesTab />}
      {section === 'item-presets' && <AdminItemPresetsTab />}
      {section === 'waste-types' && <AdminWasteTypesTab />}
      {section === 'urgency-levels' && <AdminUrgencyLevelsTab />}
      {section === 'asset-conditions' && <AdminAssetConditionsTab />}
    </div>
  );
};
