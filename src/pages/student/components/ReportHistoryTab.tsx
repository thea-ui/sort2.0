import React, { useState, useEffect, useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Clock,
  MapPin,
  AlertTriangle,
  AlertCircle,
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
  Map as MapIcon,
  Maximize2,
  Inbox,
} from 'lucide-react';
import { Report, SystemSettings } from '../../../types';
import {
  cleanReportTitle,
  cleanLocationName,
  getReportTimestampMs,
  parseReportTags,
  stripReportTags,
} from '../../../utils/reportUtils';
import { formatDateTime } from '../../../utils/dateFormat';
import { PhotoLightbox } from '../../../components/common/PhotoLightbox';
import { EvidenceThumbnail } from '../../../components/common/EvidenceImage';
import { ReportLocationMiniMap } from '../../../components/map/ReportLocationMiniMap';
import { useReportPhoto } from '../../../hooks/useReportPhoto';

type DisplayStatus = 'Pending' | 'Verified' | 'Dispatched' | 'Resolved' | 'Dismissed' | 'Expired';
type StatusFilter = 'All' | DisplayStatus;

interface ReportHistoryTabProps {
  personalReports: Report[];
  settings?: SystemSettings;
  CATEGORY_META?: any;
  URGENCY_META?: any;
  statusFilter?: StatusFilter;
  setStatusFilter?: (s: StatusFilter) => void;
  categoryFilter?: string;
  setCategoryFilter?: (c: string) => void;
}

const STATUS_FILTERS: StatusFilter[] = [
  'All',
  'Pending',
  'Verified',
  'Dispatched',
  'Resolved',
  'Dismissed',
  'Expired',
];

const getDisplayStatus = (status: string, title: string, isVerified?: boolean): DisplayStatus => {
  if (status === 'EXPIRED') return 'Expired';
  if (status === 'DISMISSED' || title.toLowerCase().includes('dismissed') || title.toLowerCase().includes('rejected')) {
    return 'Dismissed';
  }
  if (status === 'COLLECTED' || status === 'RESOLVED') return 'Resolved';
  if (status === 'DISPATCHED') return 'Dispatched';
  if (isVerified) return 'Verified';
  return 'Pending';
};

const getDisplayCategory = (desc: string) => {
  if (desc.includes('[PILLAR: FURNITURE]'))   return 'Furniture';
  if (desc.includes('[PILLAR: ELECTRONICS]')) return 'Electronics';
  if (desc.includes('[PILLAR: FIXTURES]'))    return 'Fixtures';
  if (desc.includes('[PILLAR: EQUIPMENT]'))   return 'Equipment';
  if (desc.includes('[PILLAR: OTHER]'))       return 'Other';
  return 'Waste/Bin';
};

const STATUS_META: Record<DisplayStatus, {
  badge: string;
  strip: string;
  text: string;
  Icon: LucideIcon;
}> = {
  Pending: {
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    strip: 'bg-amber-50/60 border-amber-100',
    text: 'text-amber-800',
    Icon: Clock,
  },
  Verified: {
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    strip: 'bg-emerald-50/60 border-emerald-100',
    text: 'text-emerald-800',
    Icon: CheckCircle2,
  },
  Dispatched: {
    badge: 'bg-sky-50 text-sky-800 border-sky-200',
    strip: 'bg-sky-50/60 border-sky-100',
    text: 'text-sky-800',
    Icon: Truck,
  },
  Resolved: {
    badge: 'bg-[var(--primary)]/10 text-[var(--text-strong)] border-[var(--primary)]/20',
    strip: 'bg-[var(--primary)]/[0.04] border-[var(--primary)]/10',
    text: 'text-[var(--text-strong)]',
    Icon: CheckCircle2,
  },
  Dismissed: {
    badge: 'bg-rose-50 text-rose-800 border-rose-200',
    strip: 'bg-rose-50/60 border-rose-100',
    text: 'text-rose-800',
    Icon: XCircle,
  },
  Expired: {
    badge: 'bg-rose-50 text-rose-600 border-rose-200',
    strip: 'bg-rose-50/60 border-rose-100',
    text: 'text-rose-700',
    Icon: AlertTriangle,
  },
};

