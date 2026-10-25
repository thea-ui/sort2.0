import React, { useState, useMemo, useEffect } from 'react';
import { Send, ChevronLeft, AlertTriangle } from 'lucide-react';
import {
  InfrastructurePillar,
  PillarMeta,
  buildCategoryDetails,
  CONDITIONS,
  URGENCIES,
  getBinLocations,
  getAssetRoomLocations,
  groupStations,
} from './teacherReportData';
import {
  TeacherSubmitSuccessView,
  SubmittedReportDetails,
} from './TeacherSubmitSuccessView';
import { useSystemPresets } from '../../../hooks/useSystemPresets';
import { useAtlasMap } from '../../../hooks/useAtlasMap';
import { atlasRoomToLocationString } from '../../../components/atlas/atlasRoomMeta';
import { TeacherCategorySelector } from './TeacherCategorySelector';
import { TeacherPhotoEvidence } from './TeacherPhotoEvidence';
import { TeacherLocationSelector } from './TeacherLocationSelector';
import { TeacherAssetItemGrid } from './TeacherAssetItemGrid';
import { TeacherConditionUrgency } from './TeacherConditionUrgency';
import { TeacherNotesSection } from './TeacherNotesSection';

interface TeacherSubmitReportTabProps {
  bins?: any[];
  reports?: any[];
  pillarCategory: InfrastructurePillar;
  setPillarCategory: (cat: InfrastructurePillar) => void;
  reportTitle: string;
  setReportTitle: (t: string) => void;
  notes: string;
  setNotes: (n: string) => void;
  observation: string;
  setObservation: (o: string) => void;
  selectedBuilding: string;
  setSelectedBuilding: (b: string) => void;
  roomNumber: string;
  setRoomNumber: (r: string) => void;
  wizardStep: number;
  setWizardStep: (s: number) => void;
  capturedImage: string | null;
  setCapturedImage: (img: string | null) => void;
  isCapturing: boolean;
  handleCapture: () => void;
  gpsCoords: { lat: number; lng: number } | null;
  setGpsCoords: (coords: { lat: number; lng: number } | null) => void;
  gpsLoading: boolean;
  handleGPSDetect: () => void;
  isSubmitting: boolean;
  submitSuccess: boolean;
  setSubmitSuccess?: (val: boolean) => void;
  lastSubmittedReport?: SubmittedReportDetails | null;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  setUrgency: (u: 'LOW' | 'MEDIUM' | 'HIGH') => void;
  isPinningMode: boolean;
  setIsPinningMode: (p: boolean) => void;
  isCustomDebrisPin: boolean;
  setIsCustomDebrisPin: (p: boolean) => void;
  assignedLocationText: string;
  setAssignedLocationText: (txt: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  PILLAR_META: Record<string, PillarMeta>;
  OBSERVATION_OPTIONS: string[];
  STEPS: string[];
  isWasteCategory: boolean;
  MAP_BOUNDS: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  coordToPct: (lat: number, lng: number) => { pctX: number; pctY: number };
  setActiveTab?: (tab: string) => void;
}

export const TeacherSubmitReportTab: React.FC<TeacherSubmitReportTabProps> = ({
  bins = [],
  reports = [],
  pillarCategory,
  setPillarCategory,
  reportTitle,
  setReportTitle,
  notes,
  setNotes,
  observation,
  setObservation,
  selectedBuilding,
  setSelectedBuilding,
  roomNumber,
  setRoomNumber,
  capturedImage,
  setCapturedImage,
  isCapturing,
  handleCapture,
  isSubmitting,
  submitSuccess,
  setSubmitSuccess,
  lastSubmittedReport = null,
  urgency,
  setUrgency,
  isPinningMode,
  setIsPinningMode,
  isCustomDebrisPin,
  setIsCustomDebrisPin,
  gpsCoords,
  setGpsCoords,
  handleSubmit,
  PILLAR_META,
  setActiveTab,
}) => {
  const isWasteCategory = pillarCategory === 'waste';
  const stations = useMemo(() => groupStations(bins || [], reports || []), [bins, reports]);
  const [activePopoverStation, setActivePopoverStation] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategoryState] = useState<InfrastructurePillar | null>(null);
  const [wasteCategory, setWasteCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>(
    roomNumber && selectedBuilding ? `${selectedBuilding} – ${roomNumber}` : ''
  );
  const [locationSearch, setLocationSearch] = useState<string>('');
  const [assetRoomList, setAssetRoomList] = useState<string[]>(getAssetRoomLocations);
  const { buildings: atlasBuildings } = useAtlasMap();

  useEffect(() => {
    const handleRoomStorage = () => setAssetRoomList(getAssetRoomLocations());
    window.addEventListener('storage', handleRoomStorage);
    window.addEventListener('sort_rooms_updated', handleRoomStorage as EventListener);
    return () => {
      window.removeEventListener('storage', handleRoomStorage);
      window.removeEventListener('sort_rooms_updated', handleRoomStorage as EventListener);
    };
  }, []);

  const [blueprintUrl, setBlueprintUrl] = useState<string | null>(() => localStorage.getItem('sort_blueprint_url'));

  useEffect(() => {
    const handleBlueprintStorage = () => {
      setBlueprintUrl(localStorage.getItem('sort_blueprint_url'));
    };
    window.addEventListener('storage', handleBlueprintStorage);
    window.addEventListener('sort_locations_updated', handleBlueprintStorage as EventListener);
    window.addEventListener('sort_blueprint_updated', handleBlueprintStorage as EventListener);
    return () => {
      window.removeEventListener('storage', handleBlueprintStorage);
      window.removeEventListener('sort_locations_updated', handleBlueprintStorage as EventListener);
      window.removeEventListener('sort_blueprint_updated', handleBlueprintStorage as EventListener);
    };
  }, []);

  const [selectedCondition, setSelectedConditionState] = useState<string>(observation || 'Damaged');
  const [selectedUrgencyState, setSelectedUrgencyState] = useState<'LOW' | 'MEDIUM' | 'HIGH'>(urgency || 'MEDIUM');

  const activeStation = useMemo(() => {
    const selLower = selectedLocation.toLowerCase();
    return (
      stations.find(s => {
        const sLower = s.locationName.toLowerCase();
        return selLower === sLower || selLower.includes(sLower) || sLower.includes(selLower.split(' – ')[0]);
      }) || stations[0]
    );
  }, [stations, selectedLocation]);

  const handleSelectCategory = (catKey: InfrastructurePillar) => {
    setSelectedCategoryState(catKey);
    setPillarCategory(catKey);
  };

  const handleLocationSelect = (locName: string) => {
    setSelectedLocation(locName);
    const parts = locName.split(' – ');
    if (parts.length > 1) {
      setRoomNumber(parts[0]);
      setSelectedBuilding(parts[1]);
    } else {
      setRoomNumber('');
      setSelectedBuilding(locName);
    }
  };

  const handleItemSelect = (itemLabel: string) => {
    setSelectedItem(itemLabel);
    setReportTitle(itemLabel);
  };

  const handleSelectWasteCategory = (catType: string, binId?: string | null) => {
    setWasteCategory(catType);
    const catLabel = catType === 'BIODEGRADABLE' ? 'Biodegradable' : catType === 'NON_BIODEGRADABLE' ? 'Non-Biodegradable' : 'Recyclable';
    setReportTitle(catLabel);
    setSelectedItem(catLabel);
  };

  const handleConditionSelect = (condLabel: string) => {
    setSelectedConditionState(condLabel);
    setObservation(condLabel);
  };

  const handleUrgencySelect = (urgVal: 'LOW' | 'MEDIUM' | 'HIGH') => {
    setSelectedUrgencyState(urgVal);
    setUrgency(urgVal);
  };

  useEffect(() => {
    if (submitSuccess) {
      setSelectedCategoryState(null);
      setSelectedItem('');
      setSelectedLocation('');
      setLocationSearch('');
      setNotes('');
      setCapturedImage(null);
      setGpsCoords(null);
      setSelectedConditionState('Damaged');
      setSelectedUrgencyState('MEDIUM');
    }
  }, [submitSuccess]);

  const handleResetForm = () => {
    setSubmitSuccess?.(false);
    setSelectedCategoryState(null);
    setSelectedItem('');
    setSelectedLocation('');
    setLocationSearch('');
    setNotes('');
    setCapturedImage(null);
    setGpsCoords(null);
    setSelectedConditionState('Damaged');
    setSelectedUrgencyState('MEDIUM');
  };

  const { presetGroups, categories, categoriesLoaded, presetGroupsLoaded, assetConditions, urgencyLevels } = useSystemPresets();

  const dynamicCategoryDetails = useMemo(
    () => buildCategoryDetails(categories, presetGroups, categoriesLoaded, presetGroupsLoaded),
    [presetGroups, categories, categoriesLoaded, presetGroupsLoaded]
  );

  useEffect(() => {
    if (selectedCategory && !dynamicCategoryDetails[selectedCategory]) {
      setSelectedCategoryState(null);
      setSelectedItem('');
    }
  }, [dynamicCategoryDetails, selectedCategory]);

  const dynamicConditions = useMemo(() => {
    if (assetConditions && assetConditions.length > 0) {
      return assetConditions.filter(c => c.enabled).map(c => ({
        id: c.name,
        label: c.name,
        desc: c.description,
      }));
    }
    return CONDITIONS;
  }, [assetConditions]);

  const dynamicUrgencies = useMemo(() => {
    if (urgencyLevels && urgencyLevels.length > 0) {
      return urgencyLevels.filter(u => u.enabled).map(u => ({
        id: u.level,
        label: u.level,
        desc: u.description || `${u.slaHours}h SLA`,
        value: u.code as 'LOW' | 'MEDIUM' | 'HIGH',
      }));
    }
    return URGENCIES;
  }, [urgencyLevels]);

  // Asset room suggestions come from the ATLAS mirror when available and
  // silently fall back to the legacy stored list when it is not (plan §7.13).
  // Format contract: "<room> – <building>" (split on ' – ' elsewhere).
  const atlasRoomLocations = React.useMemo(
    () =>
      Array.from(
        new Set(
          atlasBuildings.flatMap((building) =>
            building.rooms.map((room) => atlasRoomToLocationString(room, building.name))
          )
        )
      ),
    [atlasBuildings]
  );
  const assetLocations = atlasRoomLocations.length > 0 ? atlasRoomLocations : assetRoomList;

  const displayLocations = isWasteCategory ? getBinLocations(bins) : assetLocations;

  const filteredLocations = displayLocations.filter(loc =>
    loc.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const activeMeta = selectedCategory ? dynamicCategoryDetails[selectedCategory] : null;

  if (submitSuccess) {
    return (
      <TeacherSubmitSuccessView
        lastSubmittedReport={lastSubmittedReport}
        PILLAR_META={PILLAR_META}
        onReset={handleResetForm}
        onViewHistory={setActiveTab ? () => { setSubmitSuccess?.(false); setActiveTab('report-history'); } : undefined}
      />
    );
  }

  return (
    <div className="w-full space-y-4 animate-fade-in pb-8 sm:space-y-5">
      {!selectedCategory ? (
        <TeacherCategorySelector pillarMeta={PILLAR_META} onSelect={handleSelectCategory} />
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-12 xl:items-start">
          <div className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-[var(--primary)]/10 bg-white p-4 sm:p-5 xl:col-span-12">
            <button
              type="button"
              onClick={() => setSelectedCategoryState(null)}
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/20"
              title="Back to category selection"
            >
              <ChevronLeft size={20} />
            </button>

            {activeMeta && (
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
                  {React.createElement(activeMeta.icon, { size: 22 })}
                </div>
                <div>
                  <h2 className="text-base font-heading font-black tracking-tight text-[var(--text-strong)] sm:text-lg">{activeMeta.title}</h2>
                  <p className="text-[11px] font-medium text-[var(--text-strong)]/55">{activeMeta.subtitle}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4 sm:space-y-5 xl:col-span-8">
          <TeacherPhotoEvidence
            capturedImage={capturedImage}
            setCapturedImage={setCapturedImage}
            isCapturing={isCapturing}
            handleCapture={handleCapture}
          />

          <TeacherLocationSelector
            isWasteCategory={isWasteCategory}
            selectedLocation={selectedLocation}
            setSelectedLocation={setSelectedLocation}
            roomNumber={roomNumber}
            setRoomNumber={setRoomNumber}
            selectedBuilding={selectedBuilding}
            setSelectedBuilding={setSelectedBuilding}
            locationSearch={locationSearch}
            setLocationSearch={setLocationSearch}
            filteredLocations={filteredLocations}
            handleLocationSelect={handleLocationSelect}
            isPinningMode={isPinningMode}
            setIsPinningMode={setIsPinningMode}
            bins={bins}
            reports={reports}
            stations={stations}
            activeStation={activeStation}
            selectedItem={selectedItem}
            handleItemSelect={handleItemSelect}
            blueprintUrl={blueprintUrl}
            gpsCoords={gpsCoords}
            setGpsCoords={setGpsCoords}
            isCustomDebrisPin={isCustomDebrisPin}
            setIsCustomDebrisPin={setIsCustomDebrisPin}
            activePopoverStation={activePopoverStation}
            setActivePopoverStation={setActivePopoverStation}
            wasteCategory={wasteCategory}
            handleSelectWasteCategory={handleSelectWasteCategory}
          />

          {activeMeta && !isWasteCategory && (
            <TeacherAssetItemGrid
              activeMeta={activeMeta}
              selectedItem={selectedItem}
              handleItemSelect={handleItemSelect}
            />
          )}
          </div>

          <div className="space-y-4 sm:space-y-5 xl:col-span-4">
          <TeacherConditionUrgency
            isWasteCategory={isWasteCategory}
            selectedCondition={selectedCondition}
            setSelectedCondition={handleConditionSelect}
            selectedUrgency={selectedUrgencyState}
            setSelectedUrgency={handleUrgencySelect}
            dynamicConditions={dynamicConditions}
            dynamicUrgencies={dynamicUrgencies}
          />

          <TeacherNotesSection notes={notes} setNotes={setNotes} />

          <div className="space-y-2 rounded-2xl border border-[var(--primary)]/10 bg-white p-4">
            <button
              type="submit"
              disabled={isSubmitting || !selectedItem || !selectedLocation || !capturedImage}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[var(--accent-dark)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Submitting Report...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Submit Report</span>
                </>
              )}
            </button>
            {!selectedLocation ? (
              <p className="text-center text-[11px] text-amber-700 font-bold flex items-center justify-center gap-1">
                <AlertTriangle size={12} />
                <span>Select a {isWasteCategory ? 'bin' : 'room'} location to enable submission.</span>
              </p>
            ) : (
              <p className="text-center text-[10px] text-gray-400 font-medium">
                Reports are reviewed by the appropriate department within 24 hours.
              </p>
            )}
          </div>
          </div>
        </form>
      )}
    </div>
  );
};
