import React from 'react';
import { residualRecords, sumResidualKg } from '../../../utils/wasteStreams';
import { Cylinder, FileText, Package, Trash2, Wine } from 'lucide-react';
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

  const wasteRampShades = [
    { bgColor: 'bg-[var(--ramp-1)]/10', textColor: 'text-[var(--ramp-1)]', barColor: 'bg-[var(--ramp-1)]', valueColor: 'text-[var(--ramp-1-strong)]' },
    { bgColor: 'bg-[var(--ramp-2)]/10', textColor: 'text-[var(--ramp-2)]', barColor: 'bg-[var(--ramp-2)]', valueColor: 'text-[var(--ramp-2-strong)]' },
    { bgColor: 'bg-[var(--ramp-3)]/10', textColor: 'text-[var(--ramp-3)]', barColor: 'bg-[var(--ramp-3)]', valueColor: 'text-[var(--ramp-3-strong)]' },
    { bgColor: 'bg-[var(--ramp-4)]/10', textColor: 'text-[var(--ramp-4)]', barColor: 'bg-[var(--ramp-4)]', valueColor: 'text-[var(--ramp-4-strong)]' },
  ];

  // Recoverable streams wear the ramp by volume rank — the largest stream takes
  // the brand accent and the ramp steps toward gold; residual stays neutral.
  const wasteComposition = [
    ...[
      {
        id: 'plastic',
        name: 'Plastic Bottles (PET / HDPE)',
        weightKg: plasticKg,
        price: pricePet,
        icon: Package,
      },
      {
        id: 'glass',
        name: 'Glass / Beverage Bottles',
        weightKg: glassKg,
        price: priceGlass,
        icon: Wine,
      },
      {
        id: 'aluminum',
        name: 'Aluminum Cans',
        weightKg: aluminumKg,
        price: priceAluminum,
        icon: Cylinder,
      },
      {
        id: 'paper',
        name: 'Paper & Cardboard',
        weightKg: paperKg,
        price: pricePaper,
        icon: FileText,
      },
    ]
      .sort((a, b) => b.weightKg - a.weightKg)
      .map((item, idx) => ({
        id: item.id,
        name: item.name,
        pct: totalCollectedKg > 0 ? Math.round((item.weightKg / totalCollectedKg) * 100) : 0,
        weightKg: item.weightKg,
        estValuePhp: Math.round(item.weightKg * item.price),
        icon: item.icon,
        ...wasteRampShades[idx % wasteRampShades.length],
      })),
    {
      id: 'residual',
      name: 'Residual Waste',
      pct: totalCollectedKg > 0 ? Math.round((residualKg / totalCollectedKg) * 100) : 0,
      weightKg: residualKg,
      estValuePhp: 0,
      icon: Trash2,
      bgColor: 'bg-[var(--text-strong)]/10',
      textColor: 'text-[var(--text-strong)]/60',
      barColor: 'bg-[var(--text-strong)]/30',
      valueColor: 'text-[var(--text-strong)]/60',
    },
  ];

  const totalValuePhp = wasteComposition.reduce((sum, item) => sum + item.estValuePhp, 0);

  // Grade Level Participation Breakdown — derived from EnrollPro-synced gradeLevel
  const studentReports = activeReports.filter(
    (r) => r.reporterRole === 'student' || (!r.reporterRole && r.reporterId !== '4'),
  );
  const totalStudentReports = studentReports.length;
  const gradeColorPalette = [
    { color: 'bg-[var(--ramp-1)]', lightBg: 'bg-[var(--ramp-1)]/10', border: 'border-[var(--ramp-1)]/30' },
    { color: 'bg-[var(--ramp-2)]', lightBg: 'bg-[var(--ramp-2)]/10', border: 'border-[var(--ramp-2)]/25' },
    { color: 'bg-[var(--ramp-3)]', lightBg: 'bg-[var(--ramp-3)]/10', border: 'border-[var(--ramp-3)]/25' },
    { color: 'bg-[var(--ramp-4)]', lightBg: 'bg-[var(--ramp-4)]/10', border: 'border-[var(--ramp-4)]/25' },
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
        title="Operations & Collections"
      />

      <ImpactKpiRow
        totalReportsCount={totalReportsCount}
        studentReportsCount={studentReportsCount}
        teacherReportsCount={teacherReportsCount}
        collectedCount={collectedReports.length}
        pendingCount={pendingReports.length}
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
