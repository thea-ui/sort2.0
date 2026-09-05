import React, { useState } from 'react';
import { Trophy, Search, RefreshCw, Flame, Award, Medal } from 'lucide-react';
import { Report, User } from '../../../types';

interface AdminLeaderboardTabProps {
  users: User[];
  reports?: Report[];
}

export const AdminLeaderboardTab: React.FC<AdminLeaderboardTabProps> = ({ users, reports = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Sort student users dynamically by points descending
  const studentUsers = [...users]
    .filter(u => u.role === 'STUDENT')
    .map(u => {
      const userReports = reports.filter(
        r => r.reporterId === u.id || r.reporterName?.toLowerCase() === u.name?.toLowerCase()
      );
      const section = (u as any).sectionName || u.classroomSection || '';
      const grade = (u as any).gradeLevel || '';
      return {
        id: u.id,
        name: u.name,
        role: grade ? `${grade} - ${section}` : (section || 'Student'),
        dept: grade && section ? `${grade} — ${section}` : grade || section || 'N/A',
        reports: userReports.length,
        points: u.points || 0,
      };
    })
    .sort((a, b) => b.points - a.points || b.reports - a.reports);

  const leaderboardData = studentUsers.slice(0, 10).map((item, idx) => ({
    rank: idx + 1,
    ...item,
  }));

  const filtered = leaderboardData.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.dept.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const top1 = leaderboardData[0];
  const top2 = leaderboardData[1];
  const top3 = leaderboardData[2];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#00271D] tracking-tight flex items-center gap-2">
            <Trophy className="text-amber-500" size={24} />
            Eco-Points Leaderboard
          </h2>
          <p className="text-xs text-[#00271D]/50 mt-0.5">
            Top student eco-champions ranked by verified report points
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search size={14} className="absolute left-3 top-3 text-[#00271D]/40" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white/90 border border-white/80 rounded-xl pl-9 pr-3 py-2 text-xs text-[#00271D] outline-none focus:border-[#00A77C] shadow-sm"
            />
          </div>
          <button
            type="button"
            className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-[#00271D] shadow-sm cursor-pointer"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Points System Banner */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-amber-800">
          <Award size={15} className="text-amber-600" />
          <span>Points System:</span>
        </div>
        <span className="px-3 py-1 bg-amber-100 text-amber-800 font-bold rounded-full text-[11px] flex items-center gap-1">
          <Flame size={12} className="text-amber-600 fill-amber-600" /> 15 pts — 1st reporter
        </span>
        <span className="px-3 py-1 bg-sky-100 text-sky-800 font-bold rounded-full text-[11px] flex items-center gap-1">
          <Flame size={12} className="text-sky-600 fill-sky-600" /> 10 pts — 2nd reporter
        </span>
        <span className="px-3 py-1 bg-orange-100 text-orange-800 font-bold rounded-full text-[11px] flex items-center gap-1">
          <Flame size={12} className="text-orange-600 fill-orange-600" /> 5 pts — 3rd reporter
        </span>
        <span className="px-3 py-1 bg-gray-100 text-gray-600 font-medium rounded-full text-[11px]">
          4th+ reporter — no points
        </span>
      </div>

      {/* Podium Cards (Rank 2, Rank 1, Rank 3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        {/* Rank 2 */}
        {top2 && (
          <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm text-center space-y-2 relative">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white font-black text-xs flex items-center justify-center mx-auto -mt-8 border-2 border-white shadow-md">
              2
            </div>
            <p className="font-extrabold text-[#00271D] text-sm mt-1">{top2.name}</p>
            <p className="text-[11px] text-[#00271D]/40 font-semibold">{top2.role}</p>
            <p className="text-lg font-black text-amber-600 flex items-center justify-center gap-1">
              <Flame size={16} fill="currentColor" /> {top2.points}
            </p>
            <p className="text-[10px] text-[#00271D]/50 font-bold">{top2.reports} reports</p>
          </div>
        )}

        {/* Rank 1 Center Podium */}
        {top1 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 shadow-md text-center space-y-2 relative md:-translate-y-2">
            <div className="w-9 h-9 rounded-full bg-amber-500 text-white font-black text-sm flex items-center justify-center mx-auto -mt-10 border-2 border-white shadow-md">
              1
            </div>
            <p className="font-black text-[#00271D] text-base mt-1">{top1.name}</p>
            <p className="text-[11px] text-[#00271D]/50 font-semibold">{top1.role}</p>
            <p className="text-2xl font-black text-amber-600 flex items-center justify-center gap-1">
              <Flame size={20} fill="currentColor" /> {top1.points}
            </p>
            <p className="text-xs text-[#00271D]/60 font-bold">{top1.reports} reports</p>
          </div>
        )}

        {/* Rank 3 */}
        {top3 && (
          <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm text-center space-y-2 relative">
            <div className="w-8 h-8 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center mx-auto -mt-8 border-2 border-white shadow-md">
              3
            </div>
            <p className="font-extrabold text-[#00271D] text-sm mt-1">{top3.name}</p>
            <p className="text-[11px] text-[#00271D]/40 font-semibold">{top3.role}</p>
            <p className="text-lg font-black text-amber-600 flex items-center justify-center gap-1">
              <Flame size={16} fill="currentColor" /> {top3.points}
            </p>
            <p className="text-[10px] text-[#00271D]/50 font-bold">{top3.reports} reports</p>
          </div>
        )}
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#00271D]/8 text-[#00271D]/40 font-bold uppercase tracking-wider bg-gray-50/50">
                <th className="py-3.5 px-6">Rank</th>
                <th className="py-3.5 px-6">Student</th>
                <th className="py-3.5 px-6">Grade Level</th>
                <th className="py-3.5 px-6 text-center">Reports</th>
                <th className="py-3.5 px-6 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#00271D]/5">
              {filtered.map(row => (
                <tr key={row.rank} className="hover:bg-amber-500/5 transition-colors">
                  <td className="py-4 px-6">
                    <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[11px] font-black ${
                      row.rank === 1 ? 'bg-amber-500 text-white' :
                      row.rank === 2 ? 'bg-blue-500 text-white' :
                      row.rank === 3 ? 'bg-amber-700 text-white' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {row.rank}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-bold text-[#00271D]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#00A77C]/10 text-[#00A77C] font-bold flex items-center justify-center text-xs">
                        {row.name.charAt(0)}
                      </div>
                      <span>{row.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-[#00271D]/60 font-medium">{row.dept}</td>
                  <td className="py-4 px-6 text-center font-semibold text-[#00271D]/70">{row.reports}</td>
                  <td className="py-4 px-6 text-right font-black text-amber-600 flex items-center justify-end gap-1">
                    <Flame size={14} fill="currentColor" />
                    <span>{row.points}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
