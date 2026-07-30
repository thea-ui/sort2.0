import React, { useState } from 'react';
import {
  Clock,
  MapPin,
  AlertTriangle,
  Scale,
  Recycle,
  Armchair,
  Monitor,
  Zap,
  Wrench,
  FileText,
  Medal,
  Award,
  Info,
  Truck,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Report, SystemSettings } from '../../../types';

interface ReportHistoryTabProps {
  personalReports: Report[];
  settings?: SystemSettings;
  CATEGORY_META?: any;
  URGENCY_META?: any;
  statusFilter?: 'All' | 'Pending' | 'Verified' | 'Resolved' | 'Dismissed';
  setStatusFilter?: (s: 'All' | 'Pending' | 'Verified' | 'Resolved' | 'Dismissed') => void;
  categoryFilter?: string;
  setCategoryFilter?: (c: string) => void;
}

const getDisplayStatus = (status: string, title: string) => {
  if (title.toLowerCase().includes('dismissed') || title.toLowerCase().includes('rejected')) return 'Dismissed';
  switch (status) {
    case 'PENDING':    return 'Pending';
    case 'DISPATCHED': return 'Verified';
    case 'COLLECTED':
    case 'RESOLVED':   return 'Resolved';
    default:           return 'Pending';
  }
};

const getDisplayCategory = (desc: string, cat?: string) => {
  if (desc.includes('[PILLAR: FURNITURE]'))   return 'Furniture';
  if (desc.includes('[PILLAR: ELECTRONICS]')) return 'Electronics';
  if (desc.includes('[PILLAR: FIXTURES]'))    return 'Fixtures';
  if (desc.includes('[PILLAR: EQUIPMENT]'))   return 'Equipment';
  if (desc.includes('[PILLAR: OTHER]'))       return 'Other';
  return cat === 'RECYCLABLE' ? 'Waste/Bin' : 'Waste/Bin';
};

const STATUS_BADGE: Record<string, string> = {
  Pending:   'bg-amber-50 text-amber-700 border-amber-200',
  Verified:  'bg-indigo-50 text-indigo-700 border-indigo-200',
  Resolved:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  Dismissed: 'bg-rose-50 text-rose-700 border-rose-200',
};

const STATUS_LEFT: Record<string, string> = {
  Pending:   'border-l-amber-400',
  Verified:  'border-l-indigo-400',
  Resolved:  'border-l-emerald-400',
  Dismissed: 'border-l-rose-400',
};

const CAT_ICON: Record<string, React.ComponentType<any>> = {
  'Waste/Bin': Recycle, Furniture: Armchair, Electronics: Monitor,
  Fixtures: Zap, Equipment: Wrench, Other: FileText,
};

