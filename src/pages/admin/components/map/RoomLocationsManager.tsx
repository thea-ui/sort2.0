import React from 'react';
import { Building2, ChevronDown, Plus, Edit2, Trash2 } from 'lucide-react';
import { AtlasBuilding } from '../../../../types';
import { AtlasRoomDirectory } from './AtlasRoomDirectory';

interface RoomLocationsManagerProps {
  roomList: string[];
  /** ATLAS mirror buildings; when they contain rooms, they become the primary list. */
  atlasBuildings?: AtlasBuilding[];
  setShowAddRoomModal: (v: boolean) => void;
  setEditingRoom: (v: { index: number; name: string } | null) => void;
  handleDeleteRoom: (index: number) => void;
}

const ManualRoomGrid: React.FC<{
  roomList: string[];
  setEditingRoom: (v: { index: number; name: string } | null) => void;
  handleDeleteRoom: (index: number) => void;
}> = ({ roomList, setEditingRoom, handleDeleteRoom }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
    {roomList.map((roomName, idx) => (
      <div
        key={`${roomName}-${idx}`}
        data-testid="fallback-room-item"
        className="p-3 bg-[var(--background)] rounded-2xl flex items-center justify-between text-xs border border-gray-200/60 hover:border-[var(--accent)]/40 transition-colors"
      >
        <span className="font-bold text-[var(--text-strong)] truncate max-w-[200px]" title={roomName}>{roomName}</span>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={() => setEditingRoom({ index: idx, name: roomName })} className="p-1 text-[var(--text-strong)]/40 hover:text-[var(--text-strong)] cursor-pointer" title="Edit Room Name">
            <Edit2 size={13} />
          </button>
          <button type="button" onClick={() => handleDeleteRoom(idx)} className="p-1 text-[var(--text-strong)]/40 hover:text-rose-600 cursor-pointer" title="Delete Room Location">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    ))}
  </div>
);

export const RoomLocationsManager: React.FC<RoomLocationsManagerProps> = ({
  roomList,
  atlasBuildings = [],
  setShowAddRoomModal,
  setEditingRoom,
  handleDeleteRoom,
}) => {
  const hasAtlasRooms = atlasBuildings.some((building) => building.rooms.length > 0);

  const addButton = (
    <button type="button" onClick={() => setShowAddRoomModal(true)} className="px-4 py-2 bg-[var(--accent)] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-[var(--accent-dark)] cursor-pointer shrink-0">
      <Plus size={14} /> Add Room Location
    </button>
  );

  const manualHeader = (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
      <div>
        <span className="text-[10px] font-extrabold text-[var(--accent)] bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          Asset Location Presets
        </span>
        <h3 className="text-base font-extrabold text-[var(--text-strong)] mt-1 flex items-center gap-2">
          <Building2 size={18} className="text-[var(--accent)]" />
          Campus Asset Room Locations ({roomList.length})
        </h3>
        <p className="text-xs text-[var(--text-strong)]/50 mt-0.5 font-medium">
          Manage reportable classroom, laboratory, and office room locations for faculty asset tickets
        </p>
      </div>
      {addButton}
    </div>
  );

  if (!hasAtlasRooms) {
    return (
      <div
        data-testid="room-locations-manager"
        className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-4"
      >
        {manualHeader}
        <ManualRoomGrid
          roomList={roomList}
          setEditingRoom={setEditingRoom}
          handleDeleteRoom={handleDeleteRoom}
        />
      </div>
    );
  }

  return (
    <div
      data-testid="room-locations-manager"
      className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-4"
    >
      <AtlasRoomDirectory buildings={atlasBuildings} />

      <details
        data-testid="fallback-rooms"
        className="border border-gray-200/70 rounded-2xl bg-[var(--background)]/40 group"
      >
        <summary className="cursor-pointer select-none px-4 py-3 text-xs font-bold text-[var(--text-strong)]/70 flex items-center gap-2 list-none">
          <ChevronDown size={13} className="text-[var(--text-strong)]/40 transition-transform group-open:rotate-180" />
          Fallback room presets ({roomList.length}) — used only when ATLAS is unavailable
        </summary>
        <div className="px-4 pb-4 space-y-3">
          <div className="flex justify-end">{addButton}</div>
          <ManualRoomGrid
            roomList={roomList}
            setEditingRoom={setEditingRoom}
            handleDeleteRoom={handleDeleteRoom}
          />
        </div>
      </details>
    </div>
  );
};
