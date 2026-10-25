import React, { useEffect, useState } from 'react';
import { useMockData } from '../../hooks/useMockData';
import {
  Zap,
  Camera,
  MapPin,
  Clock,
  Trophy,
  Bell,
  ChevronDown,
  Flame,
  GraduationCap,
  PanelLeft,
  CheckCircle2,
  Truck,
  XCircle
} from 'lucide-react';
import { SortLogo } from '../common/SortLogo';
import { ProfileMenu } from '../common/ProfileMenu';
import { AccessibilityMenu } from '../common/AccessibilityMenu';
import { LogoutConfirmDialog } from '../common/LogoutConfirmDialog';
import { filterNotificationsForUser } from '../../utils/notifications';
import { getInitials } from '../../utils/userDisplay';

interface StudentLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const NAV_GROUPS = [
  {
    title: 'Dashboard',
    items: [{ id: 'overview', label: 'Home', icon: Zap }],
  },
  {
    title: 'Reporting',
    items: [
      { id: 'submit-report', label: 'Report', icon: Camera },
      { id: 'bin-map', label: 'Bin Map', icon: MapPin },
    ],
  },
  {
    title: 'Progress',
    items: [
      { id: 'report-history', label: 'Activity', icon: Clock },
      { id: 'gamification', label: 'Ranks', icon: Trophy },
    ],
  },
];

