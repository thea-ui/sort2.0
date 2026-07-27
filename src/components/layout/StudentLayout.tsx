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
  Leaf
} from 'lucide-react';
import { Role } from '../../types';

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
  
  // Filter out 'Ranks' for Teachers as requested
  const navItems = isTeacher
    ? ALL_NAV_ITEMS.filter(item => item.id !== 'gamification')
    : ALL_NAV_ITEMS;

  // Mock pending alerts
  const pendingReportsCount = reports.filter(r => r.status === 'PENDING').length;

  const handleRoleToggle = (role: Role) => {
    changeRole(role);
    setProfileDropdownOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f9f7] text-gray-900 flex flex-col font-sans relative overflow-hidden">
      
      {/* Background SVG Waves */}
      <div className="absolute top-0 left-0 w-full h-[50vh] pointer-events-none overflow-hidden z-0">
        <svg 
          viewBox="0 0 1440 320" 
          className="absolute top-0 left-0 w-full object-cover opacity-60"
          style={{ height: '350px' }}
          preserveAspectRatio="none"
        >
          <path fill="#e0f2ec" fillOpacity="1" d="M0,192L48,202.7C96,213,192,235,288,229.3C384,224,480,192,576,192C672,192,768,224,864,240C960,256,1056,256,1152,240C1248,224,1344,192,1392,176L1440,160L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
        </svg>
        <svg 
          viewBox="0 0 1440 320" 
          className="absolute top-0 left-0 w-full object-cover opacity-30"
          style={{ height: '450px' }}
          preserveAspectRatio="none"
        >
          <path fill="#d1f0e4" fillOpacity="1" d="M0,256L48,261.3C96,267,192,277,288,256C384,235,480,181,576,170.7C672,160,768,192,864,213.3C960,235,1056,245,1152,234.7C1248,224,1344,192,1392,176L1440,160L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
        </svg>
      </div>

      {/* Global Header */}
      <header className="relative z-40 w-full px-6 py-4 flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500 text-white h-8 w-8 rounded-lg flex items-center justify-center shadow-sm">
            <Leaf size={18} strokeWidth={2.5} />
          </div>
          <span className="font-extrabold tracking-tight text-lg text-gray-900">
            S.O.R.T.
          </span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          
          {!isTeacher && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-orange-200 bg-orange-50 text-orange-700 shadow-sm cursor-default">
              <Flame size={14} className="text-orange-500" />
              <span>{currentUser.points} pts</span>
            </div>
          )}

          {isTeacher && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              Faculty Staff
            </span>
          )}

          <div className="relative">
            <button 
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-emerald-600 hover:border-emerald-200 shadow-sm transition-all relative cursor-pointer"
            >
              <Bell size={15} />
              {pendingReportsCount > 0 && (
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-rose-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center border border-white">
                  {pendingReportsCount}
                </span>
              )}
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 bg-white border border-gray-200 rounded-full pr-3 pl-1 py-1 shadow-sm hover:border-emerald-200 transition-all cursor-pointer"
            >
              <div className={`h-7 w-7 rounded-full text-white font-bold flex items-center justify-center text-xs ${
                isTeacher ? 'bg-indigo-600' : 'bg-emerald-500'
              }`}>
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </div>
              <span className="text-xs font-bold text-gray-700">{isTeacher ? 'Teacher' : 'Student'}</span>
              <ChevronDown size={14} className="text-gray-400" />
            </button>
            
            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50">
                <div className="p-2 bg-gray-50 border-b border-gray-100">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Switch Role (Demo)</p>
                </div>
                <div className="p-1">
                  {(['STUDENT', 'TEACHER', 'MRF', 'ADMIN'] as Role[]).map(role => (
                    <button
                      key={role}
                      onClick={() => handleRoleToggle(role)}
                      className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg cursor-pointer ${
                        currentUser.role === role ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
                <div className="p-1 border-t border-gray-100">
                  <button onClick={() => logout()} className="w-full text-left px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer">
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Desktop/Tablet Horizontal Navigation - Floating Capsule (Identical layout for Student & Teacher) */}
      <div className="hidden md:flex relative z-30 w-full justify-center mt-2 mb-6">
        <nav className="flex items-center gap-1 bg-white/80 backdrop-blur-md border border-gray-200 p-1.5 rounded-full shadow-sm">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`
                  flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer
                  ${isActive 
                    ? isTeacher
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
                `}
              >
                <Icon size={15} className={isActive ? 'text-white' : 'text-gray-500'} strokeWidth={isActive ? 2.5 : 2} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content Area */}
      <main className="relative z-20 flex-1 w-full max-w-5xl mx-auto px-4 pb-24 md:pb-12 overflow-y-auto">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-20 w-full bg-white border-t border-gray-150 py-4 px-6 mt-auto">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500 text-white h-6 w-6 rounded-lg flex items-center justify-center shadow-sm">
              <Leaf size={14} strokeWidth={2.5} />
            </div>
            <span className="font-extrabold tracking-tight text-sm text-gray-900">
              S.O.R.T.
            </span>
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider text-center sm:text-right">
            © 2026 S.O.R.T. — SMART OPERATIONAL RECOVERY AND TRACKING SYSTEM - Campus MRF Management System - v0.1
          </p>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar - Hidden on Desktop */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-t border-gray-200 pb-safe">
        <nav className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="relative flex flex-col items-center justify-center w-full py-1 gap-1 cursor-pointer transition-transform duration-200 ease-out"
                style={{ transform: isActive ? 'scale(1.05)' : 'scale(1)' }}
              >
                <div className={`
                  flex items-center justify-center p-1.5 rounded-full transition-colors duration-200
                  ${isActive 
                    ? isTeacher
                      ? 'bg-indigo-50 text-indigo-600 shadow-[0_0_12px_rgba(99,102,241,0.2)]'
                      : 'bg-emerald-50 text-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.2)]' 
                    : 'text-gray-400'}
                `}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] tracking-wide font-medium transition-colors duration-200 ${
                  isActive ? (isTeacher ? 'text-indigo-700 font-bold' : 'text-emerald-700 font-bold') : 'text-gray-500'
                }`}>
                  {item.label}
                </span>
                
                {/* Active Glowing Dot */}
                {isActive && (
                  <span className={`absolute -bottom-1 h-1 w-1 rounded-full ${
                    isTeacher ? 'bg-indigo-600 shadow-[0_0_4px_rgba(99,102,241,0.8)]' : 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.8)]'
                  }`} />
                )}
              </button>
            );
          })}
        </nav>
      </div>
      
    </div>
  );
};
