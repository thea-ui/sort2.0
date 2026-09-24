import React from 'react';
import { X } from 'lucide-react';

interface RoomModalsProps {
  showAddRoomModal: boolean;
  setShowAddRoomModal: (v: boolean) => void;
  editingRoom: { index: number; name: string } | null;
  setEditingRoom: (v: { index: number; name: string } | null) => void;
  newRoomName: string;
  setNewRoomName: (v: string) => void;
  handleAddRoom: (e: React.FormEvent) => void;
  handleSaveEditRoom: (e: React.FormEvent) => void;
}

export const RoomModals: React.FC<RoomModalsProps> = ({
  showAddRoomModal,
  setShowAddRoomModal,
  editingRoom,
  setEditingRoom,
  newRoomName,
  setNewRoomName,
  handleAddRoom,
  handleSaveEditRoom,
}) => (
  <>
    {showAddRoomModal && (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-white space-y-4 animate-fade-in">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <h3 className="text-base font-extrabold text-[var(--text-strong)]">Add Room Location</h3>
            <button type="button" onClick={() => setShowAddRoomModal(false)} className="text-[var(--text-strong)]/40 hover:text-[var(--text-strong)]">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleAddRoom} className="space-y-4 text-xs">
            <div>
              <label className="text-[10px] font-bold text-[var(--text-strong)]/50 uppercase">Room & Building Name</label>
              <input type="text" required placeholder="e.g. Physics Lab 3 – Science Hall" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} className="w-full mt-1 p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-[var(--accent)]" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAddRoomModal(false)} className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 cursor-pointer">Cancel</button>
              <button type="submit" className="px-5 py-2 bg-[var(--accent)] text-white font-extrabold rounded-xl shadow-md hover:bg-[var(--accent-dark)] cursor-pointer">Add Room</button>
            </div>
          </form>
        </div>
      </div>
    )}

    {editingRoom && (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-white space-y-4 animate-fade-in">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <h3 className="text-base font-extrabold text-[var(--text-strong)]">Edit Room Location</h3>
            <button type="button" onClick={() => setEditingRoom(null)} className="text-[var(--text-strong)]/40 hover:text-[var(--text-strong)]">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSaveEditRoom} className="space-y-4 text-xs">
            <div>
              <label className="text-[10px] font-bold text-[var(--text-strong)]/50 uppercase">Room Name</label>
              <input type="text" required value={editingRoom.name} onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })} className="w-full mt-1 p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-[var(--accent)]" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingRoom(null)} className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 cursor-pointer">Cancel</button>
              <button type="submit" className="px-5 py-2 bg-[var(--accent)] text-white font-extrabold rounded-xl shadow-md hover:bg-[var(--accent-dark)] cursor-pointer">Save Room</button>
            </div>
          </form>
        </div>
      </div>
    )}
  </>
);
