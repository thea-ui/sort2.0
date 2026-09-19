import React, { useState } from 'react';
import { useMockData } from '../../hooks/useMockData';
import { Role } from '../../types';
import { SortLogo } from '../common/SortLogo';
import {
  LayoutDashboard,
  Truck,
  History,
  Users,
  FileText,
  AlertOctagon,
  Settings,
  RefreshCw,
  Bell,
  ChevronDown,
  ShieldCheck,
  LogOut,
  Shield,
  ChevronRight,
  Menu,
  X,
  Wrench,
  Trash2,
  PackageCheck,
  Scale,
  BarChart2,
  TrendingUp,
  Trophy,
  MapPin,
  Newspaper,
  ClipboardList,
  CalendarClock,
  FileSpreadsheet,
} from 'lucide-react';

// ── Nav item definitions ──────────────────────────────────────────────────────

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  roles: Role[];
}

const MRF_NAV_ITEMS: NavItem[] = [
  { id: 'overview',       label: 'Overview',         icon: LayoutDashboard, roles: ['MRF'] },
  { id: 'dispatches',     label: 'Dispatches',       icon: Truck,           roles: ['MRF'] },
  { id: 'mrf-direct',     label: 'Direct Pickup',    icon: PackageCheck,    roles: ['MRF'] },
  { id: 'mrf-assets',     label: 'Asset Ledger',     icon: FileSpreadsheet, roles: ['MRF'] },
  { id: 'mrf-scrap',      label: 'Scrap Stock',      icon: Trash2,          roles: ['MRF'] },
  { id: 'mrf-market',     label: 'Recycle Market',   icon: Scale,           roles: ['MRF'] },
  { id: 'mrf-history',    label: 'History',          icon: History,         roles: ['MRF'] },
];

export const ADMIN_SECTIONS = [
  {
    group: 'DATA & ANALYTICS',
    items: [
      { id: 'overview', label: 'Overview', icon: BarChart2 },
      { id: 'admin-impact', label: 'Operational Analytics', icon: TrendingUp },
      { id: 'admin-leaderboard', label: 'Leaderboard', icon: Trophy },
      { id: 'admin-ledger', label: 'School Years', icon: FileSpreadsheet },
    ],
  },
  {
    group: 'MANAGEMENT',
    items: [
      { id: 'admin-reports', label: 'Reports', icon: FileText },
      { id: 'admin-collections', label: 'Collections', icon: Scale },
      { id: 'admin-bin-map', label: 'Bin Map', icon: MapPin },
      { id: 'admin-campus-news', label: 'Campus News', icon: Newspaper },
    ],
  },
  {
    group: 'ADMINISTRATION',
    items: [
      { id: 'admin-users', label: 'Users', icon: Users },
      { id: 'admin-audit-logs', label: 'Audit Logs', icon: ClipboardList },
      { id: 'admin-settings', label: 'Settings', icon: Settings, hasSubmenu: true },
    ],
  },
];

