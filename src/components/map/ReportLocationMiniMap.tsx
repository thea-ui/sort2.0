import React, { useEffect, useState } from 'react';
import { MapPin, Target } from 'lucide-react';
import { CampusMapFrame } from './CampusMapFrame';
import { STORAGE_KEY_BLUEPRINT_URL } from '../../services/locationStore';

/**
 * Projection used by every campus map surface to convert report coordinates to
 * canvas percentages (kept in sync with the report pickers and history views).
 */
const MAP_BOUNDS = {
  minLat: 14.5975,
  maxLat: 14.6035,
  minLng: 120.9815,
  maxLng: 120.9885,
};

interface ReportLocationMiniMapProps {
  lat?: number | null;
  lng?: number | null;
  /** Rendered absolutely above the map (banner chips, grid readout). */
  overlay?: React.ReactNode;
  /** Container height classes; the admin modal uses the taller default. */
  heightClassName?: string;
}

/**
 * Report inspection mini-map.
 *
 * Renders the same base layer as every other campus map surface — ATLAS mirror
 * (default) → uploaded blueprint → grid fallback — and pins the report
 * coordinates with the shared MAP_BOUNDS projection, so the marker sits exactly
 * where the reporter dropped it on the real map.
 */
export const ReportLocationMiniMap: React.FC<ReportLocationMiniMapProps> = ({
  lat,
  lng,
  overlay,
  heightClassName = 'h-[220px]',
}) => {
  const [blueprintUrl, setBlueprintUrl] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY_BLUEPRINT_URL)
  );

  useEffect(() => {
    const handleStorageChange = () =>
      setBlueprintUrl(localStorage.getItem(STORAGE_KEY_BLUEPRINT_URL));
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('sort_blueprint_updated', handleStorageChange as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sort_blueprint_updated', handleStorageChange as EventListener);
    };
  }, []);

  const safeLat = lat ?? (MAP_BOUNDS.minLat + MAP_BOUNDS.maxLat) / 2;
  const safeLng = lng ?? (MAP_BOUNDS.minLng + MAP_BOUNDS.maxLng) / 2;
  const pctY = Math.max(
    8,
    Math.min(92, ((MAP_BOUNDS.maxLat - safeLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * 100)
  );
  const pctX = Math.max(
    8,
    Math.min(92, ((safeLng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * 100)
  );

  return (
    <div
      className={`relative w-full ${heightClassName} rounded-2xl border border-gray-200 bg-[#f8fafc] overflow-hidden shadow-inner`}
    >
      <CampusMapFrame
        blueprintUrl={blueprintUrl}
        blueprintClassName="absolute inset-0 w-full h-full object-cover opacity-80 pointer-events-none"
        fallback={
          <svg
            className="absolute inset-0 w-full h-full opacity-60 pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="report-minimap-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#CBD5E1" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#report-minimap-grid)" />
          </svg>
        }
      >
        <div
          style={{ left: `${pctX}%`, top: `${pctY}%` }}
          className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
        >
          <div className="flex flex-col items-center animate-bounce motion-reduce:animate-none">
            <span className="bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg border border-white whitespace-nowrap mb-0.5 flex items-center gap-1">
              <MapPin size={9} /> Pinned Debris Location
            </span>
            <div className="h-9 w-9 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xl border-2 border-white ring-4 ring-rose-400/40">
              <Target size={18} className="stroke-[2.5]" />
            </div>
          </div>
        </div>
      </CampusMapFrame>
      {overlay}
    </div>
  );
};
