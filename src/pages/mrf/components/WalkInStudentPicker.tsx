import React from 'react';
import { Search, User, X, Loader2, WifiOff } from 'lucide-react';
import { WalkInStudentOption } from '../../../types';

interface WalkInStudentPickerProps {
  query: string;
  setQuery: (value: string) => void;
  results: WalkInStudentOption[];
  searching: boolean;
  selected: WalkInStudentOption | null;
  onSelect: (student: WalkInStudentOption | null) => void;
}

export const WalkInStudentPicker: React.FC<WalkInStudentPickerProps> = ({
  query,
  setQuery,
  results,
  searching,
  selected,
  onSelect,
}) => {
  if (selected) {
    return (
      <div className="bg-white rounded-2xl border border-[var(--accent)]/30 ring-2 ring-[var(--accent)]/15 p-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center shrink-0">
            <User size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-[var(--text-strong)] truncate">{selected.name}</p>
            <p className="text-[11px] text-[var(--text-strong)]/50 font-semibold truncate">
              {[selected.gradeLevel, selected.sectionName].filter(Boolean).join(' · ') || 'Student'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-black text-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_10%,white)] border border-[var(--gold)]/25 px-2.5 py-1 rounded-full">
            {selected.points} pts
          </span>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            aria-label="Clear selected student"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search student by name, LRN, or section…"
          className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-semibold text-[var(--text-strong)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
        />
        {searching && (
          <Loader2 size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--accent)] animate-spin" />
        )}
      </div>

      {query.trim().length >= 2 && !searching && results.length === 0 && (
        <p className="mt-2 text-[11px] text-[var(--text-strong)]/40 font-semibold px-1">No students found.</p>
      )}

      {results.length > 0 && (
        <div className="absolute z-30 mt-2 w-full bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden max-h-72 overflow-y-auto">
          {results.map((student) => (
            <button
              key={student.id}
              type="button"
              onClick={() => onSelect(student)}
              className="w-full text-left px-4 py-2.5 hover:bg-[color-mix(in_srgb,var(--accent)_5%,white)] transition-colors flex items-center justify-between gap-3 border-b border-gray-50 last:border-0 cursor-pointer"
            >
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-[var(--text-strong)] truncate">{student.name}</p>
                <p className="text-[10px] text-[var(--text-strong)]/50 font-semibold truncate">
                  {[student.gradeLevel, student.sectionName].filter(Boolean).join(' · ') || 'Student'}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {student.syncSource && student.syncSource !== 'ENROLLPRO' && (
                  <span className="flex items-center gap-1 text-[9px] font-black uppercase text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    <WifiOff size={9} /> Local
                  </span>
                )}
                <span className="text-[10px] font-black text-[var(--gold)]">{student.points} pts</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
