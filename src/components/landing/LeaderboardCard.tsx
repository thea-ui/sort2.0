import React from 'react';
import { useMockData } from '../../hooks/useMockData';
import { Trophy, Crown, Medal } from 'lucide-react';

const RANK_CONFIGS = [
  { icon: Crown,  badge: 'bg-amber-400 text-white',   ring: 'ring-amber-200' },
  { icon: Medal,  badge: 'bg-gray-300 text-gray-700', ring: 'ring-gray-200' },
  { icon: Medal,  badge: 'bg-amber-600 text-white',   ring: 'ring-amber-200' },
];

const AVATAR_COLORS = ['bg-emerald-500', 'bg-violet-500', 'bg-sky-500', 'bg-amber-500', 'bg-rose-500'];
const getAvatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

function formatDisplayName(fullName: string): { last: string; firstWithInitial: string } {
  // Input: "AGUILAR, MARY GRACE, REYES" or "AGUILAR, MARY GRACE REYES"
  const parts = fullName.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const last = parts[0];
    const firstPart = parts[1];
    const middle = parts[2] || '';
    const firstName = firstPart.split(' ')[0];
    const middleInitial = middle ? ` ${middle.charAt(0)}.` : '';
    return { last, firstWithInitial: `${firstName}${middleInitial}` };
  }
  // Fallback for non-comma names
  const words = fullName.split(' ').filter(Boolean);
  if (words.length >= 2) {
    return { last: words[words.length - 1], firstWithInitial: `${words[0]} ${words[words.length - 1]?.charAt(0) || ''}.` };
  }
  return { last: fullName, firstWithInitial: '' };
}

function Initials({ name, size = 'text-xs' }: { name: string; size?: string }) {
  const parts = name.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    const last = parts[0]?.charAt(0) || '';
    const first = parts[1]?.charAt(0) || '';
    return <span className={size}>{last}{first}</span>;
  }
  return <span className={size}>{name.charAt(0)}</span>;
}

export const LeaderboardCard: React.FC = () => {
  const { users } = useMockData();

  const leaderboard = [...users]
    .filter((u) => u.role === 'STUDENT')
    .sort((a, b) => b.points - a.points)
    .slice(0, 5);

  // Podium: 2nd, 1st, 3rd
  const podium = [leaderboard[1], leaderboard[0], leaderboard[2]];
  const podiumHeights = ['h-16', 'h-24', 'h-12'];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Trophy size={15} className="text-amber-500" strokeWidth={2} />
          <h3 className="text-sm font-bold text-gray-800">Eco Leaderboard</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Live</span>
        </div>
      </div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-5 border-b border-gray-100 bg-gradient-to-b from-gray-50/50 to-white px-4 py-8">
        {podium.map((user, visualIndex) => {
          if (!user) return <div key={visualIndex} className="w-20" />;
          const rank = visualIndex === 1 ? 0 : visualIndex === 0 ? 1 : 2;
          const cfg = RANK_CONFIGS[rank];
          const RankIcon = cfg.icon;
          const isFirst = rank === 0;
          const { last, firstWithInitial } = formatDisplayName(user.name);

          return (
            <div key={user.id} className="flex flex-col items-center gap-2">
              {/* Avatar */}
              <div className="relative">
                <div
                  className={`flex items-center justify-center rounded-full font-black text-white ring-2 ${cfg.ring} ${getAvatarColor(user.name)} ${isFirst ? 'h-14 w-14 text-base' : 'h-11 w-11 text-sm'}`}
                >
                  <Initials name={user.name} size={isFirst ? 'text-base' : 'text-sm'} />
                </div>
                <div className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black ${cfg.badge}`}>
                  {rank === 0 ? <RankIcon size={10} strokeWidth={3} /> : rank + 1}
                </div>
              </div>

              {/* Name */}
              <div className="text-center max-w-[90px]">
                <p className="text-[11px] font-bold text-gray-800 leading-tight">{firstWithInitial}</p>
                <p className="text-[10px] font-semibold text-gray-500 truncate">{last}</p>
              </div>

              {/* Points */}
              <p className="text-xs font-black text-emerald-600">{user.points.toLocaleString()} pts</p>

              {/* Podium bar */}
              <div className={`flex w-full items-center justify-center rounded-t-lg bg-gray-100 ${podiumHeights[visualIndex]} relative border border-b-0 border-gray-200`}>
                <span className="absolute -top-3 text-[10px] font-black text-gray-400">#{rank + 1}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rest of leaderboard */}
      <div className="divide-y divide-gray-50">
        {leaderboard.slice(3).map((user, i) => {
          const rank = i + 3;
          const { last, firstWithInitial } = formatDisplayName(user.name);
          return (
            <div key={user.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/80 transition-colors">
              <span className="w-6 text-center text-xs font-black text-gray-300">#{rank + 1}</span>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white ${getAvatarColor(user.name)}`}>
                <Initials name={user.name} size="text-[11px]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-700">{firstWithInitial} <span className="text-gray-400">{last}</span></p>
              </div>
              <span className="text-xs font-bold text-gray-500">{user.points.toLocaleString()} pts</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
