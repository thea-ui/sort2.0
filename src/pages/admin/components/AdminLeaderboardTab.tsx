import React from 'react';
import { Award, Flame } from 'lucide-react';
import { Report, User } from '../../../types';
import { DataTable } from '../../../components/data-table';
import type { TableColumn } from '../../../components/data-table';
import { PageHeader } from '../../../components/layout/PageHeader';

interface AdminLeaderboardTabProps {
  users: User[];
  reports?: Report[];
}

interface LeaderboardRow {
  id: string;
  rank: number;
  name: string;
  role: string;
  dept: string;
  reports: number;
  points: number;
}

export const AdminLeaderboardTab: React.FC<AdminLeaderboardTabProps> = ({
  users,
  reports = [],
}) => {
  // Sort student users dynamically by points descending
  const studentUsers = [...users]
    .filter((u) => u.role === 'STUDENT')
    .map((u) => {
      const userReports = reports.filter(
        (r) => r.reporterId === u.id || r.reporterName?.toLowerCase() === u.name?.toLowerCase(),
      );
      const section = (u as any).sectionName || u.classroomSection || '';
      const grade = (u as any).gradeLevel || '';
      return {
        id: u.id,
        name: u.name,
        role: grade ? `${grade} - ${section}` : section || 'Student',
        dept: grade && section ? `${grade} — ${section}` : grade || section || 'N/A',
        reports: userReports.length,
        points: u.points || 0,
      };
    })
    .sort((a, b) => b.points - a.points || b.reports - a.reports);

  const leaderboardData: LeaderboardRow[] = studentUsers
    .slice(0, 10)
    .map((item, idx) => ({ rank: idx + 1, ...item }));

  const top1 = leaderboardData[0];
  const top2 = leaderboardData[1];
  const top3 = leaderboardData[2];

  const columns: TableColumn<LeaderboardRow>[] = [
    {
      key: 'rank',
      header: 'Rank',
      skeleton: 'number',
      cell: (row) => (
        <span
          className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[11px] font-black ${
            row.rank === 1
              ? 'bg-amber-500 text-white'
              : row.rank === 2
                ? 'bg-[var(--primary)] text-white'
                : row.rank === 3
                  ? 'bg-amber-700 text-white'
                  : 'bg-[var(--primary)]/10 text-[var(--text-strong)]/60'
          }`}
        >
          {row.rank}
        </span>
      ),
    },
    {
      key: 'student',
      header: 'Student',
      skeleton: 'name',
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] font-bold flex items-center justify-center text-xs">
            {row.name.charAt(0)}
          </div>
          <span className="font-bold text-[var(--text-strong)]">{row.name}</span>
        </div>
      ),
    },
    {
      key: 'dept',
      header: 'Grade Level',
      skeleton: 'text',
      cell: (row) => (
        <span className="text-[var(--text-strong)]/60 font-medium">{row.dept}</span>
      ),
    },
    {
      key: 'reports',
      header: 'Reports',
      align: 'center',
      skeleton: 'number',
      cell: (row) => (
        <span className="font-semibold text-[var(--text-strong)]/70">{row.reports}</span>
      ),
    },
    {
      key: 'points',
      header: 'Points',
      align: 'right',
      skeleton: 'number',
      cell: (row) => (
        <span className="font-black text-amber-600 inline-flex items-center gap-1">
          <Flame size={14} fill="currentColor" />
          {row.points}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Eco-Points Leaderboard"
        description="Top student eco-champions ranked by verified report points"
      />

      {/* Points System Banner */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-amber-800">
          <Award size={15} className="text-amber-600" />
          <span>Points System:</span>
        </div>
        <span className="px-3 py-1 bg-amber-100 text-amber-800 font-bold rounded-full text-[11px] flex items-center gap-1">
          <Flame size={12} className="text-amber-600 fill-amber-600" /> 15 pts — 1st reporter
        </span>
        <span className="px-3 py-1 bg-[var(--primary)]/10 text-[var(--text-strong)] font-bold rounded-full text-[11px] flex items-center gap-1">
          <Flame size={12} className="text-[var(--text-strong)] fill-[var(--primary)]" /> 10 pts — 2nd reporter
        </span>
        <span className="px-3 py-1 bg-orange-100 text-orange-800 font-bold rounded-full text-[11px] flex items-center gap-1">
          <Flame size={12} className="text-orange-600 fill-orange-600" /> 5 pts — 3rd reporter
        </span>
        <span className="px-3 py-1 bg-[var(--primary)]/5 text-[var(--text-strong)]/60 font-medium rounded-full text-[11px]">
          4th+ reporter — no points
        </span>
      </div>

      {/* Podium Cards (Rank 2, Rank 1, Rank 3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        {top2 && (
          <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm text-center space-y-2 relative">
            <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white font-black text-xs flex items-center justify-center mx-auto -mt-8 border-2 border-white shadow-md">
              2
            </div>
            <p className="font-extrabold text-[var(--text-strong)] text-sm mt-1">{top2.name}</p>
            <p className="text-[11px] text-[var(--text-strong)]/40 font-semibold">{top2.role}</p>
            <p className="text-lg font-black text-amber-600 flex items-center justify-center gap-1">
              <Flame size={16} fill="currentColor" /> {top2.points}
            </p>
            <p className="text-[10px] text-[var(--text-strong)]/50 font-bold">{top2.reports} reports</p>
          </div>
        )}

        {top1 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 shadow-md text-center space-y-2 relative md:-translate-y-2">
            <div className="w-9 h-9 rounded-full bg-amber-500 text-white font-black text-sm flex items-center justify-center mx-auto -mt-10 border-2 border-white shadow-md">
              1
            </div>
            <p className="font-black text-[var(--text-strong)] text-base mt-1">{top1.name}</p>
            <p className="text-[11px] text-[var(--text-strong)]/50 font-semibold">{top1.role}</p>
            <p className="text-2xl font-black text-amber-600 flex items-center justify-center gap-1">
              <Flame size={20} fill="currentColor" /> {top1.points}
            </p>
            <p className="text-xs text-[var(--text-strong)]/60 font-bold">{top1.reports} reports</p>
          </div>
        )}

        {top3 && (
          <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm text-center space-y-2 relative">
            <div className="w-8 h-8 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center mx-auto -mt-8 border-2 border-white shadow-md">
              3
            </div>
            <p className="font-extrabold text-[var(--text-strong)] text-sm mt-1">{top3.name}</p>
            <p className="text-[11px] text-[var(--text-strong)]/40 font-semibold">{top3.role}</p>
            <p className="text-lg font-black text-amber-600 flex items-center justify-center gap-1">
              <Flame size={16} fill="currentColor" /> {top3.points}
            </p>
            <p className="text-[10px] text-[var(--text-strong)]/50 font-bold">{top3.reports} reports</p>
          </div>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={leaderboardData}
        rowKey={(row) => row.id}
        searchable
        searchPlaceholder="Search students..."
        searchText={(row) => `${row.name} ${row.dept}`}
        emptyTitle="No students on the leaderboard yet"
        emptyHint="Points appear here once student reports are verified."
      />
    </div>
  );
};
