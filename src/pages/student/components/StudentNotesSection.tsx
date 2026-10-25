import React from 'react';
import { MessageSquare } from 'lucide-react';

interface StudentNotesSectionProps {
  reportDesc: string;
  setReportDesc: (v: string) => void;
}

export const StudentNotesSection: React.FC<StudentNotesSectionProps> = ({ reportDesc, setReportDesc }) => (
  <div className="space-y-2 rounded-2xl border border-[var(--primary)]/10 bg-white p-4 sm:p-5">
    <h3 className="text-sm font-heading font-bold text-[var(--text-strong)] flex items-center gap-2">
      <MessageSquare size={16} className="text-[var(--accent)]" />
      <span>4. Additional Notes</span>
      <span className="text-gray-400 font-normal text-xs">(optional)</span>
    </h3>
    <textarea
      rows={2}
      maxLength={300}
      placeholder="e.g. 'Bin overflowing with plastic cups since morning'"
      value={reportDesc}
      onChange={e => setReportDesc(e.target.value)}
      className="w-full resize-none rounded-xl border border-[var(--primary)]/15 bg-[var(--background)]/60 p-3 text-base text-[var(--text-strong)] outline-none transition-colors focus:border-[var(--accent)] focus:bg-white sm:text-sm"
    />
  </div>
);
