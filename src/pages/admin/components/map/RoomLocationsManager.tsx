import React from 'react';
import { Building2, Plus, Edit2, Trash2 } from 'lucide-react';

interface RoomLocationsManagerProps {
  roomList: string[];
  setShowAddRoomModal: (v: boolean) => void;
  setEditingRoom: (v: { index: number; name: string } | null) => void;
  handleDeleteRoom: (index: number) => void;
}

export const RoomLocationsManager: React.FC<RoomLocationsManagerProps> = ({
  roomList,
  setShowAddRoomModal,
  setEditingRoom,
  handleDeleteRoom,
}) => (
  <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-4">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
      <div>
        <span className="text-[10px] font-extrabold text-[#00A77C] bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          Asset Location Presets
        </span>
        <h3 className="text-base font-extrabold text-[#00271D] mt-1 flex items-center gap-2">
          <Building2 size={18} className="text-[#00A77C]" />
          Campus Asset Room Locations ({roomList.length})
        </h3>
        <p className="text-xs text-[#00271D]/50 mt-0.5 font-medium">
          Manage reportable classroom, laboratory, and office room locations for faculty asset tickets
        </p>
      </div>
      <button type="button" onClick={() => setShowAddRoomModal(true)} className="px-4 py-2 bg-[#00A77C] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-[#008f6a] cursor-pointer shrink-0">
        <Plus size={14} /> Add Room Location
      </button>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
      {roomList.map((roomName, idx) => (
        <div key={`${roomName}-${idx}`} className="p-3 bg-[#F9F3F0] rounded-2xl flex items-center justify-between text-xs border border-gray-200/60 hover:border-[#00A77C]/40 transition-colors">
          <span className="font-bold text-[#00271D] truncate max-w-[200px]" title={roomName}>{roomName}</span>
          <div className="flex items-center gap-1 shrink-0">
            <button type="button" onClick={() => setEditingRoom({ index: idx, name: roomName })} className="p-1 text-[#00271D]/40 hover:text-blue-600 cursor-pointer" title="Edit Room Name">
              <Edit2 size={13} />
            </button>
            <button type="button" onClick={() => handleDeleteRoom(idx)} className="p-1 text-[#00271D]/40 hover:text-rose-600 cursor-pointer" title="Delete Room Location">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);
