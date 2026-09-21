import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Send,
  Sparkles,
  Info,
  Compass,
  MapPin,
  Tag,
  Target,
  X,
  Search,
  Trash2,
  Check,
  XCircle,
  Clock,
  CheckCircle,
  Droplets,
  Recycle,
  PackageX,
  Map as MapIcon,
} from 'lucide-react';
import { User, Bin, SystemSettings, WasteCategory, Report } from '../../../types';
import { CampusMapFrame } from '../../../components/map/CampusMapFrame';
import { StudentSubmitSuccessView } from './StudentSubmitSuccessView';
import { StudentSubmittedReportDetails } from '../StudentDashboard';
import { useSystemPresets } from '../../../hooks/useSystemPresets';
import { StudentPhotoEvidence } from './StudentPhotoEvidence';
import { StudentUrgencySelector } from './StudentUrgencySelector';
import { StudentNotesSection } from './StudentNotesSection';

interface SubmitReportTabProps {
  currentUser: User;
  bins: Bin[];
  reports?: Report[];
  settings: SystemSettings;
  setActiveTab?: (tab: string) => void;
  createReport: (params: any) => void;
  reportTitle?: string;
  setReportTitle?: (v: string) => void;
  reportDesc: string;
  setReportDesc: (v: string) => void;
  category: WasteCategory;
  setCategory?: (v: WasteCategory) => void;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  setUrgency: (v: 'LOW' | 'MEDIUM' | 'HIGH') => void;
  locationName: string;
  setLocationName: (v: string) => void;
  isCapturing: boolean;
  handleCapture: () => void;
  capturedImage: string | null;
  setCapturedImage?: (v: string | null) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  gpsLoading: boolean;
  gpsCoords: { lat: number; lng: number } | null;
  setGpsCoords: (coords: { lat: number; lng: number } | null) => void;
  isSubmitting: boolean;
  submitSuccess: boolean;
  setSubmitSuccess?: (v: boolean) => void;
  lastSubmittedReport?: StudentSubmittedReportDetails | null;
  binId: string | null;
  setBinId: (v: string | null) => void;
  isScatteredDebris: boolean;
  setIsScatteredDebris: (v: boolean) => void;
  isPinningMode: boolean;
  setIsPinningMode: (v: boolean) => void;
  selectedMaterials: string[];
  setSelectedMaterials: (v: any) => void;
  sliderValue: number;
  setSliderValue: (v: number) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

// DepEd Order No. 5, s. 2014 requires segregation into biodegradable,
// non-biodegradable and hazardous/toxic waste. Recyclable is retained as an
// additional RA 9003 stream. Bin colours follow the DO 5 colour coding.
type BinCategory = 'BIODEGRADABLE' | 'NON_BIODEGRADABLE' | 'RECYCLABLE' | 'HAZARDOUS';
export type BinReportStatusState = 'AVAILABLE' | 'REPORTED_FULL' | 'DISPATCHED' | 'LIMIT_REACHED' | 'NO_BIN' | 'UNAVAILABLE';

interface BinSlot {
  bin: Bin | null;
  type: BinCategory;
  statusState: BinReportStatusState;
  isAvailable: boolean;
  reason: string;
  unverifiedCount: number;
  activeReport?: Report;
}

interface StationCluster {
  locationName: string;
  coordinates: { lat: number; lng: number };
  x?: number;
  y?: number;
  slots: [BinSlot, BinSlot, BinSlot, BinSlot];
}

const CATEGORY_ORDER: BinCategory[] = ['BIODEGRADABLE', 'NON_BIODEGRADABLE', 'RECYCLABLE', 'HAZARDOUS'];

const CAT_META: Record<BinCategory, { label: string; short: string; bg: string; border: string; text: string; Icon: React.FC<{ size?: number; className?: string }>; desc: string }> = {
  // DO 5 s. 2014 colour coding: green/yellow = biodegradable, black/blue = non-biodegradable, red/orange = hazardous.
  BIODEGRADABLE:     { label: 'Biodegradable',     short: 'Bio', bg: 'bg-emerald-500', border: 'border-emerald-400', text: 'text-emerald-600', Icon: Droplets,     desc: 'Food scraps, organic waste & plant leaves' },
  NON_BIODEGRADABLE: { label: 'Non-Biodegradable', short: 'Non', bg: 'bg-slate-800',   border: 'border-slate-600',   text: 'text-slate-700',   Icon: PackageX,     desc: 'Wrappers, plastic films & residual waste (black/blue bin)' },
  RECYCLABLE:        { label: 'Recyclable',         short: 'Rec', bg: 'bg-sky-500',     border: 'border-sky-400',     text: 'text-sky-600',     Icon: Recycle,      desc: 'PET bottles, aluminum cans, glass & cardboard' },
  HAZARDOUS:         { label: 'Hazardous',          short: 'Haz', bg: 'bg-orange-500',  border: 'border-orange-400',  text: 'text-orange-600',  Icon: AlertTriangle, desc: 'Batteries, bulbs, chemicals, sharps & e-waste (red/orange bin)' },
};

function getBinSlotDetails(bin: Bin | null, reports: Report[] = []): {
  statusState: BinReportStatusState;
  isAvailable: boolean;
  reason: string;
  unverifiedCount: number;
  activeReport?: Report;
} {
  if (!bin || bin.streamStatus === 'No Bin') {
    return { statusState: 'NO_BIN', isAvailable: false, reason: 'No Bin at Location', unverifiedCount: 0 };
  }

  if (bin.streamStatus === 'Unavailable') {
    return { statusState: 'LIMIT_REACHED', isAvailable: false, reason: 'Unavailable (3/3 Waiting Verification)', unverifiedCount: 0 };
  }

  const binLoc = bin.locationName.toLowerCase().trim();
  const activeReports = reports.filter(r => {
    const repLoc = (r.locationName || '').toLowerCase().trim();
    const repBaseLoc = repLoc.split(' - ')[0].split(' – ')[0].trim();
    const matchesLoc = repLoc.includes(binLoc) || binLoc.includes(repBaseLoc) || repLoc === binLoc;
    return matchesLoc && r.category === bin.type && (r.status === 'PENDING' || r.status === 'DISPATCHED');
  });

  const unverifiedPending = activeReports.filter(r => !r.isVerified && r.status === 'PENDING');
  const isVerifiedOrDispatched = activeReports.some(r => r.isVerified || r.status === 'DISPATCHED');

  if (isVerifiedOrDispatched || unverifiedPending.length >= 3) {
    return {
      statusState: 'DISPATCHED',
      isAvailable: false,
      reason: 'Pending Pick Up',
      unverifiedCount: unverifiedPending.length,
      activeReport: activeReports[0]
    };
  }

  if (bin.fillLevel >= 90) {
    return { statusState: 'REPORTED_FULL', isAvailable: false, reason: 'Reported Full', unverifiedCount: 0 };
  }

  return {
    statusState: 'AVAILABLE',
    isAvailable: true,
    reason: 'Available',
    unverifiedCount: unverifiedPending.length,
    activeReport: activeReports[0]
  };
}

function groupStations(bins: Bin[], reports: Report[] = []): StationCluster[] {
  const map = new Map<string, { coords: { lat: number; lng: number }; x?: number; y?: number; byType: Map<BinCategory, Bin> }>();
  for (const bin of bins) {
    if (!map.has(bin.locationName)) {
      map.set(bin.locationName, { coords: bin.coordinates, x: bin.x, y: bin.y, byType: new Map() });
    }
    const t = bin.type as BinCategory;
    if (CATEGORY_ORDER.includes(t)) map.get(bin.locationName)!.byType.set(t, bin);
  }

  return Array.from(map.entries()).map(([locationName, data]) => ({
    locationName,
    coordinates: data.coords,
    x: data.x,
    y: data.y,
    slots: CATEGORY_ORDER.map(type => {
      const bin = data.byType.get(type) ?? null;
      const details = getBinSlotDetails(bin, reports);
      return {
        type,
        bin,
        statusState: details.statusState,
        isAvailable: details.isAvailable,
        reason: details.reason,
        unverifiedCount: details.unverifiedCount,
        activeReport: details.activeReport,
      };
    }) as [BinSlot, BinSlot, BinSlot, BinSlot],
  }));
}

export const SubmitReportTab: React.FC<SubmitReportTabProps> = ({
  currentUser,
  bins,
  reports = [],
  settings,
  setActiveTab,
  reportTitle,
  setReportTitle,
  reportDesc,
  setReportDesc,
  category = 'RECYCLABLE',
  setCategory,
  urgency,
  setUrgency,
  locationName,
  setLocationName,
  isCapturing,
  handleCapture,
  capturedImage,
  setCapturedImage,
  handleFileChange,
  gpsCoords,
  setGpsCoords,
  isSubmitting,
  submitSuccess,
  setSubmitSuccess,
  lastSubmittedReport,
  binId,
  setBinId,
  isScatteredDebris,
  setIsScatteredDebris,
  isPinningMode,
  setIsPinningMode,
  selectedMaterials,
  setSelectedMaterials,
  handleSubmit
}) => {
  const [searchLocation, setSearchLocation] = useState('');
  const [activePopoverStation, setActivePopoverStation] = useState<string | null>(null);

  const { presetGroups, categories, wasteTypes, urgencyLevels } = useSystemPresets();

  const [blueprintUrl, setBlueprintUrl] = useState<string | null>(() => localStorage.getItem('sort_blueprint_url'));

  React.useEffect(() => {
    const handleStorageChange = () => {
      setBlueprintUrl(localStorage.getItem('sort_blueprint_url'));
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('sort_blueprint_updated', handleStorageChange as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sort_blueprint_updated', handleStorageChange as EventListener);
    };
  }, []);

  const stations = useMemo(() => groupStations(bins, reports), [bins, reports]);
  const filteredStations = useMemo(
    () => stations.filter(s => s.locationName.toLowerCase().includes(searchLocation.toLowerCase())),
    [stations, searchLocation]
  );

  const activeStation = useMemo(
    () => stations.find(s => s.locationName === locationName),
    [stations, locationName]
  );

  const handleSelectCategoryAndBin = (selectedCat: WasteCategory, targetBinId?: string | null) => {
    setCategory?.(selectedCat);
    // Normalise legacy aliases, then take the label from the single source of
    // truth (CAT_META). The previous hand-rolled ternary had no HAZARDOUS
    // branch and silently titled hazardous reports "Recyclable".
    const canonical: BinCategory =
      selectedCat === 'ORGANIC' ? 'BIODEGRADABLE'
      : selectedCat === 'GENERAL' ? 'NON_BIODEGRADABLE'
      : (selectedCat as BinCategory);
    const catLabel = CAT_META[canonical]?.label ?? 'Waste Report';
    setReportTitle?.(catLabel);
    setSelectedMaterials([catLabel]);

    if (targetBinId) {
      setBinId(targetBinId);
    } else if (activeStation) {
      const slot = activeStation.slots.find(s => s.type === canonical);
      if (slot?.bin) {
        setBinId(slot.bin.id);
      }
    }
  };

  const handleSelectStation = (station: StationCluster, specificBinId?: string | null, binType?: BinCategory) => {
    setLocationName(station.locationName);
    setGpsCoords(station.coordinates);
    setIsScatteredDebris(false);

    const targetType = binType || (category as BinCategory) || 'RECYCLABLE';
    const slot = station.slots.find(s => s.type === targetType && s.bin !== null) || station.slots.find(s => s.bin !== null);
    
    if (specificBinId && binType) {
      handleSelectCategoryAndBin(binType, specificBinId);
    } else if (slot && slot.bin) {
      handleSelectCategoryAndBin(slot.type, slot.bin.id);
    } else {
      setBinId(null);
    }
  };

  const isDuplicateActiveReport = useMemo(() => {
    if (!locationName || !category) return false;
    return (reports || []).some(r =>
      (r.reporterId === currentUser.id || r.reporterName?.toLowerCase() === currentUser.name?.toLowerCase()) &&
      r.locationName.toLowerCase() === locationName.toLowerCase() &&
      r.category === category &&
      (r.status === 'PENDING' || r.status === 'DISPATCHED')
    );
  }, [reports, currentUser, locationName, category]);

  if (submitSuccess) {
    return (
      <StudentSubmitSuccessView
        lastSubmittedReport={lastSubmittedReport}
        category={category}
        reportTitle={reportTitle}
        locationName={locationName}
        urgency={urgency}
        onReset={() => {
          setSubmitSuccess?.(false);
          if (setCapturedImage) setCapturedImage(null);
          setReportTitle?.('');
          setReportDesc('');
          setLocationName('');
          setBinId(null);
          setIsScatteredDebris(false);
          setSelectedMaterials([]);
          setCategory?.('RECYCLABLE');
          setGpsCoords(null);
        }}
        onViewHistory={setActiveTab ? () => {
          setSubmitSuccess?.(false);
          setActiveTab('report-history');
        } : undefined}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in pb-12">
      <div className="bg-white/95 backdrop-blur-md border border-white/80 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#00A77C]/15 text-[#00A77C] flex items-center justify-center shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="font-heading font-bold text-sm text-[#00271D]">Report Campus Waste</h2>
            <p className="text-xs text-[#00271D]/70 font-medium">
              Snap photo → Tap map pin → Submit. Points awarded upon MRF resolution!
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1 bg-[#C69B26]/10 border border-[#C69B26]/30 text-[#C69B26] px-3 py-1.5 rounded-full text-xs font-bold shrink-0">
          <span>1st: 15pts · 2nd: 10pts · 3rd: 5pts</span>
        </div>
      </div>

      {isDuplicateActiveReport && (
        <div className="p-4 bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl flex items-start gap-3 text-xs shadow-sm animate-fade-in">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-950">You Have Already Reported This Trash Bin</p>
            <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
              Per user policy, you can only submit <strong>1 report per specific trash bin</strong> until MRF staff complete the cleanup. Your existing report is registered and pending MRF action.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <StudentPhotoEvidence
          capturedImage={capturedImage}
          setCapturedImage={setCapturedImage || (() => {})}
          isCapturing={isCapturing}
          handleCapture={handleCapture}
          handleFileChange={handleFileChange}
        />

        <div className="bg-white/95 backdrop-blur-sm border border-white/80 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-[#00A77C]/15 text-[#00A77C] flex items-center justify-center">
                <MapPin size={15} />
              </div>
              <h3 className="text-sm font-heading font-bold text-[#00271D]">
                2. Location & Waste Category
                <span className="text-rose-500 ml-1">*</span>
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setIsPinningMode(!isPinningMode)}
              className={`px-3 py-1 text-xs font-bold rounded-full border transition-all flex items-center gap-1.5 cursor-pointer w-fit ${
                isPinningMode
                  ? 'bg-[#00A77C] border-[#00A77C] text-white shadow-xs'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <Compass size={13} className={isPinningMode ? 'animate-spin' : ''} />
              <span>{isPinningMode ? 'Pinning Active (Tap Map)' : 'Pin Scattered Waste'}</span>
            </button>
          </div>

          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search campus location or building..."
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-[#00271D] font-medium outline-none focus:border-[#00A77C] focus:bg-white transition-all shadow-xs"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <span>Interactive Campus Map (Tap Circular Trash Pin)</span>
              {locationName && (
                <span className="text-[#00A77C] normal-case font-bold truncate max-w-[240px]">
                  Selected: {locationName}
                </span>
              )}
            </div>

            <div
              className={`relative w-full h-[360px] sm:h-[420px] rounded-2xl border border-gray-200 bg-[#f8fafc] shadow-inner flex items-center justify-center transition-all ${
                isPinningMode ? 'ring-2 ring-[#00A77C]' : ''
              }`}
            >
              <CampusMapFrame
                blueprintUrl={blueprintUrl}
                contentProps={{
                  onClick: (e) => {
                    if (!isPinningMode) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const clickY = e.clientY - rect.top;
                    const pctX = clickX / rect.width;
                    const pctY = clickY / rect.height;

                    const minLat = 14.5980, maxLat = 14.6030, minLng = 120.9820, maxLng = 120.9880;
                    const lat = maxLat - pctY * (maxLat - minLat);
                    const lng = minLng + pctX * (maxLng - minLng);

                    setGpsCoords({ lat, lng });
                    setBinId(null);
                    setIsScatteredDebris(true);
                    setLocationName('Scattered Debris');
                    setActivePopoverStation(null);
                  },
                  className: isPinningMode ? 'cursor-crosshair' : 'cursor-default',
                }}
                fallback={(
                  <svg className="absolute inset-0 w-full h-full opacity-50 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="campus-grid-clean" width="28" height="28" patternUnits="userSpaceOnUse">
                        <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#E2E8F0" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#campus-grid-clean)" />
                    <rect x="15%" y="10%" width="20%" height="15%" rx="8" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                    <text x="25%" y="19%" fill="#475569" fontSize="9" fontWeight="bold" textAnchor="middle">Sports Gym</text>

                    <rect x="65%" y="12%" width="22%" height="18%" rx="8" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                    <text x="76%" y="22%" fill="#475569" fontSize="9" fontWeight="bold" textAnchor="middle">Science Hall</text>

                    <circle cx="50%" cy="50%" r="35" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                    <text x="50%" y="51%" fill="#475569" fontSize="9" fontWeight="bold" textAnchor="middle">Quad</text>

                    <rect x="10%" y="70%" width="25%" height="18%" rx="8" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                    <text x="22%" y="81%" fill="#475569" fontSize="9" fontWeight="bold" textAnchor="middle">Chemistry Lab</text>

                    <rect x="60%" y="72%" width="28%" height="18%" rx="8" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                    <text x="74%" y="83%" fill="#475569" fontSize="9" fontWeight="bold" textAnchor="middle">Main Library</text>
                  </svg>
                )}
              >

              <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] text-[#00271D] font-bold border border-gray-200 shadow-xs pointer-events-none flex items-center gap-1 z-10">
                <MapIcon size={12} className="text-[#00A77C]" />
                <span>Map Pins</span>
              </div>

              {filteredStations.map(station => {
                const minLat = 14.5975, maxLat = 14.6035, minLng = 120.9815, maxLng = 120.9885;
                const rawPctY = ((maxLat - station.coordinates.lat) / (maxLat - minLat)) * 100;
                const rawPctX = ((station.coordinates.lng - minLng) / (maxLng - minLng)) * 100;
                const pctX = station.x ?? Math.max(10, Math.min(90, rawPctX));
                const pctY = station.y ?? Math.max(10, Math.min(90, rawPctY));
                const isSel = locationName === station.locationName;
                const isPopoverOpen = activePopoverStation === station.locationName;
                const hasReportedFull = station.slots.some(s => s.statusState === 'REPORTED_FULL' || s.statusState === 'DISPATCHED');

                // Popovers hold up to 4 streams (~170px tall): only open below
                // the pin when the pin is in the top 40% of the map.
                const isNearTopEdge = pctY < 40;
                const isNearLeftEdge = pctX < 25;
                const isNearRightEdge = pctX > 75;

                const verticalPosClass = isNearTopEdge ? 'top-12' : 'bottom-12';
                const horizontalPosClass = isNearLeftEdge
                  ? 'left-0 translate-x-0'
                  : isNearRightEdge
                  ? 'right-0 translate-x-0'
                  : 'left-1/2 -translate-x-1/2';
                
                const visiblePopoverSlots = station.slots.filter(s => s.statusState !== 'NO_BIN');
                return (
                  <div key={station.locationName} style={{ left: `${pctX}%`, top: `${pctY}%` }} className="absolute">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectStation(station);
                        setActivePopoverStation(isPopoverOpen ? null : station.locationName);
                      }}
                      className={`relative -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md border-2 ${
                        isSel
                          ? 'bg-[#00A77C] text-white border-white scale-110 ring-4 ring-[#00A77C]/30 z-20'
                          : hasReportedFull
                          ? 'bg-[#FF5722] text-white border-white hover:scale-105'
                          : 'bg-white text-[#00271D] border-gray-200 hover:border-[#00A77C] hover:scale-105'
                      }`}
                      title={`${station.locationName} (${visiblePopoverSlots.length} Streams)`}
                    >
                      <Trash2 size={18} />
                      {hasReportedFull && (
                        <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-[#FF5722] border-2 border-white animate-pulse shadow-xs" title="Station has bin pending pick up" />
                      )}
                    </button>

                    {isPopoverOpen && (
                      <div className={`absolute ${verticalPosClass} ${horizontalPosClass} z-40 min-w-[210px] bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-2xl border border-gray-200/90 animate-fade-in`}>
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                          <div>
                            <p className="text-[11px] font-extrabold text-[#00271D]">{station.locationName}</p>
                            <p className="text-[9px] text-gray-400 font-medium">{visiblePopoverSlots.length} Waste Stream{visiblePopoverSlots.length !== 1 ? 's' : ''}</p>
                          </div>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setActivePopoverStation(null); }} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                            <X size={12} />
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          {visiblePopoverSlots.map((slot) => {
                            const meta = CAT_META[slot.type];
                            const Icon = meta.Icon;

                            return (
                              <button
                                key={slot.type}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectStation(station);
                                  if (slot.isAvailable) {
                                    handleSelectCategoryAndBin(slot.type, slot.bin?.id);
                                    setActivePopoverStation(null);
                                  }
                                }}
                                className={`w-full flex items-center justify-between p-1.5 rounded-xl transition-all cursor-pointer text-left border ${
                                  category === slot.type
                                    ? 'bg-[#00A77C]/15 border-[#00A77C]/40'
                                    : 'hover:bg-gray-50 border-transparent'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <div className={`h-5 w-5 rounded-lg text-white flex items-center justify-center shrink-0 ${!slot.isAvailable ? 'bg-gray-400' : meta.bg}`}>
                                    <Icon size={11} />
                                  </div>
                                  <span className="text-[10px] font-bold text-[#00271D] truncate">{meta.label}</span>
                                </div>
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-md shrink-0 uppercase ${
                                  slot.statusState === 'UNAVAILABLE' || slot.statusState === 'LIMIT_REACHED'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : slot.statusState === 'NO_BIN'
                                    ? 'bg-gray-200 text-gray-700 border border-gray-300'
                                    : slot.statusState === 'DISPATCHED'
                                    ? 'bg-[#FF5722]/15 text-[#FF5722] border border-[#FF5722]/30'
                                    : 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30'
                                }`}>
                                  {slot.statusState === 'UNAVAILABLE' || slot.statusState === 'LIMIT_REACHED'
                                    ? 'Unavailable'
                                    : slot.statusState === 'NO_BIN'
                                    ? 'No Bin'
                                    : slot.statusState === 'DISPATCHED'
                                    ? 'Pending Pick Up'
                                    : 'Available'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {isScatteredDebris && gpsCoords && (
                <div
                  data-testid="scattered-pin"
                  style={{ left: `${((gpsCoords.lng - 120.9820) / 0.0060) * 100}%`, top: `${((14.6030 - gpsCoords.lat) / 0.0050) * 100}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 p-2 rounded-full bg-rose-500 border border-rose-400 text-white shadow-xl animate-bounce z-30 flex items-center justify-center"
                >
                  <MapPin size={16} className="stroke-[2.5]" />
                </div>
              )}
              </CampusMapFrame>
            </div>

            {isPinningMode && (
              <p className="text-xs text-[#00A77C] font-semibold text-center mt-1 animate-pulse flex items-center justify-center gap-1">
                <Target size={13} />
                <span>Tap anywhere on the map to pin scattered trash!</span>
              </p>
            )}
          </div>

          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Campus Locations</span>
            <div className="flex flex-wrap gap-1.5">
              {filteredStations.map((station) => {
                const isSel = locationName === station.locationName;
                const hasReported = station.slots.some(s => !s.isAvailable);
                return (
                  <button
                    key={station.locationName}
                    type="button"
                    onClick={() => {
                      handleSelectStation(station);
                      setActivePopoverStation(station.locationName);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSel
                        ? 'bg-[#00A77C] border-[#00A77C] text-white shadow-xs'
                        : 'bg-gray-50 border-gray-200 text-[#00271D]/80 hover:bg-emerald-50 hover:border-emerald-200'
                    }`}
                  >
                    <span>{station.locationName}</span>
                    {hasReported && (
                      <span className={`h-2 w-2 rounded-full ${isSel ? 'bg-white' : 'bg-rose-500 animate-ping'}`} title="Has unavailable bins pending pickup" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {activeStation && (() => {
            const visibleSlots = activeStation.slots.filter(s => s.statusState !== 'NO_BIN');
            return (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#00271D] flex items-center gap-1.5">
                    <Tag size={14} className="text-[#00A77C]" />
                    <span>Select Waste Category at {activeStation.locationName}:</span>
                  </p>
                  <span className="text-[10px] font-bold text-[#00A77C] bg-[#00A77C]/10 px-2 py-0.5 rounded-full">
                    {visibleSlots.length} Bin Stream{visibleSlots.length !== 1 ? 's' : ''} Configured
                  </span>
                </div>

                {visibleSlots.length === 0 ? (
                  <div className="p-4 bg-gray-50 border border-gray-200 text-gray-500 rounded-2xl text-center text-xs font-semibold">
                    No active waste stream bins installed at this location.
                  </div>
                ) : (
                  <div className={`grid grid-cols-1 ${visibleSlots.length === 1 ? 'sm:grid-cols-1 max-w-sm' : visibleSlots.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-3`}>
                    {visibleSlots.map(slot => {
                      const meta = CAT_META[slot.type];
                      const isSelectedCategory = category === slot.type;
                      const Icon = meta.Icon;

                  return (
                    <button
                      key={slot.type}
                      type="button"
                      disabled={!slot.isAvailable}
                      onClick={() => slot.isAvailable && handleSelectCategoryAndBin(slot.type, slot.bin?.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between select-none relative overflow-hidden ${
                        isSelectedCategory && slot.isAvailable
                          ? 'bg-[#00A77C]/15 border-[#00A77C] text-[#00271D] font-bold ring-2 ring-[#00A77C]/40 shadow-xs cursor-pointer'
                          : slot.isAvailable
                          ? 'bg-white border-gray-200 text-[#00271D]/70 hover:bg-gray-50 hover:border-[#00A77C]/40 cursor-pointer'
                          : 'bg-gray-100/90 border-gray-200 text-gray-400 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`p-2 rounded-xl text-white ${!slot.isAvailable ? 'bg-gray-400' : meta.bg}`}>
                          <Icon size={18} />
                        </div>

                        {slot.statusState === 'UNAVAILABLE' || slot.statusState === 'LIMIT_REACHED' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle size={9} /> Unavailable Bin
                          </span>
                        ) : slot.statusState === 'NO_BIN' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1 bg-gray-200 text-gray-700 border border-gray-300">
                            <Info size={9} /> No Bin at Location
                          </span>
                        ) : slot.statusState === 'DISPATCHED' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1 bg-[#FF5722]/15 text-[#FF5722] border border-[#FF5722]/30">
                            <AlertTriangle size={9} /> Pending Pick Up
                          </span>
                        ) : slot.statusState === 'REPORTED_FULL' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-200">
                            <AlertTriangle size={9} /> Reported Full
                          </span>
                        ) : isSelectedCategory ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#00A77C] text-white">
                            Selected
                          </span>
                        ) : (
                          <span className="px-[#00A77C] py-0.5 rounded-full text-[9px] font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                            Available
                          </span>
                        )}
                      </div>

                      <div>
                        <p className={`text-xs font-bold ${isSelectedCategory && slot.isAvailable ? 'text-[#00A77C]' : 'text-[#00271D]'}`}>
                          {meta.label}
                        </p>
                        <p className="text-[10px] text-[#00271D]/60 font-medium mt-0.5 leading-snug">
                          {meta.desc}
                        </p>

                        <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-gray-500">Status:</span>
                          {slot.statusState === 'UNAVAILABLE' || slot.statusState === 'LIMIT_REACHED' ? (
                            <span className="font-extrabold text-rose-600 flex items-center gap-1">
                              <XCircle size={10} /> Unavailable Bin
                            </span>
                          ) : slot.statusState === 'NO_BIN' ? (
                            <span className="font-extrabold text-gray-500 flex items-center gap-1">
                              <Info size={10} /> No Bin at Location
                            </span>
                          ) : slot.statusState === 'DISPATCHED' ? (
                            <span className="font-extrabold text-[#FF5722] flex items-center gap-1">
                              <Clock size={10} /> Pending Pick Up
                            </span>
                          ) : slot.statusState === 'REPORTED_FULL' ? (
                            <span className="font-extrabold text-amber-600 flex items-center gap-1">
                              <AlertTriangle size={10} /> Reported Full
                            </span>
                          ) : (
                            <span className="font-bold text-[#00A77C] flex items-center gap-1">
                              <Check size={10} /> Available
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

              {activeStation.slots.some(s => s.type === category && (s.statusState === 'REPORTED_FULL' || s.statusState === 'DISPATCHED')) && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex items-start gap-2.5 text-xs mt-2">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-950">Notice: Category Already Reported Full</p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      The <span className="font-bold">{category}</span> bin at <span className="font-bold">{locationName}</span> has already been reported full by a campus user. MRF staff have been dispatched for collection.
                    </p>
                  </div>
                </div>
              )}
              </div>
            );
          })()}
        </div>

        <StudentUrgencySelector urgency={urgency} setUrgency={setUrgency} />

        <StudentNotesSection reportDesc={reportDesc} setReportDesc={setReportDesc} />

        <div className="space-y-2 pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !capturedImage || !locationName || isDuplicateActiveReport}
            className="w-full py-4 bg-[#00A77C] hover:bg-[#008f6a] text-white font-bold text-sm rounded-full shadow-md shadow-[#00A77C]/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Submitting Report...</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>{isDuplicateActiveReport ? 'Bin Already Reported' : 'Submit Report'}</span>
              </>
            )}
          </button>

          {isDuplicateActiveReport ? (
            <p className="text-center text-[11px] text-amber-700 font-bold flex items-center justify-center gap-1">
              <AlertTriangle size={12} />
              <span>You have already reported this trashbin. Only 1 report per user per bin is allowed.</span>
            </p>
          ) : (!capturedImage || !locationName) ? (
            <p className="text-center text-[11px] text-amber-700 font-medium flex items-center justify-center gap-1">
              <Info size={12} />
              <span>Please attach photo evidence and select a location to submit.</span>
            </p>
          ) : null}

          <p className="text-center text-[11px] text-gray-500 font-medium">
            Points are awarded upon MRF final cleanup (1st reporter = 15 pts, 2nd = 10 pts, 3rd = 5 pts).
          </p>
        </div>
      </form>
    </div>
  );
};
