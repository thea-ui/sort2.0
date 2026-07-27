import React, { useState } from 'react';
import {
  MapPin,
  Trash2,
  Search,
  ChevronRight,
  Send
} from 'lucide-react';
import { Bin } from '../../../types';

interface BinMapTabProps {
  bins: Bin[];
  setActiveTab: (tab: string) => void;
  setBinId: (id: string | null) => void;
  setLocationName: (name: string) => void;
}

// Helper to strictly evaluate 2-state status: Available vs Unavailable
export const isBinUnavailable = (bin: Bin): boolean => {
  return Boolean(bin.activeDispatch || bin.fillLevel >= 85);
};

export const BinMapTab: React.FC<BinMapTabProps> = ({
  bins,
  setActiveTab,
  setBinId,
  setLocationName,
}) => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'UNAVAILABLE' | 'AVAILABLE'>('ALL');
  const [selectedBinId, setSelectedBinIdState] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Bin status stats
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
  };

  const handleReportBin = (bin: Bin) => {
    setBinId(bin.id);
    setLocationName(bin.locationName);
    setActiveTab('submit-report');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">

      {/* Main Blueprint Map Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow space-y-4">
        
        {/* Header & Status Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <MapPin size={16} />
              </div>
              <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">Live Bin Map</h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Real-time smart status monitor & campus waste recovery locations</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live · Updated Just Now
            </span>
          </div>
        </div>

        {/* Top Summary Filter Pills (Simplified to Available vs Unavailable) */}
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
              {availableBinsCount}
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
              {unavailableBinsCount}
            </span>
          </button>
        </div>

        {/* Blueprint Campus Grid Map */}
        <div className="relative w-full h-[360px] sm:h-[400px] rounded-2xl border bg-slate-900 border-slate-950 overflow-hidden shadow-inner flex items-center justify-center transition-all">
          
          {/* Blueprint Grid Canvas */}
          <svg className="absolute inset-0 w-full h-full opacity-25 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="binmap-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#334155" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#binmap-grid)" />
            
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

          {/* Plot Bins dynamically on Map (NO Fill Level Percentages) */}
          {filteredBins.map(bin => {
            const minLat = 14.5980;
            const maxLat = 14.6030;
            const minLng = 120.9820;
            const maxLng = 120.9880;

            const pctY = ((maxLat - bin.coordinates.lat) / (maxLat - minLat)) * 100;
            const pctX = ((bin.coordinates.lng - minLng) / (maxLng - minLng)) * 100;

            const isSelected = selectedBinId === bin.id;
            const unavail = isBinUnavailable(bin);

            const badgeStyle = unavail
              ? 'bg-rose-950/90 text-rose-300 border-rose-700 shadow-rose-950/50'
              : 'bg-emerald-950/90 text-emerald-300 border-emerald-700 shadow-emerald-950/50';

            return (
              <div
                key={bin.id}
                style={{ left: `${pctX}%`, top: `${pctY}%` }}
                onClick={() => handleSelectBin(bin)}
                className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 z-20 group ${
                  isSelected ? 'scale-125 z-30' : 'hover:scale-110'
                }`}
              >
                {/* Marker Container without percentage overlay */}
                <div className={`p-1.5 sm:p-2 rounded-xl border shadow-xl flex items-center gap-1.5 backdrop-blur-md ${badgeStyle} ${
                  isSelected ? 'ring-2 ring-emerald-400 shadow-emerald-500/30' : ''
                }`}>
                  <Trash2 size={14} className="stroke-[2.5]" />
                  <span className="text-[8.5px] font-black tracking-wider uppercase">{bin.type.slice(0, 4)}</span>
                  <span className={`h-2 w-2 rounded-full ${unavail ? 'bg-rose-500' : 'bg-emerald-400'}`} />
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

          {/* Floating Bin Detail Overlay Card */}
          {selectedBinId && (() => {
            const bin = bins.find(b => b.id === selectedBinId);
            if (!bin) return null;

            const unavail = isBinUnavailable(bin);

            return (
              <div className="absolute bottom-3 inset-x-3 sm:left-auto sm:right-3 sm:w-80 bg-slate-900/95 backdrop-blur-md border border-slate-700 text-white rounded-xl p-4 shadow-2xl z-40 animate-fade-in flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      <Trash2 size={13} className={unavail ? 'text-rose-400' : 'text-emerald-400'} />
                      <span>{bin.locationName}</span>
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                      Category: {bin.type} · ID: {bin.id}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedBinIdState(null)}
                    className="text-slate-400 hover:text-slate-200 text-xs font-bold p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Simplified Single Status Badge (No percentages or progress bars) */}
                <div className="flex items-center justify-between bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                  <span className="text-[11px] font-medium text-slate-300">Bin Status</span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    unavail
                      ? 'bg-rose-950 text-rose-300 border-rose-800'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  }`}>
                    {unavail ? 'Unavailable' : 'Available'}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Legend Footer (Strictly 2 Status Indicators: Available vs Unavailable) */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 pt-2">
          <div className="flex items-center gap-5 text-[11px] font-semibold">
            <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Legend:</span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Available (Active on site)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Unavailable (Full / Dispatched / Emptying)
            </span>
          </div>
          <p className="text-[10px] text-gray-400 italic">Click any bin marker on grid for instant details</p>
        </div>

      </div>

      {/* Campus Bin Directory List */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Trash2 size={18} className="text-gray-500" />
              <span>All Campus Bins Directory</span>
              <span className="text-gray-400 font-normal text-xs">({filteredBins.length})</span>
            </h3>
            {/* Updated search input subtext */}
            <p className="text-xs text-gray-500 mt-0.5">Filter by location or status to check bin status</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search bin location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 outline-none focus:border-emerald-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Directory List Table/Cards (NO Fill Level Bars) */}
        <div className="border border-gray-200 rounded-xl divide-y divide-gray-150 overflow-hidden bg-white">
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
                  onClick={() => handleSelectBin(bin)}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-emerald-50/50 font-semibold' : 'hover:bg-gray-50'
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
                    {/* Single Clean Status Badge (Available vs Unavailable) */}
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
