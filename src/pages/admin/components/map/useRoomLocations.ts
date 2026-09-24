import React, { useState } from 'react';
import { getStoredRoomLocations, saveRoomLocations } from '../../../../services/locationStore';
import { useToast } from '../../../../hooks/useToast';

/** Room-location directory state (ATLAS room list) for the campus map editor. */
export function useRoomLocations() {
  const toast = useToast();

  const [roomList, setRoomList] = useState<string[]>(getStoredRoomLocations);
  const [newRoomName, setNewRoomName] = useState('');
  const [editingRoom, setEditingRoom] = useState<{ index: number; name: string } | null>(null);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);

  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    const updated = [newRoomName.trim(), ...roomList];
    setRoomList(updated);
    saveRoomLocations(updated);
    setNewRoomName('');
    setShowAddRoomModal(false);
    toast.success('Added asset room location!');
  };

  const handleSaveEditRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom || !editingRoom.name.trim()) return;
    const updated = [...roomList];
    updated[editingRoom.index] = editingRoom.name.trim();
    setRoomList(updated);
    saveRoomLocations(updated);
    setEditingRoom(null);
    toast.success('Updated room location name!');
  };

  const handleDeleteRoom = (index: number) => {
    const updated = roomList.filter((_, i) => i !== index);
    setRoomList(updated);
    saveRoomLocations(updated);
    toast.success('Deleted room location!');
  };

  return {
    roomList,
    newRoomName,
    setNewRoomName,
    editingRoom,
    setEditingRoom,
    showAddRoomModal,
    setShowAddRoomModal,
    handleAddRoom,
    handleSaveEditRoom,
    handleDeleteRoom,
  };
}
