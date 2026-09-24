import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  Clock,
  Camera,
  Package,
  Tag,
  MapPin,
  AlertTriangle,
  ShieldAlert,
  Send,
  FileText,
  Maximize2,
} from 'lucide-react';
import { InfrastructurePillar } from './teacherReportData';
import { PhotoLightbox } from '../../../components/common/PhotoLightbox';

export interface SubmittedReportDetails {
  title: string;
  category: InfrastructurePillar;
  location: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  observation: string;
  notes: string;
  imageUrl?: string | null;
  ticketId: string;
  timestamp: string;
}

interface TeacherSubmitSuccessViewProps {
  lastSubmittedReport: SubmittedReportDetails | null;
  PILLAR_META: Record<InfrastructurePillar, { label: string; icon?: React.ComponentType<any>; [key: string]: any }>;
  onReset: () => void;
  onViewHistory?: () => void;
}

export const TeacherSubmitSuccessView: React.FC<TeacherSubmitSuccessViewProps> = ({
  lastSubmittedReport,
  PILLAR_META,
  onReset,
  onViewHistory,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [showPhotoFull, setShowPhotoFull] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onReset();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onReset]);

  const isWaste = lastSubmittedReport?.category === 'waste';
  const pillarMeta = lastSubmittedReport ? PILLAR_META[lastSubmittedReport.category] : null;
  const catLabel = pillarMeta?.label || 'Asset / Waste';

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-12 pt-4">
      <div className="bg-white/95 backdrop-blur-md border border-white/80 rounded-3xl p-8 shadow-xl text-center space-y-6">
        {/* Static Success Icon & Status Pill */}
        <div className="flex flex-col items-center gap-3">
          <div className="h-20 w-20 rounded-full bg-[var(--accent)]/15 flex items-center justify-center text-[var(--accent)] ring-8 ring-[var(--accent)]/10 shadow-inner">
            <CheckCircle size={44} strokeWidth={2.5} />
          </div>
          <div className="bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[var(--accent)] px-3.5 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-xs uppercase tracking-wider">
            <Clock size={13} /> Ticket Logged & Pending Review · Auto-dismiss in {secondsLeft}s
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-heading font-black text-[var(--text-strong)]">Report Submitted Successfully!</h2>
          <p className="text-xs text-[var(--text-strong)]/70 font-medium mt-1 max-w-md mx-auto">
            Your {catLabel.toLowerCase()} report has been registered in the system. MRF operations center and facility managers have been notified for inspection and action.
          </p>
        </div>

        {/* Submitted Summary Details Card */}
        <div className="p-6 bg-[var(--background)]/80 border border-[var(--primary)]/10 rounded-2xl text-left space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[var(--primary)]/10 pb-3">
            <p className="text-[10px] font-extrabold text-[var(--text-strong)]/50 uppercase tracking-wider">Ticket Summary</p>
            <span className="text-xs font-black text-[var(--accent)] bg-white px-2.5 py-0.5 rounded-md border border-[var(--accent)]/20 shadow-2xs">
              {lastSubmittedReport?.ticketId || '#TKT-849201'}
            </span>
          </div>

          {/* Photo preview if present */}
          {lastSubmittedReport?.imageUrl && (
            <button
              type="button"
              onClick={() => setShowPhotoFull(true)}
              aria-label="View submitted photo full screen"
              className="group relative block h-44 w-full overflow-hidden rounded-xl border border-gray-200 shadow-inner cursor-zoom-in"
            >
              <img src={lastSubmittedReport.imageUrl} alt="Submitted evidence" className="h-full w-full object-cover" />
              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] px-2.5 py-0.5 rounded-md font-semibold flex items-center gap-1.5">
                <Camera size={12} /> Photo Evidence Attached
              </div>
              <div className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-90 transition-all group-hover:bg-black/80">
                <Maximize2 size={13} />
              </div>
            </button>
          )}

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[var(--text-strong)]/50 font-medium block text-[10px]">Report Title / Item</span>
              <span className="font-bold text-[var(--text-strong)] flex items-center gap-1 mt-0.5">
                <Package size={13} className="text-[var(--accent)]" /> {lastSubmittedReport?.title || 'Maintenance Request'}
              </span>
            </div>

            <div>
              <span className="text-[var(--text-strong)]/50 font-medium block text-[10px]">Category</span>
              <span className="font-bold text-[var(--accent)] flex items-center gap-1 mt-0.5">
                <Tag size={13} /> {catLabel}
              </span>
            </div>

            <div>
              <span className="text-[var(--text-strong)]/50 font-medium block text-[10px]">Location</span>
              <span className="font-bold text-[var(--text-strong)] flex items-center gap-1 mt-0.5">
                <MapPin size={13} className="text-[var(--accent)]" /> {lastSubmittedReport?.location || 'Campus'}
              </span>
            </div>

            <div>
              <span className="text-[var(--text-strong)]/50 font-medium block text-[10px]">Urgency Level</span>
              <span className="font-bold text-[var(--text-strong)] flex items-center gap-1 mt-0.5">
                <AlertTriangle size={13} className={lastSubmittedReport?.urgency === 'HIGH' ? 'text-rose-500' : 'text-[var(--accent)]'} />
                <span className={lastSubmittedReport?.urgency === 'HIGH' ? 'text-rose-600 font-extrabold' : ''}>
                  {lastSubmittedReport?.urgency || 'MEDIUM'}
                </span>
              </span>
            </div>

            {!isWaste && lastSubmittedReport?.observation && (
              <div>
                <span className="text-[var(--text-strong)]/50 font-medium block text-[10px]">Asset Condition</span>
                <span className="font-bold text-[var(--text-strong)] flex items-center gap-1 mt-0.5">
                  <ShieldAlert size={13} className="text-amber-500" /> {lastSubmittedReport.observation}
                </span>
              </div>
            )}

            <div>
              <span className="text-[var(--text-strong)]/50 font-medium block text-[10px]">Date & Time</span>
              <span className="font-medium text-[var(--text-strong)]/80 flex items-center gap-1 mt-0.5">
                <Clock size={13} className="text-gray-400" /> {lastSubmittedReport?.timestamp || 'Just now'}
              </span>
            </div>
          </div>

          {lastSubmittedReport?.notes && (
            <div className="pt-2 border-t border-[var(--primary)]/10">
              <span className="text-[var(--text-strong)]/50 font-medium block text-[10px]">Notes</span>
              <p className="text-xs text-[var(--text-strong)]/80 italic mt-0.5">"{lastSubmittedReport.notes}"</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={onReset}
            className="flex-1 py-3.5 px-5 rounded-2xl bg-[var(--accent)] text-white font-bold text-xs shadow-md hover:bg-[var(--accent-dark)] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Send size={15} />
            <span>Submit Another Report</span>
          </button>

          {onViewHistory && (
            <button
              type="button"
              onClick={onViewHistory}
              className="flex-1 py-3.5 px-5 rounded-2xl border border-[var(--primary)]/20 bg-white text-[var(--text-strong)] font-bold text-xs hover:bg-gray-50 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <FileText size={15} />
              <span>View Report History</span>
            </button>
          )}
        </div>
      </div>

      <PhotoLightbox
        src={showPhotoFull ? lastSubmittedReport?.imageUrl ?? null : null}
        alt="Submitted evidence full view"
        caption="Photo Evidence"
        onClose={() => setShowPhotoFull(false)}
      />
    </div>
  );
};
