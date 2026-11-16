/**
 * Theme-color resolver shared by the client metadata updater.
 *
 * Kept in sync with `server/src/services/pwa-manifest.service.ts`
 * (`resolveManifestThemeColor`): dark brand primaries tint the status bar,
 * light ones fall back to SORT's near-black so the bar stays readable.
 */
export const PWA_DEFAULT_THEME_COLOR = '#00271D';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function resolveManifestThemeColor(primaryColor: string | null | undefined): string {
  if (!primaryColor || !HEX_COLOR.test(primaryColor)) return PWA_DEFAULT_THEME_COLOR;
  const hex = primaryColor.slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? PWA_DEFAULT_THEME_COLOR : primaryColor.toLowerCase();
}
