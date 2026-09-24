import React from 'react';
import { Search, MapPin, Compass, Trash2, X, Target, Map as MapIcon, Tag, Check, XCircle, Info, Clock, AlertTriangle } from 'lucide-react';
import { BinSlot, CAT_META, groupStations, type StationCluster, type BinCategory } from './teacherReportData';
import { CampusMapFrame } from '../../../components/map/CampusMapFrame';

interface TeacherLocationSelectorProps {
  isWasteCategory: boolean;
  selectedLocation: string;
  setSelectedLocation: (loc: string) => void;
  roomNumber: string;
  setRoomNumber: (r: string) => void;
  selectedBuilding: string;
  setSelectedBuilding: (b: string) => void;
  locationSearch: string;
  setLocationSearch: (s: string) => void;
  filteredLocations: string[];
  handleLocationSelect: (loc: string) => void;
  isPinningMode: boolean;
  setIsPinningMode: (p: boolean) => void;
  bins: any[];
  reports: any[];
  stations: ReturnType<typeof groupStations>;
  activeStation: any;
  selectedItem: string;
  handleItemSelect: (item: string) => void;
  blueprintUrl: string | null;
  gpsCoords: { lat: number; lng: number } | null;
  setGpsCoords: (coords: { lat: number; lng: number } | null) => void;
  isCustomDebrisPin: boolean;
  setIsCustomDebrisPin: (p: boolean) => void;
  activePopoverStation: string | null;
  setActivePopoverStation: (s: string | null) => void;
  wasteCategory: string | null;
  handleSelectWasteCategory: (catType: string, binId?: string | null) => void;
}

