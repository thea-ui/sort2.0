import type { AtlasBuilding } from '../types';

export interface FitBox {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

const EMPTY_BOX: FitBox = { width: 0, height: 0, offsetX: 0, offsetY: 0 };

/**
 * Largest box with `ratio` (width/height) that fits inside the container,
 * centered — the `object-fit: contain` math used to keep percentage-based
 * pins linearly aligned with the ATLAS canvas.
 */
export function fitContain(containerWidth: number, containerHeight: number, ratio: number): FitBox {
  if (
    !Number.isFinite(containerWidth) ||
    !Number.isFinite(containerHeight) ||
    !Number.isFinite(ratio) ||
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    ratio <= 0
  ) {
    return { ...EMPTY_BOX };
  }

  const containerRatio = containerWidth / containerHeight;
  if (containerRatio > ratio) {
    // Container is wider than the map: height-limited, pillarboxed.
    const height = containerHeight;
    const width = height * ratio;
    return { width, height, offsetX: (containerWidth - width) / 2, offsetY: 0 };
  }

  // Container is taller than the map: width-limited, letterboxed.
  const width = containerWidth;
  const height = width / ratio;
  return { width, height, offsetX: 0, offsetY: (containerHeight - height) / 2 };
}

export interface AtlasBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Exact drawing bounds of the ATLAS buildings (no padding). This is the
 * coordinate space percentage pins are mapped against.
 */
export function atlasBounds(buildings: AtlasBuilding[]): AtlasBounds | null {
  if (!Array.isArray(buildings)) return null;

  const valid = buildings.filter(
    (b) =>
      b &&
      Number.isFinite(b.x) &&
      Number.isFinite(b.y) &&
      Number.isFinite(b.width) &&
      Number.isFinite(b.height) &&
      b.width > 0 &&
      b.height > 0
  );
  if (valid.length === 0) return null;

  const minX = Math.min(...valid.map((b) => b.x));
  const minY = Math.min(...valid.map((b) => b.y));
  const maxX = Math.max(...valid.map((b) => b.x + b.width));
  const maxY = Math.max(...valid.map((b) => b.y + b.height));

  return {
    x: minX,
    y: minY,
    w: Math.max(1, maxX - minX),
    h: Math.max(1, maxY - minY),
  };
}

export function atlasAspectRatio(buildings: AtlasBuilding[]): number | null {
  const bounds = atlasBounds(buildings);
  if (!bounds) return null;
  return bounds.w / bounds.h;
}
