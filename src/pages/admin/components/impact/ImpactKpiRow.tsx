import React from 'react';
import { Coins, FileText, GraduationCap, Truck } from 'lucide-react';
import { KpiCard } from '../../../../components/layout/KpiCard';

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
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <KpiCard
      label="Total Campus Reports"
      value={totalReportsCount}
      icon={<FileText size={18} strokeWidth={2} />}
      iconClassName="bg-[var(--ramp-1)]/10 text-[var(--ramp-1-strong)]"
      footer={
        <>
          <span>{studentReportsCount} Student</span>
          <span aria-hidden="true" className="text-[var(--text-strong)]/25">•</span>
          <span>{teacherReportsCount} Teacher</span>
        </>
      }
    />

    <KpiCard
      label="Dispatched & Collected"
      value={
        <>
          {collectedCount}
          <span className="ml-1.5 text-sm font-medium text-[var(--text-strong)]/35">/ {totalReportsCount}</span>
        </>
      }
      icon={<Truck size={18} strokeWidth={2} />}
      iconClassName="bg-[var(--ramp-2)]/10 text-[var(--ramp-2-strong)]"
      footer={
        <>
          <span>MRF Tasks Resolved</span>
          <span className="shrink-0 font-semibold text-[var(--text-strong)]/70">{pendingCount} pending</span>
        </>
      }
    />

    <KpiCard
      label="Most Active Grade Level"
      value={topGradeKey}
      icon={<GraduationCap size={18} strokeWidth={2} />}
      iconClassName="bg-[var(--ramp-3)]/10 text-[var(--ramp-3-strong)]"
      footer={
        <>
          <span>
            {topGradeSubmissions} Submission{topGradeSubmissions === 1 ? '' : 's'}
          </span>
          <span className="shrink-0 font-semibold text-[var(--ramp-3-strong)]">{topGradeShare}% Share</span>
        </>
      }
    />

    <KpiCard
      label="Total Recyclable Value"
      value={<>₱{totalValuePhp.toLocaleString('en-US', { maximumFractionDigits: 0 })}</>}
      icon={<Coins size={18} strokeWidth={2} />}
      iconClassName="bg-[var(--ramp-4)]/10 text-[var(--ramp-4-strong)]"
      footer={
        <>
          <span>Est. Revenue</span>
          <span className="shrink-0 font-semibold text-[var(--ramp-4-strong)]">
            {totalCollectedKg.toFixed(1)} kg processed
          </span>
        </>
      }
    />
  </div>
);
