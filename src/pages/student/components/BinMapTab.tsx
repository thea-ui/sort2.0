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
} from 'lucide-react';
import { Bin, Report, WasteCategory } from '../../../types';

interface BinMapTabProps {
  bins: Bin[];
  reports?: Report[];
  setActiveTab?: (tab: string) => void;
  setBinId?: (id: string | null) => void;
  setLocationName?: (name: string) => void;
}

type BinCategory = 'BIODEGRADABLE' | 'NON_BIODEGRADABLE' | 'RECYCLABLE';
export type BinReportStatusState = 'AVAILABLE' | 'REPORTED_FULL' | 'DISPATCHED' | 'NO_BIN';

interface BinSlot {
  bin: Bin | null;
  type: BinCategory;
  statusState: BinReportStatusState;
  activeReport?: Report;
}

interface StationCluster {
  locationName: string;
  coordinates: { lat: number; lng: number };
  slots: [BinSlot, BinSlot, BinSlot];
}

const CATEGORY_ORDER: BinCategory[] = ['BIODEGRADABLE', 'NON_BIODEGRADABLE', 'RECYCLABLE'];

const CAT_META: Record<BinCategory, { label: string; short: string; bg: string; border: string; text: string; Icon: React.FC<{ size?: number; className?: string }>; desc: string }> = {
  BIODEGRADABLE:     { label: 'Biodegradable',     short: 'Bio', bg: 'bg-emerald-500', border: 'border-emerald-400', text: 'text-emerald-600', Icon: Droplets, desc: 'Food scraps, organic waste & plant leaves' },
  NON_BIODEGRADABLE: { label: 'Non-Biodegradable', short: 'Non', bg: 'bg-rose-500',    border: 'border-rose-400',    text: 'text-rose-600',    Icon: PackageX, desc: 'Wrappers, plastic films & residual waste' },
  RECYCLABLE:        { label: 'Recyclable',         short: 'Rec', bg: 'bg-sky-500',     border: 'border-sky-400',     text: 'text-sky-600',     Icon: Recycle,  desc: 'PET bottles, aluminum cans, glass & cardboard' },
};

function getBinSlotDetails(bin: Bin | null, reports: Report[] = []): { statusState: BinReportStatusState; activeReport?: Report } {
  if (!bin) return { statusState: 'NO_BIN' };

  const activeReport = reports.find(r => 
    r.locationName.toLowerCase() === bin.locationName.toLowerCase() &&
    r.category === bin.type &&
    (r.status === 'PENDING' || r.status === 'DISPATCHED')
  );

  if (activeReport?.status === 'DISPATCHED' || bin.activeDispatch) {
    return { statusState: 'DISPATCHED', activeReport };
  }

  if (activeReport?.status === 'PENDING' || bin.fillLevel >= 85) {
    return { statusState: 'REPORTED_FULL', activeReport };
  }

  return { statusState: 'AVAILABLE' };
}

