import React from 'react';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, X, Check, Move } from 'lucide-react';
import { BlueprintTransform, DEFAULT_BLUEPRINT_TRANSFORM } from '../../../../services/locationStore';

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;

interface BlueprintAdjustControlsProps {
  transform: BlueprintTransform;
  onChange: (t: BlueprintTransform) => void;
  onFit: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
}

const clamp = (n: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(n * 100) / 100));

export const BlueprintAdjustControls: React.FC<BlueprintAdjustControlsProps> = ({
  transform,
  onChange,
  onFit,
  onCancel,
  onSave,
  saving = false,
}) => {
  const zoomBy = (delta: number) => onChange({ ...transform, scale: clamp(transform.scale + delta) });

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs shadow-sm">
      <div className="flex items-center gap-2 text-amber-800 font-bold min-w-0">
        <Move size={15} className="text-amber-600 shrink-0" />
        <span className="truncate">Adjust the blueprint: drag to position, scroll or use the slider to zoom, then save.</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap shrink-0">
        <div className="flex items-center gap-1 bg-white border border-amber-200 rounded-xl px-1.5 py-1">
          <button type="button" onClick={() => zoomBy(-0.1)} className="p-1 rounded-lg text-amber-700 hover:bg-amber-100 cursor-pointer" title="Zoom out">
            <ZoomOut size={14} />
          </button>
          <input
            type="range"
            min={MIN_SCALE}
            max={MAX_SCALE}
            step={0.05}
            value={transform.scale}
            onChange={(e) => onChange({ ...transform, scale: clamp(parseFloat(e.target.value)) })}
            className="w-28 accent-amber-500 cursor-pointer"
            aria-label="Blueprint zoom"
          />
          <button type="button" onClick={() => zoomBy(0.1)} className="p-1 rounded-lg text-amber-700 hover:bg-amber-100 cursor-pointer" title="Zoom in">
            <ZoomIn size={14} />
          </button>
          <span className="text-[10px] font-black text-amber-800 w-10 text-center tabular-nums">
            {Math.round(transform.scale * 100)}%
          </span>
        </div>

        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_BLUEPRINT_TRANSFORM })}
          className="px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-amber-800 font-bold hover:bg-amber-100 cursor-pointer flex items-center gap-1.5"
        >
          <RotateCcw size={12} /> Reset
        </button>

        <button
          type="button"
          onClick={onFit}
          className="px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-amber-800 font-bold hover:bg-amber-100 cursor-pointer flex items-center gap-1.5"
        >
          <Maximize2 size={12} /> Fit
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold hover:bg-gray-100 cursor-pointer flex items-center gap-1.5"
        >
          <X size={12} /> Cancel
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="px-4 py-1.5 rounded-xl bg-[#00A77C] hover:bg-[#008f6a] text-white font-extrabold cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
        >
          <Check size={13} /> {saving ? 'Saving…' : 'Save Blueprint'}
        </button>
      </div>
    </div>
  );
};
