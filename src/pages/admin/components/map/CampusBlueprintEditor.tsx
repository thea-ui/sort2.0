import React, { useState, useRef } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { BinLocationItem, StreamBinStatus, CategoryStreamType, BinStreamState } from '../../../../types';
import { useMockData } from '../../../../hooks/useMockData';
import {
  getStoredLocations,
  saveLocations,
  locationsToBins,
  getStoredRoomLocations,
  saveRoomLocations,
  STORAGE_KEY_BLUEPRINT_URL,
  STORAGE_KEY_BLUEPRINT_PRESET,
} from '../../../../services/locationStore';
import { BlueprintHeader } from './BlueprintHeader';
import { BlueprintPresetBar } from './BlueprintPresetBar';
import { BlueprintCanvas } from './BlueprintCanvas';
import { StationInspector } from './StationInspector';
import { StationModals } from './StationModals';
import { RoomLocationsManager } from './RoomLocationsManager';
import { RoomModals } from './RoomModals';

export const CampusBlueprintEditor: React.FC = () => {
  const { setBinsState, reports } = useMockData();

  const [locationList, setLocationList] = useState<BinLocationItem[]>(getStoredLocations);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'All' | 'Available' | 'Unavailable'>('All');
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedLocId, setSelectedLocId] = useState<string | null>('loc-1');
  const [showAddForm, setShowAddForm] = useState(false);

  React.useEffect(() => {
    const handleLocationsUpdated = () => {
      setLocationList(getStoredLocations());
    };

    window.addEventListener('storage', handleLocationsUpdated);
    window.addEventListener('sort_locations_updated', handleLocationsUpdated as EventListener);
    return () => {
      window.removeEventListener('storage', handleLocationsUpdated);
      window.removeEventListener('sort_locations_updated', handleLocationsUpdated as EventListener);
    };
  }, []);

  const [editingLoc, setEditingLoc] = useState<BinLocationItem | null>(null);
  const [deletingLoc, setDeletingLoc] = useState<BinLocationItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [draggingLocId, setDraggingLocId] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const [blueprintUrl, setBlueprintUrl] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY_BLUEPRINT_URL));
  const [selectedPreset, setSelectedPreset] = useState<'DEFAULT' | 'ARCHITECTURAL' | 'AERIAL'>(
    () => (localStorage.getItem(STORAGE_KEY_BLUEPRINT_PRESET) as any) || 'DEFAULT'
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    triggerToast('Added asset room location!');
  };

  const handleSaveEditRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom || !editingRoom.name.trim()) return;
    const updated = [...roomList];
    updated[editingRoom.index] = editingRoom.name.trim();
    setRoomList(updated);
    saveRoomLocations(updated);
    setEditingRoom(null);
    triggerToast('Updated room location name!');
  };

  const handleDeleteRoom = (index: number) => {
    const updated = roomList.filter((_, i) => i !== index);
    setRoomList(updated);
    saveRoomLocations(updated);
    triggerToast('Deleted room location!');
  };

  const [newLocName, setNewLocName] = useState('');
  const [newLocCode, setNewLocCode] = useState('');
  const [newLocX, setNewLocX] = useState(50);
  const [newLocY, setNewLocY] = useState(50);
  const [newBio, setNewBio] = useState(true);
  const [newNonBio, setNewNonBio] = useState(true);
  const [newRecycle, setNewRecycle] = useState(true);

  const updateAndSyncLocations = (newList: BinLocationItem[]) => {
    setLocationList(newList);
    saveLocations(newList);
    const newBins = locationsToBins(newList);
    setBinsState(newBins);
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image blueprint (PNG, JPG, SVG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setBlueprintUrl(dataUrl);
      localStorage.setItem(STORAGE_KEY_BLUEPRINT_URL, dataUrl);
      window.dispatchEvent(new Event('storage'));
      triggerToast('Campus Blueprint image uploaded successfully!');
    };
    reader.readAsDataURL(file);
  };

  const handleClearBlueprint = () => {
    setBlueprintUrl(null);
    localStorage.removeItem(STORAGE_KEY_BLUEPRINT_URL);
    window.dispatchEvent(new Event('storage'));
    triggerToast('Custom blueprint cleared. Restored to default vector grid.');
  };

  const handleSelectPreset = (preset: 'DEFAULT' | 'ARCHITECTURAL' | 'AERIAL') => {
    setSelectedPreset(preset);
    localStorage.setItem(STORAGE_KEY_BLUEPRINT_PRESET, preset);
    window.dispatchEvent(new Event('storage'));
    triggerToast(`Applied ${preset.toLowerCase()} map preset.`);
  };

  const handleMouseDown = (locId: string, e: React.MouseEvent) => {
    if (!isEditMode) return;
    e.stopPropagation();
    setDraggingLocId(locId);
    setSelectedLocId(locId);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditMode || !draggingLocId || !mapContainerRef.current) return;

    const rect = mapContainerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let pctX = Math.round((mouseX / rect.width) * 100);
    let pctY = Math.round((mouseY / rect.height) * 100);

    pctX = Math.max(5, Math.min(95, pctX));
    pctY = Math.max(5, Math.min(95, pctY));

    const updated = locationList.map((loc) => (loc.id === draggingLocId ? { ...loc, x: pctX, y: pctY } : loc));
    setLocationList(updated);
  };

  const handleMouseUp = () => {
    if (draggingLocId) {
      saveLocations(locationList);
      const newBins = locationsToBins(locationList);
      setBinsState(newBins);
      setDraggingLocId(null);
      triggerToast('Station pin position updated!');
    }
  };

  const handleSetStreamStatus = (locId: string, streamType: CategoryStreamType, newStatus: BinStreamState) => {
    const updated = locationList.map((loc) => {
      if (loc.id !== locId) return loc;

      const existingStream = loc.streams.find((st) => st.type === streamType);
      let newStreams: StreamBinStatus[];
      if (existingStream) {
        newStreams = loc.streams.map((st) => (st.type === streamType ? { ...st, status: newStatus } : st));
      } else {
        newStreams = [...loc.streams, { type: streamType, status: newStatus }];
      }

      const allUnavail = newStreams.every((s) => s.status === 'Unavailable' || s.status === 'No Bin');
      const overallStatus = allUnavail ? ('Unavailable' as const) : ('Available' as const);

      return { ...loc, streams: newStreams, status: overallStatus };
    });

    updateAndSyncLocations(updated);
    triggerToast(`Set ${streamType.replace('_', '-')} bin status to ${newStatus}!`);
  };

  const handleAddLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim()) return;

    const streams: StreamBinStatus[] = [];
    if (newBio) streams.push({ type: 'BIODEGRADABLE', status: 'Available' });
    if (newNonBio) streams.push({ type: 'NON_BIODEGRADABLE', status: 'Available' });
    if (newRecycle) streams.push({ type: 'RECYCLABLE', status: 'Available' });

    const newLoc: BinLocationItem = {
      id: `loc-${Date.now()}`,
      name: newLocName.trim(),
      code: newLocCode.trim() || `LOC-0${locationList.length + 1}`,
      status: 'Available',
      x: newLocX,
      y: newLocY,
      streams: streams.length > 0 ? streams : [{ type: 'RECYCLABLE', status: 'Available' }],
    };

    const updated = [...locationList, newLoc];
    updateAndSyncLocations(updated);

    setNewLocName('');
    setNewLocCode('');
    setShowAddForm(false);
    setSelectedLocId(newLoc.id);
    triggerToast(`Station "${newLoc.name}" added successfully!`);
  };

  const handleSaveEditedLoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLoc) return;

    const updated = locationList.map((l) => (l.id === editingLoc.id ? editingLoc : l));
    updateAndSyncLocations(updated);
    setEditingLoc(null);
    triggerToast('Station details updated!');
  };

  const handleConfirmDelete = () => {
    if (!deletingLoc) return;
    const updated = locationList.filter((l) => l.id !== deletingLoc.id);
    updateAndSyncLocations(updated);
    if (selectedLocId === deletingLoc.id) setSelectedLocId(locationList[0]?.id || null);
    setDeletingLoc(null);
    triggerToast('Station location deleted.');
  };

  const filteredList = locationList.filter((loc) => {
    const matchesSearch = loc.name.toLowerCase().includes(searchQuery.toLowerCase()) || loc.code.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'Available') return loc.status === 'Available';
    if (filter === 'Unavailable') return loc.status === 'Unavailable';
    return true;
  });

  const selectedLoc = locationList.find((l) => l.id === selectedLocId) || locationList[0] || null;

  const totalStations = locationList.length;
  const availableStationsCount = locationList.filter((l) => l.status === 'Available').length;
  const unavailableStationsCount = locationList.filter((l) => l.status === 'Unavailable').length;

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <BlueprintHeader
        totalStations={totalStations}
        availableStationsCount={availableStationsCount}
        unavailableStationsCount={unavailableStationsCount}
        isEditMode={isEditMode}
        setIsEditMode={setIsEditMode}
        setShowAddForm={setShowAddForm}
        fileInputRef={fileInputRef}
        handleFileUpload={handleFileUpload}
      />

      {toastMessage && (
        <div className="p-3 bg-emerald-500 text-white rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg animate-bounce">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} /> {toastMessage}
          </span>
          <button type="button" onClick={() => setToastMessage(null)} className="opacity-80 hover:opacity-100 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      <BlueprintPresetBar
        blueprintUrl={blueprintUrl}
        selectedPreset={selectedPreset}
        setSelectedPreset={handleSelectPreset}
        handleClearBlueprint={handleClearBlueprint}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <BlueprintCanvas
          filteredList={filteredList}
          selectedLocId={selectedLocId}
          setSelectedLocId={setSelectedLocId}
          draggingLocId={draggingLocId}
          setDraggingLocId={setDraggingLocId}
          isEditMode={isEditMode}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filter={filter}
          setFilter={setFilter}
          blueprintUrl={blueprintUrl}
          selectedPreset={selectedPreset}
          mapContainerRef={mapContainerRef}
          handleMouseDown={handleMouseDown}
          handleMouseMove={handleMouseMove}
          handleMouseUp={handleMouseUp}
        />

        <div className="lg:col-span-5 space-y-4">
          <StationInspector
            selectedLoc={selectedLoc}
            setEditingLoc={setEditingLoc}
            setDeletingLoc={setDeletingLoc}
            filteredList={filteredList}
            selectedLocId={selectedLocId}
            setSelectedLocId={setSelectedLocId}
            handleSetStreamStatus={handleSetStreamStatus}
            reports={reports}
          />
        </div>
      </div>

      <StationModals
        showAddForm={showAddForm}
        setShowAddForm={setShowAddForm}
        editingLoc={editingLoc}
        setEditingLoc={setEditingLoc}
        deletingLoc={deletingLoc}
        setDeletingLoc={setDeletingLoc}
        newLocName={newLocName}
        setNewLocName={setNewLocName}
        newLocCode={newLocCode}
        setNewLocCode={setNewLocCode}
        newLocX={newLocX}
        setNewLocX={setNewLocX}
        newLocY={newLocY}
        setNewLocY={setNewLocY}
        newBio={newBio}
        setNewBio={setNewBio}
        newNonBio={newNonBio}
        setNewNonBio={setNewNonBio}
        newRecycle={newRecycle}
        setNewRecycle={setNewRecycle}
        handleAddLocationSubmit={handleAddLocationSubmit}
        handleSaveEditedLoc={handleSaveEditedLoc}
        handleConfirmDelete={handleConfirmDelete}
      />

      <RoomLocationsManager
        roomList={roomList}
        setShowAddRoomModal={setShowAddRoomModal}
        setEditingRoom={setEditingRoom}
        handleDeleteRoom={handleDeleteRoom}
      />

      <RoomModals
        showAddRoomModal={showAddRoomModal}
        setShowAddRoomModal={setShowAddRoomModal}
        editingRoom={editingRoom}
        setEditingRoom={setEditingRoom}
        newRoomName={newRoomName}
        setNewRoomName={setNewRoomName}
        handleAddRoom={handleAddRoom}
        handleSaveEditRoom={handleSaveEditRoom}
      />
    </div>
  );
};


