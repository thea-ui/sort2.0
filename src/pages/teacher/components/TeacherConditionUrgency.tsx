import React from 'react';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

interface TeacherConditionUrgencyProps {
  isWasteCategory: boolean;
  selectedCondition: string;
  setSelectedCondition: (c: string) => void;
  selectedUrgency: 'LOW' | 'MEDIUM' | 'HIGH';
  setSelectedUrgency: (u: 'LOW' | 'MEDIUM' | 'HIGH') => void;
  dynamicConditions: { id: string; label: string; desc: string }[];
  dynamicUrgencies: { id: string; label: string; desc: string; value: 'LOW' | 'MEDIUM' | 'HIGH' }[];
}

export const TeacherConditionUrgency: React.FC<TeacherConditionUrgencyProps> = ({
  isWasteCategory,
  selectedCondition,
  setSelectedCondition,
  selectedUrgency,
  setSelectedUrgency,
  dynamicConditions,
  dynamicUrgencies,
}) => (
  <>
    {isWasteCategory ? (
      <div className="rounded-3xl border border-white/80 bg-white/95 backdrop-blur-md p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-heading font-bold text-[var(--text-strong)] flex items-center gap-2">
            <AlertTriangle size={18} className="text-[var(--accent)]" />
            <span>3. Urgency Level</span>
          </h3>
          <span className="text-[11px] text-gray-400 font-medium">Defaults to Normal</span>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[#F8FAFC] p-1.5 border border-gray-200/80">
          {[
            { id: 'Low', label: 'Low', desc: 'Not full yet', value: 'LOW' as const },
            { id: 'Normal', label: 'Normal', desc: 'Needs pick up', value: 'MEDIUM' as const },
            { id: 'Urgent', label: 'Urgent', desc: 'Overflowing', value: 'HIGH' as const },
          ].map(urg => {
            const isSelected = selectedUrgency === urg.value;
            const activeBg = urg.value === 'HIGH' ? 'bg-rose-500 text-white' : 'bg-[var(--accent)] text-white';

            return (
              <button
                key={urg.id}
                type="button"
                onClick={() => setSelectedUrgency(urg.value)}
                className={`py-3 px-2 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                  isSelected
                    ? `${activeBg} shadow-md font-bold`
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <span className="text-xs font-bold">{urg.label}</span>
                <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>{urg.desc}</span>
              </button>
            );
          })}
        </div>
      </div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-3xl border border-white/80 bg-white/95 backdrop-blur-md p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-[var(--text-strong)]/60" />
            <h3 className="text-xs font-bold text-[var(--text-strong)]">Condition</h3>
          </div>

          <div className="space-y-2">
            {dynamicConditions.map(cond => {
              const isSelected = selectedCondition === cond.id;
              return (
                <button
                  key={cond.id}
                  type="button"
                  onClick={() => setSelectedCondition(cond.id)}
                  className={`w-full text-left p-3 rounded-2xl border text-xs transition-all cursor-pointer flex items-start gap-3 ${
                    isSelected
                      ? 'bg-[var(--primary)]/10 border-[var(--primary)]/25 text-[var(--text-strong)] shadow-2xs font-bold'
                      : 'bg-white border-gray-200/80 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className={`mt-0.5 h-3.5 w-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${isSelected ? 'border-[var(--primary)] bg-[var(--primary)]' : 'border-gray-300'}`}>
                    {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  <div>
                    <p className="font-bold text-xs">{cond.label}</p>
                    <p className="text-[10px] text-gray-400 font-normal mt-0.5">{cond.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-white/80 bg-white/95 backdrop-blur-md p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-[var(--text-strong)]/60" />
            <h3 className="text-xs font-bold text-[var(--text-strong)]">Urgency Level</h3>
          </div>

          <div className="space-y-2">
            {dynamicUrgencies.map(urg => {
              const isSelected = selectedUrgency === urg.value;
              return (
                <button
                  key={urg.id}
                  type="button"
                  onClick={() => setSelectedUrgency(urg.value)}
                  className={`w-full text-left p-3 rounded-2xl border text-xs transition-all cursor-pointer flex items-start gap-3 ${
                    isSelected
                      ? 'bg-amber-50/80 border-amber-400 text-amber-900 shadow-2xs font-bold'
                      : 'bg-white border-gray-200/80 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className={`mt-0.5 h-3.5 w-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${isSelected ? 'border-amber-500 bg-amber-500' : 'border-gray-300'}`}>
                    {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  <div>
                    <p className="font-bold text-xs">{urg.label}</p>
                    <p className="text-[10px] text-gray-400 font-normal mt-0.5">{urg.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    )}
  </>
);
