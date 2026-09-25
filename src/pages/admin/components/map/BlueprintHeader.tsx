import React from 'react';
import { Building2, Upload, Move, Plus, CheckCircle2, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../../components/layout/PageHeader';

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
  syncControl?: React.ReactNode;
  /** Informational status (freshness badge) shown with the stat chips. */
  statusControl?: React.ReactNode;
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
  syncControl,
  statusControl,
}) => (
  <>
    <PageHeader
      title="Campus Bin Map & Blueprint Editor"
      description="The map is synced from ATLAS. Drag the pins to align stations with the buildings. Upload a custom background only if ATLAS is unavailable."
      actions={
        <>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

          {syncControl}

          {!isAdjusting && (
            <>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3.5 py-2 bg-white text-[var(--text-strong)] border border-gray-200 rounded-xl text-xs font-extrabold hover:bg-gray-50 flex items-center gap-1.5 shadow-xs cursor-pointer">
                <Upload size={13} className="text-[var(--accent)]" />
                {hasBlueprint ? 'Replace Fallback Map' : 'Upload Fallback Map'}
              </button>

              {hasBlueprint && (
                <button type="button" onClick={onAdjust} className="px-3.5 py-2 bg-white text-[var(--text-strong)] border border-gray-200 rounded-xl text-xs font-extrabold hover:bg-gray-50 flex items-center gap-1.5 shadow-xs cursor-pointer">
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

              <button type="button" onClick={() => setIsEditMode(!isEditMode)} className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${isEditMode ? 'bg-amber-500 text-white shadow-amber-200 animate-pulse' : 'bg-[var(--primary)] text-white hover:bg-[var(--accent)]'}`}>
                <Move size={13} />
                {isEditMode ? 'Exit Edit Mode' : 'Edit Bins Mode'}
              </button>

              <button type="button" onClick={() => setShowAddForm(true)} className="px-3.5 py-2 bg-[var(--accent)] text-white rounded-xl text-xs font-extrabold flex items-center gap-1 shadow-sm hover:bg-[var(--accent-dark)] cursor-pointer">
                <Plus size={13} />
                Add Station
              </button>
            </>
          )}
        </>
      }
    />

    <div className="flex items-center gap-2 flex-wrap">
      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-strong)] bg-[var(--background)] border border-[var(--primary)]/10 px-2.5 py-1 rounded-full">
        <Building2 size={11} className="text-[var(--text-strong)]" />
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
      {statusControl}
    </div>
  </>
);