export const ReportHistoryTab: React.FC<ReportHistoryTabProps> = ({
  personalReports,
  settings,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter
}) => {
  const [localStatusFilter, setLocalStatusFilter] = useState<'All' | 'Pending' | 'Verified' | 'Resolved' | 'Dismissed'>('All');
  const [localCategoryFilter, setLocalCategoryFilter] = useState<string>('All');

  const currentStatusFilter = statusFilter ?? localStatusFilter;
  const currentSetStatusFilter = setStatusFilter ?? setLocalStatusFilter;

  const currentCategoryFilter = categoryFilter ?? localCategoryFilter;
  const currentSetCategoryFilter = setCategoryFilter ?? setLocalCategoryFilter;

  const filtered = personalReports.filter(rep => {
    const ds = getDisplayStatus(rep.status, rep.title);
    const dc = getDisplayCategory(rep.description, rep.category);
    return (currentStatusFilter === 'All' || ds === currentStatusFilter) && (currentCategoryFilter === 'All' || dc === currentCategoryFilter);
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">

      {/* Header */}
      <div className="bg-gradient-to-br from-white/95 via-white/90 to-[#e0f2ec]/60 border border-white/90 rounded-3xl p-7 shadow-xl shadow-[#00271D]/5 backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00A77C]/40 bg-[#00A77C]/15 px-3.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-[#00A77C]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00A77C] animate-pulse" />
          Ledger Log
        </span>
        <h2 className="mt-2 text-2xl font-heading font-black tracking-tight text-[#00271D]">Activity & Incident History</h2>
        <p className="mt-1 text-xs text-[#00271D]/60 font-medium">All your submitted waste reports and bin recovery requests.</p>
      </div>

      {/* Pill filter toggles */}
      <div className="flex flex-wrap gap-2">
        {/* Status pills */}
        {(['All', 'Pending', 'Verified', 'Resolved', 'Dismissed'] as const).map(s => (
          <button
            key={s} type="button"
            onClick={() => currentSetStatusFilter(s)}
            className={`rounded-full border px-4 py-1.5 text-[10px] font-extrabold transition-all cursor-pointer ${
              currentStatusFilter === s
                ? 'border-[#00A77C] bg-[#00A77C] text-white shadow-md shadow-[#00A77C]/25'
                : 'border-[#00271D]/15 bg-white/90 text-[#00271D]/70 hover:border-[#00A77C]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/80 p-10 text-center shadow-sm">
          <AlertTriangle className="mx-auto mb-2 text-[#00271D]/30" size={28} />
          <p className="text-xs font-bold text-[#00271D]/50">No reports match your filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(rep => {
            const ds = getDisplayStatus(rep.status, rep.title);
            const dc = getDisplayCategory(rep.description, rep.category);
            const rank = rep.reporterRank || 1;
            const rankBadgeMeta = rank === 1
              ? { label: '1st Reporter', points: '+15 pts', style: 'bg-amber-100 text-amber-800 border-amber-300', Icon: Medal }
              : rank === 2
              ? { label: '2nd Reporter', points: '+10 pts', style: 'bg-slate-100 text-slate-800 border-slate-300', Icon: Award }
              : rank === 3
              ? { label: '3rd Reporter', points: '+5 pts', style: 'bg-orange-100 text-orange-800 border-orange-300', Icon: Award }
              : { label: `${rank}th Reporter`, points: '0 pts', style: 'bg-gray-100 text-gray-700 border-gray-200', Icon: Info };

            const isResolved = rep.status === 'COLLECTED' || rep.status === 'RESOLVED';
            const RankIcon = rankBadgeMeta.Icon;

            return (
              <div
                key={rep.id}
                className={`bg-[#FFFFFF]/90 backdrop-blur-md border border-white/80 border-l-4 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-start gap-4 ${STATUS_LEFT[ds]}`}
              >
                {(() => {
                  const IconComp = CAT_ICON[dc] || FileText;
                  return (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#00271D]/5 text-[#00A77C]">
                      <IconComp size={22} />
                    </div>
                  );
                })()}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="truncate text-xs font-extrabold text-[#00271D]">{rep.title}</p>
                    <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2.5 py-0.5 rounded-full border ${rankBadgeMeta.style}`}>
                      <RankIcon size={11} />
                      <span>{rankBadgeMeta.label} ({rankBadgeMeta.points})</span>
                    </span>
                  </div>

                  <p className="text-[10px] text-[#00271D]/60 leading-relaxed line-clamp-1 font-medium">{rep.description.replace(/\[.*?\]/g, '').trim() || rep.description}</p>
                  
                  <div className="flex items-center gap-2 text-[9px] font-bold text-[#00271D]/50">
                    <Clock size={10} />
                    <span>{rep.timestamp}</span>
                    <span>•</span>
                    <MapPin size={10} />
                    <span>{rep.locationName}</span>
                  </div>

                  {/* Points & Verification Status Bar */}
                  <div className="pt-2 border-t border-[#00271D]/10 flex items-center justify-between text-[10px] text-[#00271D]/70 bg-[#00271D]/5 px-3 py-1.5 rounded-xl">
                    <div className="flex items-center gap-1 font-semibold">
                      <Scale size={12} className="text-[#00A77C]" />
                      <span className="flex items-center gap-1">Status: <strong className={`flex items-center gap-1 ${
                        rep.status === 'PENDING'
                          ? 'text-amber-700 font-extrabold'
                          : rep.status === 'DISPATCHED'
                          ? 'text-indigo-700 font-extrabold'
                          : isResolved
                          ? 'text-emerald-700 font-extrabold'
                          : 'text-rose-700 font-extrabold'
                      }`}>
                        {rep.status === 'PENDING' ? (
                          <><Clock size={11} className="text-amber-600" /> Pending Admin Verification</>
                        ) : rep.status === 'DISPATCHED' ? (
                          <><Truck size={11} className="text-indigo-600" /> Verified by Admin · Assigned to MRF</>
                        ) : isResolved ? (
                          <><CheckCircle2 size={11} className="text-emerald-600" /> Verified & Cleared by MRF</>
                        ) : (
                          <><XCircle size={11} className="text-rose-600" /> Marked Invalid by Admin</>
                        )}
                      </strong></span>
                    </div>
                    <div>
                      {isResolved ? (
                        <span className="text-[#00A77C] font-black text-xs">
                          +{(rep.pointsAwarded && rep.pointsAwarded !== 50) ? rep.pointsAwarded : (rank === 1 ? 15 : rank === 2 ? 10 : rank === 3 ? 5 : 0)} PTS AWARDED
                        </span>
                      ) : rep.status === 'DISPATCHED' ? (
                        <span className="text-indigo-600 font-extrabold text-[10px]">
                          ({rank === 1 ? '15' : rank === 2 ? '10' : rank === 3 ? '5' : '0'} pts pending MRF cleanup)
                        </span>
                      ) : (
                        <span className="text-amber-600 font-extrabold text-[10px]">
                          ({rank === 1 ? '15' : rank === 2 ? '10' : rank === 3 ? '5' : '0'} pts pending Admin review)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className={`rounded-full border px-3 py-0.5 text-[8px] font-black uppercase tracking-wider ${STATUS_BADGE[ds]}`}>{ds}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
