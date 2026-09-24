import { promises as fs, mkdirSync } from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  getEnrollProPublicUrl,
  saveBranding,
  type BrandingPatch,
  type PublicBranding,
} from './branding.service.js';

const prisma = new PrismaClient();

const DEFAULT_ENROLLPRO_BASE = 'https://dev-jegs.buru-degree.ts.net/api';
const SETTINGS_TIMEOUT_MS = 20_000;
const LOGO_TIMEOUT_MS = 20_000;
const LOGO_FILENAME = 'logo-enrollpro-sync';
const LOGO_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

/** SORT serves synced assets from its own origin; see index.ts static mount. */
export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

export interface EnrollProPaletteColor {
  hex: string;
  hsl?: string;
  foreground?: string;
}

export interface EnrollProPublicSettings {
  schoolName?: string;
  schoolHeadName?: string;
  depedSchoolId?: string;
  region?: string;
  division?: string;
  logoUrl?: string | null;
  colorScheme?: { palette?: EnrollProPaletteColor[]; extracted_at?: string } | null;
  selectedAccentHsl?: string | null;
  activeSchoolYearLabel?: string | null;
  activeSchoolYearStatus?: string | null;
  depedEmail?: string | null;
  facebookPageUrl?: string | null;
  schoolWebsite?: string | null;
}

/**
 * Pick 3 brand colors from an EnrollPro palette (skip near-white and near-black).
 * Cross-system contract: identical rule in SMART/ATLAS/AIMS so every companion
 * resolves the same tenant colors. Hex values only — never `selectedAccentHsl`.
 */
export function pickColorsFromPalette(
  palette: Array<{ hex: string }>
): { primary: string; secondary: string; accent: string } {
  const vibrant = palette
    .filter((c) => {
      if (!c.hex || c.hex.length < 7) return false;
      const r = parseInt(c.hex.slice(1, 3), 16);
      const g = parseInt(c.hex.slice(3, 5), 16);
      const b = parseInt(c.hex.slice(5, 7), 16);
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      return lum > 30 && lum < 210;
    })
    .map((c) => c.hex);
  return {
    primary: vibrant[0] ?? '#10b981',
    secondary: vibrant[1] ?? '#34d399',
    accent: vibrant[2] ?? '#6ee7b7',
  };
}

/**
 * EnrollPro base URL resolution mirrors SMART: local DB override first, then
 * environment, then the shared dev hub. Trailing slashes are stripped.
 */
export async function resolveEnrollProBase(): Promise<string> {
  const row = await prisma.systemSetting.findUnique({
    where: { id: 'default_setting' },
    select: { enrollproUrl: true },
  });
  const raw =
    (row?.enrollproUrl && row.enrollproUrl.trim()) ||
    process.env.ENROLLPRO_URL ||
    process.env.ENROLLPRO_BASE_URL ||
    DEFAULT_ENROLLPRO_BASE;
  return raw.replace(/\/+$/, '');
}

/** Origin (no `/api`) used for asset downloads and browser redirects. */
export function enrollProOrigin(base: string): string {
  return base.replace(/\/api\/?$/, '').replace(/\/+$/, '');
}

export async function fetchEnrollProPublicSettings(): Promise<EnrollProPublicSettings> {
  const base = await resolveEnrollProBase();
  const res = await fetch(`${base}/settings/public`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(SETTINGS_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`EnrollPro settings/public returned HTTP ${res.status}`);
  }
  return (await res.json()) as EnrollProPublicSettings;
}

/**
 * Download the tenant logo to SORT's own /uploads directory. Failures are
 * non-fatal: the caller keeps the previous logo.
 */
export async function downloadEnrollProLogo(logoRelativePath: string): Promise<string | null> {
  try {
    const base = await resolveEnrollProBase();
    const origin = enrollProOrigin(base);
    // SSRF guard: only same-origin /uploads/ paths from the trusted hub.
    if (!logoRelativePath.startsWith('/uploads/')) return null;
    const url = new URL(`${origin}${logoRelativePath}`);
    if (url.origin !== new URL(origin).origin) return null;

    const ext = path.extname(url.pathname).toLowerCase();
    const safeExt = LOGO_EXTENSIONS.has(ext) ? ext : '.png';

    const res = await fetch(url, { signal: AbortSignal.timeout(LOGO_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (!contentType.startsWith('image/')) {
      throw new Error(`unexpected content-type "${contentType}"`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    mkdirSync(UPLOADS_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOADS_DIR, `${LOGO_FILENAME}${safeExt}`), buffer);
    return `/uploads/${LOGO_FILENAME}${safeExt}`;
  } catch (err: any) {
    console.warn('[Branding] Logo download failed (keeping previous logo):', err?.message || err);
    return null;
  }
}

export interface BrandingSyncResult {
  status: 'synced' | 'failed';
  colors: { primary: string; secondary: string; accent: string };
  logoUpdated: boolean;
  branding: PublicBranding | null;
  error?: string;
}

let isSyncing = false;

/**
 * Pull EnrollPro branding and persist it. Never blanks existing branding: on
 * any failure the previous values stay and the error is reported to the caller.
 */
export async function syncEnrollProBranding(): Promise<BrandingSyncResult> {
  if (isSyncing) {
    return {
      status: 'failed',
      colors: pickColorsFromPalette([]),
      logoUpdated: false,
      branding: null,
      error: 'A branding sync is already running',
    };
  }

  isSyncing = true;
  try {
    const base = await resolveEnrollProBase();
    const remote = await fetchEnrollProPublicSettings();
    const colors = pickColorsFromPalette(remote.colorScheme?.palette ?? []);

    const patch: BrandingPatch = {
      primaryColor: colors.primary,
      secondaryColor: colors.secondary,
      accentColor: colors.accent,
      enrollproPublicUrl: enrollProOrigin(base),
    };
    if (remote.schoolName?.trim()) patch.schoolName = remote.schoolName.trim();
    if (remote.schoolHeadName?.trim()) patch.schoolHeadName = remote.schoolHeadName.trim();
    if (remote.depedSchoolId?.trim()) patch.schoolId = remote.depedSchoolId.trim();
    if (remote.region?.trim()) patch.region = remote.region.trim();
    if (remote.division?.trim()) patch.division = remote.division.trim();

    let logoUpdated = false;
    if (remote.logoUrl) {
      const localLogo = await downloadEnrollProLogo(remote.logoUrl);
      if (localLogo) {
        patch.logoUrl = localLogo;
        logoUpdated = true;
      }
    }

    const branding = await saveBranding(patch);
    await prisma.systemSetting.update({
      where: { id: 'default_setting' },
      data: { enrollproBrandingSyncedAt: new Date() },
    });

    console.log(
      `[Branding] Synced from EnrollPro: ${colors.primary}/${colors.secondary}/${colors.accent}` +
        (logoUpdated ? ' + logo' : '')
    );
    return { status: 'synced', colors, logoUpdated, branding };
  } catch (err: any) {
    console.warn('[Branding] EnrollPro sync failed (keeping last-known branding):', err?.message || err);
    return {
      status: 'failed',
      colors: pickColorsFromPalette([]),
      logoUpdated: false,
      branding: null,
      error: err?.message || 'EnrollPro branding sync failed',
    };
  } finally {
    isSyncing = false;
  }
}
