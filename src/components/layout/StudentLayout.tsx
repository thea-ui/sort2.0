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
  GraduationCap
} from 'lucide-react';
import { Role } from '../../types';
import { SortLogo } from '../common/SortLogo';

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
  const { currentUser, changeRole, logout, reports } = useMockData();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  if (!currentUser) return null;

  const isTeacher = currentUser.role === 'TEACHER';
  
  // Filter out 'Ranks' for Teachers
  const navItems = isTeacher
    ? ALL_NAV_ITEMS.filter(item => item.id !== 'gamification')
    : ALL_NAV_ITEMS;

  const pendingReportsCount = reports.filter(r => r.status === 'PENDING').length;

  const handleRoleToggle = (role: Role) => {
    changeRole(role);
    setProfileDropdownOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F9F3F0] text-[#00271D] flex flex-col font-sans relative overflow-hidden">

      {/* Organic Background Waves & Pattern Grid (Matches Design Specs & Image 2) */}
      <div className="absolute top-0 left-0 w-full h-[60vh] pointer-events-none overflow-hidden z-0">
        <svg 
          viewBox="0 0 1440 320" 
          className="absolute top-0 left-0 w-full object-cover opacity-75"
          style={{ height: '420px' }}
          preserveAspectRatio="none"
        >
          <path fill="#e0f2ec" fillOpacity="1" d="M0,192L48,202.7C96,213,192,235,288,229.3C384,224,480,192,576,192C672,192,768,224,864,240C960,256,1056,256,1152,240C1248,224,1344,192,1392,176L1440,160L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
        </svg>
        <svg 
          viewBox="0 0 1440 320" 
          className="absolute top-0 left-0 w-full object-cover opacity-45"
          style={{ height: '500px' }}
          preserveAspectRatio="none"
        >
          <path fill="#d1f0e4" fillOpacity="1" d="M0,256L48,261.3C96,267,192,277,288,256C384,235,480,181,576,170.7C672,160,768,192,864,213.3C960,235,1056,245,1152,234.7C1248,224,1344,192,1392,176L1440,160L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
        </svg>
      </div>

      {/* Global Header */}
      <header className="sticky top-0 z-50 border-b border-[#00271D]/10 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">

          {/* Brand */}
          <SortLogo 
            size={48} 
            subtitle={isTeacher ? 'Faculty Portal' : 'Student Portal'} 
          />

          {/* Right Actions */}
          <div className="flex items-center gap-2">

            {!isTeacher && (
              <div className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border border-[#00A77C]/30 bg-[#00A77C]/10 text-[#00A77C]">
                <Flame size={13} />
                <span>{currentUser.points} pts</span>
              </div>
            )}

            {isTeacher && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#00A77C]/10 text-[#00A77C] border border-[#00A77C]/30 text-xs font-bold">
                <GraduationCap size={13} />
                Faculty Staff
              </span>
            )}

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-[#00271D] transition-colors relative cursor-pointer"
              >
                <Bell size={16} />
                {pendingReportsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">
                    {pendingReportsCount}
                  </span>
                )}
              </button>
            </div>

            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 border border-gray-200 bg-white rounded-full pr-3 pl-1 py-1 hover:border-[#00A77C] transition-all cursor-pointer shadow-sm"
              >
                <div className="h-6 w-6 rounded-full bg-[#00A77C] text-white font-bold flex items-center justify-center text-[10px]">
                  {currentUser.name.split(' ').map(n => n[0]).join('')}
                </div>
                <span className="text-xs font-semibold text-[#00271D] hidden sm:block">{currentUser.name.split(' ')[0]}</span>
                <ChevronDown size={13} className="text-gray-400" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50 p-1">
                  <div className="px-3 py-2 bg-gray-50 rounded-lg mb-1">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Switch Role (Demo)</p>
                  </div>
                  <div className="space-y-0.5">
                    {(['STUDENT', 'TEACHER', 'MRF', 'ADMIN'] as Role[]).map(role => (
                      <button
                        key={role}
                        onClick={() => handleRoleToggle(role)}
                        className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
                          currentUser.role === role ? 'bg-[#00A77C]/15 text-[#00A77C]' : 'text-[#00271D] hover:bg-gray-50'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                  <div className="pt-1 mt-1 border-t border-gray-100">
                    <button onClick={() => logout()} className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer">
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Desktop Navigation — 2026 Floating Pill Capsule */}
      <div className="hidden md:flex relative z-20 w-full justify-center pt-5 pb-2">
        <nav className="flex items-center gap-1.5 bg-white/85 backdrop-blur-xl border border-white/80 p-1.5 rounded-full shadow-lg shadow-[#00271D]/5">
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
                    ? 'bg-[#00A77C] text-white shadow-md shadow-[#00A77C]/25'
                    : 'text-[#00271D]/70 hover:bg-[#00271D]/5 hover:text-[#00271D]'}
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
      <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-10">
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
                  isActive ? 'bg-[#00A77C]/15 text-[#00A77C]' : 'text-gray-400'
                }`}>
                  <Icon size={19} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] font-semibold transition-colors ${
                  isActive ? 'text-[#00A77C]' : 'text-gray-400'
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
