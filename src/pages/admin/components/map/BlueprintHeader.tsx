import React from 'react';
import { Building2, Upload, Move, Plus, CheckCircle2, AlertTriangle, Pencil, Trash2 } from 'lucide-react';

interface BlueprintHeaderProps {
  totalStations: number;
  availableStationsCount: number;
  unavailableStationsCount: number;
  isEditMode: boolean;
  setIsEditMode: (v: boolean) => void;
  setShowAddForm: (v: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hasBlueprint?: boolean;
  isAdjusting?: boolean;
  onAdjust?: () => void;
  onRemove?: () => void;
}

export const BlueprintHeader: React.FC<BlueprintHeaderProps> = ({
  totalStations,
  availableStationsCount,
  unavailableStationsCount,
  isEditMode,
  setIsEditMode,
  setShowAddForm,
  fileInputRef,
  handleFileUpload,
  hasBlueprint = false,
  isAdjusting = false,
  onAdjust,
  onRemove,
}) => (
  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm">
    <div className="min-w-0">
      <span className="text-[10px] font-extrabold text-[#0091EA] bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
        Map & Bin Architecture
      </span>
      <h2 className="text-xl font-black text-[#00271D] tracking-tight mt-1.5 flex items-center gap-2">
        <Building2 className="text-[#00A77C]" size={22} />
        Campus Bin Map & Blueprint Editor
      </h2>
      <p className="text-xs text-[#00271D]/50 mt-1">
        Upload a campus map blueprint, then drag and zoom to align it with the bin pins before saving.
      </p>
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#00271D] bg-[#F9F3F0] border border-[#00271D]/10 px-2.5 py-1 rounded-full">
          <Building2 size={11} className="text-[#0091EA]" />
          {totalStations} Stations
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
          <CheckCircle2 size={11} />
          {availableStationsCount} Available
        </span>
        {unavailableStationsCount > 0 && (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
            <AlertTriangle size={11} />
            {unavailableStationsCount} Unavailable
          </span>
        )}
      </div>
    </div>

    <div className="flex items-center gap-2 flex-wrap shrink-0">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

      {!isAdjusting && (
        <>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3.5 py-2 bg-white text-[#00271D] border border-gray-200 rounded-xl text-xs font-extrabold hover:bg-gray-50 flex items-center gap-1.5 shadow-xs cursor-pointer">
            <Upload size={13} className="text-[#00A77C]" />
            {hasBlueprint ? 'Replace Blueprint' : 'Upload Blueprint'}
          </button>

          {hasBlueprint && (
            <button type="button" onClick={onAdjust} className="px-3.5 py-2 bg-white text-[#00271D] border border-gray-200 rounded-xl text-xs font-extrabold hover:bg-gray-50 flex items-center gap-1.5 shadow-xs cursor-pointer">
              <Pencil size={13} className="text-amber-600" />
              Adjust
            </button>
          )}

          {hasBlueprint && (
            <button type="button" onClick={onRemove} className="px-3.5 py-2 bg-white text-rose-600 border border-rose-200 rounded-xl text-xs font-extrabold hover:bg-rose-50 flex items-center gap-1.5 shadow-xs cursor-pointer">
              <Trash2 size={13} />
              Remove
            </button>
          )}

          <button type="button" onClick={() => setIsEditMode(!isEditMode)} className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${isEditMode ? 'bg-amber-500 text-white shadow-amber-200 animate-pulse' : 'bg-[#00271D] text-white hover:bg-[#00A77C]'}`}>
            <Move size={13} />
            {isEditMode ? 'Exit Edit Mode' : 'Edit Bins Mode'}
          </button>

          <button type="button" onClick={() => setShowAddForm(true)} className="px-3.5 py-2 bg-[#00A77C] text-white rounded-xl text-xs font-extrabold flex items-center gap-1 shadow-sm hover:bg-[#008f6a] cursor-pointer">
            <Plus size={13} />
            Add Station
          </button>
        </>
      )}
    </div>
  </div>
);