export const SETTINGS_SUBITEMS = [
  { id: 'locations', label: 'Locations' },
  { id: 'academic-calendar', label: 'Academic Calendar' },
  { id: 'sync-integrations', label: 'Sync & Integrations' },
  { id: 'asset-categories', label: 'Asset Categories' },
  { id: 'item-presets', label: 'Item Presets' },
  { id: 'points-system', label: 'Points System' },
  { id: 'certificates', label: 'Certificates' },
  { id: 'challenges', label: 'Challenges' },
  { id: 'waste-types', label: 'Waste Types' },
  { id: 'urgency-levels', label: 'Urgency Levels' },
  { id: 'asset-conditions', label: 'Asset Conditions' },
  { id: 'danger-zone', label: 'Danger Zone' },
];


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
  const { currentUser, changeRole, logout, reports, notifications, dismissNotification } = useMockData();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const mainRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  if (!currentUser) return null;

  const isMRF   = currentUser.role === 'MRF';
  const navItems = isMRF ? MRF_NAV_ITEMS : [];
  const adminNotifications = notifications.filter(n => n.recipientId === 'admin' || n.recipientId === currentUser.id);
  const unreadCount = adminNotifications.length;
  const subtitle  = isMRF ? 'MRF Terminal' : 'Admin Console';
  const roleColor = isMRF
    ? 'bg-sky-500 shadow-sky-500/20'
    : 'bg-violet-600 shadow-violet-600/20';

  const handleRoleToggle = (role: Role) => {
    changeRole(role);
    setProfileDropdownOpen(false);
    setActiveTab('overview');
  };

  return (
    <div className="h-screen max-h-screen bg-[#F9F3F0] text-[#00271D] flex flex-col font-sans relative overflow-hidden">

      {/* ── Organic Background ── */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
        <ellipse cx="5%"  cy="15%" rx="30%" ry="22%" fill="#e0f2ec" opacity="0.5" />
        <ellipse cx="90%" cy="80%" rx="35%" ry="28%" fill="#d1f0e4" opacity="0.4" />
        <ellipse cx="60%" cy="45%" rx="20%" ry="15%" fill="#e0f2ec" opacity="0.25" />
      </svg>

      {/* ── Fixed Top Header ── */}
      <header className="shrink-0 z-40 w-full bg-white/85 backdrop-blur-xl border-b border-[#00271D]/10 px-4 py-3 flex items-center justify-between shadow-sm shadow-[#00271D]/5">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-[#00271D]/50 hover:text-[#00271D] hover:bg-[#00271D]/5 md:hidden transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <SortLogo size={38} subtitle={subtitle} />
        </div>

        {/* Header Right */}
        <div className="flex items-center gap-2">

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileDropdownOpen(false); }}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-[#00271D] transition-colors relative cursor-pointer"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                  <h4 className="font-bold text-xs text-[#00271D] uppercase tracking-wider">Alerts & Actions</h4>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); adminNotifications.forEach(n => dismissNotification(n.id)); }}
                        className="text-[9px] text-[#00A77C] font-bold hover:underline cursor-pointer"
                      >
                        Clear all
                      </button>
                    )}
                    <span className="text-[10px] px-2 py-0.5 bg-[#00A77C]/10 text-[#00A77C] rounded-full font-bold border border-[#00A77C]/20">
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

                    const color = isCompleted ? 'text-emerald-700' : isVerified ? 'text-amber-700' : isDispatched ? 'text-indigo-700' : isSubmitted ? 'text-sky-600' : 'text-gray-600';
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
                    className="text-xs text-[#00A77C] font-bold hover:underline"
                  >
                    View All Reports
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => { setProfileDropdownOpen(!profileDropdownOpen); setNotificationsOpen(false); }}
              className="flex items-center gap-2 bg-white/80 border border-slate-200/80 px-2.5 py-1.5 rounded-full shadow-xs hover:border-[#00A77C] transition-all cursor-pointer"
            >
              <div className={`h-7 w-7 rounded-full text-white font-bold flex items-center justify-center text-xs shadow-md ${roleColor}`}>
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-[#00271D] leading-none">{currentUser.name.split(' ')[0]}</p>
                <p className="text-[9px] text-[#00271D]/40 font-semibold uppercase tracking-wider">{currentUser.role}</p>
              </div>
              <ChevronDown size={12} className="text-gray-400" />
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Active Account</p>
                  <p className="font-bold text-sm text-[#00271D] mt-0.5">{currentUser.name}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{currentUser.employeeId}</p>
                </div>

                <div className="p-3">
                  <p className="flex items-center gap-1.5 text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-2">
                    <Wrench size={10} /> Demo Role Switcher
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['STUDENT', 'TEACHER', 'MRF', 'ADMIN'] as Role[]).map(role => (
                      <button
                        key={role}
                        onClick={() => handleRoleToggle(role)}
                        className={`text-[10px] font-bold p-1.5 rounded-lg border transition-all cursor-pointer ${
                          currentUser.role === role
                            ? 'bg-[#00A77C] text-white border-[#00A77C]'
                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="px-3 pb-2 flex items-center justify-center gap-1 text-[9px] text-gray-400 font-semibold border-t border-gray-100 pt-2">
                  <ShieldCheck size={10} className="text-[#00A77C]" />
                  RBAC Simulation
                </div>

                <div className="p-1 border-t border-gray-100">
                  <button
                    onClick={() => logout()}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <LogOut size={13} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── BODY (Sidebar + Main) ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative z-10">

        {/* ── Fixed Left Sidebar ── */}
        <aside className={`
          fixed inset-y-0 left-0 z-30 w-60 bg-white/90 backdrop-blur-xl border-r border-[#00271D]/8
          pt-20 pb-4 px-3 flex flex-col justify-between shrink-0 overflow-y-auto
          transform transition-transform duration-300 ease-in-out
          md:translate-x-0 md:relative md:inset-auto md:h-full md:pt-4
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="flex flex-col gap-4 overflow-hidden flex-1">

            {/* Section label */}
            <div className="px-2 pb-2 border-b border-[#00271D]/8 hidden md:block shrink-0">
              <span className="text-[10px] font-black text-[#00271D]/30 tracking-widest uppercase">
                {isMRF ? 'MRF Operations' : 'Admin Control'}
              </span>
            </div>

            {/* Nav items */}
            <nav className="flex flex-col gap-4 overflow-y-auto flex-1 pr-1">
              {isMRF ? (
                <div className="flex flex-col gap-0.5">
                  {MRF_NAV_ITEMS.map(item => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all group cursor-pointer
                          ${isActive
                            ? 'bg-[#00A77C]/10 text-[#00A77C]'
                            : 'text-[#00271D]/55 hover:bg-[#00271D]/5 hover:text-[#00271D]'}
                        `}
                      >
                        <Icon
                          size={15}
                          className={`transition-colors shrink-0 ${isActive ? 'text-[#00A77C]' : 'text-[#00271D]/30 group-hover:text-[#00271D]'}`}
                        />
                        <span className="flex-1 text-left">{item.label}</span>
                        {isActive && <ChevronRight size={11} className="text-[#00A77C] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                ADMIN_SECTIONS.map(section => (
                  <div key={section.group} className="space-y-1">
                    <span className="px-3 text-[10px] font-black text-[#00271D]/40 uppercase tracking-wider block">
                      {section.group}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      {section.items.map(item => {
                        const isSettings = item.id === 'admin-settings';
                        const isSettingsActive = isSettings && (activeTab === 'admin-settings' || SETTINGS_SUBITEMS.some(sub => sub.id === activeTab));
                        const isActive = activeTab === item.id || isSettingsActive;
                        const Icon = item.icon;

                        return (
                          <React.Fragment key={item.id}>
                            <button
                              onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                              className={`
                                w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all group cursor-pointer
                                ${isActive
                                  ? 'bg-[#00271D] text-white shadow-sm'
                                  : 'text-[#00271D]/70 hover:bg-[#00271D]/5 hover:text-[#00271D]'}
                              `}
                            >
                              <Icon
                                size={15}
                                className={`transition-colors shrink-0 ${isActive ? 'text-[#00A77C]' : 'text-[#00271D]/40 group-hover:text-[#00271D]'}`}
                              />
                              <span className="flex-1 text-left">{item.label}</span>
                              {isSettings && (
                                <ChevronDown size={12} className={`transition-transform shrink-0 ${isSettingsActive ? 'rotate-180 text-white' : 'text-[#00271D]/30'}`} />
                              )}
                              {isActive && !isSettings && <div className="w-1.5 h-1.5 rounded-full bg-[#00A77C] shrink-0" />}
                            </button>

                            {/* Settings Expandable Sub-Menu */}
                            {isSettings && isSettingsActive && (
                              <div className="pl-7 pr-1 py-1 space-y-0.5">
                                {SETTINGS_SUBITEMS.map(sub => {
                                  const isSubActive = activeTab === sub.id || (activeTab === 'admin-settings' && sub.id === 'academic-calendar');
                                  return (
                                    <button
                                      key={sub.id}
                                      onClick={() => { setActiveTab(sub.id); setSidebarOpen(false); }}
                                      className={`
                                        w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all block cursor-pointer
                                        ${isSubActive
                                          ? 'bg-[#00A77C]/15 text-[#00A77C] font-bold'
                                          : 'text-[#00271D]/60 hover:text-[#00271D] hover:bg-[#00271D]/5'}
                                      `}
                                    >
                                      {sub.label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </nav>

          </div>

          {/* Sidebar Footer */}
          <div className="flex flex-col gap-2 pt-4 border-t border-[#00271D]/8 shrink-0">
            <button
              onClick={() => logout()}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-[#00271D]/40 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
            >
              <LogOut size={14} />
              <span>Sign Out Session</span>
            </button>
            <div className="flex items-center gap-2 px-3">
              <div className="h-1.5 w-1.5 rounded-full bg-[#00A77C] animate-pulse" />
              <span className="text-[9px] font-bold text-[#00A77C] tracking-wider uppercase">Connected</span>
            </div>
            <p className="text-[9px] text-gray-400 px-3">S.O.R.T Campus Gate v2.0</p>
          </div>
        </aside>

        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-gray-900/30 backdrop-blur-xs z-20 md:hidden"
          />
        )}

        {/* ── Main Content (Scrollable) ── */}
        <main ref={mainRef} className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8 relative z-10 h-full min-w-0">
          {children}
        </main>

      </div>
    </div>
  );
};
