import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  Clock,
  Camera,
  Package,
  Tag,
  MapPin,
  AlertTriangle,
  Send,
  FileText,
} from 'lucide-react';
import { StudentSubmittedReportDetails } from '../StudentDashboard';
import { WasteCategory } from '../../../types';

interface StudentSubmitSuccessViewProps {
  lastSubmittedReport?: StudentSubmittedReportDetails | null;
  category: WasteCategory;
  reportTitle?: string;
  locationName: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  onReset: () => void;
  onViewHistory?: () => void;
}

export const StudentSubmitSuccessView: React.FC<StudentSubmitSuccessViewProps> = ({
  lastSubmittedReport,
  category,
  reportTitle,
  locationName,
  urgency,
  onReset,
  onViewHistory,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(30);

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

  const formattedCat = lastSubmittedReport?.category
    ? lastSubmittedReport.category === 'BIODEGRADABLE'
      ? 'Biodegradable'
      : lastSubmittedReport.category === 'NON_BIODEGRADABLE'
      ? 'Non-Biodegradable'
      : 'Recyclable'
    : category === 'BIODEGRADABLE'
    ? 'Biodegradable'
    : category === 'NON_BIODEGRADABLE'
    ? 'Non-Biodegradable'
    : 'Recyclable';

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-12 pt-4">
      <div className="bg-white/95 backdrop-blur-md border border-white/80 rounded-3xl p-8 shadow-xl text-center space-y-6">
        
        {/* Static Success Icon & Status Pill */}
        <div className="flex flex-col items-center gap-3">
          <div className="h-20 w-20 rounded-full bg-[#00A77C]/15 flex items-center justify-center text-[#00A77C] ring-8 ring-[#00A77C]/10 shadow-inner">
            <CheckCircle size={44} strokeWidth={2.5} />
          </div>
          <div className="bg-[#00A77C]/15 border border-[#00A77C]/30 text-[#00A77C] px-3.5 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-xs uppercase tracking-wider">
            <Clock size={13} /> Ticket Logged & Pending Review · Auto-dismiss in {secondsLeft}s
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-heading font-black text-[#00271D]">Report Submitted Successfully!</h2>
          <p className="text-xs text-[#00271D]/70 font-medium mt-1 max-w-md mx-auto">
            Your waste / bin report has been registered in the system. MRF operations center and facility managers have been notified for inspection and action.
          </p>
        </div>

        {/* Submitted Summary Details Card (Matches Screenshot Exactly) */}
        <div className="p-6 bg-[#F9F3F0]/80 border border-[#00271D]/10 rounded-2xl text-left space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#00271D]/10 pb-3">
            <p className="text-[10px] font-extrabold text-[#00271D]/50 uppercase tracking-wider">Ticket Summary</p>
            <span className="text-xs font-black text-[#00A77C] bg-white px-2.5 py-0.5 rounded-md border border-[#00A77C]/20 shadow-2xs">
              {lastSubmittedReport?.ticketId || '#TKT-938917'}
            </span>
          </div>

          {/* Photo preview if present */}
          {lastSubmittedReport?.imageUrl && (
            <div className="relative h-44 w-full overflow-hidden rounded-xl border border-gray-200 shadow-inner">
              <img src={lastSubmittedReport.imageUrl} alt="Submitted evidence" className="h-full w-full object-cover" />
              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] px-2.5 py-0.5 rounded-md font-semibold flex items-center gap-1.5">
                <Camera size={12} /> Photo Evidence Attached
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[#00271D]/50 font-medium block text-[10px]">Report Title / Item</span>
              <span className="font-bold text-[#00271D] flex items-center gap-1 mt-0.5">
                <Package size={13} className="text-[#00A77C]" /> {lastSubmittedReport?.title || reportTitle || 'Recyclable'}
              </span>
            </div>

            <div>
              <span className="text-[#00271D]/50 font-medium block text-[10px]">Category</span>
              <span className="font-bold text-[#00A77C] flex items-center gap-1 mt-0.5">
                <Tag size={13} /> Waste / Bin ({formattedCat})
              </span>
            </div>

            <div>
              <span className="text-[#00271D]/50 font-medium block text-[10px]">Location</span>
              <span className="font-bold text-[#00271D] flex items-center gap-1 mt-0.5">
                <MapPin size={13} className="text-[#00A77C]" /> {lastSubmittedReport?.location || locationName || 'Campus Station'}
              </span>
            </div>

            <div>
              <span className="text-[#00271D]/50 font-medium block text-[10px]">Urgency Level</span>
              <span className="font-bold text-[#00271D] flex items-center gap-1 mt-0.5">
                <AlertTriangle size={13} className={(lastSubmittedReport?.urgency || urgency) === 'HIGH' ? 'text-rose-500' : 'text-[#00A77C]'} />
                <span className={(lastSubmittedReport?.urgency || urgency) === 'HIGH' ? 'text-rose-600 font-extrabold' : ''}>
                  {lastSubmittedReport?.urgency || urgency || 'MEDIUM'}
                </span>
              </span>
            </div>

            <div>
              <span className="text-[#00271D]/50 font-medium block text-[10px]">Date & Time</span>
              <span className="font-medium text-[#00271D]/80 flex items-center gap-1 mt-0.5">
                <Clock size={13} className="text-gray-400" /> {lastSubmittedReport?.timestamp || 'Just now'}
              </span>
            </div>
          </div>

          {lastSubmittedReport?.notes && (
            <div className="pt-2 border-t border-[#00271D]/10">
              <span className="text-[#00271D]/50 font-medium block text-[10px]">Notes</span>
              <p className="text-xs text-[#00271D]/80 italic mt-0.5">"{lastSubmittedReport.notes}"</p>
            </div>
          )}
        </div>

        {/* Action Buttons (Matching Screenshot) */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={onReset}
            className="flex-1 py-3.5 px-5 rounded-2xl bg-[#00A77C] hover:bg-[#008f6a] text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Send size={15} />
            <span>Submit Another Report</span>
          </button>

          {onViewHistory && (
            <button
              type="button"
              onClick={onViewHistory}
              className="flex-1 py-3.5 px-5 rounded-2xl border border-[#00271D]/20 bg-white text-[#00271D] font-bold text-xs hover:bg-gray-50 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <FileText size={15} />
              <span>View Report History</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
