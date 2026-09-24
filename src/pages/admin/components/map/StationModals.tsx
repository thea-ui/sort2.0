import React from 'react';
import { AlertTriangle, Plus, Save } from 'lucide-react';
import { BinLocationItem } from '../../../../types';
import { AppModal } from '../../../../components/common/AppModal';

interface StationModalsProps {
  showAddForm: boolean;
  setShowAddForm: (v: boolean) => void;
  editingLoc: BinLocationItem | null;
  setEditingLoc: (loc: BinLocationItem | null) => void;
  deletingLoc: BinLocationItem | null;
  setDeletingLoc: (loc: BinLocationItem | null) => void;
  newLocName: string;
  setNewLocName: (v: string) => void;
  newLocCode: string;
  setNewLocCode: (v: string) => void;
  newLocX: number;
  setNewLocX: (v: number) => void;
  newLocY: number;
  setNewLocY: (v: number) => void;
  newBio: boolean;
  setNewBio: (v: boolean) => void;
  newNonBio: boolean;
  setNewNonBio: (v: boolean) => void;
  newRecycle: boolean;
  setNewRecycle: (v: boolean) => void;
  handleAddLocationSubmit: (e: React.FormEvent) => void;
  handleSaveEditedLoc: (e: React.FormEvent) => void;
  handleConfirmDelete: () => void;
}

const FIELD =
  'w-full mt-1 p-2.5 bg-[var(--primary)]/5 border border-[var(--primary)]/10 rounded-xl text-xs font-semibold outline-none focus:border-[var(--accent)] text-[var(--text-strong)]';
const LABEL = 'text-[10px] font-bold text-[var(--text-strong)]/50 uppercase';
const CANCEL_BUTTON =
  'px-4 py-2 bg-[var(--primary)]/5 text-[var(--text-strong)]/70 font-bold rounded-xl hover:bg-[var(--primary)]/10 cursor-pointer transition-colors';
const SUBMIT_BUTTON =
  'px-5 py-2 bg-[var(--accent)] text-white font-extrabold rounded-xl shadow-md hover:bg-[var(--accent-dark)] cursor-pointer transition-colors';

