import React from 'react';
import {
  Flame,
  Trophy,
  AlertTriangle,
  Zap,
  Camera,
  MapPin,
  Clock,
  Activity,
  ArrowRight
} from 'lucide-react';
import { User, Report } from '../../../types';

interface OverviewTabProps {
  currentUser: User;
  reports: Report[];
  setActiveTab?: (tab: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ currentUser, reports, setActiveTab }) => {
  const personalReports = reports.filter(r => r.reporterId === 'current');

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">
      
      {/* Welcome Header Banner */}
      <div className="bg-white/80 backdrop-blur-sm border border-emerald-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between relative overflow-hidden">
        <div className="flex items-center gap-5 relative z-10">
          <div className="h-20 w-20 rounded-2xl bg-emerald-500 text-white font-black text-3xl flex items-center justify-center shadow-md shadow-emerald-500/30 shrink-0">
            SD
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400">Welcome back,</p>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none mt-1">{currentUser.name}</h2>
            <p className="text-xs font-bold text-emerald-600 mt-2 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Active Eco-Reporter · Grade 10 - Newton
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8 mt-6 md:mt-0 relative z-10">
          <div className="text-center">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Rank</p>
            <p className="text-3xl font-black text-gray-900 leading-none">
              <span className="text-amber-500 text-2xl mr-0.5">#</span>2
            </p>
          </div>
          <div className="text-center">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Eco-Points</p>
            <p className="text-3xl font-black text-gray-900 leading-none flex items-center justify-center">
              <Flame size={20} className="text-orange-500 mr-1 fill-orange-500" />
              {currentUser.points}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">My Reports</p>
            <p className="text-3xl font-black text-gray-900 leading-none">
              {personalReports.length}
            </p>
          </div>
        </div>
      </div>

      {/* The Top 3 Race Card */}
      <div className="bg-[#fcfdfa] border border-amber-150 rounded-3xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex items-start gap-4 relative z-10">
          <div className="h-10 w-10 shrink-0 rounded-2xl bg-amber-100 flex items-center justify-center">
            <Trophy size={20} className="text-amber-500" strokeWidth={2.5} />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">The Top 3 Race</h3>
              <p className="text-[11px] text-gray-500 font-semibold mt-0.5">Quarterly certificates are exclusively awarded to the top 3 eco-champions.</p>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-gray-600 font-medium bg-gray-50/80 border border-gray-150 rounded-xl py-2 px-3 w-fit">
              <AlertTriangle size={14} className="text-amber-500 shrink-0" />
              <span>Quarterly certificates are exclusively awarded to the top 3 eco-champions. Keep reporting to reach the top next quarter!</span>
            </div>

            <div className="pt-1 max-w-2xl">
              <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 tracking-wider mb-1.5 uppercase">
                <span>Your Standing</span>
                <span className="text-gray-900">Rank <span className="text-amber-500 font-black">#2</span></span>
              </div>
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '85%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Zap size={16} className="text-emerald-500" />
          <h3 className="text-sm font-bold text-gray-900">Quick Actions</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={() => setActiveTab?.('submit-report')}
            className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm text-left hover:border-emerald-400 transition-all group cursor-pointer active:scale-[0.98]"
          >
            <div className="h-11 w-11 rounded-xl bg-emerald-500 flex items-center justify-center mb-3 text-white group-hover:scale-105 transition-transform shadow-md shadow-emerald-500/20">
              <Camera size={20} />
            </div>
            <h4 className="text-xs font-bold text-gray-900">Report Waste Bin</h4>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">Snap or pin full bins</p>
          </button>

          <button 
            onClick={() => setActiveTab?.('bin-map')}
            className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm text-left hover:border-sky-400 transition-all group cursor-pointer active:scale-[0.98]"
          >
            <div className="h-11 w-11 rounded-xl bg-sky-500 flex items-center justify-center mb-3 text-white group-hover:scale-105 transition-transform shadow-md shadow-sky-500/20">
              <MapPin size={20} />
            </div>
            <h4 className="text-xs font-bold text-gray-900">Live Bin Map</h4>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">Check bin availability</p>
          </button>

          <button 
            onClick={() => setActiveTab?.('report-history')}
            className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm text-left hover:border-purple-400 transition-all group cursor-pointer active:scale-[0.98]"
          >
            <div className="h-11 w-11 rounded-xl bg-purple-500 flex items-center justify-center mb-3 text-white group-hover:scale-105 transition-transform shadow-md shadow-purple-500/20">
              <Clock size={20} />
            </div>
            <h4 className="text-xs font-bold text-gray-900">My Activity</h4>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">View filed reports</p>
          </button>

          <button 
            onClick={() => setActiveTab?.('gamification')}
            className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm text-left hover:border-amber-400 transition-all group cursor-pointer active:scale-[0.98]"
          >
            <div className="h-11 w-11 rounded-xl bg-amber-500 flex items-center justify-center mb-3 text-white group-hover:scale-105 transition-transform shadow-md shadow-amber-500/20">
              <Trophy size={20} />
            </div>
            <h4 className="text-xs font-bold text-gray-900">Ranks & Badges</h4>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">Leaderboard standings</p>
          </button>
        </div>
      </div>

      {/* Operational Analytics Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-emerald-500" />
            <h3 className="text-sm font-bold text-gray-900">Campus Operational Analytics</h3>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab?.('bin-map')}
            className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View Bin Map</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {/* Module 2: STUDENT REPORTING FREQUENCY (Quick-Stat Counter Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-1 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-emerald-600 mb-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Reports Today</span>
              <span className="p-1.5 bg-emerald-50 rounded-lg">📊</span>
            </div>
            <p className="text-3xl font-black text-gray-900">24</p>
            <p className="text-[11px] font-semibold text-emerald-600">+8% vs yesterday</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-1 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-sky-600 mb-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">This Week</span>
              <span className="p-1.5 bg-sky-50 rounded-lg">📅</span>
            </div>
            <p className="text-3xl font-black text-gray-900">142</p>
            <p className="text-[11px] font-semibold text-sky-600">Active campus submissions</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-1 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-amber-600 mb-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Peak Activity Time</span>
              <span className="p-1.5 bg-amber-50 rounded-lg">⏰</span>
            </div>
            <p className="text-xl font-black text-gray-900 mt-1">12:00 PM - 2:00 PM</p>
            <p className="text-[11px] font-semibold text-amber-600">Highest daily traffic window</p>
          </div>
        </div>

        {/* 2-Column Grid: Grade Level & Materials Breakdown Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Module 1: REPORTS BY GRADE LEVEL */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-4 hover:shadow-md transition-shadow">
            <div>
              <h4 className="text-xs font-extrabold text-gray-900 flex items-center gap-2">
                <span className="text-emerald-500 text-sm">🎓</span>
                <span>Reports by Grade Level</span>
              </h4>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                Report distribution volume across academic grade levels
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {[
                { grade: 'Grade 7', pct: 28, count: 120, barBg: 'bg-emerald-500', bg: 'bg-emerald-50/60', text: 'text-emerald-700', border: 'border-emerald-100' },
                { grade: 'Grade 8', pct: 25, count: 108, barBg: 'bg-sky-500', bg: 'bg-sky-50/60', text: 'text-sky-700', border: 'border-sky-100' },
                { grade: 'Grade 9', pct: 22, count: 95, barBg: 'bg-amber-500', bg: 'bg-amber-50/60', text: 'text-amber-700', border: 'border-amber-100' },
                { grade: 'Grade 10', pct: 25, count: 105, barBg: 'bg-purple-500', bg: 'bg-purple-50/60', text: 'text-purple-700', border: 'border-purple-100' },
              ].map((item) => (
                <div key={item.grade} className={`p-3 rounded-2xl border ${item.bg} ${item.border} space-y-1.5`}>
                  <div className="flex justify-between items-center text-xs font-bold text-gray-900">
                    <span>{item.grade}</span>
                    <span className={item.text}>{item.pct}% · {item.count} reports</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.barBg} transition-all duration-500`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Module 3: TOP RECYCLED MATERIALS */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-4 hover:shadow-md transition-shadow">
            <div>
              <h4 className="text-xs font-extrabold text-gray-900 flex items-center gap-2">
                <span className="text-emerald-500 text-sm">♻️</span>
                <span>Most Reported Materials</span>
              </h4>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                Item categories submitted by students across campus
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {[
                { name: 'Plastic Bottles', pct: 45, count: 210, icon: '🥤', barBg: 'bg-emerald-500', bg: 'bg-emerald-50/60', text: 'text-emerald-700', border: 'border-emerald-100' },
                { name: 'Aluminum Cans', pct: 30, count: 140, icon: '🥫', barBg: 'bg-sky-500', bg: 'bg-sky-50/60', text: 'text-sky-700', border: 'border-sky-100' },
                { name: 'Paper / Cardboard', pct: 15, count: 70, icon: '📦', barBg: 'bg-amber-500', bg: 'bg-amber-50/60', text: 'text-amber-700', border: 'border-amber-100' },
                { name: 'Glass / Others', pct: 10, count: 45, icon: '🍾', barBg: 'bg-purple-500', bg: 'bg-purple-50/60', text: 'text-purple-700', border: 'border-purple-100' },
              ].map((item) => (
                <div key={item.name} className={`p-3 rounded-2xl border ${item.bg} ${item.border} space-y-1.5`}>
                  <div className="flex justify-between items-center text-xs font-bold text-gray-900">
                    <span className="flex items-center gap-1.5">
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                    </span>
                    <span className={item.text}>{item.pct}% · {item.count} reports</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.barBg} transition-all duration-500`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
