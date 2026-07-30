import React from 'react';
import {
  Clock,
  MapPin,
  AlertTriangle,
  Recycle,
  Armchair,
  Monitor,
  Zap,
  Wrench,
  FileText,
} from 'lucide-react';
import { Report } from '../../../types';

interface TeacherReportHistoryTabProps {
  timelineReports: Report[];
  statusFilter: 'All' | 'Pending' | 'Verified' | 'Resolved' | 'Dismissed';
  setStatusFilter: (s: 'All' | 'Pending' | 'Verified' | 'Resolved' | 'Dismissed') => void;
  categoryFilter: string;
  setCategoryFilter: (c: string) => void;
  getDisplayStatus: (status: string, title: string) => string;
  getDisplayCategory: (desc: string) => string;
  STATUS_BADGE: Record<string, string>;
  STATUS_LEFT: Record<string, string>;
  CAT_EMOJI?: Record<string, string>;
}

const CAT_ICON: Record<string, React.ComponentType<any>> = {
  'Waste/Bin': Recycle, Furniture: Armchair, Electronics: Monitor,
  Fixtures: Zap, Equipment: Wrench, Other: FileText,
};

export const TeacherReportHistoryTab: React.FC<TeacherReportHistoryTabProps> = ({
  timelineReports,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  getDisplayStatus,
  getDisplayCategory,
  STATUS_BADGE,
  STATUS_LEFT,
  CAT_EMOJI
}) => {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">

      {/* Header */}
      <div className="bg-gradient-to-br from-white/95 via-white/90 to-[#e0f2ec]/60 border border-white/90 rounded-3xl p-7 shadow-xl shadow-[#00271D]/5 backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00A77C]/40 bg-[#00A77C]/15 px-3.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-[#00A77C]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00A77C] animate-pulse" />
          Ledger Log
        </span>
        <h2 className="mt-2 text-2xl font-heading font-black tracking-tight text-[#00271D]">Activity & Incident History</h2>
        <p className="mt-1 text-xs text-[#00271D]/60 font-medium">All submitted maintenance, asset repair, and waste recovery tickets.</p>
      </div>

      {/* Pill filter toggles */}
      <div className="flex flex-wrap gap-2">
        {/* Status pills */}
        {(['All', 'Pending', 'Verified', 'Resolved', 'Dismissed'] as const).map(s => (
          <button
            key={s} type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-full border px-4 py-1.5 text-[10px] font-extrabold transition-all cursor-pointer ${
              statusFilter === s
                ? 'border-[#00A77C] bg-[#00A77C] text-white shadow-md shadow-[#00A77C]/25'
                : 'border-[#00271D]/15 bg-white/90 text-[#00271D]/70 hover:border-[#00A77C]'
            }`}
          >
            {s}
          </button>
        ))}

        <div className="mx-1 h-6 w-px bg-[#00271D]/15 self-center" />

        {/* Category pills */}
        {['All', 'Waste/Bin', 'Furniture', 'Electronics', 'Fixtures', 'Equipment', 'Other'].map(c => (
          <button
            key={c} type="button"
            onClick={() => setCategoryFilter(c)}
            className={`rounded-full border px-3 py-1.5 text-[10px] font-bold transition-all cursor-pointer ${
              categoryFilter === c
                ? 'border-[#00271D] bg-[#00271D] text-white shadow-xs'
                : 'border-[#00271D]/15 bg-white/90 text-[#00271D]/60 hover:border-[#00271D]/40'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* List */}
      {(() => {
        const filtered = timelineReports.filter(rep => {
          const ds = getDisplayStatus(rep.status, rep.title);
          const dc = getDisplayCategory(rep.description);
          return (statusFilter === 'All' || ds === statusFilter) && (categoryFilter === 'All' || dc === categoryFilter);
        });

        if (filtered.length === 0) {
          return (
            <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/80 p-10 text-center shadow-sm">
              <AlertTriangle className="mx-auto mb-2 text-[#00271D]/30" size={28} />
              <p className="text-xs font-bold text-[#00271D]/50">No reports match your filters.</p>
            </div>
          );
        }

        return (
          <div className="space-y-3">
            {filtered.map(rep => {
              const ds = getDisplayStatus(rep.status, rep.title);
              const dc = getDisplayCategory(rep.description);
              return (
                <div
                  key={rep.id}
                  className={`bg-white/90 backdrop-blur-md border border-white/80 border-l-4 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-start gap-4 ${STATUS_LEFT[ds]}`}
                >
                  {(() => {
                    const IconComp = CAT_ICON[dc] || FileText;
                    return (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#00271D]/5 text-[#00A77C]">
                        <IconComp size={22} />
                      </div>
                    );
                  })()}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-extrabold text-[#00271D]">{rep.title}</p>
                    <p className="mt-0.5 text-[10px] text-[#00271D]/60 leading-relaxed line-clamp-1 font-medium">{rep.description.replace(/\[.*?\]/g, '').trim()}</p>
                    <div className="mt-1.5 flex items-center gap-2 text-[9px] font-bold text-[#00271D]/50">
                      <Clock size={10} />
                      <span>{rep.timestamp}</span>
                      <span>•</span>
                      <MapPin size={10} />
                      <span>{rep.locationName}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className={`rounded-full border px-3 py-0.5 text-[8px] font-black uppercase tracking-wider ${STATUS_BADGE[ds]}`}>{ds}</span>
                    {rep.imageUrl && (
                      <div className="h-9 w-14 overflow-hidden rounded-xl border border-[#00271D]/10 shadow-2xs">
                        <img src={rep.imageUrl} alt="Evidence" className="h-full w-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

    </div>
  );
};