const CAT_ICON: Record<string, React.ComponentType<any>> = {
  'Waste/Bin': Recycle, Furniture: Armchair, Electronics: Monitor,
  Fixtures: Zap, Equipment: Wrench, Other: FileText,
};

const getStatusLabel = (ds: DisplayStatus, rep: Report): string => {
  switch (ds) {
    case 'Pending':
      return 'Awaiting admin verification';
    case 'Verified':
      return 'Verified — awaiting MRF collection';
    case 'Dispatched':
      return rep.assignedMrfName ? `MRF dispatched — ${rep.assignedMrfName}` : 'MRF collector dispatched';
    case 'Resolved':
      return rep.weightCollected && rep.weightCollected > 0
        ? `Collected by MRF — ${rep.weightCollected} kg recovered`
        : 'Collected by MRF';
    case 'Dismissed':
      return 'Marked invalid by admin';
    case 'Expired':
      return 'Expired — closed without collection';
  }
};

function getReportTimeMs(r: Report): number {
  const parsed = getReportTimestampMs(r.timestamp);
  if (parsed > 0) return parsed;
  if (r.id && r.id.startsWith('rep-')) {
    const num = parseInt(r.id.replace('rep-', ''), 10);
    if (!isNaN(num)) return num;
  }
  return 0;
}

function getMaterials(description?: string): string[] {
  const materials = parseReportTags(description)['materials'];
  if (!materials) return [];
  return materials.split(',').map((m) => m.trim()).filter(Boolean);
}

const PointsChip: React.FC<{ report: Report; status: DisplayStatus }> = ({ report, status }) => {
  if (status === 'Dismissed' || status === 'Expired') {
    return <span className="text-[10px] font-extrabold text-rose-500/80">0 pts</span>;
  }
  if (report.pointsAwardedAt) {
    return report.pointsAwarded > 0 ? (
      <span className="rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-2 py-0.5 font-mono text-[10px] font-black tabular-nums text-[var(--accent)]">
        +{report.pointsAwarded} pts
      </span>
    ) : (
      <span className="text-[10px] font-bold text-[var(--text-strong)]/40">No points awarded</span>
    );
  }
  return <span className="text-[10px] font-bold text-[var(--text-strong)]/35">Points pending</span>;
};

const MaterialChips: React.FC<{ materials: string[]; max?: number }> = ({ materials, max = 3 }) => (
  <div className="flex flex-wrap items-center gap-1">
    {materials.slice(0, max).map((m) => (
      <span
        key={m}
        className="rounded-md border border-[var(--primary)]/10 bg-[var(--primary)]/[0.04] px-1.5 py-0.5 text-[9px] font-bold text-[var(--text-strong)]/70"
      >
        {m}
      </span>
    ))}
    {materials.length > max && (
      <span className="text-[9px] font-bold text-[var(--text-strong)]/40">+{materials.length - max}</span>
    )}
  </div>
);

