import React from 'react';
import { useMockData } from '../../hooks/useMockData';
import { Trophy, Crown, Medal, Flame, Star } from 'lucide-react';

const RANK_CONFIGS = [
  { icon: Crown, badge: 'bg-gradient-to-br from-amber-400 to-yellow-600 text-white', ring: 'ring-amber-300', glow: 'shadow-amber-200/50', bar: 'bg-gradient-to-b from-amber-300 to-amber-500' },
  { icon: Medal, badge: 'bg-gradient-to-br from-gray-300 to-gray-400 text-white', ring: 'ring-gray-300', glow: 'shadow-gray-200/50', bar: 'bg-gradient-to-b from-gray-200 to-gray-400' },
  { icon: Medal, badge: 'bg-gradient-to-br from-amber-600 to-amber-800 text-white', ring: 'ring-amber-400', glow: 'shadow-amber-300/50', bar: 'bg-gradient-to-b from-amber-500 to-amber-700' },
];

const AVATAR_COLORS = ['bg-emerald-500', 'bg-violet-500', 'bg-sky-500', 'bg-amber-500', 'bg-rose-500'];
const getAvatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const DEPARTMENTS = ['BS Biology', 'BS Computer Science', 'AB Political Science', 'BS Engineering', 'BS Education'];
const getDepartment = (name: string) => DEPARTMENTS[name.charCodeAt(0) % DEPARTMENTS.length];

function formatDisplayName(fullName: string): { last: string; firstWithInitial: string } {
  const parts = fullName.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const last = parts[0];
    const firstPart = parts[1];
    const middle = parts[2] || '';
    const firstName = firstPart.split(' ')[0];
    const middleInitial = middle ? ` ${middle.charAt(0)}.` : '';
    return { last, firstWithInitial: `${firstName}${middleInitial}` };
  }
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
    .slice(0, 10);

  const podium = [leaderboard[1], leaderboard[0], leaderboard[2]];
  const podiumHeights = ['h-20', 'h-28', 'h-16'];
  const podiumOrder = [1, 0, 2]; // 2nd, 1st, 3rd visual order

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Trophy size={15} className="text-amber-500" strokeWidth={2} />
          <h3 className="text-sm font-bold text-gray-800">Campus Hall of Fame</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Live</span>
        </div>
      </div>

      {/* 3D Metallic Podium */}
      <div className="flex items-end justify-center gap-4 border-b border-gray-100 bg-gradient-to-b from-gray-50/80 to-white px-4 py-10 sm:gap-6">
        {podiumOrder.map((visualIndex) => {
          const user = podium[visualIndex];
          if (!user) return <div key={visualIndex} className="w-20" />;
          const rank = visualIndex === 1 ? 0 : visualIndex === 0 ? 1 : 2;
          const cfg = RANK_CONFIGS[rank];
          const RankIcon = cfg.icon;
          const isFirst = rank === 0;
          const { last, firstWithInitial } = formatDisplayName(user.name);

          return (
            <div key={user.id} className="flex flex-col items-center gap-2">
              {/* Avatar with glow */}
              <div className="relative">
                <div
                  className={`flex items-center justify-center rounded-full font-black text-white ring-2 shadow-lg ${cfg.ring} ${cfg.glow} ${getAvatarColor(user.name)} ${isFirst ? 'h-16 w-16 text-lg' : 'h-12 w-12 text-sm'}`}
                >
                  <Initials name={user.name} size={isFirst ? 'text-lg' : 'text-sm'} />
                </div>
                <div className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${cfg.badge}`}>
                  {rank === 0 ? <RankIcon size={12} strokeWidth={3} /> : rank + 1}
                </div>
                {isFirst && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Crown size={20} className="text-amber-400 drop-shadow-md" fill="currentColor" />
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="text-center max-w-[100px]">
                <p className="text-[12px] font-bold text-gray-800 leading-tight">{firstWithInitial}</p>
                <p className="text-[10px] font-semibold text-gray-500 truncate">{last}</p>
              </div>

              {/* Points */}
              <div className="flex items-center gap-1">
                <Star size={10} className="text-amber-500" fill="currentColor" />
                <p className="text-xs font-black text-emerald-600">{user.points.toLocaleString()} pts</p>
              </div>

              {/* Metallic Podium Bar */}
              <div className={`flex w-full items-center justify-center rounded-t-lg ${podiumHeights[visualIndex]} relative ${cfg.bar} shadow-inner`}>
                <span className="absolute -top-4 text-sm font-black text-white drop-shadow-md">#{rank + 1}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ranks #4-#5 */}
      <div className="divide-y divide-gray-50">
        {leaderboard.slice(3, 5).map((user, i) => {
          const rank = i + 3;
          const { last, firstWithInitial } = formatDisplayName(user.name);
          const dept = getDepartment(user.name);
          const streak = Math.floor(Math.random() * 7) + 1;
          const nextTierPoints = Math.ceil((user.points + 50) / 100) * 100;
          const progress = Math.min(100, (user.points / nextTierPoints) * 100);

          return (
            <div key={user.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/80 transition-colors">
              <span className="w-6 text-center text-xs font-black text-gray-300">#{rank + 1}</span>
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white ${getAvatarColor(user.name)}`}>
                <Initials name={user.name} size="text-[11px]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-700">{firstWithInitial} <span className="text-gray-400">{last}</span></p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[8px] font-semibold text-gray-500">{dept}</span>
                  {streak >= 3 && (
                    <span className="flex items-center gap-0.5 rounded-full bg-orange-50 px-1.5 py-0.5 text-[8px] font-bold text-orange-600">
                      <Flame size={8} />
                      {streak}d streak
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-bold text-gray-500">{user.points.toLocaleString()} pts</span>
                <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
