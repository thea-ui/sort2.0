import React from 'react';
import { Layers } from 'lucide-react';

interface BlueprintPresetBarProps {
  blueprintUrl: string | null;
  selectedPreset: 'DEFAULT' | 'ARCHITECTURAL' | 'AERIAL';
  setSelectedPreset: (p: 'DEFAULT' | 'ARCHITECTURAL' | 'AERIAL') => void;
  handleClearBlueprint: () => void;
}

export const BlueprintPresetBar: React.FC<BlueprintPresetBarProps> = ({
  blueprintUrl,
  selectedPreset,
  setSelectedPreset,
  handleClearBlueprint,
}) => (
  <div className="bg-white/80 backdrop-blur-xs border border-white/80 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
    <div className="flex items-center gap-2 text-[#00271D]/70 font-semibold">
      <Layers size={15} className="text-[#00A77C]" />
      <span>Blueprint Canvas Preset:</span>
      {blueprintUrl && (
        <span className="text-emerald-600 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
          Custom Image Active
        </span>
      )}
    </div>
    <div className="flex items-center gap-1.5">
      {(['DEFAULT', 'ARCHITECTURAL', 'AERIAL'] as const).map((preset) => (
        <button
          key={preset}
          type="button"
          onClick={() => setSelectedPreset(preset)}
          className={`px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all ${
            selectedPreset === preset
              ? 'bg-[#00271D] text-white shadow-xs'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
          }`}
        >
          {preset}
        </button>
      ))}
      {blueprintUrl && (
        <button type="button" onClick={handleClearBlueprint} className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-full font-bold text-[11px] cursor-pointer ml-2 border border-rose-200">
          Clear Custom Map
        </button>
      )}
    </div>
  </div>
);
