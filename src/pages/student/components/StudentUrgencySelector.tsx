import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface StudentUrgencySelectorProps {
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  setUrgency: (u: 'LOW' | 'MEDIUM' | 'HIGH') => void;
}

export const StudentUrgencySelector: React.FC<StudentUrgencySelectorProps> = ({ urgency, setUrgency }) => (
  <div className="space-y-2.5 rounded-2xl border border-[var(--primary)]/10 bg-white p-4 sm:p-5">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-heading font-bold text-[var(--text-strong)] flex items-center gap-2">
        <AlertTriangle size={16} className="text-[var(--accent)]" />
        <span>3. Urgency Level</span>
      </h3>
      <span className="text-[10px] font-medium text-gray-400">Defaults to Normal</span>
    </div>

    <div className="grid grid-cols-3 gap-1 rounded-xl bg-[var(--background)] p-1">
      {[
        { level: 'LOW', label: 'Low', desc: 'Not full yet' },
        { level: 'MEDIUM', label: 'Normal', desc: 'Needs pick up' },
        { level: 'HIGH', label: 'Urgent', desc: 'Overflowing' },
      ].map(item => {
        const isSelected = urgency === item.level;
        return (
          <button
            key={item.level}
            type="button"
            onClick={() => setUrgency(item.level as any)}
            className={`min-h-[44px] rounded-lg px-2 py-2 text-center transition-colors cursor-pointer select-none ${
              isSelected
                ? item.level === 'HIGH'
                  ? 'bg-rose-500 text-white font-bold shadow-xs'
                  : 'bg-[var(--accent)] text-white font-bold shadow-xs'
                : 'text-gray-600 hover:text-[var(--text-strong)]'
            }`}
          >
            <p className="text-xs font-bold leading-tight">{item.label}</p>
            <p className={`text-[9px] mt-0.5 opacity-80 ${isSelected ? 'text-white' : 'text-gray-400'}`}>{item.desc}</p>
          </button>
        );
      })}
    </div>
  </div>
);
