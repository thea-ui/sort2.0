import React, { useEffect, useState } from 'react';
import { Recycle, ShieldCheck } from 'lucide-react';
import { useMockData } from '../../hooks/useMockData';
import { useTheme } from '../../hooks/useTheme';
import { isOfflineSessionToken } from '../../services/api';
import { filterNotificationsForUser } from '../../utils/notifications';
import { readDismissed, writeDismissed } from '../../utils/notificationDismissals';
import { ROLE_LABELS } from '../../utils/userDisplay';
import { NotificationBell } from '../common/NotificationBell';
import type { BellNotification, NotificationSeverity } from '../common/NotificationBell';
import type { NotificationType } from '../../types';
import { AppShell, ShellNavFooter, ShellNavList } from './AppShell';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileNavSheet } from './MobileNavSheet';
import {
  ADMIN_NAV_GROUPS,
  MOBILE_PRIMARY_ITEMS,
  MRF_NAV_GROUPS,
  resolvePageTitle,
} from './dashboardNav';

// Re-exported for callers that consumed these from the layout module.
export { ADMIN_SECTIONS, SETTINGS_SUBITEMS } from './dashboardNav';

// ── Props ─────────────────────────────────────────────────────────────────────

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

/**
 * Severity model (master handoff Part 4 §3) mapped onto SORT's own notification
 * types: dismissal/overdue conditions are critical, submissions need attention,
 * and the remaining lifecycle events are informational.
 */
const SEVERITY_BY_TYPE: Record<NotificationType, NotificationSeverity> = {
  REPORT_DISMISSED: 'critical',
  REPORT_SUBMITTED: 'warning',
  REPORT_VERIFIED: 'info',
  REPORT_DISPATCHED: 'info',
  REPORT_COMPLETED: 'info',
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Shell for the Admin console and the MRF terminal. Navigation is tab state
 * (no router); the desktop rail collapses 280px ↔ 70px, and below `lg` the
 * same destinations are served by the mobile bottom bar + "More" sheet.
 */
export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
}) => {
  const { currentUser, logout, notifications } = useMockData();
  const { logoUrl, schoolName, currentSchoolYear } = useTheme();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const isMRF = currentUser?.role === 'MRF';
  const portal = isMRF ? 'mrf' : 'admin';
  const userId = currentUser?.id ?? '';

  // Dismissals are per portal + user and live in localStorage only.
  useEffect(() => {
    if (!userId) return;
    setDismissed(readDismissed(portal, userId));
  }, [portal, userId]);

  if (!currentUser) return null;

  const navGroups = isMRF ? MRF_NAV_GROUPS : ADMIN_NAV_GROUPS;
  const userNotifications = filterNotificationsForUser(notifications, currentUser).filter(
    (notification) => !dismissed.has(notification.id),
  );
  const bellNotifications: BellNotification[] = userNotifications.map((notification) => ({
    id: notification.id,
    severity: SEVERITY_BY_TYPE[notification.type] ?? 'info',
    title: notification.title,
    description: notification.message,
  }));
  const mobilePrimaryItems = isMRF ? MOBILE_PRIMARY_ITEMS.MRF : MOBILE_PRIMARY_ITEMS.ADMIN;
  const shellUser = {
    name: currentUser.name,
    roleLabel: ROLE_LABELS[currentUser.role],
    roleTone: isMRF ? ('primary' as const) : ('emerald' as const),
    offlineSession: isOfflineSessionToken(),
  };

  const persistDismissed = (next: Set<string>) => {
    setDismissed(next);
    writeDismissed(portal, userId, next);
  };

  const handleDismissNotification = (id: string) => {
    persistDismissed(new Set([...dismissed, id]));
  };

  const handleDismissAllNotifications = () => {
    persistDismissed(new Set([...dismissed, ...userNotifications.map((notification) => notification.id)]));
  };

  const handleSelectNotification = (id: string) => {
    handleDismissNotification(id);
    setActiveTab(isMRF ? 'dispatches' : 'admin-reports');
  };

  const handleNavSelect = (id: string, options?: { keepOpen?: boolean }) => {
    setActiveTab(id);
    if (!options?.keepOpen) setMobileNavOpen(false);
  };

  const notificationsButton = (
    <NotificationBell
      notifications={bellNotifications}
      onDismiss={handleDismissNotification}
      onDismissAll={handleDismissAllNotifications}
      onSelect={handleSelectNotification}
    />
  );

  return (
    <>
      <AppShell
        brand={{
          name: schoolName || 'S.O.R.T.',
          logoUrl,
          fallbackIcon: isMRF ? Recycle : ShieldCheck,
        }}
        navGroups={navGroups}
        portalLabel={isMRF ? 'MRF Terminal' : 'Admin Console'}
        pageTitle={resolvePageTitle(activeTab, isMRF)}
        user={shellUser}
        schoolYear={currentSchoolYear}
        activeTab={activeTab}
        onNavigate={handleNavSelect}
        onLogout={() => logout()}
        headerActions={notificationsButton}
      >
        {children}
      </AppShell>

      {/* ── Mobile Navigation (bottom bar + grouped sheet) ── */}
      <MobileBottomNav
        items={mobilePrimaryItems}
        activeTab={activeTab}
        onSelect={handleNavSelect}
        onMore={() => setMobileNavOpen(true)}
      />
      <MobileNavSheet
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        title={isMRF ? 'MRF Operations' : 'Admin Control'}
        footer={<ShellNavFooter user={shellUser} onLogout={() => logout()} />}
      >
        <ShellNavList groups={navGroups} activeTab={activeTab} onNavigate={handleNavSelect} />
      </MobileNavSheet>
    </>
  );
};
