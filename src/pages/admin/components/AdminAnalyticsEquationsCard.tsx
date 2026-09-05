import React, { useState } from 'react';
import {
  Calculator,
  Percent,
  TrendingUp,
  Coins,
  Scale,
  Award,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { Report, User } from '../../../types';

interface AdminAnalyticsEquationsCardProps {
  reports: Report[];
  users: User[];
  totalCollectedKg: number;
  totalEstimatedValuePhp: number;
  rewardsReservedPhp: number;
  resolutionRatePct: number;
}

export const AdminAnalyticsEquationsCard: React.FC<AdminAnalyticsEquationsCardProps> = ({
  reports,
  users,
  totalCollectedKg,
  totalEstimatedValuePhp,
  rewardsReservedPhp,
  resolutionRatePct,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'VOLUME' | 'RESOLUTION' | 'VALUATION' | 'RESERVE' | 'POINTS'>('ALL');

  const totalReports = reports.length;
  const studentReports = reports.filter(r => r.reporterRole === 'student' || (!r.reporterRole && r.reporterId !== '4')).length;
  const teacherReports = reports.filter(r => r.reporterRole === 'teacher' || r.reporterId === '4').length;
  const collectedCount = reports.filter(r => r.status === 'COLLECTED' || r.status === 'RESOLVED').length;

  const equations = [
    {
      id: 'VOLUME',
      category: 'Volume & Cohorts',
      title: 'Total Campus Submissions & Grade Distribution',
      icon: Layers,
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
      borderColor: 'border-sky-200',
      formula: 'N_total = N_student + N_teacher',
      subFormula: 'Grade_Share (%) = (N_grade / N_total) × 100%',
      description: 'Calculates the cumulative report count across student and faculty cohorts, and measures relative grade-level participation density.',
      parameters: [
        { symbol: 'N_total', label: 'Total Campus Reports', value: totalReports.toString() },
        { symbol: 'N_student', label: 'Student Reports', value: studentReports.toString() },
        { symbol: 'N_teacher', label: 'Faculty / Teacher Reports', value: teacherReports.toString() },
      ],
      liveCalculation: `${studentReports} (Students) + ${teacherReports} (Faculty) = ${totalReports} Total Reports`,
    },
    {
      id: 'RESOLUTION',
      category: 'MRF Efficiency',
      title: 'Dispatch & Collection Resolution Rate',
      icon: TrendingUp,
      color: 'text-[#00A77C]',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      formula: 'Resolution Rate (%) = (N_collected / N_total) × 100%',
      subFormula: 'Pending_Rate (%) = 100% - Resolution Rate (%)',
      description: 'Measures the operational efficiency of the MRF dispatch workflow from student alert submission to verified weigh-in and clearance.',
      parameters: [
        { symbol: 'N_collected', label: 'Cleared / Collected Reports', value: collectedCount.toString() },
        { symbol: 'N_total', label: 'Total Reports Evaluated', value: totalReports.toString() },
      ],
      liveCalculation: totalReports > 0 
        ? `(${collectedCount} / ${totalReports}) × 100% = ${resolutionRatePct}% Operational Resolution`
        : `(0 / 0) = 100% (No Active Backlog)`,
    },
    {
      id: 'VALUATION',
      category: 'Biomass & Economy',
      title: 'Recyclables Mass Recovery & Economic Value',
      icon: Scale,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      formula: 'W_total = Σ w_i (kg)',
      subFormula: 'V_total (₱) = Σ (W_c × Price_c) + Sales_Revenue',
      description: 'Computes total recovered biomass weight across all cleared bins and aggregates the projected market valuation based on live junkshop rates.',
      parameters: [
        { symbol: 'W_total', label: 'Total Recycled Weight', value: `${totalCollectedKg.toFixed(1)} kg` },
        { symbol: 'Price_c', label: 'Category Unit Rates', value: 'Dynamic from Market Stock DB' },
        { symbol: 'V_total', label: 'Estimated Total Value', value: `₱${totalEstimatedValuePhp.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
      ],
      liveCalculation: `Σ Collected Weight = ${totalCollectedKg.toFixed(1)} kg → Yielding ₱${totalEstimatedValuePhp.toLocaleString('en-US', { minimumFractionDigits: 2 })} Recyclable Value`,
    },
    {
      id: 'RESERVE',
      category: 'Incentives Pool',
      title: 'Quarter-End Rank 1 Rewards Reserve (20% Rule)',
      icon: Coins,
      color: 'text-[#C69B26]',
      bgColor: 'bg-amber-50/80',
      borderColor: 'border-amber-300',
      formula: 'Reserve_Fund (₱) = Total_MRF_Sales × Reserve_Rate',
      subFormula: 'Quarterly_Disbursement = Reserve_Fund / Eligible_Rank1_Winners',
      description: 'Strict governance policy reserving a configurable percentage of all closed MRF recyclable vendor sales revenue into the end-of-quarter student reward cash pool.',
      parameters: [
        { symbol: 'Quota', label: 'Institutional Reserve Ratio', value: 'Configurable via Settings (default: 20%)' },
        { symbol: 'Reserve_Fund', label: 'Accumulated Cash Pool', value: `₱${rewardsReservedPhp.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
      ],
      liveCalculation: `Configurable % of MRF Vendor Transactions = ₱${rewardsReservedPhp.toLocaleString('en-US', { minimumFractionDigits: 2 })} locked for Top 1 Sentinel`,
    },
    {
      id: 'POINTS',
      category: 'Gamification',
      title: 'Reporter Rank Points Allocation & Sanctions',
      icon: Award,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      formula: 'User_Points = Σ (Reporter_Rank_Bonus) - Σ (Offense_Penalties)',
      subFormula: 'Rank_Bonus = Dynamic from PointRule table | Penalties = Configurable in Settings',
      description: 'Awards points dynamically according to submission order when duplicate reports cluster around an overflowing bin, and applies configurable sanctions for false reports.',
      parameters: [
        { symbol: '1st Reporter', label: 'Primary Spotter Reward', value: '+15 Eco-Points (configurable)' },
        { symbol: '2nd Reporter', label: 'Secondary Confirmation', value: '+10 Eco-Points (configurable)' },
        { symbol: '3rd Reporter', label: 'Tertiary Verification', value: '+5 Eco-Points (configurable)' },
        { symbol: 'Penalty', label: 'False Submission Sanction', value: '-50 Eco-Points (configurable)' },
      ],
      liveCalculation: `Verified submissions awarded based on timestamp order; disciplinary deductions enforce sorting integrity.`,
    },
  ];

  const filteredEquations = activeTab === 'ALL' 
    ? equations 
    : equations.filter(eq => eq.id === activeTab);

  return (
    <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-4 hover:shadow-md transition-shadow">
      {/* Header with toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#00271D]/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#00A77C]/10 text-[#00A77C]">
            <Calculator size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold text-[#00A77C] bg-[#00A77C]/10 border border-[#00A77C]/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                MATHEMATICAL FORMULATIONS & TELEMETRY EQUATIONS
              </span>
              <span className="text-xs font-semibold text-[#00271D]/40">• System Synchronized</span>
            </div>
            <h3 className="text-lg font-extrabold text-[#00271D] tracking-tight mt-1">
              Analytics Governance & Calculation Formulas
            </h3>
            <p className="text-xs text-[#00271D]/50 mt-0.5">
              Formal equations and real-time parameter substitutions governing operational metrics across SORTv2
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3.5 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-bold text-[#00271D] flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <span>{isExpanded ? 'Collapse Formulas' : 'View Equations'}</span>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4 animate-fade-in pt-1">
          {/* Category Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#F9F3F0] p-1 rounded-xl border border-[#00271D]/10 text-xs font-bold">
            {[
              { id: 'ALL', label: 'All Equations' },
              { id: 'VOLUME', label: 'Volume & Cohorts' },
              { id: 'RESOLUTION', label: 'MRF Efficiency' },
              { id: 'VALUATION', label: 'Biomass & Valuation' },
              { id: 'RESERVE', label: '20% Rewards Reserve' },
              { id: 'POINTS', label: 'Eco-Points Rules' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#00A77C] text-white shadow-sm'
                    : 'text-[#00271D]/60 hover:text-[#00271D]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Grid of Equation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {filteredEquations.map(eq => {
              const Icon = eq.icon;
              return (
                <div
                  key={eq.id}
                  className={`p-5 rounded-2xl border ${eq.bgColor} ${eq.borderColor} space-y-3.5 hover:shadow-md transition-all flex flex-col justify-between`}
                >
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-xl bg-white shadow-xs ${eq.color}`}>
                          <Icon size={16} />
                        </div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#00271D]/60">
                          {eq.category}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-white/80 border border-black/5 text-[#00271D]">
                        Active Rule
                      </span>
                    </div>

                    <h4 className="text-sm font-extrabold text-[#00271D]">{eq.title}</h4>
                    <p className="text-[11px] text-[#00271D]/70 leading-relaxed">{eq.description}</p>
                  </div>

                  {/* Mathematical Code Block */}
                  <div className="p-3 bg-[#00271D] text-white rounded-xl font-mono text-xs space-y-1 shadow-inner">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <span className="text-[10px] uppercase tracking-wider opacity-70">Primary:</span>
                      <span>{eq.formula}</span>
                    </div>
                    {eq.subFormula && (
                      <div className="flex items-center gap-1.5 text-amber-300 text-[11px]">
                        <span className="text-[9px] uppercase tracking-wider opacity-60">Sub-Rule:</span>
                        <span>{eq.subFormula}</span>
                      </div>
                    )}
                  </div>

                  {/* Parameters Table */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#00271D]/50 block">
                      Parameter Values & State:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {eq.parameters.map((p, idx) => (
                        <div key={idx} className="p-2 rounded-xl bg-white/80 border border-black/5 flex flex-col justify-between">
                          <span className="text-[10px] font-mono text-gray-500 font-semibold">{p.symbol} ({p.label})</span>
                          <span className="text-xs font-black text-[#00271D] mt-0.5">{p.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Live Calculation Output */}
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-[#00A77C] shrink-0" />
                    <span className="text-[11px] font-medium leading-tight">
                      <strong className="text-emerald-950">Live Output: </strong>
                      {eq.liveCalculation}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
