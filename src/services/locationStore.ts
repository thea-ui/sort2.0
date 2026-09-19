import { BinLocationItem, BinStatus } from '../types';

export const STORAGE_KEY_LOCATIONS = 'sort_locations';
export const STORAGE_KEY_ROOM_LOCATIONS = 'sort_room_locations';
export const STORAGE_KEY_BLUEPRINT_URL = 'sort_blueprint_url';
export const STORAGE_KEY_BLUEPRINT_PRESET = 'sort_blueprint_preset';
export const STORAGE_KEY_BLUEPRINT_TRANSFORM = 'sort_blueprint_transform';

export const BLUEPRINT_UPDATED_EVENT = 'sort_blueprint_updated';

/**
 * Alignment of the custom blueprint image, expressed as a percentage of the
 * container so the same transform reproduces across every map surface.
 */
export interface BlueprintTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export const DEFAULT_BLUEPRINT_TRANSFORM: BlueprintTransform = { scale: 1, offsetX: 0, offsetY: 0 };

export const DEFAULT_ROOM_LOCATIONS = [
  'Room 101 – Science Hall',
  'Room 102 – Science Hall',
  'Room 103 – Science Hall',
  'Room 201 – Science Hall',
  'Room 202 – Science Hall',
  'Room 204 – Arts Building',
  'Room 301 – Engineering Building',
  'Room 305 – Engineering Building',
  'Physics Lab 1 – Science Hall',
  'Chemistry Lab 2 – Science Hall',
  'Biology Lab – Science Hall',
  'Computer Lab 1 – IT Building',
  'Computer Lab 2 – IT Building',
  'Computer Lab 3 – IT Building',
  'Faculty Office – Admin Building',
  'Conference Room – Admin Building',
  "Dean's Office – Admin Building",
  'Library Lobby – 2nd Floor',
  'Library Study Hall – 3rd Floor',
  'Audio Visual Room (AVR 1) – Main Bldg',
  'Lecture Hall A – Main Bldg',
  'Sports Complex Office – Gym',
  'Main Courtyard (Quad)',
  'Sports Complex Entrance B',
];

export function getStoredRoomLocations(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ROOM_LOCATIONS);
    if (!raw) return DEFAULT_ROOM_LOCATIONS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_ROOM_LOCATIONS;
  } catch {
    return DEFAULT_ROOM_LOCATIONS;
  }
}

export function saveRoomLocations(rooms: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY_ROOM_LOCATIONS, JSON.stringify(rooms));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('sort_rooms_updated', { detail: rooms }));
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const ch = new BroadcastChannel('sort_preset_channel');
        ch.postMessage({ type: 'ROOMS_UPDATED', timestamp: Date.now() });
        ch.close();
      } catch (e) {}
    }
  } catch (err) {
    console.error('Failed to save room locations:', err);
  }
}


export const DEFAULT_CAMPUS_LOCATIONS: BinLocationItem[] = [
  {
    id: 'loc-1',
    name: 'Main Courtyard (Quad)',
    code: 'LOC-01',
    status: 'Available',
    x: 70,
    y: 45,
    streams: [
      { type: 'BIODEGRADABLE', status: 'Available' },
      { type: 'NON_BIODEGRADABLE', status: 'Available' },
      { type: 'RECYCLABLE', status: 'Available' },
      { type: 'HAZARDOUS', status: 'Available' },
    ],
  },
  {
    id: 'loc-2',
    name: 'Science Hall Cafeteria Side',
    code: 'LOC-02',
    status: 'Available',
    x: 49,
    y: 35,
    streams: [
      { type: 'BIODEGRADABLE', status: 'Available' },
      { type: 'NON_BIODEGRADABLE', status: 'Available' },
      { type: 'RECYCLABLE', status: 'Available' },
      { type: 'HAZARDOUS', status: 'Available' },
    ],
  },
  {
    id: 'loc-3',
    name: 'Chemistry Building Entrance',
    code: 'LOC-03',
    status: 'Available',
    x: 35,
    y: 42,
    streams: [
      { type: 'BIODEGRADABLE', status: 'Available' },
      { type: 'NON_BIODEGRADABLE', status: 'Available' },
      { type: 'RECYCLABLE', status: 'Available' },
      { type: 'HAZARDOUS', status: 'Available' },
    ],
  },
  {
    id: 'loc-4',
    name: 'Main Library Lobby Entrance',
    code: 'LOC-04',
    status: 'Available',
    x: 53,
    y: 55,
    streams: [
      { type: 'BIODEGRADABLE', status: 'Available' },
      { type: 'NON_BIODEGRADABLE', status: 'Available' },
      { type: 'RECYCLABLE', status: 'Available' },
      { type: 'HAZARDOUS', status: 'Available' },
    ],
  },
  {
    id: 'loc-5',
    name: 'Sports Complex Entrance B',
    code: 'LOC-05',
    status: 'Available',
    x: 46,
    y: 65,
    streams: [
      { type: 'BIODEGRADABLE', status: 'Available' },
      { type: 'NON_BIODEGRADABLE', status: 'Available' },
      { type: 'RECYCLABLE', status: 'Available' },
      { type: 'HAZARDOUS', status: 'Available' },
    ],
  },
];