export const ReportHistoryTab: React.FC<ReportHistoryTabProps> = ({
  personalReports,
  statusFilter,
  setStatusFilter,
  categoryFilter,
}) => {
  const [localStatusFilter, setLocalStatusFilter] = useState<StatusFilter>('All');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const selectedPhotoSrc = useReportPhoto(selectedReport?.photoUrl, selectedReport?.imageUrl);

  // The inline detail modal has no Dialog primitive: support Escape like the
  // rest of the app so keyboard users can dismiss it.
  useEffect(() => {
    if (!selectedReport) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedReport(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedReport]);

  const currentStatusFilter = statusFilter ?? localStatusFilter;
  const currentSetStatusFilter = setStatusFilter ?? setLocalStatusFilter;

  const currentCategoryFilter = categoryFilter ?? 'All';

  const filtered = useMemo(
    () =>
      personalReports
        .filter((rep) => {
          const ds = getDisplayStatus(rep.status, rep.title, rep.isVerified);
          const dc = getDisplayCategory(rep.description);
          return (
            (currentStatusFilter === 'All' || ds === currentStatusFilter) &&
            (currentCategoryFilter === 'All' || dc === currentCategoryFilter)
          );
        })
        .sort((a, b) => getReportTimeMs(b) - getReportTimeMs(a)),
    [personalReports, currentStatusFilter, currentCategoryFilter],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      All: 0, Pending: 0, Verified: 0, Dispatched: 0, Resolved: 0, Dismissed: 0, Expired: 0,
    };
    personalReports.forEach((rep) => {
      if (currentCategoryFilter !== 'All' && getDisplayCategory(rep.description) !== currentCategoryFilter) {
        return;
      }
      counts.All += 1;
      counts[getDisplayStatus(rep.status, rep.title, rep.isVerified)] += 1;
    });
    return counts;
  }, [personalReports, currentCategoryFilter]);

  const hasAnyReports = personalReports.length > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">

      {/* Header */}
      <div className="bg-gradient-to-br from-white/95 via-white/90 to-[var(--primary)]/5 border border-white/90 rounded-3xl p-5 sm:p-7 shadow-xl shadow-[var(--primary)]/5 backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/15 px-3.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-[var(--accent)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
          Ledger Log
        </span>
        <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-heading font-black tracking-tight text-[var(--text-strong)]">
              Activity &amp; Incident History
            </h2>
            <p className="mt-1 text-xs font-medium text-[var(--text-strong)]/60">
              Every report you&rsquo;ve filed. Tap a card to inspect the full record.
            </p>
          </div>
          <p className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-strong)]/35">
            {personalReports.length} {personalReports.length === 1 ? 'record' : 'records'}
          </p>
        </div>
      </div>

      {/* Status filter pills */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:px-0">
        {STATUS_FILTERS.map((s) => {
          const active = currentStatusFilter === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => currentSetStatusFilter(s)}
              className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[10px] font-extrabold transition-all active:scale-[0.97] ${
                active
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/25'
                  : 'border-[var(--primary)]/15 bg-white/90 text-[var(--text-strong)]/65 hover:border-[var(--accent)]/60 hover:text-[var(--text-strong)]'
              }`}
            >
              {s}
              <span
                className={`rounded-full px-1.5 py-px font-mono text-[9px] font-bold tabular-nums ${
                  active ? 'bg-white/25 text-white' : 'bg-[var(--primary)]/10 text-[var(--text-strong)]/50'
                }`}
              >
                {statusCounts[s]}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-white/80 p-10 sm:p-14 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
            <Inbox size={24} />
          </div>
          <h3 className="mt-4 text-sm font-extrabold text-[var(--text-strong)]">
            {hasAnyReports ? 'No reports match this filter' : 'No reports yet'}
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-xs font-medium leading-relaxed text-[var(--text-strong)]/50">
            {hasAnyReports
              ? 'Try a different status filter to see the rest of your ledger.'
              : 'Submit your first waste report from the Report tab and it will appear here.'}
          </p>
          {hasAnyReports && currentStatusFilter !== 'All' && (
            <button
              type="button"
              onClick={() => currentSetStatusFilter('All')}
              className="mt-4 cursor-pointer rounded-full border border-[var(--primary)]/15 bg-white px-4 py-1.5 text-[10px] font-extrabold text-[var(--text-strong)]/70 transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              Show all reports
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((rep) => {
            const ds = getDisplayStatus(rep.status, rep.title, rep.isVerified);
            const dc = getDisplayCategory(rep.description);
            const meta = STATUS_META[ds];
            const StatusIcon = meta.Icon;
            const IconComp = CAT_ICON[dc] || FileText;
            const freeText = stripReportTags(rep.description);
            const materials = getMaterials(rep.description);
            const timeMs = getReportTimeMs(rep);
            const title = cleanReportTitle(rep.title);

            return (
              <div
                key={rep.id}
                role="button"
                tabIndex={0}
                aria-label={`Open details for ${title}`}
                onClick={() => setSelectedReport(rep)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedReport(rep);
                  }
                }}
                className="group cursor-pointer rounded-2xl border border-[var(--primary)]/10 bg-white/95 p-4 shadow-xs backdrop-blur-sm outline-none transition-all hover:-translate-y-0.5 hover:border-[var(--accent)]/30 hover:shadow-lg focus-visible:border-[var(--accent)] focus-visible:ring-3 focus-visible:ring-[var(--accent)]/25 sm:p-5"
              >
                <div className="flex items-start gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/5 text-[var(--accent)]">
                    <IconComp size={20} strokeWidth={2.2} />
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="min-w-0 line-clamp-2 text-[13px] font-extrabold tracking-tight text-[var(--text-strong)]">
                        {title}
                      </h3>
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider ${meta.badge}`}
                      >
                        {ds}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] font-bold text-[var(--text-strong)]/50">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} />
                        <time className="font-mono" dateTime={rep.timestamp}>
                          {timeMs > 0 ? formatDateTime(timeMs) : 'Unknown time'}
                        </time>
                      </span>
                      <span className="text-[var(--text-strong)]/20">•</span>
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <MapPin size={11} className="shrink-0" />
                        <span className="truncate">{cleanLocationName(rep.locationName)}</span>
                      </span>
                    </div>

                    {freeText && (
                      <p className="line-clamp-2 text-[11px] font-medium leading-relaxed text-[var(--text-strong)]/60">
                        {freeText}
                      </p>
                    )}

                    {materials.length > 0 && <MaterialChips materials={materials} />}

                    <div
                      className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-xl border px-3 py-2 ${meta.strip}`}
                    >
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold ${meta.text}`}>
                        <StatusIcon size={12} />
                        {getStatusLabel(ds, rep)}
                      </span>
                      <PointsChip report={rep} status={ds} />
                    </div>
                  </div>

                  <EvidenceThumbnail
                    photoUrl={rep.photoUrl}
                    imageUrl={rep.imageUrl}
                    alt="Evidence"
                    onOpen={setLightboxSrc}
                    className="h-12 w-12 shrink-0 cursor-zoom-in overflow-hidden rounded-xl border border-[var(--primary)]/10 shadow-2xs transition-transform hover:scale-[1.04] sm:h-14 sm:w-14"
                  />
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
        const ds = getDisplayStatus(selectedReport.status, selectedReport.title, selectedReport.isVerified);
        const meta = STATUS_META[ds];
        const freeText = stripReportTags(selectedReport.description);
        const materials = getMaterials(selectedReport.description);

        const isScattered = selectedReport.isScatteredDebris === true ||
          selectedReport.title.toLowerCase().includes('scattered debris') ||
          selectedReport.locationName.toLowerCase().includes('scattered debris') ||
          selectedReport.description.toLowerCase().includes('[scattered debris pin]');

        return (
          <div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-label="Report details"
          >
            <div className="bg-white border border-gray-200 rounded-2xl sm:rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl space-y-4 relative my-auto max-h-[92dvh] overflow-y-auto">

              <button
                onClick={() => setSelectedReport(null)}
                aria-label="Close report details"
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer z-20"
              >
                <X size={18} />
              </button>

              <div className="flex items-start gap-3 border-b border-gray-100 pb-3 pr-8">
                <div className="h-11 w-11 rounded-2xl bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center font-bold shrink-0">
                  <Eye size={22} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span
                      className="max-w-[170px] truncate rounded-full bg-[var(--primary)] px-2 py-0.5 font-mono text-[9px] font-bold text-white"
                      title={selectedReport.id}
                    >
                      #{selectedReport.id.slice(0, 8)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${meta.badge}`}>
                      {ds}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase border border-[var(--primary)]/15 bg-[var(--primary)]/[0.04] text-[var(--text-strong)]/60">
                      {getDisplayCategory(selectedReport.description)}
                    </span>
                  </div>
                  <h3 className="text-base font-heading font-black text-[var(--text-strong)] leading-snug">
                    {cleanReportTitle(selectedReport.title)}
                  </h3>
                </div>
              </div>

              {/* Location Banner */}
              <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-wider block">Target Location</span>
                  <h4 className="text-lg font-heading font-black text-[var(--text-strong)] leading-tight mt-0.5">{cleanLocationName(selectedReport.locationName)}</h4>
                  {isScattered && (
                    <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-mono font-bold text-gray-700 bg-white/90 border border-[var(--accent)]/30 px-2.5 py-0.5 rounded-md">
                      <Navigation size={10} className="text-[var(--accent)]" /> Grid [{lat.toFixed(4)}, {lng.toFixed(4)}]
                    </span>
                  )}
                </div>
                <div className="h-10 w-10 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <MapPin size={22} />
                </div>
              </div>

              {/* Mini-map if Scattered Debris */}
              {isScattered && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-strong)]">
                    <span className="flex items-center gap-1">
                      <MapIcon size={14} className="text-[var(--accent)]" />
                      <span>Pinned Location Map:</span>
                    </span>
                    <span className="text-[10px] font-mono text-gray-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md font-bold flex items-center gap-1">
                      <Navigation size={11} className="text-[var(--accent)]" /> Grid [{lat.toFixed(4)}, {lng.toFixed(4)}]
                    </span>
                  </div>

                  <ReportLocationMiniMap lat={lat} lng={lng} heightClassName="h-[200px]" />
                </div>
              )}

              {/* Dismissed / Expired Notice */}
              {(ds === 'Dismissed' || ds === 'Expired') && (
                <div
                  className={`p-4 rounded-2xl flex items-start gap-3 ${
                    ds === 'Dismissed' ? 'bg-rose-50 border border-rose-200' : 'bg-amber-50 border border-amber-200'
                  }`}
                >
                  {ds === 'Dismissed' ? (
                    <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`text-sm font-bold ${ds === 'Dismissed' ? 'text-rose-800' : 'text-amber-800'}`}>
                      {ds === 'Dismissed' ? 'This report was marked as invalid' : 'This report expired before collection'}
                    </p>
                    <p className={`text-xs mt-0.5 ${ds === 'Dismissed' ? 'text-rose-600' : 'text-amber-700'}`}>
                      {ds === 'Dismissed'
                        ? 'Admin determined this report was false or improper. A warning has been logged to your account.'
                        : 'No MRF collection happened within the reporting window. Submit a fresh report if the issue persists.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Photo Evidence & Notes */}
              <div className="space-y-2">
                {selectedPhotoSrc && (
                  <button
                    type="button"
                    onClick={() => setLightboxSrc(selectedPhotoSrc)}
                    className="group relative block w-full rounded-2xl overflow-hidden border border-gray-200 h-44 sm:h-52 bg-gray-100 shadow-inner cursor-zoom-in"
                  >
                    <img src={selectedPhotoSrc} alt="Waste evidence" className="w-full h-full object-cover" />
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

                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Report Notes</span>
                  <p className="text-xs text-gray-700 font-medium leading-relaxed italic">
                    {freeText ? `\u201C${freeText}\u201D` : 'No additional notes were provided.'}
                  </p>
                  {materials.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {materials.map((m) => (
                        <span
                          key={m}
                          className="rounded-md border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--accent)]"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
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
