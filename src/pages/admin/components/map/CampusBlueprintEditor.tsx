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
  BlueprintTransform,
  DEFAULT_BLUEPRINT_TRANSFORM,
  getStoredBlueprintUrl,
  getBlueprintTransform,
  saveBlueprint,
  clearBlueprint,
} from '../../../../services/locationStore';
import { BlueprintHeader } from './BlueprintHeader';
import { BlueprintAdjustControls } from './BlueprintAdjustControls';
import { BlueprintCanvas } from './BlueprintCanvas';
import { AtlasSyncButton } from '../../../../components/map/AtlasSyncButton';
import { AtlasFreshnessBadge } from '../../../../components/atlas/AtlasFreshnessBadge';
import { useAtlasMap } from '../../../../hooks/useAtlasMap';
import { StationInspector } from './StationInspector';
import { StationModals } from './StationModals';
import { RoomLocationsManager } from './RoomLocationsManager';
import { RoomModals } from './RoomModals';

// ── Blueprint helpers ─────────────────────────────────────────────────────

const MIN_BP_SCALE = 0.25;
const MAX_BP_SCALE = 4;
const clampScale = (n: number) => Math.min(MAX_BP_SCALE, Math.max(MIN_BP_SCALE, Math.round(n * 100) / 100));
const clampOffset = (n: number) => Math.min(300, Math.max(-300, Math.round(n * 10) / 10));

