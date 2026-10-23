import React from 'react';
import { Coins, FileText, GraduationCap, Truck } from 'lucide-react';

interface ImpactKpiRowProps {
  totalReportsCount: number;
  studentReportsCount: number;
  teacherReportsCount: number;
  collectedCount: number;
  pendingCount: number;
  topGradeKey: string;
  topGradeSubmissions: number;
  topGradeShare: string;
  totalValuePhp: number;
  totalCollectedKg: number;
}

/**
 * KPI accent ramp: the row bridges brand identity to recognition — one shade
 * per card, stepping from the tenant accent (red) through terracotta and amber
 * to gold (AGENTS.md §3 single-accent content system, --ramp-* tokens).
 * A card must never mix two hues.
 */
export const ImpactKpiRow: React.FC<ImpactKpiRowProps> = ({
  totalReportsCount,
  studentReportsCount,
  teacherReportsCount,
  collectedCount,
  pendingCount,
  topGradeKey,
  topGradeSubmissions,
  topGradeShare,
  totalValuePhp,
  totalCollectedKg,
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {/* Card 1: Total Campus Reports — ramp 1 (accent) */}
    <div className="h-full flex flex-col p-5 bg-white/90 rounded-2xl border border-white/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
      <div className="flex flex-1 items-center justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <p className="text-3xl font-extrabold tracking-tight text-[var(--text-strong)]">
            {totalReportsCount}
          </p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-strong)]/60 leading-tight">
            Total Campus Reports
          </p>
        </div>
        <div className="w-fit shrink-0 p-3 bg-[var(--ramp-1)]/10 rounded-xl text-[var(--ramp-1)] group-hover:scale-110 transition-transform">
          <FileText size={22} />
        </div>
      </div>
      <div className="mt-auto pt-4 border-t border-[var(--primary)]/5 flex items-center justify-between text-[11px] text-[var(--text-strong)]/60 font-medium">
        <span>{studentReportsCount} Student</span>
        <span>•</span>
        <span>{teacherReportsCount} Teacher</span>
      </div>
    </div>

    {/* Card 2: Dispatched & Collected Tasks — ramp 2 (terracotta) */}
    <div className="h-full flex flex-col p-5 bg-white/90 rounded-2xl border border-white/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
      <div className="flex flex-1 items-center justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <p className="text-3xl font-extrabold tracking-tight text-[var(--text-strong)]">
            {collectedCount}{' '}
            <span className="text-sm font-bold text-[var(--text-strong)]/40">/ {totalReportsCount}</span>
          </p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-strong)]/60 leading-tight">
            Dispatched &amp; Collected
          </p>
        </div>
        <div className="w-fit shrink-0 p-3 bg-[var(--ramp-2)]/10 rounded-xl text-[var(--ramp-2)] group-hover:scale-110 transition-transform">
          <Truck size={22} />
        </div>
      </div>
      <div className="mt-auto pt-4 border-t border-[var(--primary)]/5 flex items-center justify-between text-[11px] text-[var(--text-strong)]/60 font-medium">
        <span>MRF Tasks Resolved</span>
        <span className="font-bold text-[var(--text-strong)]">{pendingCount} pending</span>
      </div>
    </div>

    {/* Card 3: Most Active Grade Level — ramp 3 (amber) */}
    <div className="h-full flex flex-col p-5 bg-white/90 rounded-2xl border border-white/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
      <div className="flex flex-1 items-center justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <p className="text-3xl font-extrabold tracking-tight text-[var(--text-strong)]">
            {topGradeKey}
          </p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-strong)]/60 leading-tight">
            Most Active Grade Level
          </p>
        </div>
        <div className="w-fit shrink-0 p-3 bg-[var(--ramp-3)]/10 rounded-xl text-[var(--ramp-3)] group-hover:scale-110 transition-transform">
          <GraduationCap size={22} />
        </div>
      </div>
      <div className="mt-auto pt-4 border-t border-[var(--primary)]/5 flex items-center justify-between text-[11px] text-[var(--text-strong)]/60 font-medium">
        <span>
          {topGradeSubmissions} Submission{topGradeSubmissions === 1 ? '' : 's'}
        </span>
        <span className="font-bold text-[var(--ramp-3-strong)]">{topGradeShare}% Share</span>
      </div>
    </div>

    {/* Card 4: Total Recyclable Value (PHP) — ramp 4 (gold) */}
    <div className="h-full flex flex-col p-5 bg-white/90 rounded-2xl border border-white/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
      <div className="flex flex-1 items-center justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <p className="text-3xl font-extrabold tracking-tight text-[var(--text-strong)]">
            ₱{totalValuePhp.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-strong)]/60 leading-tight">
            Total Recyclable Value
          </p>
        </div>
        <div className="w-fit shrink-0 p-3 bg-[var(--ramp-4)]/10 rounded-xl text-[var(--ramp-4)] group-hover:scale-110 transition-transform">
          <Coins size={22} />
        </div>
      </div>
      <div className="mt-auto pt-4 border-t border-[var(--primary)]/5 flex items-center justify-between text-[11px] text-[var(--text-strong)]/60 font-medium">
        <span>Est. Revenue</span>
        <span className="font-bold text-[var(--ramp-4-strong)]">{totalCollectedKg.toFixed(1)} kg processed</span>
      </div>
    </div>
  </div>
);
