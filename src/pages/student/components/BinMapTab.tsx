import React, { useState } from 'react';
import {
  MapPin,
  Trash2,
  Search,
  Filter,
  Compass
} from 'lucide-react';
import { Bin } from '../../../types';

interface BinMapTabProps {
  bins: Bin[];
  setActiveTab?: (tab: string) => void;
  setBinId?: (id: string | null) => void;
  setLocationName?: (name: string) => void;
}

export const isBinUnavailable = (bin: Bin): boolean => {
  return Boolean(bin.activeDispatch || bin.fillLevel >= 85);
};

export const BinMapTab: React.FC<BinMapTabProps> = ({
  bins,
  setBinId,
  setLocationName,
}) => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'UNAVAILABLE' | 'AVAILABLE'>('ALL');
  const [selectedBinId, setSelectedBinIdState] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const unavailableBinsCount = bins.filter(isBinUnavailable).length;
  const availableBinsCount = bins.length - unavailableBinsCount;

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

  const handleSelectBin = (bin: Bin) => {
    setSelectedBinIdState(bin.id);
    setBinId?.(bin.id);
    setLocationName?.(bin.locationName);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">

      {/* ── Main Live Bin Map Card ── */}
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

        {/* Filter Pills */}
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
              {unavailableBinsCount}
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
              {availableBinsCount}
            </span>
          </button>
        </div>

        {/* ── Dark Mode Blueprint Grid Canvas ── */}
        <div className="relative w-full h-[380px] sm:h-[420px] rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden shadow-2xl flex items-center justify-center transition-all">
          
          {/* Dark Grid Overlay Lines */}
          <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dark-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#334155" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dark-grid)" />
          </svg>

          {/* Campus Map Badge */}
          <div className="absolute top-4 left-4 bg-slate-800/90 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[11px] text-slate-200 font-bold border border-slate-700 shadow-md pointer-events-none flex items-center gap-1.5">
            <span>📍 Campus Grid Map</span>
          </div>

          {/* Plot Side-By-Side Color-Coded Trash Can Icons */}
          {filteredBins.map(bin => {
            const minLat = 14.5980;
            const maxLat = 14.6030;
            const minLng = 120.9820;
            const maxLng = 120.9880;

            const pctY = ((maxLat - bin.coordinates.lat) / (maxLat - minLat)) * 100;
            const pctX = ((bin.coordinates.lng - minLng) / (maxLng - minLng)) * 100;

            const isSelected = selectedBinId === bin.id;
            const unavail = isBinUnavailable(bin);

            return (
              <div
                key={bin.id}
                style={{ left: `${pctX}%`, top: `${pctY}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectBin(bin);
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 z-20 group ${
                  isSelected ? 'scale-150 z-30' : 'hover:scale-125'
                }`}
              >
                {/* ── Two Distinct Side-by-Side Color-Coded Trash Cans ── */}
                <div className={`flex items-center gap-1 p-1 rounded-xl bg-slate-900/90 border-2 border-white shadow-xl transition-all ${
                  isSelected
                    ? 'ring-4 ring-[#00A77C]/70 shadow-[#00A77C]/40 animate-pulse'
                    : 'group-hover:border-[#00A77C]'
                }`}>
                  {/* Left Trash Can Icon: Biodegradable / Organic */}
                  <div
                    className={`p-1 rounded-md transition-colors ${
                      unavail ? 'bg-rose-500 text-white' : 'bg-[#10B981] text-white'
                    }`}
                    title="Biodegradable / Organic Bin"
                  >
                    <Trash2 size={13} />
                  </div>

                  {/* Right Trash Can Icon: Non-Biodegradable / Recyclable */}
                  <div
                    className={`p-1 rounded-md transition-colors ${
                      unavail ? 'bg-rose-500 text-white' : 'bg-[#0091EA] text-white'
                    }`}
                    title="Non-Biodegradable / Recyclable Bin"
                  >
                    <Trash2 size={13} />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Floating Bin Detail Overlay Card */}
          {selectedBinId && (() => {
            const bin = bins.find(b => b.id === selectedBinId);
            if (!bin) return null;
            const unavail = isBinUnavailable(bin);

            return (
              <div className="absolute bottom-4 inset-x-4 sm:left-auto sm:right-4 sm:w-80 bg-white/95 backdrop-blur-md border border-gray-200 text-[#00271D] rounded-2xl p-4 shadow-xl z-40 animate-fade-in space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#00271D] flex items-center gap-1.5">
                      <Trash2 size={14} className={unavail ? 'text-rose-500' : 'text-[#10B981]'} />
                      <span>{bin.locationName}</span>
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
                      Category: {bin.type} · Fill: {bin.fillLevel}%
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedBinIdState(null)}
                    className="text-gray-400 hover:text-[#00271D] text-xs font-bold p-1 cursor-pointer"
                  >
                    ✕
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
        <div className="flex items-center gap-4 text-xs text-[#00271D]/70 font-semibold pt-1">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" /> Organic / Biodegradable
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#0091EA]" /> Recyclable / Non-Bio
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Full / Unavailable
          </span>
        </div>

      </div>

      {/* ── All Campus Bins Directory List ── */}
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
                  onClick={() => handleSelectBin(bin)}
                  className={`py-3.5 px-3 flex items-center justify-between gap-3 cursor-pointer transition-colors rounded-xl ${
                    isSelected ? 'bg-[#00A77C]/15 font-bold border border-[#00A77C]/30 shadow-xs' : 'hover:bg-gray-50'
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

