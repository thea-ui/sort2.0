import { describe, expect, it } from 'vitest';
import {
  alignLocationsToAtlas,
  atlasBuildingPinPosition,
} from '../atlasStationAlignment';
import { DEFAULT_CAMPUS_LOCATIONS } from '../locationStore';
import type { AtlasBuilding, BinLocationItem } from '../../types';

function building(partial: Partial<AtlasBuilding>): AtlasBuilding {
  return {
    atlasId: 1,
    name: 'Grade 7 Academic Wing',
    shortCode: 'G7AW',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    color: null,
    rotation: 0,
    floorCount: 1,
    isTeachingBuilding: true,
    rooms: [],
    ...partial,
  };
}

// A single square building gives a symmetric viewBox (padding mirrors on both
// axes), so its centre lands exactly at 50%/50%.
const SQUARE_ATLAS = [building({})];

function legacyStation(name: string): BinLocationItem {
  const source = DEFAULT_CAMPUS_LOCATIONS.find((loc) => loc.name === name);
  if (!source) throw new Error(`No legacy default for ${name}`);
  return { ...source, streams: [...source.streams] };
}

describe('atlasBuildingPinPosition', () => {
  it('maps a matching building centre to viewBox percentages', () => {
    expect(atlasBuildingPinPosition('Grade 7 Academic Wing', SQUARE_ATLAS)).toEqual({
      x: 50,
      y: 50,
    });
  });

  it('matches by short code too', () => {
    expect(atlasBuildingPinPosition('g7aw', SQUARE_ATLAS)).toEqual({ x: 50, y: 50 });
  });

  it('returns null when no building matches or atlas is empty', () => {
    expect(atlasBuildingPinPosition('Unknown Building', SQUARE_ATLAS)).toBeNull();
    expect(atlasBuildingPinPosition('Grade 7 Academic Wing', [])).toBeNull();
  });
});

describe('alignLocationsToAtlas', () => {
  it('re-anchors legacy default positions onto their ATLAS building', () => {
    const legacy = legacyStation('Grade 7 Academic Wing');
    expect(legacy.x).toBe(35);
    expect(legacy.y).toBe(42);

    const [aligned] = alignLocationsToAtlas([legacy], SQUARE_ATLAS);
    expect(aligned).toMatchObject({ x: 50, y: 50 });
    expect(aligned.name).toBe('Grade 7 Academic Wing');
  });

  it('preserves positions an admin moved away from the legacy defaults', () => {
    const moved = { ...legacyStation('Grade 7 Academic Wing'), x: 14, y: 32 };
    const [result] = alignLocationsToAtlas([moved], SQUARE_ATLAS);
    expect(result).toBe(moved);
  });

  it('leaves stations without a matching building untouched', () => {
    const custom = { ...legacyStation('Grade 7 Academic Wing'), name: 'Custom Drop-off' };
    const [result] = alignLocationsToAtlas([custom], SQUARE_ATLAS);
    expect(result).toBe(custom);
  });

  it('is a no-op without ATLAS buildings', () => {
    const legacy = legacyStation('Grade 7 Academic Wing');
    const input = [legacy];
    expect(alignLocationsToAtlas(input, [])).toBe(input);
  });

  it('returns the same reference once positions are aligned', () => {
    const legacy = legacyStation('Grade 7 Academic Wing');
    const once = alignLocationsToAtlas([legacy], SQUARE_ATLAS);
    const twice = alignLocationsToAtlas(once, SQUARE_ATLAS);
    expect(twice).toBe(once);
  });
});