function groupStations(bins: Bin[], reports: Report[] = []): StationCluster[] {
  const map = new Map<string, { coords: { lat: number; lng: number }; byType: Map<BinCategory, Bin> }>();
  for (const bin of bins) {
    if (!map.has(bin.locationName)) map.set(bin.locationName, { coords: bin.coordinates, byType: new Map() });
    const t = bin.type as BinCategory;
    if (CATEGORY_ORDER.includes(t)) map.get(bin.locationName)!.byType.set(t, bin);
  }

  return Array.from(map.entries()).map(([locationName, data]) => ({
    locationName,
    coordinates: data.coords,
    slots: CATEGORY_ORDER.map(type => {
      const bin = data.byType.get(type) ?? null;
      const details = getBinSlotDetails(bin, reports);
      return {
        type,
        bin,
        statusState: details.statusState,
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

          <div className="relative w-full h-[360px] sm:h-[420px] rounded-2xl border border-gray-200 bg-[#f8fafc] overflow-hidden shadow-inner flex items-center justify-center">
            {/* SVG Grid Overlay */}
            <svg className="absolute inset-0 w-full h-full opacity-60 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
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

            <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] text-[#00271D] font-bold border border-gray-200 shadow-xs pointer-events-none flex items-center gap-1 z-10">
              <MapIcon size={12} className="text-[#00A77C]" />
              <span>Map Pins</span>
            </div>

            {/* Circular Trash Can Pins with Smart Auto-Adjusting Popover */}
            {filteredStations.map(station => {
              const minLat = 14.5975, maxLat = 14.6035, minLng = 120.9815, maxLng = 120.9885;
              const pctY = ((maxLat - station.coordinates.lat) / (maxLat - minLat)) * 100;
              const pctX = ((station.coordinates.lng - minLng) / (maxLng - minLng)) * 100;
              const isSel = activeStation?.locationName === station.locationName;
              const isPopoverOpen = activePopoverStation === station.locationName;
              const hasReportedFull = station.slots.some(s => s.statusState === 'REPORTED_FULL' || s.statusState === 'DISPATCHED');

              // Boundary Auto-Adjust Logic
              const isNearTopEdge = pctY < 55;
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectStation(station);
                      setActivePopoverStation(isPopoverOpen ? null : station.locationName);
                    }}
                    className={`relative -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md border-2 ${
                      isSel
                        ? 'bg-[#00A77C] border-white text-white ring-4 ring-[#00A77C]/30 scale-110 z-30'
                        : hasReportedFull
                        ? 'bg-rose-500 border-white text-white ring-4 ring-rose-400/40 animate-pulse z-20'
                        : 'bg-white border-[#00A77C] text-[#00A77C] hover:bg-emerald-50 hover:scale-105 z-10'
                    }`}
                    title={station.locationName}
                  >
                    <Trash2 size={18} strokeWidth={2.2} />
                    {hasReportedFull && (
                      <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-rose-600 rounded-full border border-white flex items-center justify-center">
                        <AlertTriangle size={8} className="text-white" />
                      </span>
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
                        {station.slots.map(slot => {
                          const meta = CAT_META[slot.type];
                          const isReported = slot.statusState === 'REPORTED_FULL' || slot.statusState === 'DISPATCHED';
                          const Icon = meta.Icon;

                          return (
                            <div
                              key={slot.type}
                              className="w-full p-2 rounded-xl border flex items-center justify-between text-left bg-gray-50 border-gray-100"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <div className={`h-5 w-5 rounded-lg text-white flex items-center justify-center shrink-0 ${isReported ? 'bg-rose-500' : meta.bg}`}>
                                  <Icon size={11} />
                                </div>
                                <span className="text-[10px] font-bold text-[#00271D] truncate">{meta.label}</span>
                              </div>
                              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md shrink-0 ${
                                isReported ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {isReported ? 'FULL' : 'READY'}
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
          </div>
        </div>

        {/* Location Pills */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Campus Locations</span>
          <div className="flex flex-wrap gap-1.5">
            {filteredStations.map((station) => {
              const isSel = activeStation?.locationName === station.locationName;
              const hasReported = station.slots.some(s => s.statusState === 'REPORTED_FULL' || s.statusState === 'DISPATCHED');
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
                    <span className={`h-2 w-2 rounded-full ${isSel ? 'bg-white' : 'bg-rose-500 animate-ping'}`} title="Has reported full bins" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Station Category Breakdown Cards & Quick Report Action */}
        {activeStation && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-[#00271D] flex items-center gap-1.5">
                <MapPin size={14} className="text-[#00A77C]" />
                <span>Station Status at {activeStation.locationName}:</span>
              </p>
              <button
                type="button"
                onClick={() => handleGoToReport(activeStation.locationName)}
                className="text-xs text-[#00A77C] font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Send size={12} />
                <span>Report Waste Here →</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {activeStation.slots.map(slot => {
                const meta = CAT_META[slot.type];
                const isReported = slot.statusState === 'REPORTED_FULL' || slot.statusState === 'DISPATCHED';
                const Icon = meta.Icon;

                return (
                  <div
                    key={slot.type}
                    className="p-3.5 rounded-2xl border bg-white border-gray-200 text-[#00271D] flex flex-col justify-between select-none"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-xl text-white ${meta.bg}`}>
                        <Icon size={18} />
                      </div>
                      {isReported ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-500 text-white animate-pulse flex items-center gap-0.5">
                          <AlertTriangle size={9} /> Reported Full
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                          Ready
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-bold text-[#00271D]">{meta.label}</p>
                      <p className="text-[10px] text-[#00271D]/60 font-medium mt-0.5 leading-snug">{meta.desc}</p>

                      <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-gray-500">Status:</span>
                        {isReported ? (
                          <span className="font-extrabold text-rose-600 flex items-center gap-1">
                            <Clock size={10} /> Pending Pick Up
                          </span>
                        ) : (
                          <span className="font-bold text-emerald-600 flex items-center gap-1">
                            <Check size={10} /> Ready for Disposal
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
