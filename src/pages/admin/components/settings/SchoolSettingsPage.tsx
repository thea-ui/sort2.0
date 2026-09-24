import React, { useEffect, useState } from 'react';
import { CalendarDays, Palette, RefreshCw } from 'lucide-react';
import { PageHeader } from '../../../../components/layout/PageHeader';
import { SettingsSectionTabs, SettingsSection } from './SettingsSectionTabs';
import { AdminBrandingTab } from './AdminBrandingTab';
import { AdminSyncSettingsTab } from './AdminSyncSettingsTab';
import { AdminAcademicCalendarTab } from './AdminAcademicCalendarTab';

const SECTIONS: SettingsSection[] = [
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'sync-integrations', label: 'Sync & Integrations', icon: RefreshCw },
  { id: 'academic-calendar', label: 'Academic Calendar', icon: CalendarDays },
];

interface SchoolSettingsPageProps {
  /** Section to open first (e.g. from a legacy `branding` deep link). */
  initialSection?: string;
}

export const SchoolSettingsPage: React.FC<SchoolSettingsPageProps> = ({ initialSection }) => {
  const [section, setSection] = useState(initialSection ?? 'branding');

  useEffect(() => {
    if (initialSection) setSection(initialSection);
  }, [initialSection]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="School & Sync"
        description="School identity, branding, academic calendar and EnrollPro integration."
      />
      <SettingsSectionTabs sections={SECTIONS} active={section} onChange={setSection} />
      {section === 'branding' && <AdminBrandingTab />}
      {section === 'sync-integrations' && <AdminSyncSettingsTab />}
      {section === 'academic-calendar' && <AdminAcademicCalendarTab />}
    </div>
  );
};
