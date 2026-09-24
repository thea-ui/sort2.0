import React, { useEffect, useRef, useState } from 'react';
import {
  BinLocationItem,
  BinStatus,
  BinStreamState,
  CategoryStreamType,
  StreamBinStatus,
} from '../../../../types';
import {
  getStoredLocations,
  locationsToBins,
  saveLocations,
} from '../../../../services/locationStore';
import { useToast } from '../../../../hooks/useToast';

export type StationFilter = 'All' | 'Available' | 'Unavailable';

/**
 * Bin-station directory state for the campus map editor: list persistence +
 * cross-tab sync, add/edit/delete, drag-to-reposition, and stream status
 * toggles. Pin moves and stream toggles save silently (the pin/status is the
 * feedback); explicit CRUD actions toast.
 */
export function useBinLocationEditor(setBinsState: (bins: BinStatus[]) => void) {
  const toast = useToast();

  const [locationList, setLocationList] = useState<BinLocationItem[]>(getStoredLocations);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<StationFilter>('All');
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedLocId, setSelectedLocId] = useState<string | null>('loc-1');
  const [showAddForm, setShowAddForm] = useState(false);

  const [editingLoc, setEditingLoc] = useState<BinLocationItem | null>(null);
  const [deletingLoc, setDeletingLoc] = useState<BinLocationItem | null>(null);
  const [draggingLocId, setDraggingLocId] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const [newLocName, setNewLocName] = useState('');
  const [newLocCode, setNewLocCode] = useState('');
  const [newLocX, setNewLocX] = useState(50);
  const [newLocY, setNewLocY] = useState(50);
  const [newBio, setNewBio] = useState(true);
  const [newNonBio, setNewNonBio] = useState(true);
  const [newRecycle, setNewRecycle] = useState(true);

  useEffect(() => {
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

  const updateAndSyncLocations = (newList: BinLocationItem[]) => {
    setLocationList(newList);
    saveLocations(newList);
    setBinsState(locationsToBins(newList));
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

    const pctX = Math.max(5, Math.min(95, Math.round((mouseX / rect.width) * 100)));
    const pctY = Math.max(5, Math.min(95, Math.round((mouseY / rect.height) * 100)));

    setLocationList((prev) =>
      prev.map((loc) => (loc.id === draggingLocId ? { ...loc, x: pctX, y: pctY } : loc)),
    );
  };

  const handleMouseUp = () => {
    if (draggingLocId) {
      saveLocations(locationList);
      setBinsState(locationsToBins(locationList));
      setDraggingLocId(null);
    }
  };

  const handleSetStreamStatus = (
    locId: string,
    streamType: CategoryStreamType,
    newStatus: BinStreamState,
  ) => {
    const updated = locationList.map((loc) => {
      if (loc.id !== locId) return loc;

      const existingStream = loc.streams.find((st) => st.type === streamType);
      let newStreams: StreamBinStatus[];
      if (existingStream) {
        newStreams = loc.streams.map((st) =>
          st.type === streamType ? { ...st, status: newStatus } : st,
        );
      } else {
        newStreams = [...loc.streams, { type: streamType, status: newStatus }];
      }

      const allUnavail = newStreams.every(
        (s) => s.status === 'Unavailable' || s.status === 'No Bin',
      );
      const overallStatus = allUnavail ? ('Unavailable' as const) : ('Available' as const);

      return { ...loc, streams: newStreams, status: overallStatus };
    });

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

    updateAndSyncLocations([...locationList, newLoc]);

    setNewLocName('');
    setNewLocCode('');
    setShowAddForm(false);
    setSelectedLocId(newLoc.id);
    toast.success(`Station "${newLoc.name}" added successfully!`);
  };

  const handleSaveEditedLoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLoc) return;

    const updated = locationList.map((l) => (l.id === editingLoc.id ? editingLoc : l));
    updateAndSyncLocations(updated);
    setEditingLoc(null);
    toast.success('Station details updated!');
  };

  const handleConfirmDelete = () => {
    if (!deletingLoc) return;
    const updated = locationList.filter((l) => l.id !== deletingLoc.id);
    updateAndSyncLocations(updated);
    if (selectedLocId === deletingLoc.id) setSelectedLocId(locationList[0]?.id || null);
    setDeletingLoc(null);
    toast.success('Station location deleted.');
  };

  const filteredList = locationList.filter((loc) => {
    const matchesSearch =
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.code.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'Available') return loc.status === 'Available';
    if (filter === 'Unavailable') return loc.status === 'Unavailable';
    return true;
  });

  const selectedLoc = locationList.find((l) => l.id === selectedLocId) || locationList[0] || null;

  return {
    locationList,
    filteredList,
    selectedLoc,
    totalStations: locationList.length,
    availableStationsCount: locationList.filter((l) => l.status === 'Available').length,
    unavailableStationsCount: locationList.filter((l) => l.status === 'Unavailable').length,
    searchQuery,
    setSearchQuery,
    filter,
    setFilter,
    isEditMode,
    setIsEditMode,
    selectedLocId,
    setSelectedLocId,
    showAddForm,
    setShowAddForm,
    editingLoc,
    setEditingLoc,
    deletingLoc,
    setDeletingLoc,
    draggingLocId,
    mapContainerRef,
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
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleSetStreamStatus,
    handleAddLocationSubmit,
    handleSaveEditedLoc,
    handleConfirmDelete,
  };
}