/** Downscale/compress large uploads so they fit comfortably in localStorage. */
function downscaleImageFile(file: File, maxDim = 1920): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read-error'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('decode-error'));
      img.onload = () => {
        const maxSide = Math.max(img.width, img.height) || 1;
        const ratio = Math.min(1, maxDim / maxSide);
        if (ratio === 1 && file.size < 1_500_000) {
          resolve(dataUrl);
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * ratio));
        canvas.height = Math.max(1, Math.round(img.height * ratio));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/webp', 0.85));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

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
  const outerCanvasRef = useRef<HTMLDivElement>(null);

  // ATLAS mirror: powers the base map plus the read-only room directory.
  const { buildings: atlasBuildings, syncedAt: atlasSyncedAt, stale: atlasStale } = useAtlasMap();

  const [blueprintUrl, setBlueprintUrl] = useState<string | null>(getStoredBlueprintUrl);
  const [blueprintTransform, setBlueprintTransform] = useState<BlueprintTransform>(getBlueprintTransform);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [draftTransform, setDraftTransform] = useState<BlueprintTransform>({ ...DEFAULT_BLUEPRINT_TRANSFORM });
  const [isSavingBlueprint, setIsSavingBlueprint] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const adjustDragRef = useRef<{ x: number; y: number } | null>(null);

  const displayUrl = isAdjusting ? pendingUrl : blueprintUrl;
  const displayTransform = isAdjusting ? draftTransform : blueprintTransform;

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

  const stageBlueprint = (dataUrl: string) => {
    setPendingUrl(dataUrl);
    setDraftTransform({ ...DEFAULT_BLUEPRINT_TRANSFORM });
    setIsAdjusting(true);
    triggerToast('Adjust the blueprint, then click Save.');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image blueprint (PNG, JPG, SVG, WebP)');
      return;
    }

    downscaleImageFile(file)
      .then(stageBlueprint)
      .catch(() => alert('Could not read that image. Please try another file.'));
  };

  const handleAdjustExisting = () => {
    if (!blueprintUrl) return;
    setPendingUrl(blueprintUrl);
    setDraftTransform({ ...blueprintTransform });
    setIsAdjusting(true);
  };

  const handleCancelAdjust = () => {
    setIsAdjusting(false);
    setPendingUrl(null);
    setDraftTransform({ ...DEFAULT_BLUEPRINT_TRANSFORM });
  };

  const handleSaveBlueprint = () => {
    if (!pendingUrl) return;
    setIsSavingBlueprint(true);
    saveBlueprint(pendingUrl, draftTransform);
    setBlueprintUrl(pendingUrl);
    setBlueprintTransform(draftTransform);
    setIsSavingBlueprint(false);
    setIsAdjusting(false);
    setPendingUrl(null);
    triggerToast('Blueprint saved and applied to all maps.');
  };

  const handleRemoveBlueprint = () => {
    clearBlueprint();
    setBlueprintUrl(null);
    setBlueprintTransform({ ...DEFAULT_BLUEPRINT_TRANSFORM });
    setIsAdjusting(false);
    setPendingUrl(null);
    triggerToast('Blueprint removed. Showing the default grid.');
  };

  // ── Adjust-mode interaction (pan + wheel zoom) ────────────────────────
  const handleAdjustPointerDown = (e: React.PointerEvent) => {
    if (!isAdjusting) return;
    adjustDragRef.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };

  const handleAdjustPointerMove = (e: React.PointerEvent) => {
    if (!isAdjusting || !adjustDragRef.current || !mapContainerRef.current) return;
    const rect = mapContainerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - adjustDragRef.current.x) / rect.width) * 100;
    const dy = ((e.clientY - adjustDragRef.current.y) / rect.height) * 100;
    adjustDragRef.current = { x: e.clientX, y: e.clientY };
    setDraftTransform((t) => ({
      ...t,
      offsetX: clampOffset(t.offsetX + dx),
      offsetY: clampOffset(t.offsetY + dy),
    }));
  };

  const handleAdjustPointerUp = () => {
    adjustDragRef.current = null;
  };

  React.useEffect(() => {
    if (!isAdjusting) return;
    // Listen on the full canvas (not the fitted content box) so wheel-to-zoom
    // works over the letterbox margins too.
    const el = outerCanvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setDraftTransform((t) => ({ ...t, scale: clampScale(t.scale * (1 - e.deltaY * 0.001)) }));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [isAdjusting]);

  const handleMouseDown = (locId: string, e: React.MouseEvent) => {
    if (!isEditMode || isAdjusting) return;
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
      // Pin moves save silently: the pin itself is the feedback, and the toast
      // covered the map on every drag.
      saveLocations(locationList);
      const newBins = locationsToBins(locationList);
      setBinsState(newBins);
      setDraggingLocId(null);
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

    // Bin stream toggles save silently: the dropdown/status text is the feedback.
    updateAndSyncLocations(updated);
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
        hasBlueprint={!!blueprintUrl}
        isAdjusting={isAdjusting}
        onAdjust={handleAdjustExisting}
        onRemove={handleRemoveBlueprint}
        statusControl={<AtlasFreshnessBadge syncedAt={atlasSyncedAt} stale={atlasStale} />}
        syncControl={<AtlasSyncButton />}
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

      {isAdjusting && (
        <BlueprintAdjustControls
          transform={draftTransform}
          onChange={setDraftTransform}
          onFit={() => setDraftTransform({ ...DEFAULT_BLUEPRINT_TRANSFORM })}
          onCancel={handleCancelAdjust}
          onSave={handleSaveBlueprint}
          saving={isSavingBlueprint}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <BlueprintCanvas
          filteredList={filteredList}
          selectedLocId={selectedLocId}
          setSelectedLocId={setSelectedLocId}
          draggingLocId={draggingLocId}
          isEditMode={isEditMode}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filter={filter}
          setFilter={setFilter}
          blueprintUrl={displayUrl}
          blueprintTransform={displayTransform}
          isAdjusting={isAdjusting}
          onAdjustPointerDown={handleAdjustPointerDown}
          onAdjustPointerMove={handleAdjustPointerMove}
          onAdjustPointerUp={handleAdjustPointerUp}
          mapContainerRef={mapContainerRef}
          canvasRef={outerCanvasRef}
          forceBlueprint={isAdjusting}
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
        atlasBuildings={atlasBuildings}
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


