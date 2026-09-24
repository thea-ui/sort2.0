import React, { useEffect, useState } from 'react';
import { Award, Coins, Target } from 'lucide-react';
import { SystemSettings } from '../../../../types';
import { PageHeader } from '../../../../components/layout/PageHeader';
import { SettingsSectionTabs, SettingsSection } from './SettingsSectionTabs';
import { AdminPointsSystemTab } from './AdminPointsSystemTab';
import { AdminCertificateTab } from './AdminCertificateTab';
import { AdminChallengesTab } from './AdminChallengesTab';

const SECTIONS: SettingsSection[] = [
  { id: 'points-system', label: 'Points System', icon: Coins },
  { id: 'certificates', label: 'Certificates', icon: Award },
  { id: 'challenges', label: 'Challenges', icon: Target },
];

interface PointsRewardsPageProps {
  settings: SystemSettings;
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  /** Section to open first (e.g. from a legacy `certificates` deep link). */
  initialSection?: string;
}

export const PointsRewardsPage: React.FC<PointsRewardsPageProps> = ({
  settings,
  updateSettings,
  initialSection,
}) => {
  const [section, setSection] = useState(initialSection ?? 'points-system');

  useEffect(() => {
    if (initialSection) setSection(initialSection);
  }, [initialSection]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Points & Rewards"
        description="Point rules, certificates and challenge programs."
      />
      <SettingsSectionTabs sections={SECTIONS} active={section} onChange={setSection} />
      {section === 'points-system' && <AdminPointsSystemTab />}
      {section === 'certificates' && (
        <AdminCertificateTab settings={settings} updateSettings={updateSettings} />
      )}
      {section === 'challenges' && <AdminChallengesTab />}
    </div>
  );
};
