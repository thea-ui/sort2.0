import React, { useState } from 'react';
import {
  Trophy,
  CheckCircle,
  Award,
  Search,
  RotateCcw,
  Flame,
  Lightbulb
} from 'lucide-react';
import { User, Challenge } from '../../../types';

interface GamificationTabProps {
  currentUser: User;
  users: User[];
  challenges: Challenge[];
  isPeriodOver: boolean;
  setIsPeriodOver: (v: boolean) => void;
  claimedSuccess: boolean;
  setClaimedSuccess: (v: boolean) => void;
  deductPoints: (id: string, amt: number) => void;
  claimCertificate: (cert: string) => void;
  getAvatarColor: (name: string) => string;
}

export const GamificationTab: React.FC<GamificationTabProps> = ({
  currentUser,
  users,
  challenges,
  isPeriodOver,
  setIsPeriodOver,
  claimedSuccess,
  setClaimedSuccess,
  deductPoints,
  claimCertificate,
  getAvatarColor
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Compute leaderboard rankings
  const leaderboardEntries = users
    .filter(u => u.role === 'STUDENT' || u.role === 'TEACHER')
    .sort((a, b) => b.points - a.points)
    .map((u, index) => ({
      rank: index + 1,
      studentId: u.id,
      studentName: u.name,
      gradeSection: u.classroomSection || (u.role === 'TEACHER' ? 'Faculty Staff' : 'Grade 10 - Newton'),
      pointsBalance: u.points,
      reportsCount: u.points >= 300 ? 20 : u.points >= 50 ? 5 : 1,
      isCurrentUser: u.id === 'current' || u.email === currentUser.email
    }));

  const currentEntry = leaderboardEntries.find(e => e.isCurrentUser);
  const currentUserRank = currentEntry ? currentEntry.rank : 99;
  const isWinner = currentUserRank === 1;

  const handleClaim = () => {
    if (!isWinner || !isPeriodOver) return;
    claimCertificate('Top 1 Institutional Certificate');
    deductPoints('current', 500);
    setClaimedSuccess(true);
    setTimeout(() => setClaimedSuccess(false), 5000);
  };

  const filteredEntries = leaderboardEntries.filter(e =>
    e.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.gradeSection.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Top 3 Podium entries (ordered Rank 2, Rank 1, Rank 3 or top 3)
  const rank1 = leaderboardEntries.find(e => e.rank === 1);
  const rank2 = leaderboardEntries.find(e => e.rank === 2);
  const rank3 = leaderboardEntries.find(e => e.rank === 3);

  const top3Podium = [rank2, rank1, rank3].filter(Boolean) as typeof leaderboardEntries;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">
      
      {/* Header Section (Matches Screenshot 693) */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
            <Trophy className="text-amber-500" size={20} />
            <span>Eco-Champions Leaderboard</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Showing top reporters for this academic quarter</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Action Button (Matches Screenshot 693) */}
          <button
            type="button"
            onClick={() => {}}
            title="Refresh Leaderboard"
            className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-emerald-600 hover:border-emerald-200 shadow-sm transition-all cursor-pointer"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* Simulator Quick Controls (Preserved Simulator Feature) */}
      <div className="flex items-center justify-between bg-gray-50/80 border border-gray-200 rounded-xl p-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tournament State:</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${isPeriodOver ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
            {isPeriodOver ? 'Ended' : 'Active'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPeriodOver(!isPeriodOver)}
            className="px-2.5 py-1 text-[10px] font-bold rounded border bg-white border-gray-200 text-gray-700 hover:bg-gray-100 cursor-pointer select-none"
          >
            {isPeriodOver ? 'Resume Period' : 'End Period Now'}
          </button>
          <button
            type="button"
            onClick={() => deductPoints('current', -300)}
            className="px-2.5 py-1 text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded cursor-pointer select-none"
          >
            +300 PTS
          </button>
        </div>
      </div>

      {/* Claim success alert */}
      {claimedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 animate-fade-in text-xs shadow-sm">
          <CheckCircle size={20} className="shrink-0 text-emerald-600" />
          <div>
            <p className="font-bold text-sm">Certificate Claimed Successfully!</p>
            <p className="text-emerald-700 mt-0.5">
              "Top 1 Institutional Certificate" has been added to your Showcase.
            </p>
          </div>
        </div>
      )}

      {/* Amber Banner: How Points Work (Matches Screenshot 693) */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 sm:p-5 text-amber-950 shadow-sm space-y-3">
        <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
          <Lightbulb className="text-amber-500 shrink-0" size={16} />
          <span>How Points Work</span>
        </div>
        <p className="text-xs text-amber-800/90 leading-relaxed font-medium">
          When the same bin is reported by multiple students, only the first 3 get points after admin verification:
        </p>

        <div className="flex flex-wrap gap-2 pt-0.5">
          <span className="px-3 py-1 bg-amber-100/90 border border-amber-200/80 text-amber-800 rounded-full text-[11px] font-bold flex items-center gap-1.5 shadow-2xs">
            <span>🥇</span> <span>15 pts — 1st reporter</span>
          </span>
          <span className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-[11px] font-bold flex items-center gap-1.5 shadow-2xs">
            <span>🥈</span> <span>10 pts — 2nd reporter</span>
          </span>
          <span className="px-3 py-1 bg-orange-100/80 border border-orange-200/80 text-amber-900 rounded-full text-[11px] font-bold flex items-center gap-1.5 shadow-2xs">
            <span>🥉</span> <span>5 pts — 3rd reporter</span>
          </span>
        </div>
      </div>

      {/* Top 3 Winner Podium Cards (Matches Screenshot 693) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {top3Podium.map((entry) => {
          const isUser = entry.isCurrentUser;
          const medalIcon = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉';
          const badgeBg = entry.rank === 1 ? 'bg-amber-100 border-amber-200 text-amber-800' :
                          entry.rank === 2 ? 'bg-slate-100 border-slate-200 text-slate-700' :
                          'bg-orange-100 border-orange-200 text-amber-900';

          return (
            <div
              key={entry.studentId}
              className={`bg-white rounded-2xl p-5 border text-center flex flex-col items-center justify-center transition-all ${
                isUser
                  ? 'border-2 border-emerald-500 ring-2 ring-emerald-500/10 shadow-sm'
                  : 'border-gray-200 shadow-sm hover:shadow-md'
              }`}
            >
              {/* Top Medal Icon Badge (Matches Screenshot 693) */}
              <div className={`h-8 w-8 rounded-full border flex items-center justify-center text-sm mb-3 shadow-inner font-bold ${badgeBg}`}>
                {entry.rank}
              </div>

              <h3 className={`text-xs font-bold ${isUser ? 'text-emerald-950 font-extrabold' : 'text-gray-900'}`}>
                {entry.studentName} {isUser && '(You)'}
              </h3>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">Student</p>

              <div className="flex items-center gap-1 mt-2.5 font-black text-xs text-gray-900">
                <Flame size={14} className="text-orange-500 fill-orange-500" />
                <span>{entry.pointsBalance}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search Input Bar (Matches Screenshot 693) */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name or course..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all shadow-sm font-medium"
        />
      </div>

      {/* Full Leaderboard Directory List (Matches Screenshot 693) */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-150 shadow-sm">
        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-xs font-medium">
            No students found matching your search.
          </div>
        ) : (
          filteredEntries.map((user) => {
            const isUser = user.isCurrentUser;
            const initial = user.studentName.charAt(0).toUpperCase();

            return (
              <div
                key={user.studentId}
                className={`p-4 flex items-center justify-between transition-colors ${
                  isUser
                    ? 'bg-emerald-50/40 border-l-4 border-emerald-500'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  {/* Medal / Rank Indicator Badge */}
                  <div className="w-6 text-center text-sm font-bold">
                    {user.rank === 1 ? (
                      <span className="h-6 w-6 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-extrabold inline-flex items-center justify-center">1</span>
                    ) : user.rank === 2 ? (
                      <span className="h-6 w-6 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-extrabold inline-flex items-center justify-center">2</span>
                    ) : user.rank === 3 ? (
                      <span className="h-6 w-6 rounded-full bg-orange-100 border border-orange-200 text-amber-900 text-[11px] font-extrabold inline-flex items-center justify-center">3</span>
                    ) : (
                      <span className="text-gray-400 text-xs font-bold">#{user.rank}</span>
                    )}
                  </div>

                  {/* Avatar Circle */}
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    isUser ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {initial}
                  </div>

                  {/* Name & Subtitle */}
                  <div>
                    <h4 className={`text-xs font-bold ${isUser ? 'text-emerald-950 font-extrabold' : 'text-gray-900'}`}>
                      {user.studentName} {isUser && '(You)'}
                    </h4>
                    <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                      Student · {user.reportsCount} {user.reportsCount === 1 ? 'report' : 'reports'}
                    </p>
                  </div>
                </div>

                {/* Fire Points Display */}
                <div className="flex items-center gap-1 font-black text-xs text-gray-900">
                  <Flame size={14} className="text-orange-500 fill-orange-500" />
                  <span>{user.pointsBalance}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Claim Certificate Action Bar (If winner) */}
      {isWinner && isPeriodOver && (
        <div className="p-5 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-2xl text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <h4 className="font-extrabold text-sm flex items-center gap-1.5">
              <Award size={18} />
              <span>Rank #1 Winner Prize Available!</span>
            </h4>
            <p className="text-xs text-amber-100 mt-0.5">You finished as the #1 Ecology Champion for this quarter.</p>
          </div>
          <button
            type="button"
            onClick={handleClaim}
            className="py-2.5 px-4 bg-white text-amber-800 font-extrabold text-xs rounded-xl shadow cursor-pointer hover:bg-amber-50 transition-all active:scale-95 shrink-0"
          >
            Claim Institutional Certificate
          </button>
        </div>
      )}

      {/* Active Challenges Section */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Trophy size={14} className="text-amber-500" />
          <span>Active Accumulation Challenges</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {challenges.map(ch => {
            const pct = Math.round((ch.progress / ch.target) * 100);

            return (
              <div key={ch.id} className="bg-gray-50/70 rounded-xl p-4 border border-gray-200 space-y-3">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-gray-800">{ch.title}</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-normal">{ch.description}</p>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded shrink-0">
                    +{ch.pointsAwarded} PTS
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-semibold text-gray-400">
                    <span>Progress</span>
                    <span>{ch.progress} / {ch.target} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
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
