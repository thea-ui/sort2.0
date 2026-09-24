import React from 'react';
import { useMockData } from '../../../../hooks/useMockData';
import { DEFAULT_BLUEPRINT_TRANSFORM } from '../../../../services/locationStore';
import { AtlasSyncButton } from '../../../../components/map/AtlasSyncButton';
import { AtlasFreshnessBadge } from '../../../../components/atlas/AtlasFreshnessBadge';
import { useAtlasMap } from '../../../../hooks/useAtlasMap';
import { BlueprintHeader } from './BlueprintHeader';
import { BlueprintAdjustControls } from './BlueprintAdjustControls';
import { BlueprintCanvas } from './BlueprintCanvas';
import { StationInspector } from './StationInspector';
import { StationModals } from './StationModals';
import { RoomLocationsManager } from './RoomLocationsManager';
import { RoomModals } from './RoomModals';
import { useBlueprintEditor } from './useBlueprintEditor';
import { useBinLocationEditor } from './useBinLocationEditor';
import { useRoomLocations } from './useRoomLocations';

/**
 * Campus map editor: composes the blueprint, station, and room hooks with the
 * canvas/inspector/modals. All alerts replaced with global toasts.
 */
export const CampusBlueprintEditor: React.FC = () => {
  const { setBinsState, reports } = useMockData();

  // ATLAS mirror: powers the base map plus the read-only room directory.
  const {
    buildings: atlasBuildings,
    syncedAt: atlasSyncedAt,
    stale: atlasStale,
  } = useAtlasMap();

  const blueprint = useBlueprintEditor();
  const stations = useBinLocationEditor(setBinsState);
  const rooms = useRoomLocations();

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <BlueprintHeader
        totalStations={stations.totalStations}
        availableStationsCount={stations.availableStationsCount}
        unavailableStationsCount={stations.unavailableStationsCount}
        isEditMode={stations.isEditMode}
        setIsEditMode={stations.setIsEditMode}
        setShowAddForm={stations.setShowAddForm}
        fileInputRef={blueprint.fileInputRef}
        handleFileUpload={blueprint.handleFileUpload}
        hasBlueprint={!!blueprint.blueprintUrl}
        isAdjusting={blueprint.isAdjusting}
        onAdjust={blueprint.handleAdjustExisting}
        onRemove={blueprint.handleRemoveBlueprint}
        statusControl={<AtlasFreshnessBadge syncedAt={atlasSyncedAt} stale={atlasStale} />}
        syncControl={<AtlasSyncButton />}
      />

      {blueprint.isAdjusting && (
        <BlueprintAdjustControls
          transform={blueprint.draftTransform}
          onChange={blueprint.setDraftTransform}
          onFit={() => blueprint.setDraftTransform({ ...DEFAULT_BLUEPRINT_TRANSFORM })}
          onCancel={blueprint.handleCancelAdjust}
          onSave={blueprint.handleSaveBlueprint}
          saving={blueprint.isSavingBlueprint}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <BlueprintCanvas
          filteredList={stations.filteredList}
          selectedLocId={stations.selectedLocId}
          setSelectedLocId={stations.setSelectedLocId}
          draggingLocId={stations.draggingLocId}
          isEditMode={stations.isEditMode}
          searchQuery={stations.searchQuery}
          setSearchQuery={stations.setSearchQuery}
          filter={stations.filter}
          setFilter={stations.setFilter}
          blueprintUrl={blueprint.displayUrl}
          blueprintTransform={blueprint.displayTransform}
          isAdjusting={blueprint.isAdjusting}
          onAdjustPointerDown={blueprint.handleAdjustPointerDown}
          onAdjustPointerMove={(e) =>
            blueprint.handleAdjustPointerMove(e, stations.mapContainerRef.current)
          }
          onAdjustPointerUp={blueprint.handleAdjustPointerUp}
          mapContainerRef={stations.mapContainerRef}
          canvasRef={blueprint.outerCanvasRef}
          forceBlueprint={blueprint.isAdjusting}
          handleMouseDown={(locId, e) => {
            if (blueprint.isAdjusting) return;
            stations.handleMouseDown(locId, e);
          }}
          handleMouseMove={stations.handleMouseMove}
          handleMouseUp={stations.handleMouseUp}
        />

        <div className="lg:col-span-5 space-y-4">
          <StationInspector
            selectedLoc={stations.selectedLoc}
            setEditingLoc={stations.setEditingLoc}
            setDeletingLoc={stations.setDeletingLoc}
            filteredList={stations.filteredList}
            selectedLocId={stations.selectedLocId}
            setSelectedLocId={stations.setSelectedLocId}
            handleSetStreamStatus={stations.handleSetStreamStatus}
            reports={reports}
          />
        </div>
      </div>

      <StationModals
        showAddForm={stations.showAddForm}
        setShowAddForm={stations.setShowAddForm}
        editingLoc={stations.editingLoc}
        setEditingLoc={stations.setEditingLoc}
        deletingLoc={stations.deletingLoc}
        setDeletingLoc={stations.setDeletingLoc}
        newLocName={stations.newLocName}
        setNewLocName={stations.setNewLocName}
        newLocCode={stations.newLocCode}
        setNewLocCode={stations.setNewLocCode}
        newLocX={stations.newLocX}
        setNewLocX={stations.setNewLocX}
        newLocY={stations.newLocY}
        setNewLocY={stations.setNewLocY}
        newBio={stations.newBio}
        setNewBio={stations.setNewBio}
        newNonBio={stations.newNonBio}
        setNewNonBio={stations.setNewNonBio}
        newRecycle={stations.newRecycle}
        setNewRecycle={stations.setNewRecycle}
        handleAddLocationSubmit={stations.handleAddLocationSubmit}
        handleSaveEditedLoc={stations.handleSaveEditedLoc}
        handleConfirmDelete={stations.handleConfirmDelete}
      />

      <RoomLocationsManager
        roomList={rooms.roomList}
        atlasBuildings={atlasBuildings}
        setShowAddRoomModal={rooms.setShowAddRoomModal}
        setEditingRoom={rooms.setEditingRoom}
        handleDeleteRoom={rooms.handleDeleteRoom}
      />

      <RoomModals
        showAddRoomModal={rooms.showAddRoomModal}
        setShowAddRoomModal={rooms.setShowAddRoomModal}
        editingRoom={rooms.editingRoom}
        setEditingRoom={rooms.setEditingRoom}
        newRoomName={rooms.newRoomName}
        setNewRoomName={rooms.setNewRoomName}
        handleAddRoom={rooms.handleAddRoom}
        handleSaveEditRoom={rooms.handleSaveEditRoom}
      />
    </div>
  );
};
