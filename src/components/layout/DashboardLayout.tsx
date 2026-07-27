import React, { useState } from 'react';
import { useMockData } from '../../hooks/useMockData';
import { Role } from '../../types';
import {
  LayoutDashboard,
  FilePlus,
  History,
  Trophy,
  Users,
  MapPin,
  Truck,
  Scale,
  Settings,
  RefreshCw,
  AlertOctagon,
  Menu,
  X,
  Bell,
  ChevronRight,
  ShieldCheck,
  LogOut,
  ChevronDown
} from 'lucide-react';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  roles: Role[];
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  // Shared / General
  { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard, roles: ['STUDENT', 'TEACHER', 'MRF', 'ADMIN'] },
  
  // Student & Teacher
  { id: 'submit-report', label: 'File a Report', icon: FilePlus, roles: ['STUDENT', 'TEACHER'] },
  { id: 'report-history', label: 'Track My Activity', icon: History, roles: ['STUDENT', 'TEACHER'] },
  { id: 'gamification', label: 'Challenges & Certificates', icon: Trophy, roles: ['STUDENT'] },
  
  // Teacher Exclusive
  { id: 'bin-map', label: 'Live Bin Map', icon: MapPin, roles: ['TEACHER'] },
  
  // MRF Personnel
  { id: 'dispatches', label: 'Active Dispatches', icon: Truck, roles: ['MRF'] },
  { id: 'payload-register', label: 'Weight Payload Form', icon: Scale, roles: ['MRF'] },
  { id: 'bins-monitor', label: 'Bins Status Monitor', icon: MapPin, roles: ['MRF'] },
  
  // Admin Hub
  { id: 'admin-users', label: 'User Leaderboard', icon: Users, roles: ['ADMIN'] },
  { id: 'admin-warnings', label: 'Offenses & Warnings', icon: AlertOctagon, roles: ['ADMIN'] },
  { id: 'admin-settings', label: 'System Configuration', icon: Settings, roles: ['ADMIN'] },
  { id: 'admin-sync', label: 'Simulated Sync Logs', icon: RefreshCw, roles: ['ADMIN'] },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { currentUser, changeRole, reports, calendarEvents, logout } = useMockData();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const filteredSidebarItems = SIDEBAR_ITEMS.filter(item => item.roles.includes(currentUser?.role));

  // Simulated notifications: get recent pending reports or events
  const pendingReportsCount = reports.filter(r => r.status === 'PENDING').length;
  const recentReports = reports.slice(0, 3);

  const handleRoleToggle = (role: Role) => {
    changeRole(role);
    setProfileDropdownOpen(false);
    setActiveTab('overview');
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans">
      
      {/* HEADER BAR */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-150 md:hidden transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          {/* Logo Area */}
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500 text-white p-1.5 rounded-lg font-black tracking-wider text-xs">
              S.O.R.T
            </div>
            <span className="hidden sm:inline font-bold tracking-tight text-sm text-gray-800">
              Campus Environmental Management
            </span>
          </div>
        </div>

        {/* Header Right Interactions */}
        <div className="flex items-center gap-3">
          
          {currentUser.role === 'STUDENT' && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-sm border bg-emerald-50 border-emerald-100 text-emerald-700">
              <Trophy size={13} className="text-amber-500" />
              <span>{currentUser.points} pts</span>
            </div>
          )}

          {/* User Warning Banner */}
          {currentUser.warningsCount > 0 && (
            <div className="flex items-center gap-1 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full text-[10px] font-bold text-red-600">
              <AlertOctagon size={11} className="text-red-500" />
              <span>{currentUser.warningsCount} Warning(s)</span>
            </div>
          )}

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setProfileDropdownOpen(false);
              }}
              className="p-2 rounded-full text-gray-500 hover:text-emerald-600 hover:bg-gray-50 border border-gray-200 transition-all relative"
            >
              <Bell size={17} />
              {pendingReportsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-emerald-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {pendingReportsCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2.5 w-80 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-fade-in-up z-50">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                  <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider">Alerts & Actions</h4>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-bold">
                    {pendingReportsCount} Pending
                  </span>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                  {recentReports.map(rep => (
                    <div key={rep.id} className="p-3 hover:bg-gray-50 transition-colors cursor-pointer text-xs">
                      <div className="flex justify-between items-start mb-1">
                        <span className={`font-bold ${rep.status === 'PENDING' ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {rep.title}
                        </span>
                        <span className="text-[9px] text-gray-400 shrink-0 ml-2">Today</span>
                      </div>
                      <p className="text-[11px] text-gray-500 line-clamp-1">{rep.description}</p>
                      <div className="mt-1.5 flex items-center justify-between text-[10px]">
                        <span className="text-gray-400">By {rep.reporterName}</span>
                        <span className="text-emerald-600 font-bold">+{rep.pointsAwarded} pts</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-2.5 bg-gray-50 border-t border-gray-200 text-center">
                  <button 
                    onClick={() => {
                      setNotificationsOpen(false);
                      if (currentUser.role === 'ADMIN') setActiveTab('overview');
                      else setActiveTab('report-history');
                    }}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-bold hover:underline"
                  >
                    View Status Timelines
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile & Demo Switcher */}
          <div className="relative">
            <button
              onClick={() => {
                setProfileDropdownOpen(!profileDropdownOpen);
                setNotificationsOpen(false);
              }}
              className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded-full sm:pr-3 transition-colors border border-gray-200"
            >
              <div className={`h-8 w-8 rounded-full text-white font-bold flex items-center justify-center text-sm ${
                currentUser.role === 'STUDENT'
                  ? 'bg-emerald-500 shadow-md shadow-emerald-500/20'
                  : currentUser.role === 'TEACHER'
                    ? 'bg-indigo-500 shadow-md shadow-indigo-500/20'
                    : 'bg-violet-600 shadow-md shadow-violet-600/20'
              }`}>
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-gray-800 leading-none">{currentUser.name.split(' ')[0]}</p>
                <span className={`text-[9px] font-black tracking-wider uppercase ${
                  currentUser.role === 'STUDENT'
                    ? 'text-emerald-600'
                    : currentUser.role === 'TEACHER'
                      ? 'text-indigo-650'
                      : 'text-violet-650'
                }`}>
                  {currentUser.role}
                </span>
              </div>
              <ChevronDown size={12} className="text-gray-400 hidden sm:block" />
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2.5 w-60 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Active Account</p>
                  <p className="font-bold text-sm text-gray-800">{currentUser.name}</p>
                  <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
                  <p className="text-[9px] text-gray-400 font-mono mt-1">ID: {currentUser.employeeId}</p>
                </div>
                
                {/* Demo Role Switcher */}
                <div className="p-3 bg-white">
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-2">
                    🛠️ Demo Switcher (Simulate RBAC)
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['STUDENT', 'TEACHER', 'MRF', 'ADMIN'] as Role[]).map(role => (
                      <button
                        key={role}
                        onClick={() => handleRoleToggle(role)}
                        className={`text-[10px] font-bold p-1.5 rounded-lg border transition-all ${
                          currentUser.role === role
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-100'
                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-2 border-t border-gray-100 bg-gray-50 text-center">
                  <div className="flex items-center justify-center gap-1 text-[9px] text-gray-400 font-semibold">
                    <ShieldCheck size={11} className="text-emerald-500" />
                    <span>RBAC Simulation</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
        </div>
      </header>

      {/* CORE WORKSPACE WRAPPER */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* SIDEBAR */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 pt-20 pb-4 px-3 flex flex-col justify-between
            transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:pt-4
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <div className="flex flex-col gap-5">
            
            <div className="px-3 pb-1 border-b border-gray-100 hidden md:block">
              <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">
                Control Center
              </span>
            </div>

            {/* Sidebar List */}
            <nav className="flex flex-col gap-1">
              {filteredSidebarItems.map(item => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;
                const isStudent = currentUser.role === 'STUDENT';
                const isTeacher = currentUser.role === 'TEACHER';
                
                const activeBtnStyle = isStudent
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-250/60 shadow-sm shadow-emerald-500/5'
                  : isTeacher
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-250/60 shadow-sm shadow-indigo-500/5'
                    : 'bg-violet-50 text-violet-750 border-violet-250/60 shadow-sm shadow-violet-500/5';
                    
                const activeIconStyle = isStudent
                  ? 'text-emerald-600'
                  : isTeacher
                    ? 'text-indigo-600'
                    : 'text-violet-600';
                
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide border border-transparent transition-all group cursor-pointer
                      ${isActive
                        ? activeBtnStyle
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <IconComponent
                      size={15}
                      className={`transition-colors ${
                        isActive ? activeIconStyle : 'text-gray-400 group-hover:text-gray-700'
                      }`}
                    />
                    <span>{item.label}</span>
                    {isActive && (
                      <ChevronRight size={11} className={`ml-auto ${activeIconStyle}`} />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div className="px-3 pt-4 border-t border-gray-100 flex flex-col gap-3.5">
            <button
              onClick={() => logout()}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all"
            >
              <LogOut size={15} />
              <span>Sign Out Session</span>
            </button>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[9px] font-bold text-emerald-600 tracking-wider uppercase">
                  Connected
                </span>
              </div>
              <p className="text-[9px] text-gray-400">
                S.O.R.T Campus Gate v2.0
              </p>
            </div>
          </div>
        </aside>

        {/* Side backdrop for mobile */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs z-20 md:hidden"
          />
        )}

        {/* MAIN DISPLAY REGION */}
        <main className="flex-1 overflow-y-auto px-3 py-5 md:px-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
        
      </div>
    </div>
  );
};