export const StudentLayout: React.FC<StudentLayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { currentUser, logout, notifications, dismissNotification } = useMockData();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      setSidebarCollapsed(localStorage.getItem('sortv2_student_sidebar_collapsed') === 'true');
    } catch {
      // Private mode / storage errors must not break the shell.
    }
  }, []);

  if (!currentUser) return null;

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('sortv2_student_sidebar_collapsed', String(next));
      } catch {
        // Best-effort persistence only.
      }
      return next;
    });
  };

  const isTeacher = currentUser.role === 'TEACHER';
  
  // Filter out 'Ranks' for Teachers
  const navGroups = NAV_GROUPS
    .map(group => ({
      ...group,
      items: isTeacher ? group.items.filter(item => item.id !== 'gamification') : group.items,
    }))
    .filter(group => group.items.length > 0);

  const navItems = navGroups.flatMap(group => group.items);
  const activeLabel = navItems.find(item => item.id === activeTab)?.label ?? 'Home';

  const myNotifications = filterNotificationsForUser(notifications, currentUser);
  const unreadCount = myNotifications.length;

  const handleDismissNotification = (notifId: string) => {
    dismissNotification(notifId);
    setNotificationsOpen(false);
    setActiveTab('report-history');
  };

  const handleClearAll = () => {
    myNotifications.forEach(n => dismissNotification(n.id));
  };

  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--text-strong)] font-sans">

      {/* Desktop Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-slate-200 bg-[#fafafa] shadow-sm transition-[width] duration-200 lg:flex ${sidebarCollapsed ? 'w-[70px]' : 'w-[280px]'}`}>
        <div className={`flex h-24 shrink-0 items-center overflow-hidden ${sidebarCollapsed ? 'justify-center px-0' : 'px-6'}`}>
          <SortLogo
            size={sidebarCollapsed ? 40 : 48}
            showText={!sidebarCollapsed}
            subtitle={isTeacher ? 'Faculty Portal' : 'Student Portal'}
            textClassName="font-bold uppercase tracking-tight text-[var(--theme-primary)]"
          />
        </div>

        <nav className="custom-scrollbar flex-1 overflow-x-hidden overflow-y-auto px-3 py-2" aria-label={isTeacher ? 'Faculty portal' : 'Student portal'}>
          {navGroups.map((group) => (
            <div key={group.title} className="mb-5 first:mt-2">
              {!sidebarCollapsed && (
                <span className="mb-1 block px-4 text-[0.625rem] font-bold uppercase tracking-normal text-[var(--text-strong)]/60">
                  {group.title}
                </span>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = activeTab === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={`
                        cursor-pointer rounded-full text-[14px] font-medium transition-all duration-200 select-none
                        ${sidebarCollapsed
                          ? 'mx-auto flex h-10 w-10 items-center justify-center'
                          : 'flex w-full items-center px-4 py-1.5'}
                        ${isActive
                          ? 'text-white shadow-sm'
                          : 'text-[var(--text-strong)] hover:bg-white/80'}
                      `}
                      style={{ backgroundColor: isActive ? 'var(--theme-primary)' : 'transparent' }}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                        <Icon
                          className={isActive ? 'h-5 w-5 text-white' : 'h-5 w-5 text-[var(--text-strong)]/70'}
                          strokeWidth={2.2}
                        />
                      </span>
                      {!sidebarCollapsed && <span className="ml-4 truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className={`border-t border-slate-200 ${sidebarCollapsed ? 'p-2' : 'p-3'}`}>
          {sidebarCollapsed ? (
            <div
              className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]"
              title={isTeacher ? 'Faculty Staff' : `${currentUser.points} eco-points`}
            >
              {isTeacher
                ? <GraduationCap size={18} />
                : <Flame size={18} className="fill-[var(--accent)]" />}
            </div>
          ) : isTeacher ? (
            <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-3">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--accent)]">Portal</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-black text-[var(--text-strong)]">
                <GraduationCap size={15} className="text-[var(--accent)]" />
                Faculty Staff
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-3">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--accent)]">Eco-points</p>
              <p className="mt-1 flex items-center gap-1.5 text-lg font-black text-[var(--accent)]">
                <Flame size={15} className="fill-[var(--accent)]" />
                {currentUser.points} pts
              </p>
            </div>
          )}
        </div>
      </aside>

      <div className={`flex min-h-dvh flex-col transition-[padding] duration-200 ${sidebarCollapsed ? 'lg:pl-[70px]' : 'lg:pl-[280px]'}`}>

      {/* Global Header */}
      <header className="sticky top-0 z-50 h-14 border-b border-[var(--primary)]/10 bg-white/95 backdrop-blur-md sm:h-16">
        <div className="mx-auto flex h-full w-full max-w-[1760px] items-center justify-between gap-2 px-3 sm:px-6 lg:px-8 2xl:px-10">

          <div className="flex min-w-0 items-center gap-2">
            {/* Brand (mobile only) */}
            <div className="lg:hidden">
              <SortLogo size={30} showText={false} />
            </div>

            {/* Sidebar toggle (desktop only) */}
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!sidebarCollapsed}
              className="hidden rounded-xl p-2 text-[var(--text-strong)]/60 transition-colors hover:bg-[var(--primary)]/5 hover:text-[var(--text-strong)] lg:inline-flex"
            >
              <PanelLeft size={19} />
            </button>

            <span className="truncate text-[15px] font-extrabold tracking-tight text-[var(--text-strong)] lg:text-sm lg:font-bold">{activeLabel}</span>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">

            {!isTeacher && (
              <div className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]">
                <Flame size={13} />
                <span>{currentUser.points} pts</span>
              </div>
            )}

            {isTeacher && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 text-xs font-bold">
                <GraduationCap size={13} />
                Faculty Staff
              </span>
            )}

            {/* Accessibility text size */}
            <AccessibilityMenu userId={currentUser.id} />

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileDropdownOpen(false); }}
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                className="relative cursor-pointer rounded-lg p-2 text-[var(--text-strong)]/50 transition-colors hover:bg-[var(--primary)]/5 hover:text-[var(--text-strong)]"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[var(--primary)]/10 bg-white shadow-xl animate-fade-in">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <h4 className="font-bold text-xs text-[var(--text-strong)] uppercase tracking-wider">My Notifications & Updates</h4>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleClearAll(); }}
                          className="text-[9px] text-[var(--accent)] font-bold hover:underline cursor-pointer"
                        >
                          Clear all
                        </button>
                      )}
                      <span className="text-[10px] px-2 py-0.5 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full font-bold border border-[var(--accent)]/20">
                        Live Feed
                      </span>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                    {myNotifications.map(notif => {
                      const isVerified = notif.type === 'REPORT_VERIFIED';
                      const isDispatched = notif.type === 'REPORT_DISPATCHED';
                      const isCompleted = notif.type === 'REPORT_COMPLETED';
                      const isDismissed = notif.type === 'REPORT_DISMISSED';

                      const Icon = isCompleted ? CheckCircle2 : isVerified ? Zap : isDispatched ? Truck : isDismissed ? XCircle : Clock;
                      const color = isCompleted ? 'text-emerald-700' : isVerified ? 'text-amber-700' : isDispatched ? 'text-[var(--text-strong)]' : isDismissed ? 'text-rose-600' : 'text-amber-700';
                      const label = isCompleted ? 'MRF Completed Cleanup' : isVerified ? 'Report Verified + Points' : isDispatched ? 'MRF Collector Dispatched' : isDismissed ? 'Report Dismissed' : 'Update';

                      return (
                        <div
                          key={notif.id}
                          onClick={() => handleDismissNotification(notif.id)}
                          className="p-3 hover:bg-gray-50 transition-colors cursor-pointer space-y-0.5"
                        >
                          <div className="flex justify-between items-center">
                            <span className={`text-xs font-extrabold flex items-center gap-1 ${color}`}>
                              <Icon size={11} /> {label}
                            </span>
                            <span className="text-[9px] text-gray-400 font-medium">{new Date(notif.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-[11px] text-gray-700 font-semibold">{notif.title}</p>
                          <p className="text-[10px] text-gray-500">{notif.message}</p>
                        </div>
                      );
                    })}
                    {myNotifications.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-6">No notifications yet.</p>
                    )}
                  </div>
                  <div className="p-2.5 bg-gray-50 border-t border-gray-100 text-center">
                    <button
                      onClick={() => { setNotificationsOpen(false); setActiveTab('report-history'); }}
                      className="text-xs text-[var(--accent)] font-bold hover:underline cursor-pointer"
                    >
                      View Full Activity History →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                aria-label="Open profile menu"
                aria-expanded={profileDropdownOpen}
                className="flex cursor-pointer items-center gap-2 rounded-full border border-[var(--primary)]/15 bg-white py-1 pl-1 pr-3 transition-colors hover:border-[var(--accent)]"
              >
                <div className="h-6 w-6 rounded-full bg-[var(--accent)] text-white font-bold flex items-center justify-center text-[10px]">
                  {getInitials(currentUser.name)}
                </div>
                <span className="text-xs font-semibold text-[var(--text-strong)] hidden sm:block">{currentUser.name.split(' ')[0]}</span>
                <ChevronDown size={13} className="text-gray-400" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 z-50 mt-2">
                  <ProfileMenu
                    user={currentUser}
                    onClose={() => setProfileDropdownOpen(false)}
                    onLogout={() => setLogoutConfirmOpen(true)}
                  />
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto w-full max-w-[1760px] flex-1 px-4 py-5 pb-[calc(7.25rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-6 lg:pb-10 lg:px-8 2xl:px-10">
        {children}
      </main>

      {/* Footer — matches LandingFooter */}
      <footer className="hidden w-full border-t border-[var(--primary)]/10 bg-white/70 py-4 lg:block">
        <div className="mx-auto flex w-full max-w-[1760px] items-center justify-between px-6 lg:px-8 2xl:px-10">
          <SortLogo size={24} showText={true} />
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
            © 2026 S.O.R.T. — Smart Operational Recovery & Tracking System
          </p>
        </div>
      </footer>

      </div>

      {/* Primary action FAB (mobile) */}
      {activeTab !== 'submit-report' && (
        <button
          type="button"
          onClick={() => setActiveTab('submit-report')}
          aria-label="File a report"
          className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-12 items-center gap-2 rounded-full bg-[var(--accent)] px-4 text-sm font-extrabold text-white shadow-lg shadow-[var(--accent)]/30 transition-transform active:scale-95 lg:hidden"
        >
          <Camera size={17} />
          Report
        </button>
      )}

      {/* Mobile Bottom Navigation */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--primary)]/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <nav className="flex items-stretch justify-around px-1.5 py-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className="relative flex min-h-[48px] w-full cursor-pointer flex-col items-center justify-center gap-0.5 py-1"
              >
                <span className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${
                  isActive ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[var(--text-strong)]/40'
                }`}>
                  <Icon size={19} strokeWidth={isActive ? 2.5 : 2} />
                </span>
                <span className={`text-[10px] font-bold transition-colors ${
                  isActive ? 'text-[var(--accent)]' : 'text-[var(--text-strong)]/45'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <LogoutConfirmDialog
        open={logoutConfirmOpen}
        onOpenChange={setLogoutConfirmOpen}
        onConfirm={logout}
      />

    </div>
  );
};
