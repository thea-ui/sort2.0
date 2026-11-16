import path from 'node:path';
import { promises as fs, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';

import { UPLOADS_DIR } from '../lib/uploads.js';

/**
 * Tenant install icons generated from the EnrollPro-synced logo.
 *
 * Files live in content-hashed directories (`uploads/pwa/<logoHash>/`) so a
 * new logo always produces new URLs, matching the existing logo cache-busting
 * strategy. Every failure is non-fatal: the manifest falls back to the bundled
 * SORT icon set.
 */

export const PWA_ICON_DIR = path.join(UPLOADS_DIR, 'pwa');
export const PWA_ICON_BACKGROUND = '#F9F3F0';
const ICON_SIZES = [192, 512] as const;
const APPLE_ICON_SIZE = 180;
const MASKABLE_SAFE_RATIO = 0.6;

export interface TenantPwaIcons {
  icon192: string;
  icon512: string;
  maskable192: string;
  maskable512: string;
  appleTouch: string;
}

const LOGO_HASH_PATTERN = /logo-enrollpro-sync-([0-9a-f]{10})\.(png|jpg|jpeg|webp|gif)$/i;

/** Extract the content hash from a synced logo URL, when it is one. */
export function logoHashFromPath(logoUrl: string | null | undefined): string | null {
  if (!logoUrl) return null;
  const file = logoUrl.split('/').pop() ?? '';
  return file.match(LOGO_HASH_PATTERN)?.[1]?.toLowerCase() ?? null;
}

function iconUrlsForHash(hash: string): TenantPwaIcons {
  const base = `/uploads/pwa/${hash}`;
  return {
    icon192: `${base}/icon-192.png`,
    icon512: `${base}/icon-512.png`,
    maskable192: `${base}/icon-maskable-192.png`,
    maskable512: `${base}/icon-maskable-512.png`,
    appleTouch: `${base}/apple-touch-icon.png`,
  };
}

/**
 * Only advertise tenant icons when every file exists; a partial set would let
 * Chrome reject the manifest or install a broken icon.
 */
export function resolveTenantPwaIcons(logoUrl: string | null | undefined): TenantPwaIcons | null {
  const hash = logoHashFromPath(logoUrl);
  if (!hash) return null;

  const dir = path.join(PWA_ICON_DIR, hash);
  const files = [
    'icon-192.png',
    'icon-512.png',
    'icon-maskable-192.png',
    'icon-maskable-512.png',
    'apple-touch-icon.png',
  ];
  if (!files.every((file) => existsSync(path.join(dir, file)))) return null;

  return iconUrlsForHash(hash);
}

function removeStaleIconDirs(keepHash: string): void {
  try {
    for (const entry of readdirSync(PWA_ICON_DIR, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === keepHash) continue;
      if (!/^[0-9a-f]{10}$/.test(entry.name)) continue;
      rmSync(path.join(PWA_ICON_DIR, entry.name), { recursive: true, force: true });
    }
  } catch {
    // Directory missing/unreadable: nothing to clean up.
  }
}

async function writePaddedIcon(
  input: Buffer,
  size: number,
  innerRatio: number,
  target: string
): Promise<void> {
  const { default: sharp } = await import('sharp');
  const inner = Math.max(1, Math.round(size * innerRatio));
  const pad = Math.max(0, Math.round((size - inner) / 2));

  const logo = await sharp(input)
    .resize(inner, inner, { fit: 'contain', background: PWA_ICON_BACKGROUND })
    .flatten({ background: PWA_ICON_BACKGROUND })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: PWA_ICON_BACKGROUND,
    },
  })
    .composite([{ input: logo, top: pad, left: pad }])
    .png({ compressionLevel: 9, quality: 70 })
    .toFile(target);
}

async function writePlainIcon(input: Buffer, size: number, target: string): Promise<void> {
  const { default: sharp } = await import('sharp');
  await sharp(input)
    .resize(size, size, { fit: 'contain', background: PWA_ICON_BACKGROUND })
    .flatten({ background: PWA_ICON_BACKGROUND })
    .png({ compressionLevel: 9, quality: 70 })
    .toFile(target);
}

/**
 * Generate every install icon variant for a newly synced logo.
 * Returns the public URLs, or null when generation fails.
 */
export async function generateTenantPwaIcons(
  logoBuffer: Buffer,
  logoHash: string
): Promise<TenantPwaIcons | null> {
  try {
    const dir = path.join(PWA_ICON_DIR, logoHash);
    mkdirSync(dir, { recursive: true });

    await Promise.all([
      ...ICON_SIZES.map((size) => writePlainIcon(logoBuffer, size, path.join(dir, `icon-${size}.png`))),
      ...ICON_SIZES.map((size) =>
        writePaddedIcon(
          logoBuffer,
          size,
          MASKABLE_SAFE_RATIO,
          path.join(dir, `icon-maskable-${size}.png`)
        )
      ),
      writePaddedIcon(
        logoBuffer,
        APPLE_ICON_SIZE,
        MASKABLE_SAFE_RATIO,
        path.join(dir, 'apple-touch-icon.png')
      ),
    ]);

    removeStaleIconDirs(logoHash);
    return iconUrlsForHash(logoHash);
  } catch (err: any) {
    console.warn('[PWA] Tenant icon generation failed (using default icons):', err?.message || err);
    return null;
  }
}

/** Remove generated icon directories (tenant reset). Best effort. */
export async function clearTenantPwaIcons(): Promise<void> {
  await fs.rm(PWA_ICON_DIR, { recursive: true, force: true }).catch(() => undefined);
}
