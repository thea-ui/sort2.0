import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Trash2,
  Search,
  Droplets,
  PackageX,
  Recycle,
  X,
  AlertTriangle,
  Map as MapIcon,
  Check,
  Clock,
  Send,
  XCircle,
  Info,
} from 'lucide-react';
import { Bin, Report, WasteCategory } from '../../../types';
import { CampusMapFrame } from '../../../components/map/CampusMapFrame';

interface BinMapTabProps {
  bins: Bin[];
  reports?: Report[];
  setActiveTab?: (tab: string) => void;
  setBinId?: (id: string | null) => void;
  setLocationName?: (name: string) => void;
}

type BinCategory = 'BIODEGRADABLE' | 'NON_BIODEGRADABLE' | 'RECYCLABLE';
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
  slots: [BinSlot, BinSlot, BinSlot];
}

const CATEGORY_ORDER: BinCategory[] = ['BIODEGRADABLE', 'NON_BIODEGRADABLE', 'RECYCLABLE'];

const CAT_META: Record<BinCategory, { label: string; short: string; bg: string; border: string; text: string; Icon: React.FC<{ size?: number; className?: string }>; desc: string }> = {
  BIODEGRADABLE:     { label: 'Biodegradable',     short: 'Bio', bg: 'bg-emerald-500', border: 'border-emerald-400', text: 'text-emerald-600', Icon: Droplets, desc: 'Food scraps, organic waste & plant leaves' },
  NON_BIODEGRADABLE: { label: 'Non-Biodegradable', short: 'Non', bg: 'bg-rose-500',    border: 'border-rose-400',    text: 'text-rose-600',    Icon: PackageX, desc: 'Wrappers, plastic films & residual waste' },
  RECYCLABLE:        { label: 'Recyclable',         short: 'Rec', bg: 'bg-sky-500',     border: 'border-sky-400',     text: 'text-sky-600',     Icon: Recycle,  desc: 'PET bottles, aluminum cans, glass & cardboard' },
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

  if (isVerifiedOrDispatched) {
    return {
      statusState: 'DISPATCHED',
      isAvailable: false,
      reason: 'Pending Pick Up',
      unverifiedCount: activeReports.length,
      activeReport: activeReports.find(r => r.status === 'DISPATCHED') || activeReports[0]
    };
  }

  if (unverifiedPending.length >= 3) {
    return {
      statusState: 'LIMIT_REACHED',
      isAvailable: false,
      reason: 'Pending Pick Up (3/3 Waiting Verification)',
      unverifiedCount: unverifiedPending.length,
      activeReport: unverifiedPending[0]
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
    }) as [BinSlot, BinSlot, BinSlot],
  }));
}

