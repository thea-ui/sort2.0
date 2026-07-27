import React, { useState } from 'react';
import {
  Compass,
  Trash2,
  MapPin,
  Truck,
  AlertOctagon,
  Search
} from 'lucide-react';
import { Bin } from '../../../types';

interface TeacherBinMapTabProps {
  bins: Bin[];
  selectedBinId: string | null;
  setSelectedBinId: (id: string | null) => void;
  activeBinDetail: Bin | undefined;
  isPinningMode: boolean;
  setIsPinningMode: (p: boolean) => void;
  isCustomDebrisPin: boolean;
  setIsCustomDebrisPin: (p: boolean) => void;
  gpsCoords: { lat: number; lng: number } | null;
  setGpsCoords: (coords: { lat: number; lng: number } | null) => void;
  assignedLocationText: string;
  setAssignedLocationText: (txt: string) => void;
  updateBinLevel: (id: string, lvl: number) => void;
  toggleBinDispatch: (id: string) => void;
  MAP_BOUNDS: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  coordToPct: (lat: number, lng: number) => { pctX: number; pctY: number };
}

// 2-state status evaluator: Available vs Unavailable
export const isBinUnavailable = (bin: Bin): boolean => {
  return Boolean(bin.activeDispatch || bin.fillLevel >= 85);
};

