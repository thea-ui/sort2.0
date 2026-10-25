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
import { WalkInActivityCard } from './WalkInActivityCard';
import { RewardLadderCard } from './RewardLadderCard';
import { StudentPageHeader, studentPage } from './ui/StudentPrimitives';

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
    <div className={studentPage}>

      <StudentPageHeader
        icon={Trophy}
        title="Eco-Champions Leaderboard"
        description="Top reporters for this academic quarter"
        actions={
          <button
            type="button"
            onClick={() => {}}
            aria-label="Refresh leaderboard"
            title="Refresh Leaderboard"
            className="cursor-pointer rounded-lg border border-[var(--primary)]/15 bg-white p-2 text-[var(--text-strong)]/40 transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <RotateCcw size={14} />
          </button>
        }
      />

      {/* Certificate Vault — milestone (instant) + ranked (term-end) */}
      <CertificateVault currentUser={currentUser} settings={settings} onClaimed={onCertificateChange} />

      {/* Banner: How Points Work */}
      <div className="space-y-3 rounded-2xl border border-[var(--primary)]/10 bg-white p-4 text-[var(--text-strong)] sm:p-5">
        <div className="flex items-center gap-2 font-bold text-xs text-[var(--accent)]">
          <Lightbulb className="text-[var(--accent)] shrink-0" size={16} />
          <span>How Points Work</span>
        </div>
        <p className="text-xs text-[var(--text-strong)]/80 leading-relaxed font-medium">
          When the same bin is reported by multiple students, only the first 3 get points after the MRF collects the reported waste. Ranks restart at each daily reset (default 6:00 PM) — every day has a fresh 1st, 2nd, and 3rd reporter:
        </p>

        <div className="flex flex-wrap gap-2 pt-0.5">
          <span className="px-3 py-1 bg-[var(--gold)]/20 border border-[var(--gold)]/40 text-[var(--gold)] rounded-full text-[11px] font-bold flex items-center gap-1.5 shadow-2xs">
            <Medal size={12} className="text-[var(--gold)]" /> <span>15 pts — 1st reporter</span>
          </span>
          <span className="px-3 py-1 bg-[var(--background)] border border-[var(--primary)]/15 text-[var(--text-strong)] rounded-full text-[11px] font-bold flex items-center gap-1.5 shadow-2xs">
            <Medal size={12} className="text-slate-400" /> <span>10 pts — 2nd reporter</span>
          </span>
          <span className="px-3 py-1 bg-[var(--background)] border border-[var(--primary)]/15 text-[var(--text-strong)]/80 rounded-full text-[11px] font-bold flex items-center gap-1.5 shadow-2xs">
            <Medal size={12} className="text-amber-700" /> <span>5 pts — 3rd reporter</span>
          </span>
        </div>
      </div>

      {/* Top 3 Winner Podium Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {top3Podium.map((entry) => {
          const isUser = entry.isCurrentUser;
          const isChampion = entry.rank === 1;
          const badgeBg = isChampion ? 'bg-[var(--gold)]/20 border-[var(--gold)] text-[var(--gold-strong)]' :
                          entry.rank === 2 ? 'bg-[var(--background)] border-[var(--primary)]/20 text-[var(--text-strong)]' :
                          'bg-[var(--background)] border-[var(--primary)]/15 text-[var(--text-strong)]/80';

          const cardTone = isUser
            ? 'border-[var(--accent)]/40 bg-[var(--accent)]/[0.04]'
            : isChampion
              ? 'border-[var(--gold)]/35 bg-white'
              : 'border-[var(--primary)]/10 bg-white';

          return (
            <div
              key={entry.studentId}
              className={`flex flex-col items-center justify-center rounded-2xl border p-5 text-center transition-colors ${cardTone}`}
            >
              <div className={`h-9 w-9 rounded-full border flex items-center justify-center text-sm mb-3 font-bold ${badgeBg}`}>
                {entry.rank}
              </div>

              <h3 className={`text-xs font-bold ${isUser ? 'text-[var(--accent)] font-extrabold' : 'text-[var(--text-strong)]'}`}>
                {entry.studentName} {isUser && '(You)'}
              </h3>
              <p className="text-[11px] text-[var(--text-strong)]/50 font-medium mt-0.5">Student</p>

              <div className="flex items-center gap-1 mt-2.5 font-black text-xs text-[var(--accent)]">
                <Flame size={14} className="text-[var(--accent)] fill-[var(--accent)]" />
                <span>{entry.pointsBalance}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-strong)]/40 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name or course..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-[var(--primary)]/15 bg-white py-2.5 pl-11 pr-4 text-base font-medium text-[var(--text-strong)] outline-none transition-colors placeholder:text-[var(--text-strong)]/35 focus:border-[var(--accent)] sm:text-sm"
        />
      </div>

      {/* Full Leaderboard Directory List */}
      <div className="divide-y divide-[var(--primary)]/10 overflow-hidden rounded-2xl border border-[var(--primary)]/10 bg-white">
        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-strong)]/50 text-xs font-medium">
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
                    ? 'bg-[var(--accent)]/15 border-l-4 border-[var(--accent)]'
                    : 'hover:bg-[var(--background)]'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-6 text-center text-sm font-bold">
                    {user.rank === 1 ? (
                      <span className="h-6 w-6 rounded-full bg-[var(--gold)]/20 border border-[var(--gold)] text-[var(--gold)] text-[11px] font-extrabold inline-flex items-center justify-center">1</span>
                    ) : user.rank === 2 ? (
                      <span className="h-6 w-6 rounded-full bg-[var(--background)] border border-[var(--primary)]/20 text-[var(--text-strong)] text-[11px] font-extrabold inline-flex items-center justify-center">2</span>
                    ) : user.rank === 3 ? (
                      <span className="h-6 w-6 rounded-full bg-[var(--background)] border border-[var(--primary)]/15 text-[var(--text-strong)]/80 text-[11px] font-extrabold inline-flex items-center justify-center">3</span>
                    ) : (
                      <span className="text-[var(--text-strong)]/40 text-xs font-bold">#{user.rank}</span>
                    )}
                  </div>

                  <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    isUser ? 'bg-[var(--accent)] text-white' : 'bg-[var(--accent)]/20 text-[var(--accent)]'
                  }`}>
                    {initial}
                  </div>

                  <div>
                    <h4 className={`text-xs font-bold ${isUser ? 'text-[var(--accent)] font-extrabold' : 'text-[var(--text-strong)]'}`}>
                      {user.studentName} {isUser && '(You)'}
                    </h4>
                    <p className="text-[11px] text-[var(--text-strong)]/50 font-medium mt-0.5">
                      Student · {user.reportsCount} {user.reportsCount === 1 ? 'report' : 'reports'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 font-black text-xs text-[var(--text-strong)]">
                  <Flame size={14} className="text-[var(--accent)] fill-[var(--accent)]" />
                  <span>{user.pointsBalance}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Active Challenges Section */}
      <div className="space-y-4 rounded-2xl border border-[var(--primary)]/10 bg-white p-4 sm:p-5">
        <h3 className="text-xs font-bold text-[var(--text-strong)]/50 uppercase tracking-widest flex items-center gap-2">
          <Trophy size={14} className="text-[var(--gold)]" />
          <span>Active Accumulation Challenges</span>
        </h3>

        {challenges.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--primary)]/15 bg-[var(--background)]/40 p-6 text-center">
            <p className="text-xs font-medium text-[var(--text-strong)]/50">
              No active challenges for this term. Check back soon!
            </p>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {challenges.map(ch => {
            const pct = ch.target > 0 ? Math.min(100, Math.round((ch.currentCount / ch.target) * 100)) : 0;

            return (
              <div key={ch.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-strong)]">{ch.title}</h4>
                    <p className="text-[11px] text-[var(--text-strong)]/60 mt-0.5 leading-normal">{ch.description}</p>
                  </div>
                  <span className="text-[10px] font-bold text-[var(--accent)] bg-[var(--accent)]/20 border border-[var(--accent)]/40 px-2.5 py-0.5 rounded-full shrink-0">
                    +{ch.pointsAwarded} PTS
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-semibold text-[var(--text-strong)]/50">
                    <span>Progress</span>
                    <span>{ch.currentCount} / {ch.target} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-[var(--primary)]/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[var(--accent)] h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* Walk-in Bottle Turn-ins & Milestone Prizes */}
      <WalkInActivityCard />
      <RewardLadderCard />

    </div>
  );
};
