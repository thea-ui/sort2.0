import React, { useState } from 'react';
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
  CheckCircle2,
  Truck,
  XCircle
} from 'lucide-react';
import { SortLogo } from '../common/SortLogo';
import { ProfileMenu } from '../common/ProfileMenu';
import { filterNotificationsForUser } from '../../utils/notifications';
import { getInitials } from '../../utils/userDisplay';

interface StudentLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const ALL_NAV_ITEMS = [
  { id: 'overview', label: 'Home', icon: Zap },
  { id: 'submit-report', label: 'Report', icon: Camera },
  { id: 'bin-map', label: 'Bin Map', icon: MapPin },
  { id: 'report-history', label: 'Activity', icon: Clock },
  { id: 'gamification', label: 'Ranks', icon: Trophy },
];

export const StudentLayout: React.FC<StudentLayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { currentUser, logout, reports, notifications, dismissNotification } = useMockData();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  if (!currentUser) return null;

  const isTeacher = currentUser.role === 'TEACHER';
  
  // Filter out 'Ranks' for Teachers
  const navItems = isTeacher
    ? ALL_NAV_ITEMS.filter(item => item.id !== 'gamification')
    : ALL_NAV_ITEMS;

  const myNotifications = filterNotificationsForUser(notifications, currentUser);
  const unreadCount = myNotifications.length;

  const handleDismissNotification = (notifId: string, reportId: string) => {
    dismissNotification(notifId);
    setNotificationsOpen(false);
    setActiveTab('report-history');
  };

  const handleClearAll = () => {
    myNotifications.forEach(n => dismissNotification(n.id));
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-strong)] flex flex-col font-sans relative overflow-hidden">

      {/* Global Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--primary)]/10 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">

          {/* Brand */}
          <SortLogo 
            size={48} 
            subtitle={isTeacher ? 'Faculty Portal' : 'Student Portal'} 
          />

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
                <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-80 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-50 animate-fade-in">
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
                          onClick={() => handleDismissNotification(notif.id, notif.reportId)}
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
                className="flex items-center gap-2 border border-gray-200 bg-white rounded-full pr-3 pl-1 py-1 hover:border-[var(--accent)] transition-all cursor-pointer shadow-sm"
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
                    onLogout={() => logout()}
                  />
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Desktop Navigation — 2026 Floating Pill Capsule */}
      <div className="hidden md:flex relative z-10 w-full justify-center pt-5 pb-2">
        <nav className="flex items-center gap-1.5 bg-white/85 backdrop-blur-xl border border-white/80 p-1.5 rounded-full shadow-lg shadow-[var(--primary)]/5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`
                  flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer select-none
                  ${isActive
                    ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/25'
                    : 'text-[var(--text-strong)]/70 hover:bg-[var(--primary)]/5 hover:text-[var(--text-strong)]'}
                `}
              >
                <Icon size={15} strokeWidth={isActive ? 2.5 : 2} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-10 relative z-10">
        {children}
      </main>

      {/* Footer — matches LandingFooter */}
      <footer className="hidden md:block w-full bg-white border-t border-gray-200 py-4 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <SortLogo size={24} showText={true} />
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
            © 2026 S.O.R.T. — Smart Operational Recovery & Tracking System
          </p>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
        <nav className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="relative flex flex-col items-center justify-center w-full py-1 gap-1 cursor-pointer"
              >
                <div className={`flex items-center justify-center p-1.5 rounded-lg transition-colors ${
                  isActive ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'text-gray-400'
                }`}>
                  <Icon size={19} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] font-semibold transition-colors ${
                  isActive ? 'text-[var(--accent)]' : 'text-gray-400'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

    </div>
  );
};
