import React from 'react';
import { FileText } from 'lucide-react';

interface TeacherNotesSectionProps {
  notes: string;
  setNotes: (n: string) => void;
}

export const TeacherNotesSection: React.FC<TeacherNotesSectionProps> = ({ notes, setNotes }) => (
  <div className="rounded-3xl border border-white/80 bg-white/95 backdrop-blur-md p-6 shadow-xs space-y-3">
    <div className="flex items-center gap-2">
      <FileText size={16} className="text-[var(--text-strong)]/60" />
      <h3 className="text-xs font-bold text-[var(--text-strong)]">
        4. Additional Notes <span className="text-gray-400 font-normal">(optional)</span>
      </h3>
    </div>

    <textarea
      rows={3}
      maxLength={300}
      placeholder="Describe the issue..."
      value={notes}
      onChange={e => setNotes(e.target.value)}
      className="w-full resize-none rounded-2xl border border-gray-200 bg-[#F8FAFC] p-3.5 text-xs text-[var(--text-strong)] outline-none transition-all focus:border-[var(--primary)]/25 focus:bg-white placeholder:text-gray-400 font-medium"
    />
    <p className="text-[10px] text-gray-400 font-medium">{notes.length}/300 characters</p>
  </div>
);
