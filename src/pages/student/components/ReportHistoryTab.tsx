import React, { useState } from 'react';
import {
  Clock,
  MapPin,
  AlertTriangle,
  AlertCircle,
  Scale,
  Recycle,
  Armchair,
  Monitor,
  Zap,
  Wrench,
  FileText,
  Truck,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  Navigation,
  Target,
  Map as MapIcon,
  Maximize2,
} from 'lucide-react';
import { Report, SystemSettings } from '../../../types';
import { isReportDoneAndExpired, cleanReportTitle, cleanLocationName } from '../../../utils/reportUtils';
import { PhotoLightbox } from '../../../components/common/PhotoLightbox';

interface ReportHistoryTabProps {
  personalReports: Report[];
  settings?: SystemSettings;
  CATEGORY_META?: any;
  URGENCY_META?: any;
  statusFilter?: 'All' | 'Pending' | 'Verified' | 'Dispatched' | 'Resolved' | 'Dismissed';
  setStatusFilter?: (s: 'All' | 'Pending' | 'Verified' | 'Dispatched' | 'Resolved' | 'Dismissed') => void;
  categoryFilter?: string;
  setCategoryFilter?: (c: string) => void;
}

const getDisplayStatus = (status: string, title: string, isVerified?: boolean) => {
  if (status === 'EXPIRED') return 'Expired';
  if (status === 'DISMISSED' || title.toLowerCase().includes('dismissed') || title.toLowerCase().includes('rejected')) return 'Dismissed';
  if (status === 'COLLECTED' || status === 'RESOLVED') return 'Resolved';
  if (status === 'DISPATCHED') return 'Dispatched';
  if (isVerified) return 'Verified';
  return 'Pending';
};

const getDisplayCategory = (desc: string, cat?: string) => {
  if (desc.includes('[PILLAR: FURNITURE]'))   return 'Furniture';
  if (desc.includes('[PILLAR: ELECTRONICS]')) return 'Electronics';
  if (desc.includes('[PILLAR: FIXTURES]'))    return 'Fixtures';
  if (desc.includes('[PILLAR: EQUIPMENT]'))   return 'Equipment';
  if (desc.includes('[PILLAR: OTHER]'))       return 'Other';
  return 'Waste/Bin';
};

const STATUS_BADGE: Record<string, string> = {
  Pending:    'bg-amber-50 text-amber-800 border-amber-200',
  Verified:   'bg-emerald-50 text-emerald-800 border-emerald-200',
  Dispatched: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  Resolved:   'bg-sky-50 text-sky-800 border-sky-200',
  Dismissed:  'bg-rose-50 text-rose-800 border-rose-200',
  Expired:    'bg-rose-50 text-rose-600 border-rose-200',
};