export const StationModals: React.FC<StationModalsProps> = ({
  showAddForm,
  setShowAddForm,
  editingLoc,
  setEditingLoc,
  deletingLoc,
  setDeletingLoc,
  newLocName,
  setNewLocName,
  newLocCode,
  setNewLocCode,
  newLocX,
  setNewLocX,
  newLocY,
  setNewLocY,
  newBio,
  setNewBio,
  newNonBio,
  setNewNonBio,
  newRecycle,
  setNewRecycle,
  handleAddLocationSubmit,
  handleSaveEditedLoc,
  handleConfirmDelete,
}) => (
  <>
    <AppModal
      open={showAddForm}
      onOpenChange={setShowAddForm}
      icon={<Plus size={18} />}
      title="Add New Campus Bin Station"
      size="sm"
      hideFooter
    >
      <form onSubmit={handleAddLocationSubmit} className="space-y-3.5 text-xs">
        <div>
          <label className={LABEL}>Station Name</label>
          <input
            type="text"
            required
            placeholder="e.g. Technology Building Lobby"
            value={newLocName}
            onChange={(e) => setNewLocName(e.target.value)}
            className={FIELD}
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className={LABEL}>Location Code</label>
            <input
              type="text"
              placeholder="e.g. LOC-06"
              value={newLocCode}
              onChange={(e) => setNewLocCode(e.target.value)}
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL}>Grid X / Y %</label>
            <div className="flex gap-1.5 mt-1">
              <input
                type="number"
                min="5"
                max="95"
                value={newLocX}
                onChange={(e) => setNewLocX(Number(e.target.value))}
                className="w-1/2 p-2.5 bg-[var(--primary)]/5 border border-[var(--primary)]/10 rounded-xl text-xs font-semibold text-[var(--text-strong)]"
              />
              <input
                type="number"
                min="5"
                max="95"
                value={newLocY}
                onChange={(e) => setNewLocY(Number(e.target.value))}
                className="w-1/2 p-2.5 bg-[var(--primary)]/5 border border-[var(--primary)]/10 rounded-xl text-xs font-semibold text-[var(--text-strong)]"
              />
            </div>
          </div>
        </div>

        <div>
          <label className={`${LABEL} block mb-1`}>Initial Installed Waste Stream Bins</label>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200 cursor-pointer text-[11px] font-bold text-emerald-800">
              <input type="checkbox" checked={newBio} onChange={(e) => setNewBio(e.target.checked)} />
              Biodegradable
            </label>
            <label className="flex items-center gap-1.5 bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-200 cursor-pointer text-[11px] font-bold text-rose-800">
              <input
                type="checkbox"
                checked={newNonBio}
                onChange={(e) => setNewNonBio(e.target.checked)}
              />
              Non-Bio
            </label>
            <label className="flex items-center gap-1.5 bg-[var(--primary)]/10 px-2.5 py-1.5 rounded-xl border border-[var(--primary)]/25 cursor-pointer text-[11px] font-bold text-[var(--text-strong)]">
              <input
                type="checkbox"
                checked={newRecycle}
                onChange={(e) => setNewRecycle(e.target.checked)}
              />
              Recyclable
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => setShowAddForm(false)} className={CANCEL_BUTTON}>
            Cancel
          </button>
          <button type="submit" className={SUBMIT_BUTTON}>
            Create Bin Station
          </button>
        </div>
      </form>
    </AppModal>

    <AppModal
      open={editingLoc !== null}
      onOpenChange={(open) => {
        if (!open) setEditingLoc(null);
      }}
      icon={<Save size={18} />}
      title="Edit Station Location"
      size="sm"
      hideFooter
    >
      {editingLoc && (
        <form onSubmit={handleSaveEditedLoc} className="space-y-4 text-xs">
          <div>
            <label className={LABEL}>Station Name</label>
            <input
              type="text"
              required
              value={editingLoc.name}
              onChange={(e) => setEditingLoc({ ...editingLoc, name: e.target.value })}
              className={FIELD}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Code</label>
              <input
                type="text"
                value={editingLoc.code}
                onChange={(e) => setEditingLoc({ ...editingLoc, code: e.target.value })}
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL}>Position (X / Y %)</label>
              <div className="flex gap-1.5 mt-1">
                <input
                  type="number"
                  value={editingLoc.x}
                  onChange={(e) => setEditingLoc({ ...editingLoc, x: Number(e.target.value) })}
                  className="w-1/2 p-2.5 bg-[var(--primary)]/5 border border-[var(--primary)]/10 rounded-xl text-xs font-semibold text-[var(--text-strong)]"
                />
                <input
                  type="number"
                  value={editingLoc.y}
                  onChange={(e) => setEditingLoc({ ...editingLoc, y: Number(e.target.value) })}
                  className="w-1/2 p-2.5 bg-[var(--primary)]/5 border border-[var(--primary)]/10 rounded-xl text-xs font-semibold text-[var(--text-strong)]"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditingLoc(null)} className={CANCEL_BUTTON}>
              Cancel
            </button>
            <button type="submit" className={SUBMIT_BUTTON}>
              Save Changes
            </button>
          </div>
        </form>
      )}
    </AppModal>

    <AppModal
      open={deletingLoc !== null}
      onOpenChange={(open) => {
        if (!open) setDeletingLoc(null);
      }}
      icon={<AlertTriangle size={18} />}
      title="Delete Station?"
      description={
        deletingLoc
          ? `Are you sure you want to remove "${deletingLoc.name}" from the map architecture?`
          : undefined
      }
      size="sm"
      destructive
      confirmLabel="Delete Station"
      onConfirm={handleConfirmDelete}
    />
  </>
);