export const TeacherBinMapTab: React.FC<TeacherBinMapTabProps> = ({
  bins,
  selectedBinId,
  setSelectedBinId,
  activeBinDetail,
  isPinningMode,
  setIsPinningMode,
  isCustomDebrisPin,
  setIsCustomDebrisPin,
  gpsCoords,
  setGpsCoords,
  assignedLocationText,
  setAssignedLocationText,
  updateBinLevel,
  toggleBinDispatch,
  MAP_BOUNDS,
  coordToPct
}) => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'UNAVAILABLE' | 'AVAILABLE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const unavailableCount = bins.filter(isBinUnavailable).length;
  const availableCount = bins.length - unavailableCount;

  const filteredBins = bins.filter(bin => {
    const unavail = isBinUnavailable(bin);
    const matchesStatus =
      filterStatus === 'ALL' ? true :
      filterStatus === 'UNAVAILABLE' ? unavail :
      !unavail;
    const matchesSearch =
      bin.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bin.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">

      {/* Blueprint Map Card (Matching Student Blueprint Map Design) */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow space-y-4">
        
        {/* Header & Status Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <MapPin size={18} />
              </div>
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Live Bin Map</h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Real-time smart status monitor & campus waste recovery locations</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setIsPinningMode(!isPinningMode); if (!isPinningMode) setSelectedBinId(null); }}
              className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-[10px] font-bold transition-all cursor-pointer ${
                isPinningMode ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Compass size={12} className={isPinningMode ? 'animate-spin' : ''} />
              {isPinningMode ? 'Pinning Active' : 'Drop Debris Pin'}
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Telemetry
            </span>
          </div>
        </div>

        {/* Top Summary Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterStatus === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>All Bins</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filterStatus === 'ALL' ? 'bg-slate-700 text-white' : 'bg-gray-200 text-gray-700'}`}>
              {bins.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('AVAILABLE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterStatus === 'AVAILABLE'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
            }`}
          >
            <span>Available Bins</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filterStatus === 'AVAILABLE' ? 'bg-emerald-700 text-white' : 'bg-emerald-200 text-emerald-800'}`}>
              {availableCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('UNAVAILABLE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterStatus === 'UNAVAILABLE'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
            }`}
          >
            <span>Unavailable Bins</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filterStatus === 'UNAVAILABLE' ? 'bg-rose-700 text-white' : 'bg-rose-200 text-rose-800'}`}>
              {unavailableCount}
            </span>
          </button>
        </div>

        {/* Blueprint Campus Grid Map Container */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 pt-2">
          
          <div className="lg:col-span-2 space-y-4">
            <div
              onClick={e => {
                if (!isPinningMode) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const pctX = (e.clientX - rect.left) / rect.width;
                const pctY = (e.clientY - rect.top) / rect.height;
                const lat = MAP_BOUNDS.maxLat - pctY * (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat);
                const lng = MAP_BOUNDS.minLng + pctX * (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng);
                setGpsCoords({ lat, lng }); setSelectedBinId(null); setIsCustomDebrisPin(true);
                setAssignedLocationText(`Custom Debris at [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
              }}
              className={`relative h-[360px] sm:h-[400px] w-full overflow-hidden rounded-2xl border bg-slate-900 border-slate-950 shadow-inner flex items-center justify-center transition-all ${
                isPinningMode ? 'cursor-crosshair ring-2 ring-indigo-500/40' : 'cursor-default'
              }`}
            >
              {/* Blueprint Grid Canvas */}
              <svg className="absolute inset-0 w-full h-full opacity-25 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="teacher-binmap-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                    <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#334155" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#teacher-binmap-grid)" />
                
                {/* Campus Building Overlay Labels */}
                <rect x="12%" y="10%" width="22%" height="18%" rx="10" fill="#475569" />
                <text x="23%" y="20%" fill="#cbd5e1" fontSize="10" fontWeight="bold" textAnchor="middle">Sports Gym Complex</text>

                <rect x="62%" y="12%" width="26%" height="20%" rx="10" fill="#475569" />
                <text x="75%" y="23%" fill="#cbd5e1" fontSize="10" fontWeight="bold" textAnchor="middle">Science Hall & Labs</text>

                <circle cx="50%" cy="50%" r="48" fill="#334155" />
                <text x="50%" y="51%" fill="#cbd5e1" fontSize="10" fontWeight="bold" textAnchor="middle">Main Courtyard (Quad)</text>

                <rect x="10%" y="68%" width="26%" height="20%" rx="10" fill="#475569" />
                <text x="23%" y="79%" fill="#cbd5e1" fontSize="10" fontWeight="bold" textAnchor="middle">Chemistry Building</text>

                <rect x="58%" y="70%" width="30%" height="20%" rx="10" fill="#475569" />
                <text x="73%" y="81%" fill="#cbd5e1" fontSize="10" fontWeight="bold" textAnchor="middle">Main University Library</text>
              </svg>

              <div className="absolute top-3 left-3 bg-slate-800/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-[9px] text-slate-300 font-bold uppercase border border-slate-700 pointer-events-none flex items-center gap-1.5 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Campus Coordinate Blueprint Grid</span>
              </div>

              {/* Plot Bins dynamically on Map (2-state Status Model: Available vs Unavailable) */}
              {filteredBins.map(bin => {
                const { pctX, pctY } = coordToPct(bin.coordinates.lat, bin.coordinates.lng);
                const isSelected = selectedBinId === bin.id;
                const unavail = isBinUnavailable(bin);

                const badgeStyle = unavail
                  ? 'bg-rose-950/90 text-rose-300 border-rose-700 shadow-rose-950/50'
                  : 'bg-emerald-950/90 text-emerald-300 border-emerald-700 shadow-emerald-950/50';

                return (
                  <div
                    key={bin.id}
                    style={{ left: `${pctX}%`, top: `${pctY}%` }}
                    onClick={e => { e.stopPropagation(); setSelectedBinId(bin.id); setIsCustomDebrisPin(false); setGpsCoords(bin.coordinates); setAssignedLocationText(bin.locationName); }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 z-20 group ${
                      isSelected ? 'scale-125 z-30' : 'hover:scale-110'
                    }`}
                  >
                    <div className={`p-1.5 sm:p-2 rounded-xl border shadow-xl flex items-center gap-1.5 backdrop-blur-md ${badgeStyle} ${
                      isSelected ? 'ring-2 ring-emerald-400 shadow-emerald-500/30' : ''
                    }`}>
                      <Trash2 size={14} className="stroke-[2.5]" />
                      <span className="text-[8.5px] font-black tracking-wider uppercase">{bin.type.slice(0, 4)}</span>
                      <span className={`h-2 w-2 rounded-full ${unavail ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'}`} />
                    </div>

                    {isSelected && (
                      <div className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Custom debris pin */}
              {isCustomDebrisPin && gpsCoords && (() => {
                const { pctX, pctY } = coordToPct(gpsCoords.lat, gpsCoords.lng);
                return (
                  <div style={{ left: `${pctX}%`, top: `${pctY}%` }} className="absolute z-30 -translate-x-1/2 -translate-y-1/2 flex h-7 w-7 animate-bounce items-center justify-center rounded-full border border-rose-400 bg-rose-500 text-white shadow-xl">
                    <MapPin size={14} strokeWidth={2.5} />
                  </div>
                );
              })()}
            </div>

            {/* Status Legend */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 pt-1">
              <div className="flex items-center gap-5 text-[11px] font-semibold">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Legend:</span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Available (Active on site)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Unavailable (Full / Dispatched / Emptying)
                </span>
              </div>
            </div>
          </div>

          {/* Right: Bin detail panel */}
          <div className="lg:col-span-1">
            {activeBinDetail ? (
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
                <div className="border-b border-gray-100 pb-3">
                  <span className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-indigo-700">
                    Ecology Node Telemetry
                  </span>
                  <h4 className="mt-2 text-sm font-bold text-gray-900">{activeBinDetail.name}</h4>
                  <p className="text-[10px] text-gray-400">{activeBinDetail.locationName}</p>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3.5 py-2.5">
                    <span className="font-bold text-gray-400">Classification</span>
                    <span className="font-extrabold uppercase text-gray-800">{activeBinDetail.type}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3.5 py-2.5">
                    <span className="font-bold text-gray-400">Last Collection</span>
                    <span className="font-extrabold uppercase text-gray-800">{activeBinDetail.lastEmptied || 'Unknown'}</span>
                  </div>
                  
                  {/* 2-State Status Badge */}
                  <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3.5 py-2.5">
                    <span className="text-xs font-bold text-gray-400">Bin Status</span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                      isBinUnavailable(activeBinDetail)
                        ? 'bg-rose-100 text-rose-700 border-rose-200'
                        : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    }`}>
                      {isBinUnavailable(activeBinDetail) ? 'Unavailable' : 'Available'}
                    </span>
                  </div>

                  <div className="pt-1">
                    <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-gray-400">Manual Fill Override</p>
                    <div className="flex gap-1.5">
                      {[30, 75, 95].map(lvl => (
                        <button key={lvl} type="button" onClick={() => updateBinLevel(activeBinDetail.id, lvl)}
                          className="flex-1 rounded-xl border border-gray-200 bg-gray-50 py-1.5 text-[10px] font-bold text-gray-600 hover:bg-gray-100 cursor-pointer">{lvl}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleBinDispatch(activeBinDetail.id)}
                    className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      activeBinDetail.activeDispatch
                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                        : 'bg-indigo-600 text-white shadow-md shadow-indigo-100 hover:bg-indigo-700'
                    }`}
                  >
                    <Truck size={14} />
                    {activeBinDetail.activeDispatch ? 'Cancel MRF Dispatch' : 'Dispatch MRF Recovery'}
                  </button>
                </div>
              </div>
            ) : isCustomDebrisPin && gpsCoords ? (
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
                <div className="border-b border-gray-100 pb-3">
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-100 bg-rose-50 px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-rose-700">
                    Unmanaged Debris Alert
                  </span>
                  <h4 className="mt-2 text-sm font-bold text-gray-900">{assignedLocationText}</h4>
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 font-mono text-[10px] text-gray-600">
                  <div>Lat: {gpsCoords.lat.toFixed(5)}</div>
                  <div>Lng: {gpsCoords.lng.toFixed(5)}</div>
                </div>
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-3.5 text-[11px] text-indigo-700">
                  💡 <span className="font-bold">Tip:</span> File a maintenance ticket via the <span className="font-bold">File a Report</span> tab to log this location.
                </div>
                <button type="button" onClick={() => { setIsCustomDebrisPin(false); setGpsCoords(null); setAssignedLocationText(''); }}
                  className="w-full rounded-2xl border border-gray-200 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:bg-gray-50 cursor-pointer">
                  Clear Pin
                </button>
              </div>
            ) : (
              <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                <AlertOctagon size={28} className="mx-auto mb-2 text-gray-200" />
                <p className="text-xs font-bold text-gray-400">Select a bin on the map to view telemetry and dispatch controls.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Directory List Container */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Trash2 size={18} className="text-gray-500" />
              <span>Campus Bins Directory</span>
              <span className="text-gray-400 font-normal text-xs">({filteredBins.length})</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Filter by location or status to check bin availability</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search bin location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Directory List Items */}
        <div className="border border-gray-200 rounded-2xl divide-y divide-gray-150 overflow-hidden bg-white">
          {filteredBins.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs font-medium">
              No campus bins match your filter criteria.
            </div>
          ) : (
            filteredBins.map((bin) => {
              const unavail = isBinUnavailable(bin);
              const isSelected = selectedBinId === bin.id;

              return (
                <div
                  key={bin.id}
                  onClick={() => { setSelectedBinId(bin.id); setIsCustomDebrisPin(false); setGpsCoords(bin.coordinates); setAssignedLocationText(bin.locationName); }}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-indigo-50/40 font-semibold' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`h-3 w-3 rounded-full shrink-0 ${unavail ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">{bin.locationName}</h4>
                      <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                        Category: <span className="text-gray-700 font-semibold">{bin.type}</span> · Sensor ID: <span className="font-mono text-gray-600">{bin.id}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                      unavail
                        ? 'bg-rose-100 text-rose-700 border-rose-200'
                        : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    }`}>
                      {unavail ? 'Unavailable' : 'Available'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
};