export function getStoredLocations(): BinLocationItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCATIONS);
    if (!raw) return DEFAULT_CAMPUS_LOCATIONS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CAMPUS_LOCATIONS;
  } catch {
    return DEFAULT_CAMPUS_LOCATIONS;
  }
}

import { apiService } from './api';

export function saveLocations(locations: BinLocationItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY_LOCATIONS, JSON.stringify(locations));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('sort_locations_updated', { detail: locations }));
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const ch = new BroadcastChannel('sort_preset_channel');
        ch.postMessage({ type: 'LOCATIONS_UPDATED', timestamp: Date.now() });
        ch.close();
      } catch (e) {}
    }
    apiService.saveCampusLocations(locations).catch((err) => {
      console.warn('Backend API location save failed, cached in localStorage:', err);
    });
  } catch (err) {
    console.error('Failed to save locations:', err);
  }
}

export function locationsToBins(locations: BinLocationItem[]): BinStatus[] {
  const nextBins: BinStatus[] = [];
  const minLat = 14.5975, maxLat = 14.6035, minLng = 120.9815, maxLng = 120.9885;

  locations.forEach((loc) => {
    const calculatedLat = maxLat - (loc.y / 100) * (maxLat - minLat);
    const calculatedLng = minLng + (loc.x / 100) * (maxLng - minLng);

    loc.streams.forEach((st) => {
      const isUnavailable = st.status === 'Unavailable' || st.status === 'No Bin';
      const fillLevel = st.status === 'Unavailable' ? 90 : 20;

      nextBins.push({
        id: `bin-${loc.id}-${st.type.toLowerCase()}`,
        name: `${loc.name} (${st.type})`,
        locationName: loc.name,
        fillLevel,
        type: st.type,
        coordinates: { lat: calculatedLat, lng: calculatedLng },
        x: loc.x,
        y: loc.y,
        activeDispatch: false,
        lastEmptied: '2026-07-30 08:00',
        streamStatus: st.status,
      });
    });
  });

  return nextBins;
}

// ── Blueprint image + transform ────────────────────────────────────────────

export function getStoredBlueprintUrl(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_BLUEPRINT_URL);
  } catch {
    return null;
  }
}

export function getBlueprintTransform(): BlueprintTransform {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BLUEPRINT_TRANSFORM);
    if (!raw) return { ...DEFAULT_BLUEPRINT_TRANSFORM };
    const parsed = JSON.parse(raw);
    return {
      scale: typeof parsed?.scale === 'number' ? parsed.scale : 1,
      offsetX: typeof parsed?.offsetX === 'number' ? parsed.offsetX : 0,
      offsetY: typeof parsed?.offsetY === 'number' ? parsed.offsetY : 0,
    };
  } catch {
    return { ...DEFAULT_BLUEPRINT_TRANSFORM };
  }
}

/** Notify every blueprint consumer (and other tabs) that the blueprint changed. */
export function broadcastBlueprintUpdate() {
  try {
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent(BLUEPRINT_UPDATED_EVENT));
  } catch {
    /* no-op */
  }
}

export function saveBlueprint(url: string, transform: BlueprintTransform) {
  try {
    localStorage.setItem(STORAGE_KEY_BLUEPRINT_URL, url);
    localStorage.setItem(STORAGE_KEY_BLUEPRINT_TRANSFORM, JSON.stringify(transform));
    broadcastBlueprintUpdate();
  } catch (err) {
    console.error('Failed to save blueprint:', err);
  }
}

export function clearBlueprint() {
  try {
    localStorage.removeItem(STORAGE_KEY_BLUEPRINT_URL);
    localStorage.removeItem(STORAGE_KEY_BLUEPRINT_TRANSFORM);
    localStorage.removeItem(STORAGE_KEY_BLUEPRINT_PRESET);
    broadcastBlueprintUpdate();
  } catch (err) {
    console.error('Failed to clear blueprint:', err);
  }
}
