import React from 'react';
import { Package, Check, XCircle, Info, Clock, AlertTriangle } from 'lucide-react';
import { CAT_META } from './teacherReportData';

interface TeacherAssetItemGridProps {
  activeMeta: { itemsLabel?: string; items: { id: string; label: string; icon?: React.ComponentType<any> }[]; icon?: React.ComponentType<any> };
  selectedItem: string;
  handleItemSelect: (label: string) => void;
}

export const TeacherAssetItemGrid: React.FC<TeacherAssetItemGridProps> = ({ activeMeta, selectedItem, handleItemSelect }) => {
  if (!activeMeta) return null;

  return (
    <div className="rounded-3xl border border-white/80 bg-white/95 backdrop-blur-md p-6 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package size={16} className="text-[var(--text-strong)]/60" />
          <h3 className="text-xs font-bold text-[var(--text-strong)]">
            {activeMeta.itemsLabel} <span className="text-rose-500">*</span>
          </h3>
        </div>
        {selectedItem && (
          <span className="text-[10px] font-extrabold text-[var(--accent)] bg-[var(--accent)]/15 border border-[var(--accent)]/30 px-3 py-0.5 rounded-full">
            Selected: {selectedItem}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {activeMeta.items.map(item => {
          const isSelected = selectedItem === item.label;
          const IconComponent = item.icon || activeMeta.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleItemSelect(item.label)}
              className={`flex items-center justify-between rounded-2xl border p-3.5 text-left text-xs transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[var(--accent)]/15 border-2 border-[var(--accent)] text-[var(--text-strong)] font-extrabold shadow-sm ring-2 ring-[var(--accent)]/20'
                  : 'bg-white border-gray-200/80 text-gray-700 hover:border-[var(--accent)]/50 hover:bg-emerald-50/30'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-[var(--accent)] text-white shadow-xs' : 'bg-[var(--accent)]/10 text-[var(--accent)]'}`}>
                  {IconComponent && <IconComponent size={16} />}
                </div>
                <span className="font-bold text-xs">{item.label}</span>
              </div>
              {isSelected && (
                <span className="h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
