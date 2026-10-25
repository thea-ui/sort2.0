import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Trash2,
  Search,
  Droplets,
  PackageX,
  Recycle,
  X,
  Map as MapIcon,
} from 'lucide-react';
import { Bin, Report } from '../../../types';
import { CampusMapFrame } from '../../../components/map/CampusMapFrame';
import { StudentPageHeader, studentPage } from './ui/StudentPrimitives';

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
    <div className={studentPage}>
      <StudentPageHeader
        icon={MapPin}
        title="Campus live bin map"
        description="Real-time station statuses across campus buildings."
        meta={
          <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-[var(--success)]/25 bg-[var(--success)]/10 px-3 py-1 text-[10px] font-bold text-[var(--success-strong)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
            Live status
          </span>
        }
      />

      {/* Main Map Area */}
      <div className="rounded-2xl border border-[var(--primary)]/10 bg-white p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:gap-5">
        <div className="min-w-0 space-y-3 xl:col-span-8">

        {/* Search Bar */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search campus station location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[var(--primary)]/15 bg-[var(--background)]/60 py-2.5 pl-9 pr-4 text-base font-medium text-[var(--text-strong)] outline-none transition-colors focus:border-[var(--accent)] focus:bg-white sm:text-sm"
          />
        </div>

        {/* Generous & Responsive Campus Map Container */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-strong)]/40">
            <span>Tap a pin for status details</span>
            {activeStation && (
              <span className="max-w-[240px] truncate font-bold normal-case text-[var(--accent)]">
                {activeStation.locationName}
              </span>
            )}
          </div>

          {/* No overflow-hidden: the frame clips the base layer to rounded
              corners, while station popovers must be able to escape the box. */}
          <div
            data-testid="bin-map-container"
            className="relative flex h-[clamp(300px,52svh,560px)] w-full items-center justify-center rounded-xl border border-[var(--primary)]/15 bg-[var(--background)]/50"
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

            <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] text-[var(--text-strong)] font-bold border border-gray-200 shadow-xs pointer-events-none flex items-center gap-1 z-10">
              <MapIcon size={12} className="text-[var(--accent)]" />
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
                        ? 'bg-[var(--accent)] border-white text-white ring-4 ring-[var(--accent)]/30 scale-110 z-30'
                        : 'bg-white border-[var(--primary)]/20 text-[var(--text-strong)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:scale-110 z-10'
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
                        <p className="text-[10px] font-extrabold text-[var(--text-strong)] truncate max-w-[150px]">
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
                                <span className="text-[10px] font-bold text-[var(--text-strong)] truncate">{meta.label}</span>
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
        </div>

        <aside className="space-y-4 xl:col-span-4">
        {/* Location Pills */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-strong)]/40">Campus stations</span>
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
                      ? 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-xs'
                      : 'bg-gray-50 border-gray-200 text-[var(--text-strong)]/80 hover:bg-emerald-50 hover:border-emerald-200'
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
            <div className="overflow-hidden rounded-xl border border-[var(--primary)]/10 bg-white">
              <div className="flex items-start justify-between gap-2 border-b border-[var(--primary)]/10 px-3.5 py-3">
                <p className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-strong)]">
                  <MapPin size={14} className="shrink-0 text-[var(--accent)]" />
                  <span>Streams at {activeStation.locationName}</span>
                </p>
                <span className="shrink-0 rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/5 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[var(--accent)]">
                  {visibleSlots.length} installed
                </span>
              </div>

              {visibleSlots.length === 0 ? (
                <p className="px-3.5 py-4 text-center text-xs font-semibold text-[var(--text-strong)]/50">
                  No active waste stream bins installed here.
                </p>
              ) : (
                <div className="divide-y divide-[var(--primary)]/10">
                  {visibleSlots.map(slot => {
                const meta = CAT_META[slot.type];
                const Icon = meta.Icon;
                const isAvailable = slot.isAvailable;
                const statusLabel =
                  slot.statusState === 'UNAVAILABLE' || slot.statusState === 'LIMIT_REACHED'
                    ? 'Unavailable'
                    : slot.statusState === 'DISPATCHED'
                    ? 'Pick up pending'
                    : slot.statusState === 'REPORTED_FULL'
                    ? 'Reported full'
                    : 'Available';
                const statusClass =
                  slot.statusState === 'UNAVAILABLE' || slot.statusState === 'LIMIT_REACHED'
                    ? 'border-[var(--danger)]/25 bg-[var(--danger)]/10 text-[var(--danger-strong)]'
                    : slot.statusState === 'DISPATCHED' || slot.statusState === 'REPORTED_FULL'
                    ? 'border-[var(--warning)]/25 bg-[var(--warning)]/10 text-[var(--warning-strong)]'
                    : 'border-[var(--success)]/25 bg-[var(--success)]/10 text-[var(--success-strong)]';

                return (
                  <button
                    key={slot.type}
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => handleGoToReport(activeStation.locationName, slot.type)}
                    className={`flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors ${
                      isAvailable ? 'cursor-pointer hover:bg-[var(--accent)]/5' : 'cursor-not-allowed opacity-60'
                    }`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      isAvailable ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'bg-[var(--warning)]/15 text-[var(--warning-strong)]'
                    }`}>
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-[var(--text-strong)]">{meta.label}</span>
                      <span className="mt-0.5 block truncate text-[10px] font-medium text-[var(--text-strong)]/50">{meta.desc}</span>
                    </span>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${statusClass}`}>
                      {statusLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    })()}
        </aside>
        </div>
      </div>
    </div>
  );
};
