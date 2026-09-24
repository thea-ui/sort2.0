import React from 'react';
import { residualRecords, sumResidualKg } from '../../../utils/wasteStreams';
import { FileText, Package, Sparkles, Trash2, Wine } from 'lucide-react';
import { Report, User as UserType } from '../../../types';
import { useRecycleMarket } from '../../../hooks/useRecycleMarket';
import { PageHeader } from '../../../components/layout/PageHeader';
import { ImpactKpiRow } from './impact/ImpactKpiRow';
import { GradeParticipationCard } from './impact/GradeParticipationCard';
import { WasteCompositionCard } from './impact/WasteCompositionCard';
import { MonthlyVolumeChart } from './impact/MonthlyVolumeChart';
import { HotspotsCard } from './impact/HotspotsCard';

export interface AdminImpactTabProps {
  reports?: Report[];
  users?: UserType[];
  onNavigate?: (tab: string) => void;
}

export const AdminImpactTab: React.FC<AdminImpactTabProps> = ({
  reports = [],
  users = [],
  onNavigate,
}) => {
  const { stocksRecord } = useRecycleMarket();

  const activeUsers = users;
  const activeReports = reports;

  // Operational metrics calculation directly from real reports
  const totalReportsCount = activeReports.length;
  const studentReportsCount = activeReports.filter(
    (r) => r.reporterRole === 'student' || (!r.reporterRole && r.reporterId !== '4'),
  ).length;
  const teacherReportsCount = activeReports.filter(
    (r) => r.reporterRole === 'teacher' || r.reporterId === '4',
  ).length;

  const collectedReports = activeReports.filter(
    (r) => r.status === 'COLLECTED' || r.status === 'RESOLVED',
  );
  const pendingReports = activeReports.filter((r) => r.status === 'PENDING');
  const dispatchResolutionRate =
    totalReportsCount > 0 ? Math.round((collectedReports.length / totalReportsCount) * 100) : 100;

  // Dynamic Recyclable Waste Composition & Weigh-in Breakdown
  const plasticKg = stocksRecord['pet_plastic']?.accumulatedKg || 0;
  const aluminumKg = stocksRecord['aluminum_cans']?.accumulatedKg || 0;
  const paperKg = stocksRecord['cardboard']?.accumulatedKg || 0;
  const glassKg = stocksRecord['glass']?.accumulatedKg || 0;

  // Residual waste — single shared definition (see utils/wasteStreams).
  const residualReports = residualRecords(collectedReports);
  const residualKg = sumResidualKg(residualReports);

  const totalCollectedKg = plasticKg + aluminumKg + paperKg + glassKg + residualKg;

  const pricePet = stocksRecord['pet_plastic']?.marketPricePerKg || 18;
  const priceGlass = stocksRecord['glass']?.marketPricePerKg || 15;
  const priceAluminum = stocksRecord['aluminum_cans']?.marketPricePerKg || 45;
  const pricePaper = stocksRecord['cardboard']?.marketPricePerKg || 12;

  const wasteComposition = [
    {
      id: 'plastic',
      name: 'Plastic Bottles (PET / HDPE)',
      pct: totalCollectedKg > 0 ? Math.round((plasticKg / totalCollectedKg) * 100) : 0,
      weightKg: plasticKg,
      estValuePhp: Math.round(plasticKg * pricePet),
      icon: Package,
      bgColor: 'bg-[var(--primary)]/10',
      textColor: 'text-[var(--text-strong)]',
      barColor: 'bg-[var(--primary)]',
    },
    {
      id: 'glass',
      name: 'Glass / Beverage Bottles',
      pct: totalCollectedKg > 0 ? Math.round((glassKg / totalCollectedKg) * 100) : 0,
      weightKg: glassKg,
      estValuePhp: Math.round(glassKg * priceGlass),
      icon: Wine,
      bgColor: 'bg-[var(--primary)]/10',
      textColor: 'text-emerald-600',
      barColor: 'bg-emerald-500',
    },
    {
      id: 'aluminum',
      name: 'Aluminum Cans',
      pct: totalCollectedKg > 0 ? Math.round((aluminumKg / totalCollectedKg) * 100) : 0,
      weightKg: aluminumKg,
      estValuePhp: Math.round(aluminumKg * priceAluminum),
      icon: Sparkles,
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
      barColor: 'bg-amber-500',
    },
    {
      id: 'paper',
      name: 'Paper & Cardboard',
      pct: totalCollectedKg > 0 ? Math.round((paperKg / totalCollectedKg) * 100) : 0,
      weightKg: paperKg,
      estValuePhp: Math.round(paperKg * pricePaper),
      icon: FileText,
      bgColor: 'bg-[var(--gold)]/10',
      textColor: 'text-[var(--gold)]',
      barColor: 'bg-[var(--gold)]',
    },
    {
      id: 'residual',
      name: 'Residual Waste',
      pct: totalCollectedKg > 0 ? Math.round((residualKg / totalCollectedKg) * 100) : 0,
      weightKg: residualKg,
      estValuePhp: 0,
      icon: Trash2,
      bgColor: 'bg-rose-50',
      textColor: 'text-rose-600',
      barColor: 'bg-rose-500',
    },
  ];

  const totalValuePhp = wasteComposition.reduce((sum, item) => sum + item.estValuePhp, 0);

  // Grade Level Participation Breakdown — derived from EnrollPro-synced gradeLevel
  const studentReports = activeReports.filter(
    (r) => r.reporterRole === 'student' || (!r.reporterRole && r.reporterId !== '4'),
  );
  const totalStudentReports = studentReports.length;
  const gradeColorPalette = [
    { color: 'bg-[var(--accent)]', lightBg: 'bg-[var(--accent)]/10', border: 'border-[var(--accent)]/30' },
    { color: 'bg-[var(--primary)]', lightBg: 'bg-[var(--primary)]/10', border: 'border-[var(--primary)]/25' },
    { color: 'bg-[var(--gold)]', lightBg: 'bg-[var(--gold)]/10', border: 'border-[var(--gold)]/25' },
    { color: 'bg-amber-500', lightBg: 'bg-amber-50', border: 'border-amber-200' },
    { color: 'bg-rose-500', lightBg: 'bg-rose-50', border: 'border-rose-200' },
    { color: 'bg-[var(--primary)]', lightBg: 'bg-[var(--primary)]/10', border: 'border-[var(--primary)]/25' },
  ];

  const gradeCountMap: Record<string, number> = {};
  studentReports.forEach((r) => {
    const u = activeUsers.find(
      (usr) => usr.id === r.reporterId || usr.name.toLowerCase() === r.reporterName?.toLowerCase(),
    );
    if (!u || u.role !== 'STUDENT') return;
    const grade = (u as any)?.gradeLevel || 'Unknown';
    gradeCountMap[grade] = (gradeCountMap[grade] || 0) + 1;
  });

  const maxGradeSubmissions = Math.max(...Object.values(gradeCountMap), 0);
  const topGradeKey =
    Object.keys(gradeCountMap).find(
      (k) => gradeCountMap[k] === maxGradeSubmissions && maxGradeSubmissions > 0,
    ) || 'Unknown';
  const topGradeSubmissions = gradeCountMap[topGradeKey] || 0;
  const topGradeShare =
    totalStudentReports > 0
      ? ((topGradeSubmissions / totalStudentReports) * 100).toFixed(1)
      : '0';

  const gradeParticipation = Object.entries(gradeCountMap)
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([grade, reportsCount], idx) => {
      const palette = gradeColorPalette[idx % gradeColorPalette.length];
      return {
        grade,
        label: grade,
        reports: reportsCount,
        pct:
          totalStudentReports > 0
            ? Number(((reportsCount / totalStudentReports) * 100).toFixed(1))
            : 0,
        activeStudents: activeUsers.filter(
          (u) => u.role === 'STUDENT' && (u as any).gradeLevel === grade,
        ).length,
        isTop: grade === topGradeKey && maxGradeSubmissions > 0,
        color: palette.color,
        lightBg: palette.lightBg,
        border: palette.border,
      };
    });

  // Monthly collection metrics — computed from actual report data
  const monthOrder = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
  const calendarMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyDataMap: Record<string, { weight: number; items: number }> = {};
  monthOrder.forEach((m) => {
    monthlyDataMap[m] = { weight: 0, items: 0 };
  });
  collectedReports.forEach((r) => {
    try {
      const d = new Date(r.timestamp || Date.now());
      if (Number.isNaN(d.getTime())) return;
      const key = calendarMonths[d.getMonth()];
      if (!monthlyDataMap[key]) monthlyDataMap[key] = { weight: 0, items: 0 };
      monthlyDataMap[key].weight += r.weightCollected || 0;
      monthlyDataMap[key].items += 1;
    } catch {
      /* skip invalid dates */
    }
  });
  const monthlyData = monthOrder
    .filter((m) => monthlyDataMap[m].items > 0)
    .map((m) => ({
      month: m,
      weight: Math.round(monthlyDataMap[m].weight) || 0,
      items: monthlyDataMap[m].items,
    }));

  // Campus Hotspots — dynamic grouping of open/pending reports by locationName
  const hotspotMap: Record<string, { count: number; highPriority: number }> = {};
  activeReports
    .filter((r) => r.status === 'PENDING' || r.status === 'DISPATCHED')
    .forEach((r) => {
      const loc = r.locationName || 'Unknown Location';
      if (!hotspotMap[loc]) hotspotMap[loc] = { count: 0, highPriority: 0 };
      hotspotMap[loc].count += 1;
      if (r.urgency === 'HIGH') hotspotMap[loc].highPriority += 1;
    });

  const hotspotZones = Object.entries(hotspotMap)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 5)
    .map(([name, data]) => ({
      name,
      reportCount: data.count,
      highPriority: data.highPriority,
      isOverdue: data.highPriority > 0,
    }));

  const totalOpenReports = hotspotZones.reduce((sum, z) => sum + z.reportCount, 0);
  const totalHighPriority = hotspotZones.reduce((sum, z) => sum + z.highPriority, 0);

  return (
    <div className="space-y-6 animate-fade-in text-[var(--text-strong)]">
      <PageHeader
        title="Operational & Collection Performance"
        description="Real-time monitoring of campus report submissions, MRF task dispatches, grade-level participation, and recyclable revenue."
        badge={
          <span className="inline-block text-[10px] font-extrabold text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-3 py-1 rounded-full uppercase tracking-wider mb-1.5">
            Operational Analytics
          </span>
        }
      />

      <ImpactKpiRow
        totalReportsCount={totalReportsCount}
        studentReportsCount={studentReportsCount}
        teacherReportsCount={teacherReportsCount}
        collectedCount={collectedReports.length}
        pendingCount={pendingReports.length}
        dispatchResolutionRate={dispatchResolutionRate}
        topGradeKey={topGradeKey}
        topGradeSubmissions={topGradeSubmissions}
        topGradeShare={topGradeShare}
        totalValuePhp={totalValuePhp}
        totalCollectedKg={totalCollectedKg}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <GradeParticipationCard
          gradeParticipation={gradeParticipation}
          activeStudentCount={activeUsers.filter((u) => u.role === 'STUDENT').length}
          topGradeKey={topGradeKey}
          topGradeSubmissions={topGradeSubmissions}
        />
        <WasteCompositionCard
          wasteComposition={wasteComposition}
          totalCollectedKg={totalCollectedKg}
          totalValuePhp={totalValuePhp}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <MonthlyVolumeChart
          monthlyData={monthlyData}
          totalCollectedKg={totalCollectedKg}
          collectedCount={collectedReports.length}
        />
        <HotspotsCard
          hotspotZones={hotspotZones}
          totalOpenReports={totalOpenReports}
          totalHighPriority={totalHighPriority}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
};
