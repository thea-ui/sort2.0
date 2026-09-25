import React from 'react';
import { Coins, FileText, GraduationCap, Truck } from 'lucide-react';

interface ImpactKpiRowProps {
  totalReportsCount: number;
  studentReportsCount: number;
  teacherReportsCount: number;
  collectedCount: number;
  pendingCount: number;
  dispatchResolutionRate: number;
  topGradeKey: string;
  topGradeSubmissions: number;
  topGradeShare: string;
  totalValuePhp: number;
  totalCollectedKg: number;
}

export const ImpactKpiRow: React.FC<ImpactKpiRowProps> = ({
  totalReportsCount,
  studentReportsCount,
  teacherReportsCount,
  collectedCount,
  pendingCount,
  dispatchResolutionRate,
  topGradeKey,
  topGradeSubmissions,
  topGradeShare,
  totalValuePhp,
  totalCollectedKg,
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {/* Card 1: Total Campus Reports */}
    <div className="h-full flex flex-col justify-between p-5 bg-white/90 rounded-2xl border border-white/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
      <div className="flex items-center justify-between">
        <div className="p-3 bg-[color-mix(in_srgb,var(--action)_10%,white)] rounded-xl text-[var(--action)] group-hover:scale-110 transition-transform">
          <FileText size={22} />
        </div>
        <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
          Live Sync
        </span>
      </div>
      <div className="mt-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-strong)]/60">
          Total Campus Reports
        </p>
        <p className="text-3xl font-extrabold tracking-tight text-[var(--text-strong)] mt-0.5">
          {totalReportsCount}
        </p>
      </div>
      <div className="mt-3 pt-3 border-t border-[var(--primary)]/5 flex items-center justify-between text-[11px] text-[var(--text-strong)]/60 font-medium">
        <span>{studentReportsCount} Student</span>
        <span>•</span>
        <span>{teacherReportsCount} Teacher</span>
      </div>
    </div>

    {/* Card 2: Dispatched & Collected Tasks */}
    <div className="h-full flex flex-col justify-between p-5 bg-white/90 rounded-2xl border border-white/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
      <div className="flex items-center justify-between">
        <div className="p-3 bg-[color-mix(in_srgb,var(--primary)_10%,white)] rounded-xl text-[var(--text-strong)] group-hover:scale-110 transition-transform">
          <Truck size={22} />
        </div>
        <span className="text-[11px] font-medium text-[var(--text-strong)] bg-[color-mix(in_srgb,var(--primary)_10%,white)] px-2 py-0.5 rounded-full border border-[var(--primary)]/60">
          {dispatchResolutionRate}%
        </span>
      </div>
      <div className="mt-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-strong)]/60">
          Dispatched &amp; Collected
        </p>
        <p className="text-3xl font-extrabold tracking-tight text-[var(--text-strong)] mt-0.5">
          {collectedCount}{' '}
          <span className="text-sm font-bold text-[var(--text-strong)]/40">/ {totalReportsCount}</span>
        </p>
      </div>
      <div className="mt-3 pt-3 border-t border-[var(--primary)]/5 flex items-center justify-between text-[11px] text-[var(--text-strong)]/60 font-medium">
        <span>MRF Tasks Resolved</span>
        <span className="font-bold text-[var(--text-strong)]">{pendingCount} pending</span>
      </div>
    </div>

    {/* Card 3: Most Active Grade Level */}
    <div className="h-full flex flex-col justify-between p-5 bg-white/90 rounded-2xl border border-white/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
      <div className="flex items-center justify-between">
        <div className="p-3 bg-[color-mix(in_srgb,var(--gold)_10%,white)] rounded-xl text-[var(--gold)] group-hover:scale-110 transition-transform">
          <GraduationCap size={22} />
        </div>
        <span className="text-[11px] font-medium text-[var(--gold)] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
          Top Grade
        </span>
      </div>
      <div className="mt-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-strong)]/60">
          Most Active Grade Level
        </p>
        <p className="text-3xl font-extrabold tracking-tight text-[var(--text-strong)] mt-0.5">
          {topGradeKey}
        </p>
      </div>
      <div className="mt-3 pt-3 border-t border-[var(--primary)]/5 flex items-center justify-between text-[11px] text-[var(--text-strong)]/60 font-medium">
        <span>
          {topGradeSubmissions} Submission{topGradeSubmissions === 1 ? '' : 's'}
        </span>
        <span className="font-bold text-[var(--gold)]">{topGradeShare}% Share</span>
      </div>
    </div>

    {/* Card 4: Total Recyclable Value (PHP) */}
    <div className="h-full flex flex-col justify-between p-5 bg-white/90 rounded-2xl border border-white/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
      <div className="flex items-center justify-between">
        <div className="p-3 bg-amber-50 rounded-xl text-[var(--gold)] group-hover:scale-110 transition-transform">
          <Coins size={22} />
        </div>
        <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
          Market Sync
        </span>
      </div>
      <div className="mt-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-strong)]/60">
          Total Recyclable Value
        </p>
        <p className="text-3xl font-extrabold tracking-tight text-[var(--text-strong)] mt-0.5">
          ₱{totalValuePhp.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </p>
      </div>
      <div className="mt-3 pt-3 border-t border-[var(--primary)]/5 flex items-center justify-between text-[11px] text-[var(--text-strong)]/60 font-medium">
        <span>Est. Revenue</span>
        <span className="font-bold text-amber-600">{totalCollectedKg.toFixed(1)} kg processed</span>
      </div>
    </div>
  </div>
);
