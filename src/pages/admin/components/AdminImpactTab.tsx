import React, { useMemo } from 'react';
import {
  FileText,
  CheckCircle2,
  GraduationCap,
  Coins,
  TrendingUp,
  Target,
  Users,
  BarChart2,
  Clock,
  Package,
  Trash2,
  Award,
  Truck,
  ArrowUpRight,
  Sparkles,
  Layers,
  Calendar,
  Wine,
  RefreshCw,
  X,
  Check,
  Scale,
  AlertTriangle,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { Report, User as UserType } from '../../../types';
import { useRecycleMarket } from '../../../hooks/useRecycleMarket';

export interface AdminImpactTabProps {
  reports?: Report[];
  users?: UserType[];
}

export const AdminImpactTab: React.FC<AdminImpactTabProps> = ({ reports = [], users = [] }) => {
  const {
    stocksRecord,
    totalVendorSales,
    rewardsReservedPhp,
  } = useRecycleMarket();

  const activeUsers = users;
  const filteredByTimeframe = reports;

  const activeReports = filteredByTimeframe;

  // Operational metrics calculation directly from real reports
  const totalReportsCount = activeReports.length;
  const studentReportsCount = activeReports.filter(
    (r) => r.reporterRole === 'student' || (!r.reporterRole && r.reporterId !== '4')
  ).length;
  const teacherReportsCount = activeReports.filter(
    (r) => r.reporterRole === 'teacher' || r.reporterId === '4'
  ).length;

  const collectedReports = activeReports.filter((r) => r.status === 'COLLECTED' || r.status === 'RESOLVED');
  const dispatchedReports = activeReports.filter((r) => r.status === 'DISPATCHED');
  const pendingReports = activeReports.filter((r) => r.status === 'PENDING');
  const activeDispatches = dispatchedReports.length;
  const dispatchResolutionRate = totalReportsCount > 0 ? Math.round((collectedReports.length / totalReportsCount) * 100) : 100;

  // Dynamic Recyclable Waste Composition & Weigh-in Breakdown
  // Use market stock accumulatedKg for accurate MRF-based weights (consistent with Recycle Market page)
  const plasticKg = stocksRecord['pet_plastic']?.accumulatedKg || 0;
  const aluminumKg = stocksRecord['aluminum_cans']?.accumulatedKg || 0;
  const paperKg = stocksRecord['cardboard']?.accumulatedKg || 0;
  const glassKg = stocksRecord['glass']?.accumulatedKg || 0;

  // Residual waste from collected reports (GENERAL/ORGANIC/HAZARDOUS categories)
  const residualReports = collectedReports.filter((r) =>
    r.category === 'GENERAL' || r.category === 'ORGANIC' || r.category === 'BIODEGRADABLE' || r.category === 'HAZARDOUS' || r.category === 'NON_BIODEGRADABLE'
  );
  const residualKg = residualReports.reduce((sum, r) => sum + (r.weightCollected || 0), 0);

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
      color: '#0091EA',
      bgColor: 'bg-sky-50',
      textColor: 'text-sky-600',
      barColor: 'bg-sky-500',
    },
    {
      id: 'glass',
      name: 'Glass / Beverage Bottles',
      pct: totalCollectedKg > 0 ? Math.round((glassKg / totalCollectedKg) * 100) : 0,
      weightKg: glassKg,
      estValuePhp: Math.round(glassKg * priceGlass),
      icon: Wine,
      color: '#10B981',
      bgColor: 'bg-emerald-50',
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
      color: '#FFAB00',
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
      color: '#651FFF',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      barColor: 'bg-purple-500',
    },
    {
      id: 'residual',
      name: 'Residual Waste',
      pct: totalCollectedKg > 0 ? Math.round((residualKg / totalCollectedKg) * 100) : 0,
      weightKg: residualKg,
      estValuePhp: 0,
      icon: Trash2,
      color: '#FF5722',
      bgColor: 'bg-rose-50',
      textColor: 'text-rose-600',
      barColor: 'bg-rose-500',
    },
  ];

  const totalValuePhp = wasteComposition.reduce((sum, item) => sum + item.estValuePhp, 0);

  // Grade Level Participation Breakdown — derived dynamically from EnrollPro-synced gradeLevel
  // Only count student reports
  const studentReports = activeReports.filter(
    (r) => r.reporterRole === 'student' || (!r.reporterRole && r.reporterId !== '4')
  );
  const totalStudentReports = studentReports.length;
  const gradeColorPalette = [
    { color: 'bg-[#00A77C]', lightBg: 'bg-[#00A77C]/10', border: 'border-[#00A77C]/30' },
    { color: 'bg-sky-500', lightBg: 'bg-sky-50', border: 'border-sky-200' },
    { color: 'bg-purple-600', lightBg: 'bg-purple-50', border: 'border-purple-300' },
    { color: 'bg-amber-500', lightBg: 'bg-amber-50', border: 'border-amber-200' },
    { color: 'bg-rose-500', lightBg: 'bg-rose-50', border: 'border-rose-200' },
    { color: 'bg-indigo-500', lightBg: 'bg-indigo-50', border: 'border-indigo-200' },
  ];

  const gradeCountMap: Record<string, number> = {};
  studentReports.forEach((r) => {
    const u = activeUsers.find((usr) => usr.id === r.reporterId || usr.name.toLowerCase() === r.reporterName?.toLowerCase());
    if (!u || u.role !== 'STUDENT') return;
    const grade = (u as any)?.gradeLevel || 'Unknown';
    gradeCountMap[grade] = (gradeCountMap[grade] || 0) + 1;
  });

  const maxGradeSubmissions = Math.max(...Object.values(gradeCountMap), 0);
  const topGradeKey = Object.keys(gradeCountMap).find((k) => gradeCountMap[k] === maxGradeSubmissions && maxGradeSubmissions > 0) || 'Unknown';
  const topGradeSubmissions = gradeCountMap[topGradeKey] || 0;
  const topGradeShare = totalStudentReports > 0 ? ((topGradeSubmissions / totalStudentReports) * 100).toFixed(1) : '0';

  const gradeParticipation = Object.entries(gradeCountMap)
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([grade, reports], idx) => {
      const palette = gradeColorPalette[idx % gradeColorPalette.length];
      return {
        grade,
        label: grade,
        reports,
        pct: totalStudentReports > 0 ? Number(((reports / totalStudentReports) * 100).toFixed(1)) : 0,
        activeStudents: activeUsers.filter((u) => u.role === 'STUDENT' && (u as any).gradeLevel === grade).length,
        isTop: grade === topGradeKey && maxGradeSubmissions > 0,
        color: palette.color,
        lightBg: palette.lightBg,
        border: palette.border,
      };
    });

  // Monthly collection metrics — computed from actual report data (respects timeframe)
  // School-year display order (Jun → May) but indexed by calendar month number.
  const monthOrder = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
  const calendarMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyDataMap: Record<string, { weight: number; items: number }> = {};
  monthOrder.forEach((m) => { monthlyDataMap[m] = { weight: 0, items: 0 }; });
  collectedReports.forEach((r) => {
    try {
      const d = new Date(r.timestamp || Date.now());
      if (Number.isNaN(d.getTime())) return;
      const key = calendarMonths[d.getMonth()];
      if (!monthlyDataMap[key]) monthlyDataMap[key] = { weight: 0, items: 0 };
      monthlyDataMap[key].weight += r.weightCollected || 0;
      monthlyDataMap[key].items += 1;
    } catch { /* skip invalid dates */ }
  });
  const monthlyData = monthOrder
    .filter((m) => monthlyDataMap[m].items > 0)
    .map((m) => ({
      month: m,
      weight: Math.round(monthlyDataMap[m].weight) || 0,
      items: monthlyDataMap[m].items,
    }));

  // Campus Hotspots — dynamic grouping of open/pending reports by locationName
  const hotspotMap: Record<string, { count: number; highPriority: number; locations: Set<string> }> = {};
  activeReports
    .filter((r) => r.status === 'PENDING' || r.status === 'DISPATCHED')
    .forEach((r) => {
      const loc = r.locationName || 'Unknown Location';
      if (!hotspotMap[loc]) hotspotMap[loc] = { count: 0, highPriority: 0, locations: new Set() };
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
    <div className="space-y-6 animate-fade-in text-[#00271D]">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold text-[#00A77C] bg-[#00A77C]/10 border border-[#00A77C]/20 px-3 py-1 rounded-full uppercase tracking-wider">
              OPERATIONAL ANALYTICS
            </span>
            <span className="text-xs font-semibold text-[#00271D]/40">• Updated live</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#00271D] tracking-tight mt-2">
            Operational & Collection Performance
          </h2>
          <p className="text-xs text-[#00271D]/60 mt-1 max-w-xl">
            Real-time monitoring of campus report submissions, MRF task dispatches, grade-level participation, and recyclable revenue.
          </p>
        </div>

      </div>

      {/* 1. TOP OPERATIONAL SUMMARY CARDS (4 CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Campus Reports */}
        <div className="h-full flex flex-col justify-between p-5 bg-white/90 rounded-2xl border border-white/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-orange-50 rounded-xl text-[#FF5722] group-hover:scale-110 transition-transform">
              <FileText size={22} />
            </div>
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-full border border-emerald-200/60">
              Live Sync
            </span>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#00271D]/60">Total Campus Reports</p>
            <p className="text-3xl font-extrabold tracking-tight text-[#00271D] mt-0.5">
              {totalReportsCount}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-[#00271D]/5 flex items-center justify-between text-[11px] text-[#00271D]/60 font-medium">
            <span>{studentReportsCount} Student</span>
            <span>•</span>
            <span>{teacherReportsCount} Teacher</span>
          </div>
        </div>

        {/* Card 2: Dispatched & Collected Tasks */}
        <div className="h-full flex flex-col justify-between p-5 bg-white/90 rounded-2xl border border-white/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-sky-50 rounded-xl text-[#0091EA] group-hover:scale-110 transition-transform">
              <Truck size={22} />
            </div>
            <span className="text-[11px] font-medium text-sky-700 bg-sky-50/80 px-2 py-0.5 rounded-full border border-sky-200/60">
              {dispatchResolutionRate}%
            </span>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#00271D]/60">Dispatched & Collected</p>
            <p className="text-3xl font-extrabold tracking-tight text-[#00271D] mt-0.5">
              {collectedReports.length} <span className="text-sm font-bold text-[#00271D]/40">/ {totalReportsCount}</span>
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-[#00271D]/5 flex items-center justify-between text-[11px] text-[#00271D]/60 font-medium">
            <span>MRF Tasks Resolved</span>
            <span className="font-bold text-[#0091EA]">{pendingReports.length} pending</span>
          </div>
        </div>

        {/* Card 3: Most Active Grade Level */}
        <div className="h-full flex flex-col justify-between p-5 bg-white/90 rounded-2xl border border-white/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-purple-50 rounded-xl text-[#651FFF] group-hover:scale-110 transition-transform">
              <GraduationCap size={22} />
            </div>
            <span className="text-[11px] font-medium text-[#C69B26] bg-amber-50/80 px-2 py-0.5 rounded-full border border-amber-200/60">
              Top Grade
            </span>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#00271D]/60">Most Active Grade Level</p>
            <p className="text-3xl font-extrabold tracking-tight text-[#00271D] mt-0.5">
              {topGradeKey}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-[#00271D]/5 flex items-center justify-between text-[11px] text-[#00271D]/60 font-medium">
            <span>{topGradeSubmissions} Submission{topGradeSubmissions === 1 ? '' : 's'}</span>
            <span className="font-bold text-purple-600">{topGradeShare}% Share</span>
          </div>
        </div>

        {/* Card 4: Total Recyclable Value (PHP) */}
        <div className="h-full flex flex-col justify-between p-5 bg-white/90 rounded-2xl border border-white/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-amber-50 rounded-xl text-[#FFAB00] group-hover:scale-110 transition-transform">
              <Coins size={22} />
            </div>
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-full border border-emerald-200/60">
              Market Sync
            </span>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#00271D]/60">Total Recyclable Value</p>
            <p className="text-3xl font-extrabold tracking-tight text-[#00271D] mt-0.5">
              ₱{totalValuePhp.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-[#00271D]/5 flex items-center justify-between text-[11px] text-[#00271D]/60 font-medium">
            <span>Est. Revenue</span>
            <span className="font-bold text-amber-600">{totalCollectedKg.toFixed(1)} kg processed</span>
          </div>
        </div>
      </div>

      {/* 2. MIDDLE GRID: GRADE LEVEL PARTICIPATION + ITEMIZED COMPOSITION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Participation by Grade Level (Grades 7–10) - 7 Columns */}
        <div className="lg:col-span-7 bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-50 rounded-xl text-[#651FFF]">
                  <BarChart2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#00271D]">Participation by Grade Level</h3>
                  <p className="text-xs text-[#00271D]/50">Reporting activity and engagement across all grade levels</p>
                </div>
              </div>
              <span className="text-[11px] font-medium text-purple-700 bg-purple-50/80 px-2 py-0.5 rounded-full border border-purple-200/60">
                {activeUsers.filter(u => u.role === 'STUDENT').length} Student Profiles
              </span>
            </div>

            {/* Grade Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5">
              {gradeParticipation.map((item) => (
                <div
                  key={item.grade}
                  className={`p-4 rounded-2xl border transition-all ${
                    item.isTop
                      ? `${item.lightBg} ${item.border} ring-2 ring-purple-400/30 shadow-sm`
                      : 'bg-gray-50/70 border-gray-200/80 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#00271D] flex items-center gap-1.5">
                      <GraduationCap size={15} className={item.isTop ? 'text-purple-600' : 'text-[#00271D]/50'} />
                      {item.label}
                    </span>
                    {item.isTop && (
                      <span className="text-[10px] font-extrabold text-[#C69B26] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Award size={11} /> Top Leader
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-black text-[#00271D]">{item.reports}</span>
                      <span className="text-xs font-bold text-[#00271D]/50 ml-1.5">reports</span>
                    </div>
                    <span className="text-xs font-extrabold text-[#00271D]/70">{item.pct}%</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-gray-200/80 rounded-full overflow-hidden mt-2.5">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max(item.pct, 5)}%` }}
                    />
                  </div>

                  <p className="text-[11px] font-medium text-[#00271D]/50 mt-2">
                    {item.activeStudents} registered student{item.activeStudents === 1 ? '' : 's'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Grade Level Summary Footer */}
          <div className="p-3.5 bg-[#F9F3F0] rounded-2xl border border-[#00271D]/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-[#00271D]/70 flex items-center gap-2">
              <Users size={14} className="text-[#00A77C]" />
              Active Campus Grade Cohorts: <strong className="text-[#00271D]">{gradeParticipation.length} Grade{gradeParticipation.length === 1 ? '' : 's'} Configured</strong>
            </span>
            <span className="text-[11px] font-medium text-[#00A77C] bg-[#00A77C]/10 px-2.5 py-0.5 rounded-full border border-[#00A77C]/20">
              {topGradeKey} ({topGradeSubmissions} report{topGradeSubmissions === 1 ? '' : 's'})
            </span>
          </div>
        </div>

        {/* Itemized Recyclable Waste Composition - 5 Columns */}
        <div className="lg:col-span-5 bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-50 rounded-xl text-[#0091EA]">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#00271D]">Recyclable Waste Composition</h3>
                  <p className="text-xs text-[#00271D]/50">Itemized breakdown by material volume & value</p>
                </div>
              </div>
            </div>

            {/* Visual Segmented Distribution Bar */}
            <div className="mt-5 space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span>Material Distribution</span>
                <span className="text-[#00A77C]">{totalCollectedKg.toFixed(1)} kg Total</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex gap-0.5 p-0.5">
                {wasteComposition.map((item) => (
                  <div
                    key={item.id}
                    className={`h-full ${item.barColor} rounded-sm transition-all`}
                    style={{ width: `${item.pct}%` }}
                    title={`${item.name}: ${item.pct}%`}
                  />
                ))}
              </div>
            </div>

            {/* Itemized Material List */}
            <div className="space-y-3 mt-4">
              {wasteComposition.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <div
                    key={item.id}
                    className="p-3 bg-gray-50/80 hover:bg-white rounded-2xl border border-gray-100 transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${item.bgColor} ${item.textColor}`}>
                        <ItemIcon size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#00271D]">{item.name}</p>
                        <p className="text-[11px] text-[#00271D]/50 font-medium">
                          {item.weightKg.toFixed(1)} kg collected
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-black text-[#00271D]">{item.pct}%</p>
                      <p className="text-[11px] font-bold text-[#00A77C]">
                        ₱{item.estValuePhp.toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-[#00271D]/10 flex items-center justify-between text-xs">
            <span className="text-[#00271D]/60 font-semibold">Total Estimated Value</span>
            <span className="font-extrabold text-[#00271D] text-sm">
              ₱{totalValuePhp.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM GRID: MONTHLY COLLECTION & CAMPUS HOTSPOTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Collection (Actual Weight & Items) - 7 Columns */}
        <div className="lg:col-span-7 bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 rounded-xl text-[#00A77C]">
                <Calendar size={18} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#00271D]">Monthly Collection Volume</h3>
                <p className="text-xs text-[#00271D]/50">Actual weight (kg) and item count per month</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {totalCollectedKg.toFixed(1)} kg Collected
              </span>
              <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                {collectedReports.length} Verified Reports
              </span>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="h-52 flex items-end justify-between gap-3 pt-8 pb-2 border-b border-[#00271D]/10">
            {monthlyData.map((m) => {
              const heightPct = Math.min(100, Math.round((m.weight / 250) * 100));
              const hasData = m.weight > 0;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-2 group relative">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-[#00271D] text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-md pointer-events-none whitespace-nowrap z-10">
                    {m.weight} kg • {m.items} items
                  </div>

                  {hasData ? (
                    <div className="w-full flex items-end justify-center" style={{ height: '140px' }}>
                      <div
                        className="w-7 bg-[#00A77C] group-hover:bg-[#008f6a] rounded-t-md transition-all duration-500 shadow-sm"
                        style={{ height: `${Math.max(heightPct, 8)}%` }}
                      />
                    </div>
                  ) : (
                    <div className="w-full flex items-end justify-center" style={{ height: '140px' }}>
                      <div className="h-1 w-7 bg-gray-200 rounded-full" />
                    </div>
                  )}
                  <span className="text-xs font-bold text-[#00271D]/70">{m.month}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-[#00271D]/60 pt-1 font-medium">
            <span>Current Collection: <strong>{totalCollectedKg.toFixed(1)} kg</strong></span>
            <span className="text-[#00A77C] font-bold">Total Processed: {totalCollectedKg.toFixed(1)} kg</span>
          </div>
        </div>

        {/* Campus Hotspots & Facility Load - 5 Columns */}
        <div className="lg:col-span-5 bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-orange-50 rounded-xl text-[#FF5722]">
                  <MapPin size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#00271D]">Campus Waste Hotspots</h3>
                  <p className="text-xs text-[#00271D]/50">High-frequency report zones requiring MRF attention</p>
                </div>
              </div>
            </div>

            {/* Dynamic Hotspot Zone List */}
            <div className="space-y-2.5 mt-5">
              {hotspotZones.length > 0 ? (
                hotspotZones.map((zone) => (
                  <div
                    key={zone.name}
                    className="p-3 bg-gray-50/80 hover:bg-white rounded-2xl border border-gray-100 transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${zone.isOverdue ? 'bg-rose-50 text-rose-600' : 'bg-sky-50 text-sky-600'}`}>
                        <MapPin size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#00271D]">{zone.name}</p>
                        <p className="text-[11px] text-[#00271D]/50 font-medium">
                          {zone.reportCount} open report{zone.reportCount === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {zone.isOverdue ? (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          High Priority
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                          Normal
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-[#00271D]/50 font-medium bg-gray-50/70 rounded-2xl border border-gray-100">
                  No active hotspots — all zones clear
                </div>
              )}
            </div>
          </div>

          {/* Action Footer linking to Bin Map */}
          <div className="pt-3 border-t border-[#00271D]/10 flex items-center justify-between text-xs mt-5">
            <span className="text-[#00271D]/60 font-semibold">
              {totalOpenReports} open report{totalOpenReports === 1 ? '' : 's'} across {hotspotZones.length} zone{hotspotZones.length === 1 ? '' : 's'}
              {totalHighPriority > 0 && (
                <span className="text-rose-600 ml-1">• {totalHighPriority} high priority</span>
              )}
            </span>
            <span className="text-[11px] font-bold text-[#00A77C] bg-[#00A77C]/10 px-2.5 py-1 rounded-full border border-[#00A77C]/20 flex items-center gap-1">
              <ExternalLink size={11} />
              View Bin Map
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
