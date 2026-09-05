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
  Sparkles,
  Droplets,
  PackageX,
  Recycle,
} from 'lucide-react';
import { BinStatus, BinLocationItem } from '../../../types';
import {
  getStoredLocations,
  STORAGE_KEY_BLUEPRINT_URL,
  STORAGE_KEY_BLUEPRINT_PRESET,
} from '../../../services/locationStore';
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
  const [blueprintPreset, setBlueprintPreset] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY_BLUEPRINT_PRESET) || 'DEFAULT'
  );

  useEffect(() => {
    const handleStorageChange = () => {
      setLocationList(getStoredLocations());
      setBlueprintUrl(localStorage.getItem(STORAGE_KEY_BLUEPRINT_URL));
      setBlueprintPreset(localStorage.getItem(STORAGE_KEY_BLUEPRINT_PRESET) || 'DEFAULT');
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('sort_locations_updated', handleStorageChange as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sort_locations_updated', handleStorageChange as EventListener);
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

  const handleSelectStation = (station: BinLocationItem) => {
    setSelectedLocation(station.name);
    setIsCustomPin(false);
    setCustomPinCoords(null);
    setCustomLocationName('');
    setIsPinningMode(false);
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

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in pb-12">
      {/* Top Banner */}
      <div className="bg-white/95 backdrop-blur-md border border-white/80 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#00A77C]/15 text-[#00A77C] flex items-center justify-center shrink-0">
            <PackageCheck size={20} />
          </div>
          <div>
            <h2 className="font-heading font-bold text-sm text-[#00271D]">Direct Campus Collection & Kilo Logger</h2>
            <p className="text-xs text-[#00271D]/70 font-medium">
              Tap map station or pin other locations → Log payload weight to update market stock.
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1 bg-[#00A77C]/10 border border-[#00A77C]/30 text-[#00A77C] px-3 py-1.5 rounded-full text-xs font-bold shrink-0">
          <span>MRF Direct Entry</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* STEP 1: LOCATION & INTERACTIVE CAMPUS MAP (MATCHING STUDENT MAP SCREENSHOT) */}
        <div className="bg-white/95 backdrop-blur-sm border border-white/80 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-[#00A77C]/15 text-[#00A77C] flex items-center justify-center">
                <MapPin size={15} />
              </div>
              <h3 className="text-sm font-heading font-bold text-[#00271D]">
                1. Location & Waste Station
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
              <span>{isPinningMode ? 'Pinning Active (Tap Map)' : 'Pin Other Location'}</span>
            </button>
          </div>

          {/* Search Input */}
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

          {/* Map Header & Interactive Canvas */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <span>Interactive Campus Map (Tap Circular Trash Pin)</span>
              {currentDisplayName && (
                <span className="text-[#00A77C] normal-case font-bold truncate max-w-[240px]">
                  Selected: {currentDisplayName}
                </span>
              )}
            </div>

            <div
              onClick={handleMapClick}
              className={`relative w-full h-[360px] sm:h-[420px] rounded-2xl border border-gray-200 bg-[#f8fafc] overflow-hidden shadow-inner flex items-center justify-center transition-all select-none ${
                isPinningMode ? 'cursor-crosshair ring-2 ring-[#00A77C]' : 'cursor-default'
              }`}
            >
              {/* Admin Blueprint Image or Vector Floorplan */}
              {blueprintUrl ? (
                <img
                  src={blueprintUrl}
                  alt="Custom Campus Map Blueprint"
                  className="absolute inset-0 w-full h-full object-cover opacity-75 pointer-events-none"
                />
              ) : blueprintPreset === 'ARCHITECTURAL' ? (
                <div className="absolute inset-0 bg-slate-950 border border-slate-800 p-6 pointer-events-none overflow-hidden">
                  <svg className="w-full h-full opacity-40 stroke-cyan-400 fill-cyan-950/20" strokeWidth="1.5">
                    <rect x="42%" y="25%" width="16%" height="22%" rx="8" strokeDasharray="4 2" />
                    <text x="50%" y="36%" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">GYMNASIUM COMPLEX</text>
                    <rect x="32%" y="55%" width="18%" height="24%" rx="8" />
                    <text x="41%" y="67%" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">SCIENCE HALL</text>
                    <rect x="52%" y="48%" width="16%" height="26%" rx="8" />
                    <text x="60%" y="61%" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">LIBRARY BLDG</text>
                    <rect x="64%" y="38%" width="18%" height="20%" rx="8" />
                    <text x="73%" y="48%" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">CAFETERIA BLOCK A</text>
                    <rect x="52%" y="22%" width="16%" height="18%" rx="8" />
                    <text x="60%" y="31%" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">ADMIN BUILDING</text>
                  </svg>
                </div>
              ) : (
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

              {/* Map Pins Badge */}
              <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] text-[#00271D] font-bold border border-gray-200 shadow-xs pointer-events-none flex items-center gap-1 z-10">
                <MapIcon size={12} className="text-[#00A77C]" />
                <span>Map Pins</span>
              </div>

              {/* Clean Circular Trash Can Icons (Matching Student View) */}
              {filteredStations.map(station => {
                const isSel = !isCustomPin && selectedLocation === station.name;
                const isPopoverOpen = activePopoverStation === station.name;

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
                      onClick={() => {
                        handleSelectStation(station);
                        setActivePopoverStation(isPopoverOpen ? null : station.name);
                      }}
                      className={`h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md border-2 ${
                        isSel
                          ? 'bg-[#00A77C] text-white border-white scale-110 ring-4 ring-[#00A77C]/30 z-30'
                          : 'bg-white text-[#00271D] border-gray-200 hover:border-[#00A77C] hover:scale-105'
                      }`}
                      title={`${station.name} (${station.code})`}
                    >
                      <Trash2 size={18} />
                    </button>

                    {/* Popover Details on Click */}
                    {isPopoverOpen && (
                      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-40 min-w-[210px] bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-2xl border border-gray-200/90 animate-fade-in">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                          <div>
                            <p className="text-[11px] font-extrabold text-[#00271D]">{station.name}</p>
                            <p className="text-[9px] text-gray-400 font-mono">{station.code}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActivePopoverStation(null)}
                            className="text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        </div>
                        <div className="space-y-1 text-[10px]">
                          {station.streams.map((stream) => (
                            <div key={stream.type} className="flex items-center justify-between py-0.5">
                              <span className="font-bold text-gray-700 capitalize">{stream.type.toLowerCase().replace('_', ' ')}</span>
                              <span className={`font-black text-[9px] px-1.5 py-0.2 rounded-md ${
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

              {/* Custom Dropped Pin (Matching Student Red Pin) */}
              {isCustomPin && customPinCoords && (
                <div
                  style={{ left: `${customPinCoords.x}%`, top: `${customPinCoords.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 p-2.5 rounded-full bg-rose-500 border-2 border-white text-white shadow-xl animate-bounce z-30 flex items-center justify-center ring-4 ring-rose-400/40"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MapPin size={18} className="fill-white" />
                </div>
              )}
            </div>

            {isPinningMode && (
              <p className="text-xs text-[#00A77C] font-semibold text-center mt-1 animate-pulse flex items-center justify-center gap-1">
                <Target size={13} />
                <span>Tap anywhere on the map to pin other locations!</span>
              </p>
            )}
          </div>

          {/* Location Custom Name Input if Pinned */}
          {isCustomPin && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl space-y-1 animate-fade-in">
              <label className="text-[10px] font-extrabold text-rose-900 uppercase tracking-wider block">
                Custom Pinned Location Name:
              </label>
              <input
                type="text"
                value={customLocationName}
                onChange={(e) => setCustomLocationName(e.target.value)}
                placeholder="e.g. Near Science Garden / Bench 3"
                className="w-full px-3 py-2 rounded-xl bg-white border border-rose-300 text-xs font-bold text-gray-900 outline-none focus:border-rose-500"
              />
            </div>
          )}

          {/* Campus Location Horizontal Pills Row (Matching Student View) */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Campus Locations</span>
            <div className="flex flex-wrap gap-1.5">
              {filteredStations.map((station) => {
                const isSel = !isCustomPin && selectedLocation === station.name;
                return (
                  <button
                    key={station.id}
                    type="button"
                    onClick={() => handleSelectStation(station)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSel
                        ? 'bg-[#00A77C] border-[#00A77C] text-white shadow-xs'
                        : 'bg-gray-50 border-gray-200 text-[#00271D]/80 hover:bg-emerald-50 hover:border-emerald-200'
                    }`}
                  >
                    <span>{station.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* STEP 2: RECYCLABLE ITEM CATEGORY */}
        <div className="bg-white/95 backdrop-blur-sm border border-white/80 rounded-3xl p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-heading font-bold text-[#00271D] flex items-center gap-2">
            <Recycle size={16} className="text-[#00A77C]" />
            <span>2. Itemized Recyclable Category</span>
            <span className="text-rose-500">*</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {RECYCLABLE_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedCategory === cat.id
                    ? 'bg-[#00A77C]/15 border-[#00A77C] ring-2 ring-[#00A77C]/30 text-[#00271D] font-bold shadow-xs'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className={`text-xs font-extrabold ${cat.color}`}>{cat.shortName}</span>
                <span className="text-[11px] text-gray-600 font-bold mt-1">₱{cat.marketPricePerKg} / kg</span>
                <span className="text-[9px] text-gray-400">Limit: {cat.thresholdLimitKg} kg</span>
              </button>
            ))}
          </div>
        </div>

        {/* STEP 3: PAYLOAD WEIGHT & REMARKS */}
        <div className="bg-white/95 backdrop-blur-sm border border-white/80 rounded-3xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-heading font-bold text-[#00271D] flex items-center gap-2">
            <PackageCheck size={16} className="text-[#00A77C]" />
            <span>3. Collected Payload & Remarks</span>
            <span className="text-rose-500">*</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Collected Weight (Kg)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  placeholder="e.g. 18.5"
                  value={weightKg}
                  onChange={e => setWeightKg(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-4 pr-12 py-2.5 text-sm font-black text-[#00271D] outline-none focus:border-[#00A77C] focus:bg-white"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-extrabold text-xs text-[#00A77C]">
                  KG
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Collection Remarks / Comments
              </label>
              <input
                type="text"
                placeholder="e.g. Cleared full bin overflow during afternoon patrol..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-900 outline-none focus:border-[#00A77C] focus:bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-[#00A77C] hover:bg-[#008f6a] text-white text-xs font-extrabold shadow-md shadow-[#00A77C]/25 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <CheckCircle2 size={16} /> Log Direct Collection & Update Inventory
          </button>
        </div>
      </form>
    </div>
  );
};
