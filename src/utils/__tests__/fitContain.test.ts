import { describe, expect, it } from 'vitest';
import {
  ATLAS_VIEW_PADDING,
  atlasBounds,
  atlasRawBounds,
  atlasViewAspectRatio,
  atlasViewBounds,
  fitContain,
} from '../fitContain';
import type { AtlasBuilding } from '../../types';

function building(partial: Partial<AtlasBuilding>): AtlasBuilding {
  return {
    atlasId: 1,
    name: 'B',
    shortCode: 'B',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    color: '#000',
    rotation: 0,
    floorCount: 1,
    isTeachingBuilding: true,
    rooms: [],
    ...partial,
  };
}

describe('fitContain', () => {
  it('letterboxes when the container is taller than the map', () => {
    const box = fitContain(200, 400, 2); // map 2:1
    expect(box.width).toBe(200);
    expect(box.height).toBe(100);
    expect(box.offsetX).toBe(0);
    expect(box.offsetY).toBe(150);
  });

  it('pillarboxes when the container is wider than the map', () => {
    const box = fitContain(600, 200, 1); // map 1:1
    expect(box.width).toBe(200);
    expect(box.height).toBe(200);
    expect(box.offsetX).toBe(200);
    expect(box.offsetY).toBe(0);
  });

  it('fills exactly when ratios match', () => {
    const box = fitContain(400, 200, 2);
    expect(box).toEqual({ width: 400, height: 200, offsetX: 0, offsetY: 0 });
  });

  it('never exceeds the container', () => {
    const box = fitContain(333, 111, 1.777);
    expect(box.width).toBeLessThanOrEqual(333 + 1e-9);
    expect(box.height).toBeLessThanOrEqual(111 + 1e-9);
    expect(box.width / box.height).toBeCloseTo(1.777, 6);
  });

  it('returns a zero box for zero/negative/NaN inputs', () => {
    expect(fitContain(0, 100, 2)).toEqual({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
    expect(fitContain(100, -5, 2)).toEqual({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
    expect(fitContain(100, 100, Number.NaN)).toEqual({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
    expect(fitContain(Number.NaN, 100, 2)).toEqual({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
    expect(fitContain(100, 100, 0)).toEqual({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
  });
});

describe('atlasBounds', () => {
  it('computes exact drawn bounds for unrotated buildings', () => {
    const bounds = atlasBounds([
      building({ atlasId: 1, x: 20, y: 20, width: 180, height: 280 }),
      building({ atlasId: 2, x: 400, y: 40, width: 200, height: 160 }),
    ]);
    expect(bounds).toEqual({ x: 20, y: 20, w: 580, h: 280 });
  });

  it('expands bounds for rotated buildings so they are never clipped', () => {
    // Vertical wing (rotation 90) reaching above the unrotated top edge.
    const bounds = atlasBounds([
      building({ atlasId: 1, x: 20, y: 20, width: 180, height: 280 }),
      building({ atlasId: 2, x: 868, y: 28, width: 212, height: 79, rotation: 90 }),
    ]);
    expect(bounds).not.toBeNull();
    expect(bounds!.y).toBeCloseTo(-38.5, 6);
    expect(bounds!.h).toBeCloseTo(338.5, 6);
    expect(bounds!.x).toBeCloseTo(20, 6);
    expect(bounds!.w).toBeCloseTo(993.5, 6);
  });

  it('ignores zero-size and non-finite buildings', () => {
    const bounds = atlasBounds([
      building({ atlasId: 1, x: 10, y: 10, width: 0, height: 100 }),
      building({ atlasId: 2, x: Number.NaN, y: 0, width: 50, height: 50 }),
      building({ atlasId: 3, x: 10, y: 10, width: 50, height: 50 }),
    ]);
    expect(bounds).toEqual({ x: 10, y: 10, w: 50, h: 50 });
  });

  it('returns null for empty or all-invalid input', () => {
    expect(atlasBounds([])).toBeNull();
    expect(atlasBounds([building({ width: 0, height: 0 })])).toBeNull();
  });

  it('single zero-room building still yields bounds (Speech Lab case)', () => {
    const bounds = atlasBounds([building({ atlasId: 60, x: 836, y: 87, width: 66, height: 74 })]);
    expect(bounds).toEqual({ x: 836, y: 87, w: 66, h: 74 });
  });
});

describe('atlasRawBounds', () => {
  it('ignores rotation (campus image underlay space)', () => {
    const raw = atlasRawBounds([
      building({ atlasId: 1, x: 20, y: 20, width: 180, height: 280 }),
      building({ atlasId: 2, x: 868, y: 28, width: 212, height: 79, rotation: 90 }),
    ]);
    expect(raw).toEqual({ x: 20, y: 20, w: 1060, h: 280 });
  });
});

describe('atlasViewBounds', () => {
  it('pads every side by a fraction of the longest side', () => {
    const view = atlasViewBounds(
      [building({ atlasId: 1, x: 100, y: 200, width: 900, height: 400 })],
      0.04
    );
    expect(view).toEqual({ x: 64, y: 164, w: 972, h: 472 });
  });

  it('defaults to the ATLAS editor padding and keeps all drawn corners inside', () => {
    const buildings = [
      building({ atlasId: 1, x: 54, y: 24, width: 229, height: 80 }),
      building({ atlasId: 2, x: 868, y: 28, width: 212, height: 79, rotation: 90 }),
      building({ atlasId: 73, x: 882, y: 276, width: 102, height: 200 }),
    ];
    const view = atlasViewBounds(buildings)!;
    const drawn = atlasBounds(buildings)!;
    expect(drawn.x).toBeGreaterThan(view.x);
    expect(drawn.y).toBeGreaterThan(view.y);
    expect(drawn.x + drawn.w).toBeLessThan(view.x + view.w);
    expect(drawn.y + drawn.h).toBeLessThan(view.y + view.h);
    expect(ATLAS_VIEW_PADDING).toBe(0.04);
  });

  it('returns null without valid buildings', () => {
    expect(atlasViewBounds([])).toBeNull();
  });

  it('derives a padded aspect ratio', () => {
    const ratio = atlasViewAspectRatio(
      [building({ atlasId: 1, x: 0, y: 0, width: 902, height: 451 })],
      0.04
    );
    expect(ratio).toBeCloseTo((902 + 2 * 36.08) / (451 + 2 * 36.08), 6);
    expect(atlasViewAspectRatio([])).toBeNull();
  });
});
