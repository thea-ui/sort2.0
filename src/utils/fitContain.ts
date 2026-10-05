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
 * Padding (fraction of the longest map side) added around the drawn ATLAS
 * buildings. Mirrors the ATLAS editor, which always shows the plan with
 * breathing room instead of flush against the viewport edges — and guarantees
 * pins/labels at 0% or 100% are never half-clipped.
 */
export const ATLAS_VIEW_PADDING = 0.04;

function validBuildings(buildings: AtlasBuilding[]): AtlasBuilding[] {
  if (!Array.isArray(buildings)) return [];
  return buildings.filter(
    (b) =>
      b &&
      Number.isFinite(b.x) &&
      Number.isFinite(b.y) &&
      Number.isFinite(b.width) &&
      Number.isFinite(b.height) &&
      b.width > 0 &&
      b.height > 0
  );
}

/**
 * Axis-aligned box a building actually occupies after its rotation is applied
 * (rotation is degrees around the building centre). Without this, rotated
 * buildings (e.g. the vertical Grade 8 wing, rotation 90°) overflow the viewBox
 * and get clipped by the SVG viewport.
 */
function rotatedExtent(b: AtlasBuilding): { minX: number; minY: number; maxX: number; maxY: number } {
  const centerX = b.x + b.width / 2;
  const centerY = b.y + b.height / 2;
  const degrees = Number.isFinite(b.rotation) ? b.rotation : 0;
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const halfW = (b.width / 2) * cos + (b.height / 2) * sin;
  const halfH = (b.width / 2) * sin + (b.height / 2) * cos;
  return {
    minX: centerX - halfW,
    minY: centerY - halfH,
    maxX: centerX + halfW,
    maxY: centerY + halfH,
  };
}

function extentOf(buildings: AtlasBuilding[], rotate: boolean): AtlasBounds | null {
  const valid = validBuildings(buildings);
  if (valid.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const b of valid) {
    const box = rotate ? rotatedExtent(b) : { minX: b.x, minY: b.y, maxX: b.x + b.width, maxY: b.y + b.height };
    minX = Math.min(minX, box.minX);
    minY = Math.min(minY, box.minY);
    maxX = Math.max(maxX, box.maxX);
    maxY = Math.max(maxY, box.maxY);
  }

  return {
    x: minX,
    y: minY,
    w: Math.max(1, maxX - minX),
    h: Math.max(1, maxY - minY),
  };
}

/**
 * Exact drawn bounds of the ATLAS buildings (rotation-aware, no padding).
 * The campus image underlay is aligned to this coordinate space.
 */
export function atlasBounds(buildings: AtlasBuilding[]): AtlasBounds | null {
  return extentOf(buildings, true);
}

/**
 * Raw axis-aligned extent of the building definitions, ignoring rotation.
 * Used for the campus image underlay, which is authored in ATLAS photo space.
 */
export function atlasRawBounds(buildings: AtlasBuilding[]): AtlasBounds | null {
  return extentOf(buildings, false);
}

/**
 * ViewBox bounds for the ATLAS base layer: rotation-aware drawn bounds plus
 * uniform `padding`. Percentage-based pins are mapped against this space.
 */
export function atlasViewBounds(
  buildings: AtlasBuilding[],
  padding: number = ATLAS_VIEW_PADDING
): AtlasBounds | null {
  const bounds = atlasBounds(buildings);
  if (!bounds) return null;
  const pad = Math.max(bounds.w, bounds.h) * Math.max(0, padding);
  return { x: bounds.x - pad, y: bounds.y - pad, w: bounds.w + pad * 2, h: bounds.h + pad * 2 };
}

export function atlasViewAspectRatio(
  buildings: AtlasBuilding[],
  padding: number = ATLAS_VIEW_PADDING
): number | null {
  const bounds = atlasViewBounds(buildings, padding);
  if (!bounds) return null;
  return bounds.w / bounds.h;
}
