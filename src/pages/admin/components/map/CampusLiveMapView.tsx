import React, { useState, useMemo, useEffect } from 'react';
import {
  MapPin,
  Trash2,
  Search,
  Droplets,
  PackageX,
  Recycle,
  AlertTriangle,
  Map as MapIcon,
  Check,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { BinStatus, Report, WasteCategory, BinLocationItem } from '../../../../types';
import {
  getStoredLocations,
  STORAGE_KEY_BLUEPRINT_URL,
  STORAGE_KEY_LOCATIONS,
} from '../../../../services/locationStore';
import { CampusMapFrame } from '../../../../components/map/CampusMapFrame';
import { PageHeader } from '../../../../components/layout/PageHeader';

interface CampusLiveMapViewProps {
  bins?: BinStatus[];
  reports?: Report[];
}

type BinCategory = 'BIODEGRADABLE' | 'NON_BIODEGRADABLE' | 'RECYCLABLE';

interface BinSlotView {
  type: BinCategory;
  isAvailable: boolean;
  statusText: string;
}

interface StationViewItem {
  id: string;
  name: string;
  code: string;
  x: number;
  y: number;
  overallStatus: 'Available' | 'Unavailable';
  slots: BinSlotView[];
}

const CAT_META: Record<
  BinCategory,
  { label: string; short: string; bg: string; border: string; text: string; Icon: React.FC<{ size?: number; className?: string }> }
> = {
  BIODEGRADABLE: { label: 'Biodegradable', short: 'Bio', bg: 'bg-emerald-500', border: 'border-emerald-400', text: 'text-emerald-600', Icon: Droplets },
  NON_BIODEGRADABLE: { label: 'Non-Biodegradable', short: 'Non', bg: 'bg-rose-500', border: 'border-rose-400', text: 'text-[var(--action)]', Icon: PackageX },
  RECYCLABLE: { label: 'Recyclable', short: 'Rec', bg: 'bg-sky-500', border: 'border-sky-400', text: 'text-[var(--bin-map)]', Icon: Recycle },
};

export const CampusLiveMapView: React.FC<CampusLiveMapViewProps> = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocId, setSelectedLocId] = useState<string | null>(null);
  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);

  // Reactive Locations state & Blueprint image listener
  const [locationList, setLocationList] = useState<BinLocationItem[]>(getStoredLocations);
  const [blueprintUrl, setBlueprintUrl] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY_BLUEPRINT_URL));

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

  const stations: StationViewItem[] = useMemo(() => {
    return locationList.map((loc) => {
      const bioStream = loc.streams.find((s) => s.type === 'BIODEGRADABLE');
      const nonBioStream = loc.streams.find((s) => s.type === 'NON_BIODEGRADABLE');
      const recStream = loc.streams.find((s) => s.type === 'RECYCLABLE');

      const slots: BinSlotView[] = [
        {
          type: 'BIODEGRADABLE',
          isAvailable: bioStream ? bioStream.status === 'Available' : false,
          statusText: bioStream ? bioStream.status : 'Not Installed',
        },
        {
          type: 'NON_BIODEGRADABLE',
          isAvailable: nonBioStream ? nonBioStream.status === 'Available' : false,
          statusText: nonBioStream ? nonBioStream.status : 'Not Installed',
        },
        {
          type: 'RECYCLABLE',
          isAvailable: recStream ? recStream.status === 'Available' : false,
          statusText: recStream ? recStream.status : 'Not Installed',
        },
      ];

      return {
        id: loc.id,
        name: loc.name,
        code: loc.code,
        x: loc.x,
        y: loc.y,
        overallStatus: loc.status,
        slots,
      };
    });
  }, [locationList]);

  const filteredStations = useMemo(() => {
    return stations.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.code.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [stations, searchQuery]);

  const activeStation = useMemo(
    () => stations.find((s) => s.id === selectedLocId) || stations[0] || null,
    [stations, selectedLocId]
  );

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <PageHeader
        title="Campus Bin Map"
        description="Real-time monitoring of campus waste stations, stream availability, and coordinates."
        actions={
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold shrink-0">
            <span className="h-2 w-2 rounded-full bg-[var(--impact)] animate-pulse motion-reduce:animate-none" />
            Live Sync Active
          </span>
        }
      />

      {/* Main Container: Map Grid on top/left, Interactive Location Cards on bottom/right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* MAP CANVAS VIEW (7 cols) */}
        <div className="lg:col-span-7 bg-white/95 backdrop-blur-sm border border-white/80 rounded-3xl p-5 shadow-sm space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search campus bin location or building..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-[var(--text-strong)] font-medium outline-none focus:border-[var(--accent)] focus:bg-white transition-all shadow-xs"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
              <span>Campus Map Grid (Click Pin for Details)</span>
              {activeStation && (
                <span className="text-[var(--accent)] normal-case font-bold truncate max-w-[240px]">
                  Selected: {activeStation.name}
                </span>
              )}
            </div>

            {/* Map Canvas Frame */}
            <div className="relative w-full h-[380px] sm:h-[430px] rounded-2xl border border-gray-200 bg-[#f8fafc] shadow-inner flex items-center justify-center select-none">
              {/* ATLAS base map (clipped to rounded corners without cutting off pin popovers) */}
              <CampusMapFrame
                blueprintUrl={blueprintUrl}
                blueprintClassName="absolute inset-0 w-full h-full object-cover opacity-80 pointer-events-none"
                fallback={(
                  <svg className="absolute inset-0 w-full h-full opacity-50 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="light-grid-adminview" width="28" height="28" patternUnits="userSpaceOnUse">
                        <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#E2E8F0" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#light-grid-adminview)" />
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
                <MapIcon size={12} className="text-[var(--text-strong)]" />
                <span>Station Map Pins</span>
              </div>

              {/* Map Pins */}
              {filteredStations.map((st) => {
                const isSelected = activeStation?.id === st.id;
                const isPopoverOpen = activePopoverId === st.id;
                const hasUnavailable = st.slots.some((slot) => !slot.isAvailable);

                return (
                  <div
                    key={st.id}
                    style={{ left: `${st.x}%`, top: `${st.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
                  >
                    <button
                      type="button"
                      data-testid="station-pin"
                      onClick={() => {
                        setSelectedLocId(st.id);
                        setActivePopoverId(isPopoverOpen ? null : st.id);
                      }}
                      className={`relative flex items-center justify-center h-9 w-9 rounded-full border-2 transition-transform duration-200 cursor-pointer shadow-md ${
                        hasUnavailable
                          ? 'bg-rose-500 border-white text-white'
                          : 'bg-[var(--accent)] border-white text-white'
                      } ${isSelected ? 'scale-125 ring-4 ring-amber-400 z-30' : 'hover:scale-110'}`}
                    >
                      <Trash2 size={16} />
                    </button>

                    {/* Popover Details */}
                    {isPopoverOpen && (
                      <div className="absolute bottom-11 left-1/2 -translate-x-1/2 w-52 bg-white rounded-2xl border border-gray-200 p-3 shadow-xl z-50 animate-fade-in">
                        <div className="flex justify-between items-start mb-1.5 border-b border-gray-100 pb-1">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 font-mono">{st.code}</p>
                            <h4 className="text-xs font-black text-[var(--text-strong)] leading-tight">{st.name}</h4>
                          </div>
                        </div>

                        <div className="space-y-1 text-[10px]">
                          {st.slots.map((slot) => {
                            const meta = CAT_META[slot.type];
                            return (
                              <div key={slot.type} className="flex items-center justify-between py-0.5">
                                <span className="flex items-center gap-1 font-bold text-[var(--text-strong)]">
                                  <meta.Icon size={11} className={meta.text} />
                                  {meta.short}
                                </span>
                                <span
                                  className={`font-extrabold px-1.5 py-0.2 rounded-full ${
                                    slot.isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                  }`}
                                >
                                  {slot.statusText}
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

        {/* INTERACTIVE LOCATION CARDS (5 cols) */}
        <div className="lg:col-span-5 bg-white/95 backdrop-blur-sm border border-white/80 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-extrabold text-[var(--text-strong)]">Campus Stations ({filteredStations.length})</h3>
              <p className="text-[11px] text-gray-400">Click a card to highlight its pin on the map grid</p>
            </div>
          </div>

          <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
            {filteredStations.map((st) => {
              const isSelected = activeStation?.id === st.id;

              return (
                <div
                  key={st.id}
                  onClick={() => {
                    setSelectedLocId(st.id);
                    setActivePopoverId(st.id);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 border-[var(--accent)] shadow-md ring-2 ring-[var(--accent)]/20'
                      : 'bg-[color-mix(in_srgb,var(--background)_60%,white)] border-gray-200/80 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-gray-400 uppercase">{st.code}</span>
                      <h4 className="font-extrabold text-xs text-[var(--text-strong)]">{st.name}</h4>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        st.overallStatus === 'Available'
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                          : 'bg-rose-100 border-rose-300 text-rose-800'
                      }`}
                    >
                      {st.overallStatus}
                    </span>
                  </div>

                  {/* 3 Bin Stream Category Statuses */}
                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-gray-200/60">
                    {st.slots.map((slot) => {
                      const meta = CAT_META[slot.type];
                      return (
                        <div
                          key={slot.type}
                          className={`p-1.5 rounded-xl border text-center text-[10px] font-bold space-y-0.5 ${
                            slot.isAvailable
                              ? 'bg-white border-gray-200 text-gray-700'
                              : 'bg-rose-50 border-rose-200 text-rose-700'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <meta.Icon size={11} className={meta.text} />
                            <span>{meta.short}</span>
                          </div>
                          <p className={`text-[9px] font-extrabold ${slot.isAvailable ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {slot.statusText}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
