import React from 'react';
import { Award, BarChart2, GraduationCap, Users } from 'lucide-react';

export interface GradeParticipationItem {
  grade: string;
  label: string;
  reports: number;
  pct: number;
  activeStudents: number;
  isTop: boolean;
  color: string;
  lightBg: string;
  border: string;
}

interface GradeParticipationCardProps {
  gradeParticipation: GradeParticipationItem[];
  activeStudentCount: number;
  topGradeKey: string;
  topGradeSubmissions: number;
}

export const GradeParticipationCard: React.FC<GradeParticipationCardProps> = ({
  gradeParticipation,
  activeStudentCount,
  topGradeKey,
  topGradeSubmissions,
}) => (
  <div className="lg:col-span-7 bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-5 flex flex-col justify-between">
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[color-mix(in_srgb,var(--gold)_10%,white)] rounded-xl text-[var(--gold)]">
            <BarChart2 size={18} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[var(--text-strong)]">
              Participation by Grade Level
            </h3>
            <p className="text-xs text-[var(--text-strong)]/50">
              Reporting activity and engagement across all grade levels
            </p>
          </div>
        </div>
        <span className="text-[11px] font-medium text-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_10%,white)] px-2 py-0.5 rounded-full border border-[var(--gold)]/60">
          {activeStudentCount} Student Profiles
        </span>
      </div>

      {/* Grade Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5">
        {gradeParticipation.map((item) => (
          <div
            key={item.grade}
            className={`p-4 rounded-2xl border transition-all ${
              item.isTop
                ? `${item.lightBg} ${item.border} ring-2 ring-[var(--gold)]/30 shadow-sm`
                : 'bg-gray-50 border-gray-200/80 hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-strong)] flex items-center gap-1.5">
                <GraduationCap
                  size={15}
                  className={item.isTop ? 'text-[var(--gold)]' : 'text-[var(--text-strong)]/50'}
                />
                {item.label}
              </span>
              {item.isTop && (
                <span className="text-[10px] font-extrabold text-[var(--gold)] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Award size={11} /> Top Leader
                </span>
              )}
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-black text-[var(--text-strong)]">{item.reports}</span>
                <span className="text-xs font-bold text-[var(--text-strong)]/50 ml-1.5">reports</span>
              </div>
              <span className="text-xs font-extrabold text-[var(--text-strong)]/70">{item.pct}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mt-2.5">
              <div
                className={`h-full ${item.color} rounded-full transition-all duration-500`}
                style={{ width: `${Math.max(item.pct, 5)}%` }}
              />
            </div>

            <p className="text-[11px] font-medium text-[var(--text-strong)]/50 mt-2">
              {item.activeStudents} registered student{item.activeStudents === 1 ? '' : 's'}
            </p>
          </div>
        ))}
      </div>
    </div>

    {/* Grade Level Summary Footer */}
    <div className="p-3.5 bg-[var(--background)] rounded-2xl border border-[var(--primary)]/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
      <span className="font-semibold text-[var(--text-strong)]/70 flex items-center gap-2">
        <Users size={14} className="text-[var(--accent)]" />
        Active Campus Grade Cohorts:{' '}
        <strong className="text-[var(--text-strong)]">
          {gradeParticipation.length} Grade{gradeParticipation.length === 1 ? '' : 's'} Configured
        </strong>
      </span>
      <span className="text-[11px] font-medium text-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,white)] px-2.5 py-0.5 rounded-full border border-[var(--accent)]/20">
        {topGradeKey} ({topGradeSubmissions} report{topGradeSubmissions === 1 ? '' : 's'})
      </span>
    </div>
  </div>
);
