import React, { useState, useMemo, useEffect } from 'react';
import { Send, ChevronLeft } from 'lucide-react';
import {
  InfrastructurePillar,
  CATEGORY_DETAILS,
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
  PILLAR_META: Record<
    InfrastructurePillar,
    {
      emoji?: string;
      icon?: React.ComponentType<any>;
      label: string;
      desc: string;
      accent: string;
      iconBg: string;
      iconText: string;
      border: string;
    }
  >;
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
    roomNumber ? `${selectedBuilding} – ${roomNumber}` : 'Room 101 – Science Hall'
  );
  const [locationSearch, setLocationSearch] = useState<string>('');
  const [assetRoomList, setAssetRoomList] = useState<string[]>(getAssetRoomLocations);

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
    setLocationSearch('');
    setNotes('');
    setCapturedImage(null);
    setGpsCoords(null);
    setSelectedConditionState('Damaged');
    setSelectedUrgencyState('MEDIUM');
  };

  const { presetGroups, categories, assetConditions, urgencyLevels } = useSystemPresets();

  const dynamicCategoryDetails = useMemo(() => {
    const details = { ...CATEGORY_DETAILS };

    presetGroups.forEach((group: any) => {
      const codeKey = (group.code || group.category.toLowerCase()) as InfrastructurePillar;
      if (codeKey && details[codeKey]) {
        const catLabel = group.category || details[codeKey].label;
        const groupItems = (group.items || [])
          .filter((it: any) => it.enabled)
          .map((it: any) => ({
            id: it.id,
            label: it.name,
            icon: details[codeKey].icon,
          }));

        details[codeKey] = {
          ...details[codeKey],
          label: catLabel,
          title: `Report ${catLabel}`,
          items: groupItems.length > 0 ? groupItems : details[codeKey].items,
        };
      }
    });

    categories.forEach((cat: any) => {
      const codeKey = (cat.code || cat.name.toLowerCase()) as InfrastructurePillar;
      if (codeKey && details[codeKey]) {
        const catLabel = cat.name || details[codeKey].label;
        details[codeKey] = {
          ...details[codeKey],
          label: catLabel,
          title: `Report ${catLabel}`,
        };
      }
    });

    return details;
  }, [presetGroups, categories]);

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

  const displayLocations = isWasteCategory ? getBinLocations(bins) : assetRoomList;

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
        onViewHistory={setActiveTab ? () => setActiveTab('report-history') : undefined}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      {!selectedCategory ? (
        <TeacherCategorySelector pillarMeta={PILLAR_META} onSelect={handleSelectCategory} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500 p-6 text-white shadow-lg shadow-blue-500/15 flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSelectedCategoryState(null)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-all hover:bg-white/30 cursor-pointer"
              title="Back to category selection"
            >
              <ChevronLeft size={20} />
            </button>

            {activeMeta && (
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md text-white shadow-inner">
                  {React.createElement(CATEGORY_DETAILS[selectedCategory].icon, { size: 24 })}
                </div>
                <div>
                  <h2 className="text-xl font-heading font-black text-white tracking-tight">{activeMeta.title}</h2>
                  <p className="text-xs text-white/80 font-medium">{activeMeta.subtitle}</p>
                </div>
              </div>
            )}
          </div>

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

          <div className="space-y-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !selectedItem || !selectedLocation || !capturedImage}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
            <p className="text-center text-[10px] text-gray-400 font-medium">
              Reports are reviewed by the appropriate department within 24 hours.
            </p>
          </div>
        </form>
      )}
    </div>
  );
};
