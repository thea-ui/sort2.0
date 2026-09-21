import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const ATLAS_ASSETS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'assets',
  'atlas'
);

export const MAX_CAMPUS_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export class AtlasImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AtlasImageError';
  }
}

type FetchLike = typeof fetch;

export interface CampusImageDownload {
  buffer: Buffer;
  ext: string;
  contentType: string;
  hash: string;
}

/**
 * Resolve the campus image URL returned by ATLAS. Only same-origin URLs under
 * `/uploads/` are accepted to prevent SSRF via a compromised upstream payload.
 */
export function resolveCampusImageUrl(raw: unknown, baseUrl: string): URL | null {
  if (typeof raw !== 'string' || raw.trim().length === 0) return null;

  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return null;
  }

  let resolved: URL;
  try {
    resolved = new URL(raw.trim(), base.origin);
  } catch {
    return null;
  }

  if (resolved.origin !== base.origin) return null;
  if (!resolved.pathname.startsWith('/uploads/')) return null;
  return resolved;
}

export function hashBytes(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export async function downloadCampusImage(
  url: URL,
  fetchImpl: FetchLike = fetch
): Promise<CampusImageDownload> {
  const res = await fetchImpl(url.toString(), {
    headers: { Accept: 'image/*' },
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    throw new AtlasImageError(`ATLAS campus image returned ${res.status}`);
  }

  const contentType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const ext = ALLOWED_IMAGE_TYPES[contentType];
  if (!ext) {
    throw new AtlasImageError(`Unsupported campus image content-type: ${contentType || 'unknown'}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length === 0) {
    throw new AtlasImageError('Campus image is empty');
  }
  if (buffer.length > MAX_CAMPUS_IMAGE_BYTES) {
    throw new AtlasImageError(`Campus image exceeds ${MAX_CAMPUS_IMAGE_BYTES} bytes`);
  }

  return { buffer, ext, contentType, hash: hashBytes(buffer) };
}

function removeFileQuietly(filePath: string | null | undefined, assetsDir: string): void {
  if (!filePath) return;
  const absolute = path.resolve(assetsDir, path.basename(filePath));
  try {
    if (fs.existsSync(absolute)) fs.unlinkSync(absolute);
  } catch {
    /* best-effort cleanup */
  }
}

export interface CampusImageSyncResult {
  changed: boolean;
  /** Raw URL last seen from ATLAS (null when ATLAS reports no image). */
  campusImageUrl: string | null;
  /** Stored file name (relative to the assets dir), or null. */
  campusImagePath: string | null;
  campusImageHash: string | null;
}

export interface SyncCampusImageOptions {
  schoolId: number;
  rawUrl: unknown;
  previousPath: string | null;
  previousHash: string | null;
  baseUrl: string;
  fetchImpl?: FetchLike;
  assetsDir?: string;
}

/**
 * Mirror the ATLAS campus image locally.
 * - `null` in ATLAS => mirrored removal (local file deleted).
 * - unchanged bytes => no write.
 * - otherwise => atomic temp-write + rename.
 */
export async function syncCampusImage(options: SyncCampusImageOptions): Promise<CampusImageSyncResult> {
  const assetsDir = options.assetsDir ?? ATLAS_ASSETS_DIR;
  const fetchImpl = options.fetchImpl ?? fetch;
  const resolved = resolveCampusImageUrl(options.rawUrl, options.baseUrl);

  if (!resolved) {
    removeFileQuietly(options.previousPath, assetsDir);
    return {
      changed: options.previousPath !== null || options.rawUrl !== null,
      campusImageUrl: typeof options.rawUrl === 'string' ? options.rawUrl : null,
      campusImagePath: null,
      campusImageHash: null,
    };
  }

  const download = await downloadCampusImage(resolved, fetchImpl);

  if (
    options.previousHash === download.hash &&
    options.previousPath &&
    fs.existsSync(path.resolve(assetsDir, path.basename(options.previousPath)))
  ) {
    return {
      changed: false,
      campusImageUrl: resolved.toString(),
      campusImagePath: path.basename(options.previousPath),
      campusImageHash: download.hash,
    };
  }

  fs.mkdirSync(assetsDir, { recursive: true });
  const fileName = `campus-${options.schoolId}.${download.ext}`;
  const target = path.join(assetsDir, fileName);
  const tmp = path.join(assetsDir, `.${fileName}.tmp-${process.pid}-${Date.now()}`);

  fs.writeFileSync(tmp, download.buffer);
  fs.renameSync(tmp, target);

  if (options.previousPath && path.basename(options.previousPath) !== fileName) {
    removeFileQuietly(options.previousPath, assetsDir);
  }

  return {
    changed: true,
    campusImageUrl: resolved.toString(),
    campusImagePath: fileName,
    campusImageHash: download.hash,
  };
}
