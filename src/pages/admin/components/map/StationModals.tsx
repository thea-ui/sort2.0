import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { BinLocationItem, CategoryStreamType, BinStreamState } from '../../../../types';

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
    {showAddForm && (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-white space-y-4 animate-fade-in">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <h3 className="text-base font-extrabold text-[var(--text-strong)]">Add New Campus Bin Station</h3>
            <button type="button" onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleAddLocationSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="text-[10px] font-bold text-[var(--text-strong)]/50 uppercase">Station Name</label>
              <input type="text" required placeholder="e.g. Technology Building Lobby" value={newLocName} onChange={(e) => setNewLocName(e.target.value)} className="w-full mt-1 p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-[var(--accent)]" />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-bold text-[var(--text-strong)]/50 uppercase">Location Code</label>
                <input type="text" placeholder="e.g. LOC-06" value={newLocCode} onChange={(e) => setNewLocCode(e.target.value)} className="w-full mt-1 p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[var(--text-strong)]/50 uppercase">Grid X / Y %</label>
                <div className="flex gap-1.5 mt-1">
                  <input type="number" min="5" max="95" value={newLocX} onChange={(e) => setNewLocX(Number(e.target.value))} className="w-1/2 p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold" />
                  <input type="number" min="5" max="95" value={newLocY} onChange={(e) => setNewLocY(Number(e.target.value))} className="w-1/2 p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[var(--text-strong)]/50 uppercase block mb-1">Initial Installed Waste Stream Bins</label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200 cursor-pointer text-[11px] font-bold text-emerald-800">
                  <input type="checkbox" checked={newBio} onChange={(e) => setNewBio(e.target.checked)} />
                  Biodegradable
                </label>
                <label className="flex items-center gap-1.5 bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-200 cursor-pointer text-[11px] font-bold text-rose-800">
                  <input type="checkbox" checked={newNonBio} onChange={(e) => setNewNonBio(e.target.checked)} />
                  Non-Bio
                </label>
                <label className="flex items-center gap-1.5 bg-[var(--primary)]/10 px-2.5 py-1.5 rounded-xl border border-[var(--primary)]/25 cursor-pointer text-[11px] font-bold text-[var(--text-strong)]">
                  <input type="checkbox" checked={newRecycle} onChange={(e) => setNewRecycle(e.target.checked)} />
                  Recyclable
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 cursor-pointer">Cancel</button>
              <button type="submit" className="px-5 py-2 bg-[var(--accent)] text-white font-extrabold rounded-xl shadow-md hover:bg-[var(--accent-dark)] cursor-pointer">Create Bin Station</button>
            </div>
          </form>
        </div>
      </div>
    )}

    {editingLoc && (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-white space-y-4 animate-fade-in">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <h3 className="text-base font-extrabold text-[var(--text-strong)]">Edit Station Location</h3>
            <button type="button" onClick={() => setEditingLoc(null)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSaveEditedLoc} className="space-y-4 text-xs">
            <div>
              <label className="text-[10px] font-bold text-[var(--text-strong)]/50 uppercase">Station Name</label>
              <input type="text" required value={editingLoc.name} onChange={(e) => setEditingLoc({ ...editingLoc, name: e.target.value })} className="w-full mt-1 p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-[var(--accent)]" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-[var(--text-strong)]/50 uppercase">Code</label>
                <input type="text" value={editingLoc.code} onChange={(e) => setEditingLoc({ ...editingLoc, code: e.target.value })} className="w-full mt-1 p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[var(--text-strong)]/50 uppercase">Position (X / Y %)</label>
                <div className="flex gap-1.5 mt-1">
                  <input type="number" value={editingLoc.x} onChange={(e) => setEditingLoc({ ...editingLoc, x: Number(e.target.value) })} className="w-1/2 p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold" />
                  <input type="number" value={editingLoc.y} onChange={(e) => setEditingLoc({ ...editingLoc, y: Number(e.target.value) })} className="w-1/2 p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingLoc(null)} className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 cursor-pointer">Cancel</button>
              <button type="submit" className="px-5 py-2 bg-[var(--accent)] text-white font-extrabold rounded-xl shadow-md hover:bg-[var(--accent-dark)] cursor-pointer">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    )}

    {deletingLoc && (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-white space-y-4 text-center animate-fade-in">
          <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[var(--text-strong)]">Delete Station?</h3>
            <p className="text-xs text-[var(--text-strong)]/60 mt-1">
              Are you sure you want to remove <span className="font-bold text-[var(--text-strong)]">"{deletingLoc.name}"</span> from the map architecture?
            </p>
          </div>

          <div className="flex justify-center gap-2 pt-2">
            <button type="button" onClick={() => setDeletingLoc(null)} className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 cursor-pointer">Cancel</button>
            <button type="button" onClick={handleConfirmDelete} className="px-5 py-2 bg-rose-500 text-white font-extrabold rounded-xl shadow-md hover:bg-rose-600 cursor-pointer">Delete Station</button>
          </div>
        </div>
      </div>
    )}
  </>
);
