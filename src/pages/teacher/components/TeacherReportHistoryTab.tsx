import React from 'react';
import {
  Clock,
  MapPin,
  AlertTriangle
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
  CAT_EMOJI: Record<string, string>;
}

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
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-indigo-700">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
          Ledger Log
        </span>
        <h2 className="mt-1.5 text-xl font-extrabold tracking-tight text-gray-900">My Activity</h2>
        <p className="mt-0.5 text-[11px] text-gray-400">All submitted maintenance and waste recovery tickets.</p>
      </div>

      {/* Pill filter toggles */}
      <div className="flex flex-wrap gap-2">
        {/* Status pills */}
        {(['All', 'Pending', 'Verified', 'Resolved', 'Dismissed'] as const).map(s => (
          <button
            key={s} type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-full border px-3.5 py-1.5 text-[10px] font-bold transition-all cursor-pointer ${
              statusFilter === s
                ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
            }`}
          >
            {s}
          </button>
        ))}
        <div className="mx-1 h-6 w-px self-center bg-gray-200" />
        {/* Category pills */}
        {(['All', 'Waste/Bin', 'Furniture', 'Electronics', 'Fixtures', 'Equipment', 'Other'] as const).map(c => (
          <button
            key={c} type="button"
            onClick={() => setCategoryFilter(c)}
            className={`rounded-full border px-3.5 py-1.5 text-[10px] font-bold transition-all cursor-pointer ${
              categoryFilter === c
                ? 'border-gray-800 bg-gray-800 text-white shadow-sm'
                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
            }`}
          >
            {CAT_EMOJI[c] || ''} {c}
          </button>
        ))}
      </div>

      {/* Report rows */}
      {(() => {
        const filtered = timelineReports.filter(rep => {
          const ds = getDisplayStatus(rep.status, rep.title);
          const dc = getDisplayCategory(rep.description);
          return (statusFilter === 'All' || ds === statusFilter) && (categoryFilter === 'All' || dc === categoryFilter);
        });

        if (filtered.length === 0) {
          return (
            <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-sm">
              <AlertTriangle className="mx-auto mb-2 text-gray-200" size={28} />
              <p className="text-xs font-bold text-gray-400">No reports match your filters.</p>
            </div>
          );
        }

        return (
          <div className="space-y-3">
            {filtered.map(rep => {
              const ds = getDisplayStatus(rep.status, rep.title);
              const dc = getDisplayCategory(rep.description);
              return (
                <div key={rep.id} className={`group flex items-start gap-3 rounded-2xl border border-l-4 bg-white p-4 shadow-sm transition-all hover:shadow-md ${STATUS_LEFT[ds]} border-gray-200`}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-base">{CAT_EMOJI[dc] || '📁'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-gray-900">{rep.title}</p>
                    <p className="mt-0.5 text-[10px] text-gray-500 leading-relaxed line-clamp-1">{rep.description.replace(/\[.*?\]/g, '').trim()}</p>
                    <div className="mt-1.5 flex items-center gap-2 text-[9px] font-bold text-gray-400">
                      <Clock size={9} />
                      <span>{rep.timestamp}</span>
                      <span>•</span>
                      <MapPin size={9} />
                      <span>{rep.locationName}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider ${STATUS_BADGE[ds]}`}>{ds}</span>
                    {rep.imageUrl && (
                      <div className="h-9 w-14 overflow-hidden rounded-lg border border-gray-100 shadow-sm">
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
