import React, { useState } from 'react';
import { Bell, Recycle, ShieldCheck } from 'lucide-react';
import { useMockData } from '../../hooks/useMockData';
import { useTheme } from '../../hooks/useTheme';
import { filterNotificationsForUser } from '../../utils/notifications';
import { ROLE_LABELS } from '../../utils/userDisplay';
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
  const { currentUser, logout, notifications, dismissNotification } = useMockData();
  const { logoUrl, schoolName, currentSchoolYear } = useTheme();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (!currentUser) return null;

  const isMRF = currentUser.role === 'MRF';
  const navGroups = isMRF ? MRF_NAV_GROUPS : ADMIN_NAV_GROUPS;
  const adminNotifications = filterNotificationsForUser(notifications, currentUser);
  const unreadCount = adminNotifications.length;
  const mobilePrimaryItems = isMRF ? MOBILE_PRIMARY_ITEMS.MRF : MOBILE_PRIMARY_ITEMS.ADMIN;
  const shellUser = {
    name: currentUser.name,
    roleLabel: ROLE_LABELS[currentUser.role],
    roleTone: isMRF ? ('primary' as const) : ('emerald' as const),
  };

  const handleNavSelect = (id: string, options?: { keepOpen?: boolean }) => {
    setActiveTab(id);
    if (!options?.keepOpen) setMobileNavOpen(false);
  };

  const notificationsButton = (
    <div className="relative">
      <button
        type="button"
        onClick={() => setNotificationsOpen((open) => !open)}
        aria-label="Notifications"
        title="Notifications"
        className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-all active:scale-95 cursor-pointer relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {notificationsOpen && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-80 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
            <h4 className="font-bold text-xs text-[var(--text-strong)] uppercase tracking-wider">
              Alerts & Actions
            </h4>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    adminNotifications.forEach((n) => dismissNotification(n.id));
                  }}
                  className="text-[9px] text-[var(--accent)] font-bold hover:underline cursor-pointer"
                >
                  Clear all
                </button>
              )}
              <span className="text-[10px] px-2 py-0.5 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full font-bold border border-[var(--accent)]/20">
                {unreadCount} New
              </span>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
            {adminNotifications.map((notif) => {
              const isVerified = notif.type === 'REPORT_VERIFIED';
              const isDispatched = notif.type === 'REPORT_DISPATCHED';
              const isCompleted = notif.type === 'REPORT_COMPLETED';
              const isSubmitted = notif.type === 'REPORT_SUBMITTED';

              const color = isCompleted
                ? 'text-emerald-700'
                : isVerified
                  ? 'text-amber-700'
                  : isDispatched
                    ? 'text-[var(--text-strong)]'
                    : isSubmitted
                      ? 'text-[var(--text-strong)]'
                      : 'text-gray-600';
              const label = isCompleted
                ? 'MRF Completed'
                : isVerified
                  ? 'Verified'
                  : isDispatched
                    ? 'Dispatched'
                    : isSubmitted
                      ? 'New Report'
                      : 'Update';

              return (
                <button
                  type="button"
                  key={notif.id}
                  onClick={() => {
                    dismissNotification(notif.id);
                    setNotificationsOpen(false);
                    setActiveTab(isMRF ? 'dispatches' : 'admin-reports');
                  }}
                  className="w-full text-left p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-0.5">
                    <span className={`text-xs font-bold ${color}`}>
                      [{label}] {notif.title}
                    </span>
                    <span className="text-[9px] text-gray-400 shrink-0 ml-2">
                      {new Date(notif.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 line-clamp-1">{notif.message}</p>
                </button>
              );
            })}
            {adminNotifications.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">No new alerts.</p>
            )}
          </div>
          <div className="p-2 bg-gray-50 border-t border-gray-100 text-center">
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen(false);
                setActiveTab(isMRF ? 'dispatches' : 'admin-reports');
              }}
              className="text-xs text-[var(--accent)] font-bold hover:underline cursor-pointer"
            >
              View All Reports
            </button>
          </div>
        </div>
      )}
    </div>
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