export const TeacherLocationSelector: React.FC<TeacherLocationSelectorProps> = ({
  isWasteCategory,
  selectedLocation,
  locationSearch,
  setLocationSearch,
  filteredLocations,
  handleLocationSelect,
  isPinningMode,
  setIsPinningMode,
  stations,
  activeStation,
  blueprintUrl,
  gpsCoords,
  setGpsCoords,
  isCustomDebrisPin,
  setIsCustomDebrisPin,
  activePopoverStation,
  setActivePopoverStation,
  setSelectedLocation,
  setRoomNumber,
  setSelectedBuilding,
  wasteCategory,
  handleSelectWasteCategory,
}) => {
  const filteredStations = stations.filter(s =>
    s.locationName.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const isScatteredDebris = isCustomDebrisPin && gpsCoords !== null;

  const handleSelectStation = (station: any) => {
    setSelectedLocation(station.locationName);
    setGpsCoords(station.coordinates);
    setIsCustomDebrisPin(false);
    const parts = station.locationName.split(' – ');
    if (parts.length > 1) {
      setRoomNumber(parts[0]);
      setSelectedBuilding(parts[1]);
    } else {
      setRoomNumber('');
      setSelectedBuilding(station.locationName);
    }
  };

  return (
    <div className="rounded-3xl border border-white/80 bg-white/95 backdrop-blur-md p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h3 className="text-base font-heading font-bold text-[var(--text-strong)] flex items-center gap-2">
          <MapPin size={18} className="text-[var(--accent)]" />
          <span>{isWasteCategory ? 'Waste Bin Location' : 'Asset Room Location'}</span>
          <span className="text-rose-500">*</span>
        </h3>

        {isWasteCategory && (
          <button
            type="button"
            onClick={() => setIsPinningMode(!isPinningMode)}
            className={`px-4 py-2 text-xs font-bold rounded-full border transition-all flex items-center gap-1.5 cursor-pointer ${
              isPinningMode
                ? 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-sm'
                : 'bg-[var(--background)] border-[var(--primary)]/15 text-[var(--text-strong)] hover:bg-[var(--primary)]/10'
            }`}
          >
            <Compass size={14} className={isPinningMode ? 'animate-spin' : ''} />
            <span>{isPinningMode ? 'Pinning Mode Active' : 'Pin Scattered Trash'}</span>
          </button>
        )}
      </div>

      <div className="space-y-3">
        {isWasteCategory && (
          <>
            <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <span>Interactive Campus Map (Tap Circular Trash Pin)</span>
              {selectedLocation && (
                <span className="text-[var(--accent)] normal-case font-bold truncate max-w-[240px]">
                  Selected: {selectedLocation}
                </span>
              )}
            </div>

            <div
              className={`relative w-full h-[360px] sm:h-[420px] rounded-2xl border border-gray-200 bg-[#f8fafc] shadow-inner flex items-center justify-center transition-all ${
                isPinningMode ? 'ring-2 ring-[var(--accent)]' : ''
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
                    setIsCustomDebrisPin(true);
                    setSelectedLocation('Scattered Debris');
                    setRoomNumber('Scattered Debris');
                    setActivePopoverStation(null);
                  },
                  className: isPinningMode ? 'cursor-crosshair' : 'cursor-default',
                }}
                fallback={(
                  <svg className="absolute inset-0 w-full h-full opacity-50 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="teacher-campus-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                        <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#E2E8F0" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#teacher-campus-grid)" />
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

              {filteredStations.map((station: StationCluster & { x?: number; y?: number }) => {
                const minLat = 14.5975, maxLat = 14.6035, minLng = 120.9815, maxLng = 120.9885;
                const rawPctY = ((maxLat - station.coordinates.lat) / (maxLat - minLat)) * 100;
                const rawPctX = ((station.coordinates.lng - minLng) / (maxLng - minLng)) * 100;
                const pctX = station.x ?? Math.max(10, Math.min(90, rawPctX));
                const pctY = station.y ?? Math.max(10, Math.min(90, rawPctY));
                const isSel = selectedLocation === station.locationName;
                const isPopoverOpen = activePopoverStation === station.locationName;
                const hasReportedFull = station.slots.some((s: any) => s.statusState === 'REPORTED_FULL' || s.statusState === 'DISPATCHED');

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

                const visiblePopoverSlots = station.slots.filter((s: any) => s.statusState !== 'NO_BIN');
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
                          ? 'bg-[var(--accent)] text-white border-white scale-110 ring-4 ring-[var(--accent)]/30 z-20'
                          : hasReportedFull
                          ? 'bg-[#FF5722] text-white border-white hover:scale-105'
                          : 'bg-white text-[var(--text-strong)] border-gray-200 hover:border-[var(--accent)] hover:scale-105'
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
                            <p className="text-[11px] font-extrabold text-[var(--text-strong)]">{station.locationName}</p>
                            <p className="text-[9px] text-gray-400 font-medium">{visiblePopoverSlots.length} Waste Stream{visiblePopoverSlots.length !== 1 ? 's' : ''}</p>
                          </div>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setActivePopoverStation(null); }} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                            <X size={12} />
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          {visiblePopoverSlots.map((slot: any) => {
                            const slotType = (slot as { type: BinCategory }).type;
                            const meta = CAT_META[slotType];
                            const Icon = meta.Icon;


                            return (
                              <button
                                key={slot.type}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectStation(station);
                                  setActivePopoverStation(null);
                                }}
                                className={`w-full flex items-center justify-between p-1.5 rounded-xl transition-all cursor-pointer text-left border ${
                                  'hover:bg-gray-50 border-transparent'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <div className={`h-5 w-5 rounded-lg text-white flex items-center justify-center shrink-0 ${!slot.isAvailable ? 'bg-gray-400' : meta.bg}`}>
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
              <p className="text-xs text-[var(--accent)] font-semibold text-center mt-1 animate-pulse flex items-center justify-center gap-1">
                <Target size={13} />
                <span>Tap anywhere on the map to pin scattered trash!</span>
              </p>
            )}

            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Campus Locations</span>
              <div className="flex flex-wrap gap-1.5">
                {filteredStations.map((station) => {
                  const isSel = selectedLocation === station.locationName;
                  const hasReported = station.slots.some((s: any) => !s.isAvailable);
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
                      {hasReported && (
                        <span className={`h-2 w-2 rounded-full ${isSel ? 'bg-white' : 'bg-rose-500 animate-ping'}`} title="Has unavailable bins pending pickup" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {activeStation && (() => {
              const visibleSlots = activeStation.slots.filter((s: any) => s.statusState !== 'NO_BIN');
              return (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[var(--text-strong)] flex items-center gap-1.5">
                      <Tag size={14} className="text-[var(--accent)]" />
                      <span>Select Waste Category at {activeStation.locationName}:</span>
                    </p>
                    <span className="text-[10px] font-bold text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded-full">
                      {visibleSlots.length} Bin Stream{visibleSlots.length !== 1 ? 's' : ''} Configured
                    </span>
                  </div>

                  {visibleSlots.length === 0 ? (
                    <div className="p-4 bg-gray-50 border border-gray-200 text-gray-500 rounded-2xl text-center text-xs font-semibold">
                      No active waste stream bins installed at this location.
                    </div>
                  ) : (
                    <div className={`grid grid-cols-1 ${visibleSlots.length === 1 ? 'sm:grid-cols-1 max-w-sm' : visibleSlots.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-3`}>
                      {visibleSlots.map((slot: any) => {
                        const slotType = (slot as { type: BinCategory }).type;
                        const meta = CAT_META[slotType];
                        const isSelectedCategory = wasteCategory === slot.type;
                        const Icon = meta.Icon;

                        return (
                          <button
                            key={slot.type}
                            type="button"
                            disabled={!slot.isAvailable}
                            onClick={() => slot.isAvailable && handleSelectWasteCategory(slot.type, slot.bin?.id)}
                            className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between select-none relative overflow-hidden ${
                              isSelectedCategory && slot.isAvailable
                                ? 'bg-[var(--accent)]/15 border-[var(--accent)] text-[var(--text-strong)] font-bold ring-2 ring-[var(--accent)]/40 shadow-xs cursor-pointer'
                                : slot.isAvailable
                                ? 'bg-white border-gray-200 text-[var(--text-strong)]/70 hover:bg-gray-50 hover:border-[var(--accent)]/40 cursor-pointer'
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
                              ) : slot.statusState === 'DISPATCHED' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1 bg-[#FF5722]/15 text-[#FF5722] border border-[#FF5722]/30">
                                  <AlertTriangle size={9} /> Pending Pick Up
                                </span>
                              ) : slot.statusState === 'REPORTED_FULL' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-200">
                                  <AlertTriangle size={9} /> Reported Full
                                </span>
                              ) : isSelectedCategory ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-[var(--accent)] text-white">
                                  Selected
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                                  Available
                                </span>
                              )}
                            </div>

                            <div>
                              <p className={`text-xs font-bold ${isSelectedCategory && slot.isAvailable ? 'text-[var(--accent)]' : 'text-[var(--text-strong)]'}`}>
                                {meta.label}
                              </p>
                              <p className="text-[10px] text-[var(--text-strong)]/60 font-medium mt-0.5 leading-snug">
                                {meta.desc}
                              </p>
                            </div>

                            <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px]">
                              <span className="font-semibold text-gray-500">Status:</span>
                              {slot.statusState === 'UNAVAILABLE' || slot.statusState === 'LIMIT_REACHED' ? (
                                <span className="font-extrabold text-rose-600 flex items-center gap-1">
                                  <XCircle size={10} /> Unavailable Bin
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
                                <span className="font-bold text-[var(--accent)] flex items-center gap-1">
                                  <Check size={10} /> Available
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
          </>
        )}

        {!isWasteCategory && (
          <>
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search room or building (e.g. Room 101 - Science Hall)..."
                value={locationSearch}
                onChange={e => setLocationSearch(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-[#F8FAFC] pl-9 pr-4 py-2.5 text-xs text-[var(--text-strong)] outline-none transition-all focus:border-[var(--accent)] focus:bg-white font-medium"
              />
            </div>

            <div className="border border-[var(--primary)]/10 rounded-2xl overflow-hidden divide-y divide-[var(--primary)]/10 max-h-44 overflow-y-auto bg-white">
              {filteredLocations.map(loc => {
                const isSelected = selectedLocation === loc;
                return (
                  <div
                    key={loc}
                    onClick={() => handleLocationSelect(loc)}
                    className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected ? 'bg-[var(--accent)]/15 font-semibold' : 'hover:bg-[var(--background)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
                      <span className={`text-xs ${isSelected ? 'text-[var(--text-strong)] font-bold' : 'text-[var(--text-strong)]/80 font-medium'}`}>
                        {loc}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold px-3 py-0.5 rounded-full border bg-[var(--accent)]/20 text-[var(--accent)] border-[var(--accent)]/40">
                      Available
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {isWasteCategory && (
          <>
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search bin location or building..."
                value={locationSearch}
                onChange={e => setLocationSearch(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-[#F8FAFC] pl-9 pr-4 py-2.5 text-xs text-[var(--text-strong)] outline-none transition-all focus:border-[var(--accent)] focus:bg-white font-medium"
              />
            </div>

            <div className="border border-[var(--primary)]/10 rounded-2xl overflow-hidden divide-y divide-[var(--primary)]/10 max-h-44 overflow-y-auto bg-white">
              {filteredLocations.map(loc => {
                const isSelected = selectedLocation === loc;
                return (
                  <div
                    key={loc}
                    onClick={() => handleLocationSelect(loc)}
                    className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected ? 'bg-[var(--accent)]/15 font-semibold' : 'hover:bg-[var(--background)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
                      <span className={`text-xs ${isSelected ? 'text-[var(--text-strong)] font-bold' : 'text-[var(--text-strong)]/80 font-medium'}`}>
                        {loc}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold px-3 py-0.5 rounded-full border bg-[var(--accent)]/20 text-[var(--accent)] border-[var(--accent)]/40">
                      Available
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
