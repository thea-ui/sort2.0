import React, { useState } from 'react';
import {
  Compass,
  Trash2,
  MapPin,
  Search,
  Filter,
  X
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
    <div className="max-w-6xl mx-auto space-y-6 pb-12">

      {/* ── Main Live Bin Map Card (Matches Screenshot 705) ── */}
      <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-7 shadow-sm space-y-5">
        
        {/* Header & Status Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-[#00A77C]/15 text-[#00A77C] flex items-center justify-center">
                <MapPin size={18} />
              </div>
              <h2 className="text-xl font-heading font-black text-[#00271D] tracking-tight">Live Bin Map</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
              <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
              Live · Updated Just Now
            </span>
          </div>
        </div>

        {/* Filter Pills below header */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterStatus('ALL')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterStatus === 'ALL'
                ? 'bg-gray-200 text-[#00271D] shadow-xs'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200/80'
            }`}
          >
            <span>All Bins</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-[#00271D] font-bold">
              {bins.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('UNAVAILABLE')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterStatus === 'UNAVAILABLE'
                ? 'bg-rose-100 text-rose-800 border border-rose-200 shadow-xs'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200/80'
            }`}
          >
            <span>Full</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-200 text-rose-900 font-bold">
              {unavailableCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('AVAILABLE')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterStatus === 'AVAILABLE'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-xs'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200/80'
            }`}
          >
            <span>Available</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-200 text-emerald-900 font-bold">
              {availableCount}
            </span>
          </button>
        </div>

        {/* Crisp Light Blueprint Grid Map (Matches Screenshot 705) */}
        <div
          onClick={e => {
            if (!isPinningMode) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const pctX = (e.clientX - rect.left) / rect.width;
            const pctY = (e.clientY - rect.top) / rect.height;
            const lat = MAP_BOUNDS.maxLat - pctY * (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat);
            const lng = MAP_BOUNDS.minLng + pctX * (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng);
            setGpsCoords({ lat, lng });
            setIsCustomDebrisPin(true);
            setAssignedLocationText(`Pinned at [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
          }}
          className={`relative w-full h-[360px] sm:h-[400px] rounded-2xl border border-gray-200 bg-[#F8FAFC] overflow-hidden shadow-inner flex items-center justify-center transition-all ${
            isPinningMode ? 'cursor-crosshair ring-2 ring-[#00A77C]/50' : 'cursor-default'
          }`}
        >
          
          {/* Light Grid Lines */}
          <svg className="absolute inset-0 w-full h-full opacity-60 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="teacher-light-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#E2E8F0" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#teacher-light-grid)" />
          </svg>

          {/* Map Top Badge */}
          <div className="absolute top-4 left-4 bg-white px-3 py-1.5 rounded-full text-[11px] text-[#00271D] font-bold border border-gray-200 shadow-xs pointer-events-none flex items-center gap-1.5">
            <MapPin size={13} className="text-[#00A77C]" />
            <span>Campus Map</span>
          </div>

          {/* Custom Pinned Debris marker if active */}
          {isCustomDebrisPin && gpsCoords && (() => {
            const { pctX, pctY } = coordToPct(gpsCoords.lat, gpsCoords.lng);
            return (
              <div style={{ left: `${pctX}%`, top: `${pctY}%` }} className="absolute -translate-x-1/2 -translate-y-1/2 z-30 flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white shadow-xl animate-bounce">
                <MapPin size={14} strokeWidth={2.5} />
              </div>
            );
          })()}

          {/* Plot Bins as Side-by-Side Dual Color-Coded Trash Cans on Map */}
          {filteredBins.map(bin => {
            const { pctX, pctY } = coordToPct(bin.coordinates.lat, bin.coordinates.lng);
            const isSelected = selectedBinId === bin.id;
            const unavail = isBinUnavailable(bin);

            return (
              <div
                key={bin.id}
                style={{ left: `${pctX}%`, top: `${pctY}%` }}
                onClick={(e) => {
                  if (isPinningMode) return;
                  e.stopPropagation();
                  setSelectedBinId(bin.id);
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 z-20 group ${
                  isSelected ? 'scale-125 z-40 ring-4 ring-[#00A77C]/40 rounded-2xl shadow-lg animate-pulse' : 'hover:scale-110'
                }`}
              >
                {/* Dual Side-by-Side Trash Cans container */}
                <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2 py-1.5 rounded-xl border border-gray-200 shadow-md">
                  {/* Left Trash Can: Biodegradable */}
                  <div className="flex flex-col items-center">
                    <div className={`p-1 rounded-md flex items-center justify-center text-white ${
                      unavail ? 'bg-rose-500' : 'bg-[#10B981]'
                    }`}>
                      <Trash2 size={12} strokeWidth={2.5} />
                    </div>
                    <span className="text-[6px] font-black text-emerald-700 uppercase tracking-tighter mt-0.5">Bio</span>
                  </div>

                  {/* Right Trash Can: Non-Biodegradable / Recyclable */}
                  <div className="flex flex-col items-center">
                    <div className={`p-1 rounded-md flex items-center justify-center text-white ${
                      unavail ? 'bg-rose-500' : 'bg-sky-500'
                    }`}>
                      <Trash2 size={12} strokeWidth={2.5} />
                    </div>
                    <span className="text-[6px] font-black text-sky-700 uppercase tracking-tighter mt-0.5">Non-Bio</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Floating Bin Detail Overlay Card */}
          {selectedBinId && activeBinDetail && (() => {
            const unavail = isBinUnavailable(activeBinDetail);

            return (
              <div className="absolute bottom-4 inset-x-4 sm:left-auto sm:right-4 sm:w-80 bg-white/95 backdrop-blur-md border border-gray-200 text-[#00271D] rounded-2xl p-4 shadow-xl z-40 animate-fade-in space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#00271D] flex items-center gap-1.5">
                      <Trash2 size={14} className={unavail ? 'text-rose-500' : 'text-[#10B981]'} />
                      <span>{activeBinDetail.locationName}</span>
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedBinId(null)}
                    className="text-gray-400 hover:text-[#00271D] text-xs font-bold p-1 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <span className="text-xs font-medium text-gray-500">Status</span>
                  <span className={`text-xs font-bold px-3 py-0.5 rounded-full border ${
                    unavail
                      ? 'bg-rose-100 text-rose-700 border-rose-200'
                      : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  }`}>
                    {unavail ? 'Bin Location Unavailable' : 'Available'}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Legend Footer */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-[#00271D]/70 font-semibold pt-1">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" /> Biodegradable (Bio)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> Non-Biodegradable (Non-Bio)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Full / Unavailable
          </span>
        </div>

      </div>

      {/* ── All Campus Bins Directory List (Matches Screenshot 705) ── */}
      <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-7 shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <h3 className="text-base font-heading font-bold text-[#00271D]">
              All Campus Bins ({filteredBins.length})
            </h3>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search bin location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-[#00271D] outline-none focus:border-[#00A77C] focus:bg-white transition-all font-medium"
            />
          </div>
        </div>

        {/* Directory List Items */}
        <div className="divide-y divide-gray-100">
          {filteredBins.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs font-medium">
              No campus bins match your search criteria.
            </div>
          ) : (
            filteredBins.map((bin) => {
              const unavail = isBinUnavailable(bin);
              const isSelected = selectedBinId === bin.id;

              return (
                <div
                  key={bin.id}
                  onClick={() => setSelectedBinId(bin.id)}
                  className={`py-3.5 px-2 flex items-center justify-between gap-3 cursor-pointer transition-colors rounded-xl ${
                    isSelected ? 'bg-[#00A77C]/10 font-bold' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${unavail ? 'bg-rose-500' : 'bg-[#10B981]'}`} />
                    <h4 className="text-xs font-bold text-[#00271D]">{bin.locationName}</h4>
                  </div>

                  <span className={`text-xs font-bold px-3 py-1 rounded-full text-center shrink-0 ${
                    unavail
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {unavail ? 'Bin Location Unavailable' : 'Available'}
                  </span>
                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
};
