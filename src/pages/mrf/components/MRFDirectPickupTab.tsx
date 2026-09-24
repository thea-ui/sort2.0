import React, { useState, useMemo, useEffect } from 'react';
import {
  PackageCheck,
  MapPin,
  Trash2,
  Search,
  CheckCircle2,
  Map as MapIcon,
  Compass,
  Target,
  X,
  Recycle,
  Scale,
  FileText,
} from 'lucide-react';
import { BinStatus, BinLocationItem } from '../../../types';
import {
  getStoredLocations,
  STORAGE_KEY_BLUEPRINT_URL,
} from '../../../services/locationStore';
import { CampusMapFrame } from '../../../components/map/CampusMapFrame';
import { RECYCLABLE_CATEGORIES, ItemizedRecyclableCategory } from '../MRFDashboard';

interface MRFDirectPickupTabProps {
  bins?: BinStatus[];
  addStockKg: (categoryCode: string, weightKg: number) => Promise<any>;
  showToast: (msg: string) => void;
}

export const MRFDirectPickupTab: React.FC<MRFDirectPickupTabProps> = ({
  addStockKg,
  showToast,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<string>('Main Courtyard (Quad)');
  const [isPinningMode, setIsPinningMode] = useState<boolean>(false);
  const [isCustomPin, setIsCustomPin] = useState<boolean>(false);
  const [customPinCoords, setCustomPinCoords] = useState<{ x: number; y: number } | null>(null);
  const [customLocationName, setCustomLocationName] = useState<string>('');

  const [activePopoverStation, setActivePopoverStation] = useState<string | null>(null);
  const [searchLocation, setSearchLocation] = useState<string>('');

  const [selectedCategory, setSelectedCategory] = useState<'pet_plastic' | 'aluminum_cans' | 'cardboard' | 'glass'>('pet_plastic');
  const [weightKg, setWeightKg] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Campus Blueprint & Locations
  const [locationList, setLocationList] = useState<BinLocationItem[]>(getStoredLocations);
  const [blueprintUrl, setBlueprintUrl] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY_BLUEPRINT_URL)
  );

  useEffect(() => {
    const handleStorageChange = () => {
      setLocationList(getStoredLocations());
      setBlueprintUrl(localStorage.getItem(STORAGE_KEY_BLUEPRINT_URL));
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

  // Filtered station nodes
  const filteredStations = useMemo(() => {
    return locationList.filter(
      loc =>
        loc.name.toLowerCase().includes(searchLocation.toLowerCase()) ||
        loc.code.toLowerCase().includes(searchLocation.toLowerCase())
    );
  }, [locationList, searchLocation]);

  // Selected station data
  const selectedStationData = useMemo(() => {
    return locationList.find(loc => loc.name === selectedLocation);
  }, [locationList, selectedLocation]);

  const handleSelectStation = (station: BinLocationItem) => {
    setSelectedLocation(station.name);
    setIsCustomPin(false);
    setCustomPinCoords(null);
    setCustomLocationName('');
    setIsPinningMode(false);
    setActivePopoverStation(null);
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPinningMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const pctX = Math.round((clickX / rect.width) * 100);
    const pctY = Math.round((clickY / rect.height) * 100);

    setCustomPinCoords({ x: pctX, y: pctY });
    setIsCustomPin(true);
    const genName = `Other Location (Campus Zone @ ${pctX}%, ${pctY}%)`;
    setSelectedLocation(genName);
    setCustomLocationName(genName);
    setActivePopoverStation(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedKg = parseFloat(weightKg) || 0;
    const finalLocation = isCustomPin ? (customLocationName.trim() || selectedLocation) : selectedLocation;
    if (parsedKg <= 0 || !finalLocation) return;

    await addStockKg(selectedCategory, parsedKg);

    const catMeta = RECYCLABLE_CATEGORIES.find(c => c.id === selectedCategory);
    showToast(
      `Logged ${parsedKg} kg of ${catMeta?.shortName || 'Recyclables'} at ${finalLocation}! Inventory updated.`
    );

    setWeightKg('');
    setNotes('');
  };

  const currentDisplayName = isCustomPin
    ? (customLocationName.trim() || selectedLocation)
    : selectedLocation;

  // Get fill level indicator
  const getFillStatus = (station: BinLocationItem) => {
    const unavailableCount = station.streams.filter(s => s.status === 'Unavailable').length;
    if (unavailableCount >= 2) return { label: 'Critical', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' };
    if (unavailableCount === 1) return { label: 'High', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
    return { label: 'Normal', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
  };

  return (
    <div className="animate-fade-in">
      {/* Compact Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
            MRF Direct Entry
          </span>
          <h3 className="text-lg font-heading font-black text-[var(--text-strong)] mt-1">
            Direct Campus Collection
          </h3>
          <p className="text-xs text-[var(--text-strong)]/50 mt-0.5">Real-time MRF payload logging</p>
        </div>
      </div>

      {/* Unified60/40 Split Cockpit */}
      <form onSubmit={handleSubmit}>
        <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-[var(--primary)]/10">

            {/* LEFT PANEL(60%): Station & Map Explorer */}
            <div className="lg:col-span-3 p-5 space-y-4">
              {/* Map Toolbar */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search location..."
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-[var(--text-strong)] font-medium outline-none focus:border-[var(--accent)] focus:bg-white transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsPinningMode(!isPinningMode)}
                  className={`px-3 py-2 text-[10px] font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                    isPinningMode
                      ? 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-xs'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  <Compass size={12} className={isPinningMode ? 'animate-spin' : ''} />
                  <span className="hidden sm:inline">{isPinningMode ? 'Pinning' : 'Pin Zone'}</span>
                </button>
              </div>

              {/* Map Canvas */}
              <div
                className={`relative w-full h-[300px] lg:h-[380px] rounded-2xl border border-gray-200 bg-[#f8fafc] shadow-inner flex items-center justify-center transition-all select-none ${
                  isPinningMode ? 'ring-2 ring-[var(--accent)]' : ''
                }`}
              >
                <CampusMapFrame
                  blueprintUrl={blueprintUrl}
                  contentProps={{
                    onClick: handleMapClick,
                    className: isPinningMode ? 'cursor-crosshair' : 'cursor-default',
                  }}
                  fallback={(
                    <svg className="absolute inset-0 w-full h-full opacity-50 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id="mrf-campus-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                          <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#E2E8F0" strokeWidth="1" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#mrf-campus-grid)" />
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

                {/* Floating Legend */}
                <div className="absolute top-3 right-3 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] text-[var(--text-strong)]/70 border border-white/80 flex items-center gap-2 pointer-events-none z-10">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                    <span>Selected</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-amber-400" />
                    <span>Warning</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-gray-400" />
                    <span>Normal</span>
                  </div>
                </div>

                {/* Map Pins Badge */}
                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] text-[var(--text-strong)] font-bold border border-gray-200 shadow-xs pointer-events-none flex items-center gap-1 z-10">
                  <MapIcon size={11} className="text-[var(--accent)]" />
                  <span>Map Pins</span>
                </div>

                {/* Clean Circular Trash Can Icons */}
                {filteredStations.map(station => {
                  const isSel = !isCustomPin && selectedLocation === station.name;
                  const isPopoverOpen = activePopoverStation === station.name;
                  const fillStatus = getFillStatus(station);
                  const isWarning = fillStatus.label === 'Critical' || fillStatus.label === 'High';

                  return (
                    <div
                      key={station.id}
                      style={{ left: `${station.x}%`, top: `${station.y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Trash Circle Button */}
                      <button
                        type="button"
                        data-testid="station-pin"
                        onClick={() => {
                          handleSelectStation(station);
                          setActivePopoverStation(isPopoverOpen ? null : station.name);
                        }}
                        className={`h-9 w-9 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md border-2 ${
                          isSel
                            ? 'bg-[var(--accent)] text-white border-white scale-110 ring-4 ring-[var(--accent)]/30 z-30'
                            : isWarning
                              ? 'bg-amber-400 text-white border-white hover:scale-105'
                              : 'bg-white text-[var(--text-strong)] border-gray-200 hover:border-[var(--accent)] hover:scale-105'
                        }`}
                        title={`${station.name} (${station.code})`}
                      >
                        <Trash2 size={15} />
                      </button>

                      {/* Popover Details on Click */}
                      {isPopoverOpen && (
                        <div className="absolute bottom-11 left-1/2 -translate-x-1/2 z-40 min-w-[190px] bg-white/95 backdrop-blur-md rounded-xl p-2.5 shadow-2xl border border-gray-200/90 animate-fade-in">
                          <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 mb-1.5">
                            <div>
                              <p className="text-[10px] font-extrabold text-[var(--text-strong)]">{station.name}</p>
                              <p className="text-[8px] text-gray-400 font-mono">{station.code}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setActivePopoverStation(null)}
                              className="text-gray-400 hover:text-gray-600 cursor-pointer"
                            >
                              <X size={10} />
                            </button>
                          </div>
                          <div className="space-y-1 text-[9px]">
                            {station.streams.map((stream) => (
                              <div key={stream.type} className="flex items-center justify-between py-0.5">
                                <span className="font-bold text-gray-700 capitalize">{stream.type.toLowerCase().replace('_', ' ')}</span>
                                <span className={`font-black text-[8px] px-1.5 py-0.5 rounded ${
                                  stream.status === 'Available' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                }`}>
                                  {stream.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Custom Dropped Pin */}
                {isCustomPin && customPinCoords && (
                  <div
                    data-testid="scattered-pin"
                    style={{ left: `${customPinCoords.x}%`, top: `${customPinCoords.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 p-2 rounded-full bg-rose-500 border-2 border-white text-white shadow-xl animate-bounce z-30 flex items-center justify-center ring-4 ring-rose-400/40"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MapPin size={15} className="fill-white" />
                  </div>
                )}

                {/* Pinning Mode Indicator */}
                {isPinningMode && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-[var(--accent)] text-white px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 shadow-lg animate-pulse z-10">
                    <Target size={12} />
                    <span>Tap map to pin location</span>
                  </div>
                )}
                </CampusMapFrame>
              </div>

              {/* Custom Location Name Input */}
              {isCustomPin && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1 animate-fade-in">
                  <label className="text-[9px] font-extrabold text-rose-900 uppercase tracking-wider block">
                    Custom Location Name:
                  </label>
                  <input
                    type="text"
                    value={customLocationName}
                    onChange={(e) => setCustomLocationName(e.target.value)}
                    placeholder="e.g. Near Science Garden / Bench 3"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-rose-300 text-xs font-bold text-gray-900 outline-none focus:border-rose-500"
                  />
                </div>
              )}

              {/* Quick Station Chips */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Quick Select</span>
                <div className="flex flex-wrap gap-1.5">
                  {filteredStations.slice(0, 8).map((station) => {
                    const isSel = !isCustomPin && selectedLocation === station.name;
                    return (
                      <button
                        key={station.id}
                        type="button"
                        onClick={() => handleSelectStation(station)}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                          isSel
                            ? 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-xs'
                            : 'bg-gray-50 border-gray-200 text-[var(--text-strong)]/80 hover:bg-emerald-50 hover:border-emerald-200'
                        }`}
                      >
                        <MapPin size={10} />
                        <span>{station.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT PANEL(40%): Log Rail */}
            <div className="lg:col-span-2 p-5 space-y-4 bg-gray-50/50">
              {/* Step1: Selected Station Status */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
                    <MapPin size={13} className="text-[var(--accent)]" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Selected Station</span>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center">
                      <MapPin size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[var(--text-strong)]">{currentDisplayName}</p>
                      {selectedStationData && (
                        <p className="text-[9px] text-gray-400 font-mono">{selectedStationData.code}</p>
                      )}
                    </div>
                  </div>
                  {selectedStationData && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        Academic Core
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${getFillStatus(selectedStationData).bg} ${getFillStatus(selectedStationData).color} border ${getFillStatus(selectedStationData).border}`}>
                        {getFillStatus(selectedStationData).label} Fill
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Step2: Recyclable Category(2x2 Grid) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
                    <Recycle size={13} className="text-[var(--accent)]" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Category</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {RECYCLABLE_CATEGORIES.map(cat => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--accent)]/10 border-[var(--accent)] ring-2 ring-[var(--accent)]/30 shadow-xs'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                            isSelected ? 'bg-[var(--accent)] text-white' : 'bg-gray-100 text-gray-500'
                          }`}>
                            <Recycle size={11} />
                          </div>
                          <span className={`text-[10px] font-extrabold ${isSelected ? 'text-[var(--text-strong)]' : cat.color}`}>
                            {cat.shortName}
                          </span>
                        </div>
                        <p className="text-[9px] text-gray-400">{cat.thresholdLimitKg} kg limit</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step3: Payload Input & Submit */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
                    <Scale size={13} className="text-[var(--accent)]" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Payload</span>
                </div>

                {/* Weight Input */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                    Collected Weight
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      required
                      placeholder="0.0"
                      value={weightKg}
                      onChange={e => setWeightKg(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white pl-4 pr-14 py-3 text-lg font-black text-[var(--text-strong)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-extrabold text-sm text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded-lg">
                      KG
                    </span>
                  </div>
                </div>

                {/* Remarks Input */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                    Remarks
                  </label>
                  <div className="relative">
                    <FileText size={14} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
                    <textarea
                      rows={2}
                      placeholder="Optional notes..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-xs text-gray-900 outline-none resize-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white text-xs font-extrabold shadow-md shadow-[var(--accent)]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 size={16} /> Log & Update Inventory
                </button>
              </div>
            </div>

          </div>
        </div>
      </form>
    </div>
  );
};
