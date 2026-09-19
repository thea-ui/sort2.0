import React, { useState } from 'react';
import {
  Trophy,
  Search,
  RotateCcw,
  Flame,
  Lightbulb,
  Medal,
} from 'lucide-react';
import { User, Challenge, Report, SystemSettings } from '../../../types';
import { CertificateVault } from './CertificateVault';

interface GamificationTabProps {
  currentUser: User;
  users: User[];
  reports?: Report[];
  challenges: Challenge[];
  settings?: SystemSettings | null;
  onCertificateChange?: () => void;
}

export const GamificationTab: React.FC<GamificationTabProps> = ({
  currentUser,
  users,
  reports = [],
  challenges,
  settings,
  onCertificateChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Anonymous API responses omit `email` (RA 10173 data minimisation), so user
  // identity must fall back to the id. Never call .toLowerCase() on it directly.
  const identityKey = (u: User) => String(u.email ?? u.id ?? '').toLowerCase();
  const isSameUser = (a: User, b: User) =>
    a.id === b.id || (!!a.email && !!b.email && a.email.toLowerCase() === b.email.toLowerCase());

  // Compute leaderboard rankings with actual report counts
  const leaderboardEntries = users
    .filter(u => u.role === 'STUDENT')
    .filter((u, index, self) => index === self.findIndex(t => identityKey(t) === identityKey(u)))
    .sort((a, b) => b.points - a.points)
    .map((u, index) => {
      const actualCount = reports.filter(r =>
        r.reporterId === u.id ||
        r.reporterName === u.name ||
        (isSameUser(u, currentUser) && r.reporterId === currentUser.id)
      ).length;

      return {
        rank: index + 1,
        studentId: u.id,
        studentName: u.name,
        gradeSection: (u as any).gradeLevel ? `${(u as any).gradeLevel} — ${(u as any).sectionName}` : u.classroomSection || 'N/A',
        pointsBalance: u.points,
        reportsCount: actualCount,
        isCurrentUser: isSameUser(u, currentUser)
      };
    });

  const filteredEntries = leaderboardEntries.filter(e =>
    e.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.gradeSection.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const rank1 = leaderboardEntries.find(e => e.rank === 1);
  const rank2 = leaderboardEntries.find(e => e.rank === 2);
  const rank3 = leaderboardEntries.find(e => e.rank === 3);

  const top3Podium = [rank2, rank1, rank3].filter(Boolean) as typeof leaderboardEntries;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">

      {/* Header Section */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-heading font-extrabold tracking-tight text-[#00271D] flex items-center gap-2">
            <Trophy className="text-[#C69B26]" size={20} />
            <span>Eco-Champions Leaderboard</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Showing top reporters for this academic quarter</p>
        </div>

        <button
          type="button"
          onClick={() => {}}
          title="Refresh Leaderboard"
          className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-[#00A77C] hover:border-[#00A77C] shadow-sm transition-all cursor-pointer"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Certificate Vault — milestone (instant) + ranked (term-end) */}
      <CertificateVault currentUser={currentUser} settings={settings} onClaimed={onCertificateChange} />

      {/* Banner: How Points Work */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 text-[#00271D] shadow-sm space-y-3">
        <div className="flex items-center gap-2 font-bold text-xs text-[#00A77C]">
          <Lightbulb className="text-[#00A77C] shrink-0" size={16} />
          <span>How Points Work</span>
        </div>
        <p className="text-xs text-[#00271D]/80 leading-relaxed font-medium">
          When the same bin is reported by multiple students, only the first 3 get points after the MRF collects the reported waste:
        </p>

        <div className="flex flex-wrap gap-2 pt-0.5">
          <span className="px-3 py-1 bg-[#C69B26]/20 border border-[#C69B26]/40 text-[#C69B26] rounded-full text-[11px] font-bold flex items-center gap-1.5 shadow-2xs">
            <Medal size={12} className="text-[#C69B26]" /> <span>15 pts — 1st reporter</span>
          </span>
          <span className="px-3 py-1 bg-[#F9F3F0] border border-[#00271D]/15 text-[#00271D] rounded-full text-[11px] font-bold flex items-center gap-1.5 shadow-2xs">
            <Medal size={12} className="text-slate-400" /> <span>10 pts — 2nd reporter</span>
          </span>
          <span className="px-3 py-1 bg-[#F9F3F0] border border-[#00271D]/15 text-[#00271D]/80 rounded-full text-[11px] font-bold flex items-center gap-1.5 shadow-2xs">
            <Medal size={12} className="text-amber-700" /> <span>5 pts — 3rd reporter</span>
          </span>
        </div>
      </div>

      {/* Top 3 Winner Podium Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {top3Podium.map((entry) => {
          const isUser = entry.isCurrentUser;
          const badgeBg = entry.rank === 1 ? 'bg-[#C69B26]/20 border-[#C69B26] text-[#C69B26]' :
                          entry.rank === 2 ? 'bg-[#F9F3F0] border-[#00271D]/20 text-[#00271D]' :
                          'bg-[#F9F3F0] border-[#00271D]/15 text-[#00271D]/80';

          return (
            <div
              key={entry.studentId}
              className={`bg-white rounded-2xl p-6 border text-center flex flex-col items-center justify-center transition-all hover:shadow-md ${
                isUser
                  ? 'border-2 border-[#00A77C] shadow-sm'
                  : 'border-gray-200 shadow-sm'
              }`}
            >
              <div className={`h-9 w-9 rounded-full border flex items-center justify-center text-sm mb-3 font-bold ${badgeBg}`}>
                {entry.rank}
              </div>

              <h3 className={`text-xs font-bold ${isUser ? 'text-[#00A77C] font-extrabold' : 'text-[#00271D]'}`}>
                {entry.studentName} {isUser && '(You)'}
              </h3>
              <p className="text-[11px] text-[#00271D]/50 font-medium mt-0.5">Student</p>

              <div className="flex items-center gap-1 mt-2.5 font-black text-xs text-[#00A77C]">
                <Flame size={14} className="text-[#00A77C] fill-[#00A77C]" />
                <span>{entry.pointsBalance}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00271D]/40 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name or course..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-[#00271D] placeholder-gray-400 outline-none focus:border-[#00A77C] transition-all shadow-sm font-medium"
        />
      </div>

      {/* Full Leaderboard Directory List */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100 shadow-sm">
        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-[#00271D]/50 text-xs font-medium">
            No students found matching your search.
          </div>
        ) : (
          filteredEntries.slice(0, 10).map((user) => {
            const isUser = user.isCurrentUser;
            const initial = user.studentName.charAt(0).toUpperCase();

            return (
              <div
                key={user.studentId}
                className={`p-4 flex items-center justify-between transition-colors ${
                  isUser
                    ? 'bg-[#00A77C]/15 border-l-4 border-[#00A77C]'
                    : 'hover:bg-[#F9F3F0]'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-6 text-center text-sm font-bold">
                    {user.rank === 1 ? (
                      <span className="h-6 w-6 rounded-full bg-[#C69B26]/20 border border-[#C69B26] text-[#C69B26] text-[11px] font-extrabold inline-flex items-center justify-center">1</span>
                    ) : user.rank === 2 ? (
                      <span className="h-6 w-6 rounded-full bg-[#F9F3F0] border border-[#00271D]/20 text-[#00271D] text-[11px] font-extrabold inline-flex items-center justify-center">2</span>
                    ) : user.rank === 3 ? (
                      <span className="h-6 w-6 rounded-full bg-[#F9F3F0] border border-[#00271D]/15 text-[#00271D]/80 text-[11px] font-extrabold inline-flex items-center justify-center">3</span>
                    ) : (
                      <span className="text-[#00271D]/40 text-xs font-bold">#{user.rank}</span>
                    )}
                  </div>

                  <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    isUser ? 'bg-[#00A77C] text-white' : 'bg-[#00A77C]/20 text-[#00A77C]'
                  }`}>
                    {initial}
                  </div>

                  <div>
                    <h4 className={`text-xs font-bold ${isUser ? 'text-[#00A77C] font-extrabold' : 'text-[#00271D]'}`}>
                      {user.studentName} {isUser && '(You)'}
                    </h4>
                    <p className="text-[11px] text-[#00271D]/50 font-medium mt-0.5">
                      Student · {user.reportsCount} {user.reportsCount === 1 ? 'report' : 'reports'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 font-black text-xs text-[#00271D]">
                  <Flame size={14} className="text-[#00A77C] fill-[#00A77C]" />
                  <span>{user.pointsBalance}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Active Challenges Section */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-[#00271D]/50 uppercase tracking-widest flex items-center gap-2">
          <Trophy size={14} className="text-[#C69B26]" />
          <span>Active Accumulation Challenges</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {challenges.map(ch => {
            const pct = Math.round((ch.currentCount / ch.target) * 100);

            return (
              <div key={ch.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-[#00271D]">{ch.title}</h4>
                    <p className="text-[11px] text-[#00271D]/60 mt-0.5 leading-normal">{ch.description}</p>
                  </div>
                  <span className="text-[10px] font-bold text-[#00A77C] bg-[#00A77C]/20 border border-[#00A77C]/40 px-2.5 py-0.5 rounded-full shrink-0">
                    +{ch.pointsAwarded} PTS
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-semibold text-[#00271D]/50">
                    <span>Progress</span>
                    <span>{ch.currentCount} / {ch.target} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-[#00271D]/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#00A77C] h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
