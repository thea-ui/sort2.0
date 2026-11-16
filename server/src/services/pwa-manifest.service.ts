import type { PublicBranding } from './branding.service.js';
import { resolveTenantPwaIcons, type TenantPwaIcons } from './pwa-icons.service.js';

/**
 * Web app manifest for the installable SORT client.
 *
 * The manifest is generated from the live tenant branding rather than shipped
 * as a static build asset, so every school installs under its own name and
 * icon. Defaults are always valid: a missing/unconfigured tenant, a database
 * failure, or a partial icon set cannot produce an uninstallable manifest.
 */

export const PWA_BACKGROUND_COLOR = '#F9F3F0';
export const PWA_DEFAULT_THEME_COLOR = '#00271D';
export const PWA_APP_NAME = 'S.O.R.T.';
export const PWA_APP_SHORT_NAME = 'SORT';
export const PWA_DESCRIPTION = 'Smart Operational Recovery & Tracking';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const NAME_MAX = 60;
const SHORT_NAME_MAX = 12;

export interface PwaManifestIcon {
  src: string;
  sizes: string;
  type: 'image/png';
  purpose: 'any' | 'maskable';
}

export interface PwaManifest {
  id: string;
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  scope: string;
  display: 'standalone';
  display_override: Array<'standalone' | 'minimal-ui'>;
  orientation: 'any';
  background_color: string;
  theme_color: string;
  lang: string;
  dir: 'ltr';
  categories: string[];
  prefer_related_applications: false;
  icons: PwaManifestIcon[];
}

export const DEFAULT_PWA_ICONS: PwaManifestIcon[] = [
  { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: '/pwa/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
  { src: '/pwa/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
];

/**
 * Chrome tints the standalone status bar with `theme_color`; a very light
 * brand primary would make the status bar unreadable. Keep dark brand colors,
 * otherwise use SORT's near-black primary.
 */
export function resolveManifestThemeColor(primaryColor: string | null | undefined): string {
  if (!primaryColor || !HEX_COLOR.test(primaryColor)) return PWA_DEFAULT_THEME_COLOR;
  const hex = primaryColor.slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? PWA_DEFAULT_THEME_COLOR : primaryColor.toLowerCase();
}

function tenantIconEntries(icons: TenantPwaIcons): PwaManifestIcon[] {
  return [
    { src: icons.icon192, sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: icons.icon512, sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: icons.maskable192, sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    { src: icons.maskable512, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ];
}

function clampText(value: string | null | undefined, max: number, fallback: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  return trimmed.length > max ? trimmed.slice(0, max).trim() : trimmed;
}

/** Same acronym rule as the client brand resolver (initials of each word). */
function acronymFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return PWA_APP_SHORT_NAME;
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return parts
    .slice(0, 6)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function manifestShortName(branding: PublicBranding | null): string {
  const acronym = branding?.schoolAcronym?.trim();
  if (acronym) return clampText(acronym, SHORT_NAME_MAX, PWA_APP_SHORT_NAME);
  const name = branding?.schoolName?.trim();
  if (name) return clampText(acronymFromName(name), SHORT_NAME_MAX, PWA_APP_SHORT_NAME);
  return PWA_APP_SHORT_NAME;
}

/**
 * Pure builder: same input always yields the same manifest, which keeps the
 * server unit tests and the Playwright manifest assertions deterministic.
 */
export function buildPwaManifest(
  branding: PublicBranding | null,
  tenantIcons: TenantPwaIcons | null = null
): PwaManifest {
  return {
    id: '/',
    name: clampText(branding?.schoolName, NAME_MAX, PWA_APP_NAME),
    short_name: manifestShortName(branding),
    description: PWA_DESCRIPTION,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'any',
    background_color: PWA_BACKGROUND_COLOR,
    theme_color: resolveManifestThemeColor(branding?.primaryColor),
    lang: 'en',
    dir: 'ltr',
    categories: ['education', 'productivity'],
    prefer_related_applications: false,
    icons: tenantIcons ? tenantIconEntries(tenantIcons) : DEFAULT_PWA_ICONS,
  };
}

/**
 * Manifest for the current tenant. Icon resolution is filesystem-based and
 * never throws; a partial generated set falls back to the bundled SORT icons.
 */
export async function resolvePwaManifest(branding: PublicBranding | null): Promise<PwaManifest> {
  const icons = resolveTenantPwaIcons(branding?.logoUrl);
  return buildPwaManifest(branding, icons);
}

export function buildFallbackPwaManifest(): PwaManifest {
  return buildPwaManifest(null, null);
}
