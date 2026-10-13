import { AtlasBuilding, BinLocationItem } from '../types';
import { atlasViewBounds } from '../utils/fitContain';
import { DEFAULT_CAMPUS_LOCATIONS, getStoredLocations, saveLocationsLocal } from './locationStore';

const PIN_MARGIN_PCT = 2;

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// The hand-authored anchors were drawn for the legacy grid/blueprint map and
// do not line up with the ATLAS plan; they are only used until a building with
// the same name can be matched.
const LEGACY_DEFAULT_POSITIONS = new Map(
  DEFAULT_CAMPUS_LOCATIONS.map((loc) => [normalizeName(loc.name), { x: loc.x, y: loc.y }]),
);

let cachedBuildings: AtlasBuilding[] = [];

/** Latest ATLAS buildings seen by any map this session (alignment source). */
export function getAtlasBuildings(): AtlasBuilding[] {
  return cachedBuildings;
}

function clampPct(value: number): number {
  return Math.max(PIN_MARGIN_PCT, Math.min(100 - PIN_MARGIN_PCT, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function findBuilding(name: string, buildings: AtlasBuilding[]): AtlasBuilding | undefined {
  const target = normalizeName(name);
  if (!target) return undefined;
  return buildings.find(
    (b) =>
      normalizeName(b.name) === target ||
      (b.shortCode ? normalizeName(b.shortCode) === target : false),
  );
}

/** Percentage of the ATLAS viewBox at the centre of the building with `name`. */
export function atlasBuildingPinPosition(
  name: string,
  buildings: AtlasBuilding[] = cachedBuildings,
): { x: number; y: number } | null {
  if (buildings.length === 0) return null;
  const building = findBuilding(name, buildings);
  if (!building) return null;

  const view = atlasViewBounds(buildings);
  if (!view || view.w <= 0 || view.h <= 0) return null;

  const centerX = building.x + building.width / 2;
  const centerY = building.y + building.height / 2;
  return {
    x: clampPct(((centerX - view.x) / view.w) * 100),
    y: clampPct(((centerY - view.y) / view.h) * 100),
  };
}

function isLegacyDefault(loc: BinLocationItem): boolean {
  const legacy = LEGACY_DEFAULT_POSITIONS.get(normalizeName(loc.name));
  return Boolean(legacy) && loc.x === legacy!.x && loc.y === legacy!.y;
}

/**
 * Re-anchors stations still sitting at their legacy hand-authored percentage
 * onto the centre of the ATLAS building that shares their name. Positions the
 * admin moved in the map editor (any other value) are preserved untouched.
 * Returns the same array reference when nothing changed.
 */
export function alignLocationsToAtlas(
  locations: BinLocationItem[],
  buildings: AtlasBuilding[] = cachedBuildings,
): BinLocationItem[] {
  if (!Array.isArray(locations) || locations.length === 0 || buildings.length === 0) {
    return locations;
  }

  let changed = false;
  const next = locations.map((loc) => {
    if (!isLegacyDefault(loc)) return loc;
    const aligned = atlasBuildingPinPosition(loc.name, buildings);
    if (!aligned) return loc;
    const x = round1(aligned.x);
    const y = round1(aligned.y);
    if (x === loc.x && y === loc.y) return loc;
    changed = true;
    return { ...loc, x, y };
  });

  return changed ? next : locations;
}

/**
 * Persists + broadcasts the ATLAS alignment of the stored station list.
 * Returns true when stored positions changed.
 */
export function alignStoredLocationsToAtlas(
  buildings: AtlasBuilding[] = cachedBuildings,
): boolean {
  if (buildings.length === 0) return false;
  const stored = getStoredLocations();
  const aligned = alignLocationsToAtlas(stored, buildings);
  if (aligned === stored) return false;
  saveLocationsLocal(aligned);
  return true;
}

/** Remembers the newest ATLAS payload and aligns the stored stations to it. */
export function setAtlasBuildings(buildings: AtlasBuilding[] | null | undefined): boolean {
  cachedBuildings = Array.isArray(buildings) ? buildings : [];
  return alignStoredLocationsToAtlas(cachedBuildings);
}
