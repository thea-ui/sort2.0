import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface StudentUrgencySelectorProps {
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  setUrgency: (u: 'LOW' | 'MEDIUM' | 'HIGH') => void;
}

export const StudentUrgencySelector: React.FC<StudentUrgencySelectorProps> = ({ urgency, setUrgency }) => (
  <div className="bg-white/95 backdrop-blur-sm border border-white/80 rounded-3xl p-5 shadow-sm space-y-2.5">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-heading font-bold text-[#00271D] flex items-center gap-2">
        <AlertTriangle size={16} className="text-[#00A77C]" />
        <span>3. Urgency Level</span>
      </h3>
      <span className="text-[10px] font-medium text-gray-400">Defaults to Normal</span>
    </div>

    <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100/80 rounded-2xl">
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
            className={`py-2 px-2.5 rounded-xl text-center transition-all cursor-pointer select-none ${
              isSelected
                ? item.level === 'HIGH'
                  ? 'bg-rose-500 text-white font-bold shadow-xs'
                  : 'bg-[#00A77C] text-white font-bold shadow-xs'
                : 'text-gray-600 hover:text-[#00271D]'
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
