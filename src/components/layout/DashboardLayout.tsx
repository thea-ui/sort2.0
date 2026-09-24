import React, { useState } from 'react';
import { useMockData } from '../../hooks/useMockData';
import { SortLogo } from '../common/SortLogo';
import { ProfileMenu } from '../common/ProfileMenu';
import { filterNotificationsForUser } from '../../utils/notifications';
import { Bell, ChevronDown } from 'lucide-react';
import { DashboardNavContent, DashboardNavFooter } from './DashboardNavContent';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileNavSheet } from './MobileNavSheet';
import { MOBILE_PRIMARY_ITEMS } from './dashboardNav';

// Re-exported for callers that consumed these from the layout module.
export { ADMIN_SECTIONS, SETTINGS_SUBITEMS } from './dashboardNav';




// ── Props ─────────────────────────────────────────────────────────────────────

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
}) => {
  const { currentUser, logout, reports, notifications, dismissNotification } = useMockData();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const mainRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  if (!currentUser) return null;

  const isMRF   = currentUser.role === 'MRF';
  const adminNotifications = filterNotificationsForUser(notifications, currentUser);
  const unreadCount = adminNotifications.length;
  const subtitle  = isMRF ? 'MRF Terminal' : 'Admin Console';
  const mobilePrimaryItems = isMRF ? MOBILE_PRIMARY_ITEMS.MRF : MOBILE_PRIMARY_ITEMS.ADMIN;
  const handleNavSelect = (id: string, options?: { keepOpen?: boolean }) => {
    setActiveTab(id);
    if (!options?.keepOpen) setMobileNavOpen(false);
  };
  const roleColor = isMRF
    ? 'bg-[var(--primary)] shadow-[var(--primary)]/20'
    : 'bg-[var(--gold)] shadow-[var(--gold)]/20';

  return (
    <div className="h-screen max-h-screen bg-[var(--background)] text-[var(--text-strong)] flex flex-col font-sans relative overflow-hidden">

      {/* ── Fixed Top Header ── */}
      <header className="shrink-0 z-40 w-full bg-white/85 backdrop-blur-xl border-b border-[var(--primary)]/10 px-4 py-3 flex items-center justify-between shadow-sm shadow-[var(--primary)]/5">
        <div className="flex items-center gap-3">
          <SortLogo size={38} subtitle={subtitle} />
        </div>

        {/* Header Right */}
        <div className="flex items-center gap-2">

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileDropdownOpen(false); }}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-[var(--text-strong)] transition-colors relative cursor-pointer"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-80 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                  <h4 className="font-bold text-xs text-[var(--text-strong)] uppercase tracking-wider">Alerts & Actions</h4>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); adminNotifications.forEach(n => dismissNotification(n.id)); }}
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
                  {adminNotifications.map(notif => {
                    const isVerified = notif.type === 'REPORT_VERIFIED';
                    const isDispatched = notif.type === 'REPORT_DISPATCHED';
                    const isCompleted = notif.type === 'REPORT_COMPLETED';
                    const isSubmitted = notif.type === 'REPORT_SUBMITTED';

                    const color = isCompleted ? 'text-emerald-700' : isVerified ? 'text-amber-700' : isDispatched ? 'text-[var(--text-strong)]' : isSubmitted ? 'text-[var(--text-strong)]' : 'text-gray-600';
                    const label = isCompleted ? 'MRF Completed' : isVerified ? 'Verified' : isDispatched ? 'Dispatched' : isSubmitted ? 'New Report' : 'Update';

                    return (
                      <div
                        key={notif.id}
                        onClick={() => { dismissNotification(notif.id); setNotificationsOpen(false); setActiveTab(isMRF ? 'dispatches' : 'admin-reports'); }}
                        className="p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <div className="flex justify-between items-start mb-0.5">
                          <span className={`text-xs font-bold ${color}`}>
                            [{label}] {notif.title}
                          </span>
                          <span className="text-[9px] text-gray-400 shrink-0 ml-2">{new Date(notif.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 line-clamp-1">{notif.message}</p>
                      </div>
                    );
                  })}
                  {adminNotifications.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-6">No new alerts.</p>
                  )}
                </div>
                <div className="p-2 bg-gray-50 border-t border-gray-100 text-center">
                  <button
                    onClick={() => { setNotificationsOpen(false); setActiveTab(isMRF ? 'dispatches' : 'admin-reports'); }}
                    className="text-xs text-[var(--accent)] font-bold hover:underline"
                  >
                    View All Reports
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile — MRF only; the admin console signs out from the sidebar card */}
          {isMRF && (
            <div className="relative">
              <button
                onClick={() => { setProfileDropdownOpen(!profileDropdownOpen); setNotificationsOpen(false); }}
                className="flex items-center gap-2 bg-white/80 border border-slate-200/80 px-2.5 py-1.5 rounded-full shadow-xs hover:border-[var(--accent)] transition-all cursor-pointer"
              >
                <div className={`h-7 w-7 rounded-full text-white font-bold flex items-center justify-center text-xs shadow-md ${roleColor}`}>
                  {currentUser.name.charAt(0)}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-[var(--text-strong)] leading-none">{currentUser.name.split(' ')[0]}</p>
                  <p className="text-[9px] text-[var(--text-strong)]/40 font-semibold uppercase tracking-wider">{currentUser.role}</p>
                </div>
                <ChevronDown size={12} className="text-gray-400" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 z-50 mt-2">
                  <ProfileMenu
                    user={currentUser}
                    onClose={() => setProfileDropdownOpen(false)}
                    onLogout={() => logout()}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── BODY (Sidebar + Main) ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative z-10">

        {/* ── Fixed Left Sidebar ── */}
        <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 w-60 bg-white/90 backdrop-blur-xl border-r border-[var(--primary)]/8 pt-20 pb-4 px-3 flex-col justify-between shrink-0 overflow-y-auto md:relative md:inset-auto md:h-full md:pt-4">
          <div className="flex flex-col gap-4 overflow-hidden flex-1">

            {/* Section label */}
            <div className="px-2 pb-2 border-b border-[var(--primary)]/8 shrink-0">
              <span className="text-[10px] font-black text-[var(--text-strong)]/30 tracking-widest uppercase">
                {isMRF ? 'MRF Operations' : 'Admin Control'}
              </span>
            </div>

            {/* Nav items */}
            <nav className="flex flex-col gap-4 overflow-y-auto flex-1 pr-1">
              <DashboardNavContent isMRF={isMRF} activeTab={activeTab} onSelect={handleNavSelect} />
            </nav>

          </div>

          <DashboardNavFooter user={currentUser} onLogout={() => logout()} showProfileCard={!isMRF} />
        </aside>

        {/* ── Main Content (Scrollable) ── */}
        <main ref={mainRef} className="flex-1 overflow-y-auto px-4 py-6 pb-28 md:px-8 md:py-8 md:pb-8 relative z-10 h-full min-w-0">
          {children}
        </main>

      </div>

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
        footer={<DashboardNavFooter user={currentUser} onLogout={() => logout()} showProfileCard={!isMRF} />}
      >
        <DashboardNavContent isMRF={isMRF} activeTab={activeTab} onSelect={handleNavSelect} expandableSettings />
      </MobileNavSheet>
    </div>
  );
};
