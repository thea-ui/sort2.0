import React from 'react';
import { useMockData } from '../../hooks/useMockData';
import { Trophy, Crown, Medal } from 'lucide-react';

const RANK_CONFIGS = [
  { icon: Crown,  badge: 'bg-amber-400 text-white',   ring: 'ring-amber-200' },
  { icon: Medal,  badge: 'bg-gray-300 text-gray-700', ring: 'ring-gray-200' },
  { icon: Medal,  badge: 'bg-amber-600 text-white',   ring: 'ring-amber-200' },
];

const ROLE_COLORS: Record<string, string> = {
  STUDENT: 'bg-sky-50 text-sky-700 border-sky-100',
  TEACHER: 'bg-violet-50 text-violet-700 border-violet-100',
};

const AVATAR_COLORS = ['bg-emerald-500', 'bg-violet-500', 'bg-sky-500', 'bg-amber-500', 'bg-rose-500'];
const getAvatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

export const LeaderboardCard: React.FC = () => {
  const { users } = useMockData();

  const leaderboard = [...users]
    .filter((u) => u.role === 'STUDENT' || u.role === 'TEACHER')
    .sort((a, b) => b.points - a.points)
    .slice(0, 5);

  // Podium order: 2nd, 1st, 3rd
  const podium = [leaderboard[1], leaderboard[0], leaderboard[2]];

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Trophy size={14} className="text-amber-500" strokeWidth={2} />
          <h3 className="text-xs font-bold text-gray-800">Eco Leaderboard</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Live</span>
        </div>
      </div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-4 border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white px-6 py-8">
        {podium.map((user, visualIndex) => {
          if (!user) return <div key={visualIndex} className="w-24" />;
          const rank = visualIndex === 1 ? 0 : visualIndex === 0 ? 1 : 2;
          const heights = ['h-16', 'h-24', 'h-12'];
          const cfg = RANK_CONFIGS[rank];
          const RankIcon = cfg.icon;
          const isFirst = rank === 0;

          return (
            <div key={user.id} className="flex flex-col items-center gap-2">
              <div className="relative">
                <div
                  className={`flex items-center justify-center rounded-full font-black text-white ring-2 ${cfg.ring} ${getAvatarColor(user.name)} ${isFirst ? 'h-12 w-12 text-sm' : 'h-10 w-10 text-xs'}`}
                >
                  {user.name.charAt(0)}
                </div>
                <div className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black ${cfg.badge}`}>
                  {rank === 0 ? <RankIcon size={10} strokeWidth={3} /> : rank + 1}
                </div>
              </div>
              <div className="text-center">
                <p className="max-w-[80px] truncate text-[11px] font-bold text-gray-800">
                  {user.name.split(' ')[0]}
                </p>
                <p className="text-[10px] font-black text-emerald-600">{user.points.toLocaleString()} pts</p>
              </div>
              <div className={`flex w-full items-center justify-center rounded-t-lg bg-gray-100 ${heights[visualIndex]} relative border border-b-0 border-gray-200`}>
                <span className="absolute -top-3 text-[9px] font-black text-gray-400">#{rank + 1}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rest */}
      <div className="divide-y divide-gray-50">
        {leaderboard.slice(3).map((user, i) => {
          const rank = i + 3;
          return (
            <div key={user.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
              <span className="w-5 text-center text-xs font-black text-gray-300">#{rank + 1}</span>
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white ${getAvatarColor(user.name)}`}>
                {user.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-gray-700">{user.name}</p>
              </div>
              <span className={`rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                {user.role}
              </span>
              <span className="text-xs font-bold text-gray-700">{user.points.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
