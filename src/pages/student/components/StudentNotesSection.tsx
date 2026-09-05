import React from 'react';
import { MessageSquare } from 'lucide-react';

interface StudentNotesSectionProps {
  reportDesc: string;
  setReportDesc: (v: string) => void;
}

export const StudentNotesSection: React.FC<StudentNotesSectionProps> = ({ reportDesc, setReportDesc }) => (
  <div className="bg-white/95 backdrop-blur-sm border border-white/80 rounded-3xl p-5 shadow-sm space-y-2">
    <h3 className="text-sm font-heading font-bold text-[#00271D] flex items-center gap-2">
      <MessageSquare size={16} className="text-[#00A77C]" />
      <span>4. Additional Notes</span>
      <span className="text-gray-400 font-normal text-xs">(optional)</span>
    </h3>
    <textarea
      rows={2}
      maxLength={300}
      placeholder="e.g. 'Bin overflowing with plastic cups since morning'"
      value={reportDesc}
      onChange={e => setReportDesc(e.target.value)}
      className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-xs text-[#00271D] outline-none focus:border-[#00A77C] focus:bg-white transition-all resize-none"
    />
  </div>
);
