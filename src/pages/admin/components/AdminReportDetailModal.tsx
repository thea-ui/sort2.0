import React, { useState } from 'react';
import {
  Eye,
  X,
  CheckCircle2,
  AlertOctagon,
  Clock,
  User,
  Award,
  MapPin,
  Navigation,
  Package,
  Target,
  AlertTriangle,
  Map as MapIcon,
  Maximize2,
  Send,
} from 'lucide-react';
import { Report } from '../../../types';
import { cleanReportTitle, cleanLocationName } from '../../../utils/reportUtils';
import { PhotoLightbox } from '../../../components/common/PhotoLightbox';
import { ModalPortal } from '../../../components/common/ModalPortal';

interface AdminReportDetailModalProps {
  report: Report;
  onClose: () => void;
  onVerify: (report: Report) => void;
  onReject: (report: Report) => void;
  onDispatch: (report: Report) => void;
}

export const AdminReportDetailModal: React.FC<AdminReportDetailModalProps> = ({
  report,
  onClose,
  onVerify,
  onReject,
  onDispatch,
}) => {
  const [showPhotoFull, setShowPhotoFull] = useState(false);

  const minLat = 14.5975, maxLat = 14.6035, minLng = 120.9815, maxLng = 120.9885;
  const lat = report.coordinates?.lat || 14.6000;
  const lng = report.coordinates?.lng || 120.9850;
  const pctY = Math.max(8, Math.min(92, ((maxLat - lat) / (maxLat - minLat)) * 100));
  const pctX = Math.max(8, Math.min(92, ((lng - minLng) / (maxLng - minLng)) * 100));

  const isScattered = report.isScatteredDebris === true ||
    (
      (report.title.toLowerCase().includes('scattered debris') ||
        report.locationName.toLowerCase().includes('scattered debris') ||
        report.description.toLowerCase().includes('[scattered debris pin]')) &&
      !report.description.toLowerCase().includes('[associated bin id') &&
      !report.description.toLowerCase().includes('[location:')
    );

  const isFacultyReporter = (
    report.reporterRole === 'teacher' ||
    report.reporterRole === 'admin' ||
    report.reporterRole === 'mrf'
  );

  const formatTimestamp = (ts: string) => {
    if (!ts) return 'Just now';
    try {
      const dateObj = new Date(ts);
      if (isNaN(dateObj.getTime())) return ts.substring(0, 16).replace('T', ' ');
      return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) + ' · ' + dateObj.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return ts.substring(0, 16).replace('T', ' ');
    }
  };

  return (
    <ModalPortal>
    <div
      data-testid="modal-overlay"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in"
    >
      <div
        data-testid="modal-panel"
        className="bg-white border border-gray-200 rounded-2xl sm:rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl space-y-4 relative my-auto max-h-[92dvh] overflow-y-auto"
      >

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close report details"
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer z-20"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3 border-b border-gray-100 pb-3 pr-8">
          <div className="h-11 w-11 rounded-2xl bg-[#00A77C]/15 text-[#00A77C] flex items-center justify-center font-bold shrink-0">
            <Eye size={22} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#00271D] text-white">
                ID: {report.id}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                report.status === 'DISMISSED'
                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                  : report.isVerified
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-100 text-amber-900 border border-amber-200'
              }`}>
                {report.status === 'DISMISSED'
                  ? '✕ Dismissed / Flagged Fake'
                  : report.isVerified
                    ? '✓ Verified'
                    : '⏳ Pending Verification'}
              </span>
              {isScattered && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-0.5">
                  <MapPin size={9} /> Scattered Debris
                </span>
              )}
            </div>
            <h3 className="text-base font-heading font-black text-[#00271D] leading-snug">
              {cleanReportTitle(report.title)}
            </h3>
          </div>
        </div>

        {/* Prominent High-Visibility Campus Location Banner */}
        <div className="bg-[#00A77C]/10 border border-[#00A77C]/30 p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-black text-[#00A77C] uppercase tracking-wider block">Target Campus Location</span>
            <h4 className="text-lg font-heading font-black text-[#00271D] leading-tight mt-0.5">{cleanLocationName(report.locationName)}</h4>
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

        {/* Reporter Details Card */}
        <div className={`bg-[#F9F3F0] p-3.5 rounded-2xl border border-[#00271D]/10 grid grid-cols-1 gap-3 text-xs ${isFacultyReporter ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Reporter Account</span>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="font-extrabold text-[#00271D] flex items-center gap-1.5 text-sm">
                <User size={15} className="text-[#00A77C]" /> {report.reporterName}
              </span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black uppercase border border-emerald-200">
                {report.reporterRole || 'Student'}
              </span>
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Date & Time Submitted</span>
            <span className="font-bold text-[#00271D] flex items-center gap-1.5 mt-1 text-xs">
              <Clock size={14} className="text-[#00A77C]" />
              {formatTimestamp(report.timestamp)}
            </span>
          </div>
          {!isFacultyReporter && (
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Points Earned</span>
              <span className={`font-extrabold flex items-center gap-1.5 mt-1 text-sm ${
                report.status === 'DISMISSED'
                  ? 'text-rose-600'
                  : report.pointsAwardedAt
                    ? (report.pointsAwarded > 0 ? 'text-[#00A77C]' : 'text-gray-500')
                    : 'text-gray-400'
              }`}>
                <Award size={14} className={
                  report.status === 'DISMISSED'
                    ? 'text-rose-400'
                    : report.pointsAwardedAt && report.pointsAwarded > 0
                      ? 'text-[#C69B26]'
                      : 'text-gray-300'
                } />
                {report.status === 'DISMISSED'
                  ? '0 pts (Report Dismissed)'
                  : report.pointsAwardedAt
                    ? (report.pointsAwarded > 0 ? `+${report.pointsAwarded} pts` : 'No points awarded')
                    : (report.isVerified ? 'Awaiting MRF collection' : 'Pending verification')}
                {report.reporterRank != null && (
                  <span className="text-[9px] font-bold text-[#C69B26] bg-[#C69B26]/10 px-1.5 py-0.5 rounded-full">
                    Rank #{report.reporterRank}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Interactive Mini-Map Preview Card (Rendered ONLY when Scattered Trash is reported) */}
        {isScattered && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#00271D]">
              <span className="flex items-center gap-1">
                <MapIcon size={14} className="text-[#00A77C]" />
                <span>Scattered Debris Pinned Location Map:</span>
              </span>
              <span className="text-[10px] font-mono text-gray-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                <Navigation size={11} className="text-[#00A77C]" /> Grid [{lat.toFixed(4)}, {lng.toFixed(4)}]
              </span>
            </div>

            <div className="relative w-full h-[220px] rounded-2xl border border-gray-200 bg-[#f8fafc] overflow-hidden shadow-inner flex items-center justify-center">
              {/* SVG Grid Canvas Overlay */}
              <svg className="absolute inset-0 w-full h-full opacity-60 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="light-grid-inspection" width="24" height="24" patternUnits="userSpaceOnUse">
                    <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#CBD5E1" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#light-grid-inspection)" />
                <rect x="15%" y="10%" width="20%" height="15%" rx="6" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                <text x="25%" y="19%" fill="#475569" fontSize="9" fontWeight="bold" textAnchor="middle">Sports Gym</text>

                <rect x="65%" y="12%" width="22%" height="18%" rx="6" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                <text x="76%" y="22%" fill="#475569" fontSize="9" fontWeight="bold" textAnchor="middle">Science Hall</text>

                <circle cx="50%" cy="50%" r="28" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                <text x="50%" y="51%" fill="#475569" fontSize="9" fontWeight="bold" textAnchor="middle">Quad</text>

                <rect x="10%" y="70%" width="25%" height="18%" rx="6" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                <text x="22%" y="81%" fill="#475569" fontSize="9" fontWeight="bold" textAnchor="middle">Chemistry Lab</text>

                <rect x="60%" y="72%" width="28%" height="18%" rx="6" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                <text x="74%" y="83%" fill="#475569" fontSize="9" fontWeight="bold" textAnchor="middle">Main Library</text>
              </svg>

              {/* Pinned Location Marker */}
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

              {/* Scattered Debris Banner Overlay */}
              <div className="absolute top-2 left-2 right-2 bg-rose-500/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-[10px] font-bold border border-rose-400 shadow-md flex items-center justify-between z-30">
                <span className="flex items-center gap-1">
                  <AlertTriangle size={12} /> Scattered Debris Report (No Trash Cans)
                </span>
                <span className="font-mono text-[9px] bg-black/30 px-2 py-0.5 rounded-md font-bold">
                  Grid [{lat.toFixed(4)}, {lng.toFixed(4)}]
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Photo Evidence & Report Description Card */}
        <div className="space-y-2">
          {report.imageUrl && (
            <button
              type="button"
              onClick={() => setShowPhotoFull(true)}
              className="group relative block w-full rounded-2xl overflow-hidden border border-gray-200 h-44 sm:h-52 bg-gray-100 shadow-inner cursor-zoom-in"
            >
              <img src={report.imageUrl} alt="Waste report evidence" className="w-full h-full object-cover" />
              <span className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-xs text-white text-[10px] px-2.5 py-1 rounded-lg font-mono flex items-center gap-1.5">
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
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Report Notes & Description:</span>
            <p className="font-medium leading-relaxed italic text-gray-700">"{report.description}"</p>
          </div>
        </div>

        {/* MRF Staff Collection Summary (if collected) */}
        {(report.status === 'COLLECTED' || report.status === 'RESOLVED') && (
          <div className="p-4 rounded-2xl bg-indigo-50/90 border border-indigo-200 text-indigo-950 space-y-2 text-xs">
            <div className="flex items-center justify-between font-extrabold text-indigo-900">
              <span className="flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                <Package size={14} className="text-indigo-600" /> MRF Collection Report
              </span>
              <span className="text-[10px] bg-indigo-100 px-2.5 py-0.5 rounded-full text-indigo-800 font-bold">
                Collected by: {report.assignedMrfName || 'MRF Staff'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {report.weightCollected !== undefined && report.weightCollected !== null && (
                <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">Payload Weight</span>
                  <span className="font-black text-[#00A77C] text-sm">{report.weightCollected} kg</span>
                </div>
              )}
              {report.collectedOutcome && (
                <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">Outcome</span>
                  <span className="font-extrabold text-indigo-900 text-xs">{report.collectedOutcome}</span>
                </div>
              )}
            </div>
            {report.completionNotes && (
              <div className="bg-white p-2.5 rounded-xl border border-indigo-100 text-[11px] text-slate-700">
                <span className="font-bold text-slate-900 block mb-0.5">Collector Staff Notes:</span>
                <p className="italic">"{report.completionNotes}"</p>
              </div>
            )}
          </div>
        )}

        {/* Modal Verification Actions */}
        <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row gap-3 z-10">
          {report.status === 'EXPIRED' ? (
            <div className="w-full py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold text-center flex items-center justify-center gap-1.5">
              <Clock size={16} /> Expired — Cleared at 6 PM daily reset
            </div>
          ) : report.status === 'DISMISSED' ? (
            <div className="w-full py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold text-center flex items-center justify-center gap-1.5">
              <AlertOctagon size={16} /> Report Dismissed by Admin
            </div>
          ) : !report.isVerified ? (
            <>
              <button
                onClick={() => onVerify(report)}
                className="flex-1 py-3 rounded-xl bg-[#00A77C] hover:bg-[#008f6a] text-white text-xs font-bold shadow-md shadow-[#00A77C]/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 size={15} /> Confirm & Verify Report
              </button>

              <button
                onClick={() => onReject(report)}
                className="py-3 px-4 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <AlertOctagon size={15} /> Mark Fake / Warning
              </button>
            </>
          ) : report.status === 'PENDING' ? (
            <div className="w-full space-y-2">
              <div className="w-full py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                <CheckCircle2 size={16} /> {isFacultyReporter ? 'Verified by Admin' : 'Verified by Admin · Points Awarded to Reporter'}
              </div>
              <button
                onClick={() => onDispatch(report)}
                className="w-full py-3 rounded-xl bg-[#1D61E8] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send size={15} /> Dispatch Collector Staff
              </button>
            </div>
          ) : (
            <div className="w-full py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold text-center flex items-center justify-center gap-1.5">
              <CheckCircle2 size={16} /> Report Verified & Handled ({report.status})
            </div>
          )}
        </div>
      </div>

      <PhotoLightbox
        src={showPhotoFull ? report.imageUrl ?? null : null}
        alt="Waste report evidence full view"
        caption="Photo Evidence"
        onClose={() => setShowPhotoFull(false)}
      />
    </div>
    </ModalPortal>
  );
};
