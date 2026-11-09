import { saveBranding, type BrandingPatch } from './branding.service.js';

/**
 * Presentation branding preset. When active, SORT pins this tenant identity
 * locally and skips EnrollPro branding fetches so the presentation never
 * depends on the external branding service.
 */
export const EMEMHS_BRANDING: BrandingPatch = {
  schoolName: 'ENRIQUETA MONTILLA DE ESTEBAN MEMORIAL HIGH SCHOOL',
  schoolAcronym: 'EMEMHS',
  primaryColor: '#861313',
  secondaryColor: '#c79229',
  accentColor: '#a8a8a8',
  goldColor: '#c69b26',
  logoUrl: '/uploads/logo-ememhs.png',
};

export function getBrandingPresetName(env: NodeJS.ProcessEnv = process.env): string {
  return (env.BRANDING_PRESET || '').trim().toUpperCase();
}

export function isBrandingSyncDisabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return (
    getBrandingPresetName(env) === 'EMEMHS' ||
    (env.BRANDING_SYNC_DISABLED || '').trim().toLowerCase() === 'true'
  );
}

export async function applyBrandingPresetIfConfigured(): Promise<boolean> {
  if (getBrandingPresetName() !== 'EMEMHS') return false;
  await saveBranding({ ...EMEMHS_BRANDING });
  console.log('[Branding] Applied EMEMHS presentation preset; EnrollPro branding sync is disabled');
  return true;
}