export const BinMapTab: React.FC<BinMapTabProps> = ({
  bins,
  reports = [],
  setActiveTab,
  setBinId,
  setLocationName
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [activePopoverStation, setActivePopoverStation] = useState<string | null>(null);

  // Admin Uploaded Map Blueprint Live Listener State
  const [blueprintUrl, setBlueprintUrl] = useState<string | null>(() => localStorage.getItem('sort_blueprint_url'));

  React.useEffect(() => {
    const handleStorageChange = () => {
      setBlueprintUrl(localStorage.getItem('sort_blueprint_url'));
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('sort_locations_updated', handleStorageChange as EventListener);
    window.addEventListener('sort_blueprint_updated', handleStorageChange as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sort_locations_updated', handleStorageChange as EventListener);
      window.removeEventListener('sort_blueprint_updated', handleStorageChange as EventListener);
    };

  }, []);

  const stations = useMemo(() => groupStations(bins, reports), [bins, reports]);

  const filteredStations = useMemo(() => {
    return stations.filter(s => s.locationName.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [stations, searchQuery]);

  const activeStation = useMemo(
    () => stations.find(s => s.locationName === selectedLocation) || stations[0] || null,
    [stations, selectedLocation]
  );

  const handleSelectStation = (station: StationCluster) => {
    setSelectedLocation(station.locationName);
    setLocationName?.(station.locationName);
  };

  const handleGoToReport = (stationName: string, binType?: BinCategory) => {
    setLocationName?.(stationName);
    if (binType && activeStation) {
      const slot = activeStation.slots.find(s => s.type === binType);
      if (slot?.bin) setBinId?.(slot.bin.id);
    }
    setActiveTab?.('submit-report');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="bg-white/95 backdrop-blur-md border border-white/80 rounded-3xl p-5 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#00A77C]/15 text-[#00A77C] flex items-center justify-center shrink-0">
            <MapPin size={20} />
          </div>
          <div>
            <h2 className="font-heading font-bold text-sm text-[#00271D]">Campus Live Bin Map</h2>
            <p className="text-xs text-[#00271D]/70 font-medium">
              View real-time station statuses across campus buildings.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold shrink-0">
          <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
          Live Status
        </span>
      </div>

      {/* Main Map Card */}
      <div className="bg-white/95 backdrop-blur-sm border border-white/80 rounded-3xl p-5 shadow-sm space-y-4">
        
        {/* Search Bar */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search campus station location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-[#00271D] font-medium outline-none focus:border-[#00A77C] focus:bg-white transition-all shadow-xs"
          />
        </div>

        {/* Generous & Responsive Campus Map Container */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            <span>Campus Map Grid (Tap Pin for Status Details)</span>
            {activeStation && (
              <span className="text-[#00A77C] normal-case font-bold truncate max-w-[240px]">
                Selected: {activeStation.locationName}
              </span>
            )}
          </div>

          {/* No overflow-hidden: the frame clips the base layer to rounded
              corners, while station popovers must be able to escape the box. */}
          <div
            data-testid="bin-map-container"
            className="relative w-full h-[360px] sm:h-[420px] rounded-2xl border border-gray-200 bg-[#f8fafc] shadow-inner flex items-center justify-center"
          >
            {/* ATLAS base map (falls back to the uploaded blueprint, then vector grid) */}
            <CampusMapFrame
              blueprintUrl={blueprintUrl}
              fallback={(
                <svg className="absolute inset-0 w-full h-full opacity-50 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="light-grid-viewonly" width="28" height="28" patternUnits="userSpaceOnUse">
                      <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#E2E8F0" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#light-grid-viewonly)" />
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

            {/* Circular Trash Can Pins with Smart Auto-Adjusting Popover */}
            {filteredStations.map(station => {
              const minLat = 14.5975, maxLat = 14.6035, minLng = 120.9815, maxLng = 120.9885;
              const rawPctY = ((maxLat - station.coordinates.lat) / (maxLat - minLat)) * 100;
              const rawPctX = ((station.coordinates.lng - minLng) / (maxLng - minLng)) * 100;
              const pctX = station.x ?? Math.max(10, Math.min(90, rawPctX));
              const pctY = station.y ?? Math.max(10, Math.min(90, rawPctY));
              const isSel = activeStation?.locationName === station.locationName;
              const isPopoverOpen = activePopoverStation === station.locationName;
              const hasReportedFull = station.slots.some(s => s.statusState === 'REPORTED_FULL' || s.statusState === 'DISPATCHED');

              // Boundary Auto-Adjust Logic
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

              return (
                <div key={station.locationName} style={{ left: `${pctX}%`, top: `${pctY}%` }} className="absolute">
                  {/* Circular Button */}
                  <button
                    type="button"
                    data-testid="station-pin"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectStation(station);
                      setActivePopoverStation(isPopoverOpen ? null : station.locationName);
                    }}
                    className={`relative -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md border-2 ${
                      isSel
                        ? 'bg-[#00A77C] border-white text-white ring-4 ring-[#00A77C]/30 scale-110 z-30'
                        : 'bg-white border-[#00271D]/20 text-[#00271D] hover:border-[#00A77C] hover:text-[#00A77C] hover:scale-110 z-10'
                    }`}
                    title={station.locationName}
                  >
                    <Trash2 size={18} strokeWidth={2} />
                    {hasReportedFull && (
                      <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-[#FF5722] border-2 border-white animate-pulse shadow-xs" title="Station has bin pending pick up" />
                    )}
                  </button>

                  {/* Auto-Adjust Popover */}
                  {(isPopoverOpen || (isSel && activePopoverStation === station.locationName)) && (
                    <div className={`absolute z-40 bg-white/95 backdrop-blur-md rounded-2xl p-2.5 shadow-xl border border-gray-200 w-56 text-left animate-fade-in ${verticalPosClass} ${horizontalPosClass}`}>
                      <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 mb-1.5">
                        <p className="text-[10px] font-extrabold text-[#00271D] truncate max-w-[150px]">
                          {station.locationName}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setActivePopoverStation(null); }}
                          className="text-gray-400 hover:text-gray-600 cursor-pointer p-0.5"
                        >
                          <X size={12} />
                        </button>
                      </div>

                      <div className="space-y-1">
                        {station.slots.filter(s => s.statusState !== 'NO_BIN').map(slot => {
                          const meta = CAT_META[slot.type];
                          const Icon = meta.Icon;

                          return (
                            <div
                              key={slot.type}
                              className="w-full p-2 rounded-xl border flex items-center justify-between text-left bg-gray-50 border-gray-100"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <div className={`h-5 w-5 rounded-lg text-white flex items-center justify-center shrink-0 ${!slot.isAvailable ? 'bg-amber-500' : meta.bg}`}>
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
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            </CampusMapFrame>
          </div>
        </div>

        {/* Location Pills */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Campus Locations</span>
          <div className="flex flex-wrap gap-1.5">
            {filteredStations.map((station) => {
              const isSel = activeStation?.locationName === station.locationName;
              const hasReported = station.slots.some(s => s.statusState === 'REPORTED_FULL' || s.statusState === 'DISPATCHED' || !s.isAvailable);
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
                  {hasReported ? (
                    <span className={`h-2 w-2 rounded-full ${isSel ? 'bg-amber-200 animate-pulse' : 'bg-[#FF5722] animate-pulse'}`} title="Has bin pending pick up" />
                  ) : (
                    <span className={`h-2 w-2 rounded-full ${isSel ? 'bg-emerald-200' : 'bg-[#10B981]'}`} title="All bins available" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Station Category Breakdown Cards & Quick Report Action (Matches Screenshot 5:25 PM) */}
        {activeStation && (() => {
          const visibleSlots = activeStation.slots.filter(s => s.statusState !== 'NO_BIN');
          return (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[#00271D] flex items-center gap-1.5">
                  <MapPin size={14} className="text-[#00A77C]" />
                  <span>Select Waste Category at {activeStation.locationName}:</span>
                </p>
                <span className="text-[10px] font-extrabold text-[#00A77C] bg-[#00A77C]/10 border border-[#00A77C]/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {visibleSlots.length} Stream{visibleSlots.length !== 1 ? 's' : ''} Installed
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
                const Icon = meta.Icon;
                const isAvailable = slot.isAvailable;

                return (
                  <button
                    key={slot.type}
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => handleGoToReport(activeStation.locationName, slot.type)}
                    className={`p-4 rounded-3xl border text-left flex flex-col justify-between transition-all cursor-pointer shadow-xs ${
                      !isAvailable
                        ? 'bg-[#fff8f6] border-orange-200 text-gray-700 opacity-85 cursor-not-allowed'
                        : 'bg-white border-gray-200 text-[#00271D] hover:border-[#00A77C] hover:shadow-md'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`p-2.5 rounded-2xl text-white shadow-xs ${!isAvailable ? 'bg-orange-500' : meta.bg}`}>
                          <Icon size={18} />
                        </div>
                        <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          slot.statusState === 'UNAVAILABLE' || slot.statusState === 'LIMIT_REACHED'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : slot.statusState === 'NO_BIN'
                            ? 'bg-gray-200 text-gray-700 border border-gray-300'
                            : slot.statusState === 'DISPATCHED'
                            ? 'bg-orange-100 text-orange-800 border border-orange-200'
                            : slot.statusState === 'REPORTED_FULL'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {slot.statusState === 'UNAVAILABLE' || slot.statusState === 'LIMIT_REACHED'
                            ? 'Unavailable Bin'
                            : slot.statusState === 'NO_BIN'
                            ? 'No Bin'
                            : slot.statusState === 'DISPATCHED'
                            ? 'Pending Pick Up'
                            : slot.statusState === 'REPORTED_FULL'
                            ? 'Reported Full'
                            : 'Available'}
                        </span>
                      </div>

                      <p className="text-sm font-bold text-[#00271D]">{meta.label}</p>
                      <p className="text-[11px] text-[#00271D]/60 font-medium mt-0.5 leading-snug">{meta.desc}</p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-gray-400">Status:</span>
                      {slot.statusState === 'UNAVAILABLE' || slot.statusState === 'LIMIT_REACHED' ? (
                        <span className="font-extrabold text-rose-600 flex items-center gap-1">
                          <XCircle size={11} /> Unavailable Bin
                        </span>
                      ) : slot.statusState === 'NO_BIN' ? (
                        <span className="font-extrabold text-gray-500 flex items-center gap-1">
                          <Info size={11} /> No Bin at Location
                        </span>
                      ) : slot.statusState === 'DISPATCHED' ? (
                        <span className="font-extrabold text-orange-600 flex items-center gap-1">
                          <Clock size={11} /> Pending Pick Up
                        </span>
                      ) : slot.statusState === 'REPORTED_FULL' ? (
                        <span className="font-extrabold text-amber-600 flex items-center gap-1">
                          <AlertTriangle size={11} /> Reported Full
                        </span>
                      ) : (
                        <span className="font-bold text-[#00A77C] flex items-center gap-1">
                          <Check size={11} /> Available
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    })()}

      </div>
    </div>
  );
};
