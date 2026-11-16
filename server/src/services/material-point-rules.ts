/**
 * Recyclable materials a student can tag on a report. Codes match the scrap
 * stock / recycle market categories so the MRF completion form can show only
 * the streams the student selected.
 */
export const MATERIAL_CODES = [
  'pet_plastic',
  'cardboard',
  'aluminum_cans',
  'glass',
  'others',
] as const;

export type MaterialCode = (typeof MATERIAL_CODES)[number];

export const DEFAULT_MATERIAL_POINTS: Record<MaterialCode, number> = {
  pet_plastic: 2,
  cardboard: 2,
  aluminum_cans: 2,
  glass: 2,
  others: 1,
};

export const MATERIAL_LABELS: Record<MaterialCode, string> = {
  pet_plastic: 'Plastic (PET/HDPE)',
  cardboard: 'Paper & Cardboard',
  aluminum_cans: 'Aluminum & Metal Cans',
  glass: 'Glass',
  others: 'Mixed / Others',
};

export const OTHER_MATERIAL_LABEL_LIMIT = 60;

export function sanitizeMaterials(input: unknown): MaterialCode[] {
  if (!Array.isArray(input)) return [];
  const allowed = new Set<string>(MATERIAL_CODES);
  const unique = new Set<MaterialCode>();
  for (const value of input) {
    if (typeof value === 'string' && allowed.has(value)) unique.add(value as MaterialCode);
  }
  return [...unique];
}

export function sanitizeOtherMaterialLabel(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim().slice(0, OTHER_MATERIAL_LABEL_LIMIT);
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Per-material bonus for one report. Every selected material earns its own
 * configured points (e.g. Plastic 2 + Paper 2 = 4), while the Mixed / Others
 * option is a fixed 1-point bucket. The UI keeps Mixed / Others exclusive from
 * specific materials, so a normal report is either one option or the other.
 */
export function computeMaterialPointsBreakdown(
  materials: readonly string[] | null | undefined,
  pointsByCode: ReadonlyMap<string, number>,
): Record<string, number> {
  const breakdown: Record<string, number> = {};
  for (const code of new Set(materials ?? [])) {
    breakdown[code] = code === 'others' ? 1 : (pointsByCode.get(code) ?? 0);
  }
  return breakdown;
}

export function computeMaterialPoints(
  materials: readonly string[] | null | undefined,
  pointsByCode: ReadonlyMap<string, number>,
): number {
  return Object.values(computeMaterialPointsBreakdown(materials, pointsByCode))
    .reduce((sum, points) => sum + points, 0);
}
