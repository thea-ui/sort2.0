/**
 * Recyclable materials a student can tag on a report. Codes match the MRF
 * scrap-stock categories so the completion form can show only the materials
 * the student selected.
 */
export const REPORT_MATERIALS = [
  { code: 'pet_plastic', label: 'Plastic (PET/HDPE)' },
  { code: 'cardboard', label: 'Paper & Cardboard' },
  { code: 'aluminum_cans', label: 'Aluminum & Metal Cans' },
  { code: 'glass', label: 'Glass' },
  { code: 'others', label: 'Mixed / Others' },
] as const;

export type ReportMaterialCode = (typeof REPORT_MATERIALS)[number]['code'];

export function materialLabel(code: string): string {
  return REPORT_MATERIALS.find((material) => material.code === code)?.label ?? code;
}
