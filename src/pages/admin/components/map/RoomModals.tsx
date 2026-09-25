import React from 'react';
import { Home, Save } from 'lucide-react';
import { AppModal } from '../../../../components/common/AppModal';

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

const FIELD =
  'w-full mt-1 p-2.5 bg-[color-mix(in_srgb,var(--primary)_5%,white)] border border-[var(--primary)]/10 rounded-xl text-xs font-semibold outline-none focus:border-[var(--accent)] text-[var(--text-strong)]';
const LABEL = 'text-[10px] font-bold text-[var(--text-strong)]/50 uppercase';
const CANCEL_BUTTON =
  'px-4 py-2 bg-[color-mix(in_srgb,var(--primary)_5%,white)] text-[var(--text-strong)]/70 font-bold rounded-xl hover:bg-[color-mix(in_srgb,var(--primary)_10%,white)] cursor-pointer transition-colors';
const SUBMIT_BUTTON =
  'px-5 py-2 bg-[var(--accent)] text-white font-extrabold rounded-xl shadow-md hover:bg-[var(--accent-dark)] cursor-pointer transition-colors';

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
    <AppModal
      open={showAddRoomModal}
      onOpenChange={setShowAddRoomModal}
      icon={<Home size={18} />}
      title="Add Room Location"
      size="sm"
      hideFooter
    >
      <form onSubmit={handleAddRoom} className="space-y-4 text-xs">
        <div>
          <label className={LABEL}>Room &amp; Building Name</label>
          <input
            type="text"
            required
            placeholder="e.g. Physics Lab 3 – Science Hall"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            className={FIELD}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => setShowAddRoomModal(false)} className={CANCEL_BUTTON}>
            Cancel
          </button>
          <button type="submit" className={SUBMIT_BUTTON}>
            Add Room
          </button>
        </div>
      </form>
    </AppModal>

    <AppModal
      open={editingRoom !== null}
      onOpenChange={(open) => {
        if (!open) setEditingRoom(null);
      }}
      icon={<Save size={18} />}
      title="Edit Room Location"
      size="sm"
      hideFooter
    >
      {editingRoom && (
        <form onSubmit={handleSaveEditRoom} className="space-y-4 text-xs">
          <div>
            <label className={LABEL}>Room Name</label>
            <input
              type="text"
              required
              value={editingRoom.name}
              onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
              className={FIELD}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditingRoom(null)} className={CANCEL_BUTTON}>
              Cancel
            </button>
            <button type="submit" className={SUBMIT_BUTTON}>
              Save Room
            </button>
          </div>
        </form>
      )}
    </AppModal>
  </>
);