const STATUS_LEFT: Record<string, string> = {
  Pending:    'border-l-amber-400',
  Verified:   'border-l-emerald-400',
  Dispatched: 'border-l-indigo-400',
  Resolved:   'border-l-sky-400',
  Dismissed:  'border-l-rose-400',
  Expired:    'border-l-rose-400',
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
  const [localStatusFilter, setLocalStatusFilter] = useState<'All' | 'Pending' | 'Verified' | 'Dispatched' | 'Resolved' | 'Dismissed'>('All');
  const [localCategoryFilter, setLocalCategoryFilter] = useState<string>('All');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const currentStatusFilter = statusFilter ?? localStatusFilter;
  const currentSetStatusFilter = setStatusFilter ?? setLocalStatusFilter;

  const currentCategoryFilter = categoryFilter ?? localCategoryFilter;
  const currentSetCategoryFilter = setCategoryFilter ?? setLocalCategoryFilter;

  const getTimeMs = (r: Report) => {
    if (r.timestamp) {
      let ts = r.timestamp.trim();
      if (ts.includes(' ')) {
        ts = ts.replace(' ', 'T');
      }
      if (!ts.endsWith('Z') && !ts.includes('+') && !ts.slice(10).includes('-')) {
        ts += 'Z';
      }
      const val = new Date(ts).getTime();
      if (!isNaN(val) && val > 0) return val;
    }
    if (r.id && r.id.startsWith('rep-')) {
      const num = parseInt(r.id.replace('rep-', ''), 10);
      if (!isNaN(num)) return num;
    }
    return 0;
  };

  const filtered = personalReports
    .filter(rep => {
      const ds = getDisplayStatus(rep.status, rep.title, rep.isVerified);
      const dc = getDisplayCategory(rep.description, rep.category);
      return (currentStatusFilter === 'All' || ds === currentStatusFilter) && (currentCategoryFilter === 'All' || dc === currentCategoryFilter);
    })
    .sort((a, b) => getTimeMs(b) - getTimeMs(a));

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">

      {/* Header */}
      <div className="bg-gradient-to-br from-white/95 via-white/90 to-[#e0f2ec]/60 border border-white/90 rounded-3xl p-7 shadow-xl shadow-[#00271D]/5 backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00A77C]/40 bg-[#00A77C]/15 px-3.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-[#00A77C]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00A77C] animate-pulse" />
          Ledger Log
        </span>
        <h2 className="mt-2 text-2xl font-heading font-black tracking-tight text-[#00271D]">Activity & Incident History</h2>
        <p className="mt-1 text-xs text-[#00271D]/60 font-medium">All your submitted waste reports and bin recovery requests. Click any card to inspect full details.</p>
      </div>

      {/* Pill filter toggles */}
      <div className="flex flex-wrap gap-2">
        {/* Status pills */}
        {(['All', 'Pending', 'Verified', 'Dispatched', 'Resolved', 'Dismissed'] as const).map(s => (
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
            const ds = getDisplayStatus(rep.status, rep.title, rep.isVerified);
            const dc = getDisplayCategory(rep.description, rep.category);
            const rank = rep.reporterRank || 1;
            const isResolved = rep.status === 'COLLECTED' || rep.status === 'RESOLVED';

            return (
              <div
                key={rep.id}
                onClick={() => setSelectedReport(rep)}
                className={`bg-[#FFFFFF]/90 backdrop-blur-md border border-white/80 border-l-4 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-start gap-4 cursor-pointer ${STATUS_LEFT[ds] || 'border-l-gray-300'}`}
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
                    <p className="truncate text-xs font-extrabold text-[#00271D]">{cleanReportTitle(rep.title)}</p>
                  </div>

                  <p className="text-[10px] text-[#00271D]/60 leading-relaxed line-clamp-1 font-medium">{rep.description.replace(/\[.*?\]/g, '').trim() || rep.description}</p>
                  
                  <div className="flex items-center gap-2 text-[9px] font-bold text-[#00271D]/50">
                    <Clock size={10} />
                    <span>{rep.timestamp}</span>
                    <span>•</span>
                    <MapPin size={10} />
                    <span>{cleanLocationName(rep.locationName)}</span>
                  </div>

                  {/* Points & Verification Status Bar */}
                  <div className="pt-2 border-t border-[#00271D]/10 flex items-center justify-between text-[10px] text-[#00271D]/70 bg-[#00271D]/5 px-3 py-1.5 rounded-xl">
                    <div className="flex items-center gap-1 font-semibold">
                      <Scale size={12} className="text-[#00A77C]" />
                      <span className="flex items-center gap-1">Status: <strong className={`flex items-center gap-1 ${
                        !rep.isVerified && rep.status === 'PENDING'
                          ? 'text-amber-700 font-extrabold'
                          : rep.isVerified && rep.status === 'PENDING'
                          ? 'text-emerald-700 font-extrabold'
                          : rep.status === 'DISPATCHED'
                          ? 'text-indigo-700 font-extrabold'
                          : isResolved
                          ? 'text-sky-700 font-extrabold'
                          : 'text-rose-700 font-extrabold'
                      }`}>
                        {!rep.isVerified && rep.status === 'PENDING' ? (
                          <><Clock size={11} className="text-amber-600" /> Pending Admin Verification</>
                        ) : rep.isVerified && rep.status === 'PENDING' ? (
                          <><CheckCircle2 size={11} className="text-emerald-600" /> {rep.pointsAwardedAt ? (rep.pointsAwarded > 0 ? 'Collected · Points Awarded' : 'Collected · No points awarded') : 'Verified · Awaiting MRF collection'}</>
                        ) : rep.status === 'DISPATCHED' ? (
                          <><Truck size={11} className="text-indigo-600" /> Collector Dispatched — points after collection ({rep.assignedMrfName || 'MRF Staff'})</>
                        ) : isResolved ? (
                          <><CheckCircle2 size={11} className="text-sky-600" /> Collected by MRF · Points Awarded</>
                        ) : (
                          <><XCircle size={11} className="text-rose-600" /> Marked Invalid by Admin</>
                        )}
                      </strong></span>
                    </div>
                    <div>
                      {rep.status === 'DISMISSED' ? (
                        <span className="text-rose-600 font-extrabold text-[10px]">
                          0 pts (Dismissed)
                        </span>
                      ) : rep.pointsAwardedAt ? (
                        rep.pointsAwarded > 0 ? (
                          <span className="text-[#00A77C] font-black text-xs">
                            +{rep.pointsAwarded} PTS AWARDED
                          </span>
                        ) : (
                          <span className="text-gray-500 font-bold text-[10px]">
                            No points awarded
                          </span>
                        )
                      ) : (
                        <span className="text-amber-600 font-extrabold text-[10px]">
                          Pending Admin review
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className={`rounded-full border px-3 py-0.5 text-[8px] font-black uppercase tracking-wider ${STATUS_BADGE[ds] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>{ds}</span>
                  {rep.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setLightboxSrc(rep.imageUrl ?? null)}
                      aria-label="View evidence photo full screen"
                      className="h-10 w-16 overflow-hidden rounded-xl border border-[#00271D]/10 shadow-2xs cursor-zoom-in"
                    >
                      <img src={rep.imageUrl} alt="Evidence" className="h-full w-full object-cover" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── REPORT DETAIL INSPECTION MODAL ── */}
      {selectedReport && (() => {
        const lat = selectedReport.coordinates?.lat || 14.6000;
        const lng = selectedReport.coordinates?.lng || 120.9850;
        const minLat = 14.5975, maxLat = 14.6035, minLng = 120.9815, maxLng = 120.9885;
        const pctY = Math.max(8, Math.min(92, ((maxLat - lat) / (maxLat - minLat)) * 100));
        const pctX = Math.max(8, Math.min(92, ((lng - minLng) / (maxLng - minLng)) * 100));

        const isScattered = selectedReport.isScatteredDebris === true ||
          selectedReport.title.toLowerCase().includes('scattered debris') ||
          selectedReport.locationName.toLowerCase().includes('scattered debris') ||
          selectedReport.description.toLowerCase().includes('[scattered debris pin]');

        return (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
            <div className="bg-white border border-gray-200 rounded-2xl sm:rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl space-y-4 relative my-auto max-h-[92dvh] overflow-y-auto">
              
              <button
                onClick={() => setSelectedReport(null)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer z-20"
              >
                <X size={18} />
              </button>

              <div className="flex items-start gap-3 border-b border-gray-100 pb-3 pr-8">
                <div className="h-11 w-11 rounded-2xl bg-[#00A77C]/15 text-[#00A77C] flex items-center justify-center font-bold shrink-0">
                  <Eye size={22} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#00271D] text-white">
                      ID: {selectedReport.id}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      selectedReport.status === 'DISMISSED'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : selectedReport.isVerified
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-900 border border-amber-200'
                    }`}>
                      {selectedReport.status === 'DISMISSED' ? 'Invalid Report' : selectedReport.isVerified ? 'Verified' : 'Pending Verification'}
                    </span>
                  </div>
                  <h3 className="text-base font-heading font-black text-[#00271D] leading-snug">
                    {cleanReportTitle(selectedReport.title)}
                  </h3>
                </div>
              </div>

              {/* Location Banner */}
              <div className="bg-[#00A77C]/10 border border-[#00A77C]/30 p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-black text-[#00A77C] uppercase tracking-wider block">Target Location</span>
                  <h4 className="text-lg font-heading font-black text-[#00271D] leading-tight mt-0.5">{cleanLocationName(selectedReport.locationName)}</h4>
                  {isScattered && (
                    <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-mono font-bold text-gray-700 bg-white/90 border border-[#00A77C]/30 px-2.5 py-0.5 rounded-md">
                      <Navigation size={10} className="text-[#00A77C]" /> Grid [{lat.toFixed(4)}, {lng.toFixed(4)}]
                    </span>
                  )}
                </div>
                <div className="h-10 w-10 rounded-xl bg-[#00A77C] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <MapPin size={22} />
                </div>
              </div>

              {/* Mini-map if Scattered Debris */}
              {isScattered && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#00271D]">
                    <span className="flex items-center gap-1">
                      <MapIcon size={14} className="text-[#00A77C]" />
                      <span>Pinned Location Map:</span>
                    </span>
                    <span className="text-[10px] font-mono text-gray-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md font-bold flex items-center gap-1">
                      <Navigation size={11} className="text-[#00A77C]" /> Grid [{lat.toFixed(4)}, {lng.toFixed(4)}]
                    </span>
                  </div>

                  <div className="relative w-full h-[200px] rounded-2xl border border-gray-200 bg-[#f8fafc] overflow-hidden shadow-inner flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full opacity-60 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id="light-grid-student-hist" width="24" height="24" patternUnits="userSpaceOnUse">
                          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#CBD5E1" strokeWidth="1" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#light-grid-student-hist)" />
                    </svg>

                    <div style={{ left: `${pctX}%`, top: `${pctY}%` }} className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                      <div className="flex flex-col items-center animate-bounce">
                        <span className="bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg border border-white whitespace-nowrap mb-0.5 flex items-center gap-1">
                          <MapPin size={9} /> Pinned Debris Location
                        </span>
                        <div className="h-9 w-9 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xl border-2 border-white ring-4 ring-rose-400/40">
                          <Target size={18} className="stroke-[2.5]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Dismissed Notice */}
              {selectedReport.status === 'DISMISSED' && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
                  <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-rose-800">This report was marked as invalid</p>
                    <p className="text-xs text-rose-600 mt-0.5">Admin determined this report was false or improper. A warning has been logged to your account.</p>
                  </div>
                </div>
              )}

              {/* Photo Evidence & Description */}
              <div className="space-y-2">
                {selectedReport.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setLightboxSrc(selectedReport.imageUrl ?? null)}
                    className="group relative block w-full rounded-2xl overflow-hidden border border-gray-200 h-44 sm:h-52 bg-gray-100 shadow-inner cursor-zoom-in"
                  >
                    <img src={selectedReport.imageUrl} alt="Waste evidence" className="w-full h-full object-cover" />
                    <span className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-lg bg-black/70 px-2.5 py-1 text-[10px] font-mono text-white backdrop-blur-xs">
                      <Maximize2 size={11} /> Tap to view full screen
                    </span>
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-black/60 p-2.5 text-white">
                        <Maximize2 size={18} />
                      </span>
                    </span>
                  </button>
                )}

                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 text-xs text-gray-800 space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Report Notes:</span>
                  <p className="font-medium leading-relaxed italic text-gray-700">"{selectedReport.description}"</p>
                </div>
              </div>

              {/* Close Button */}
              <div className="pt-2">
                <button
                  onClick={() => setSelectedReport(null)}
                  className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Close Details
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      <PhotoLightbox
        src={lightboxSrc}
        alt="Waste report evidence full view"
        caption="Photo Evidence"
        onClose={() => setLightboxSrc(null)}
      />

    </div>
  );
};
