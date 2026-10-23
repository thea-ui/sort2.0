import fs from 'node:fs';
import path from 'node:path';
import { UPLOADS_DIR } from './enrollpro-branding.service.js';

/**
 * File-backed report photo evidence (Phase 6).
 *
 * New uploads are decoded from the client's data URL and written under
 * `uploads/reports/<reportId>.<ext>`; the database stores only the relative
 * path. Legacy rows keep their base64 `image_url` until the backfill script
 * (`npm --prefix server run db:migrate-photos`) moves them to disk.
 */

export const REPORT_PHOTO_DIR = path.join(UPLOADS_DIR, 'reports');
export const MAX_REPORT_PHOTO_BYTES = 7 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export class ReportPhotoError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'ReportPhotoError';
    this.status = status;
  }
}

export function parseImageDataUrl(value: string): { mime: string; ext: string; buffer: Buffer } {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/.exec(value);
  if (!match) {
    throw new ReportPhotoError('Photo evidence must be a base64 image data URL.');
  }

  const mime = match[1].toLowerCase();
  const ext = EXT_BY_MIME[mime];
  if (!ext) {
    throw new ReportPhotoError(`Unsupported photo type "${mime}". Use JPEG, PNG, or WebP.`);
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(match[2], 'base64');
  } catch {
    throw new ReportPhotoError('Photo evidence could not be decoded.');
  }

  if (buffer.length === 0) {
    throw new ReportPhotoError('Photo evidence is empty.');
  }
  if (buffer.length > MAX_REPORT_PHOTO_BYTES) {
    throw new ReportPhotoError('Photo evidence is too large (max 7 MB).', 413);
  }

  return { mime, ext, buffer };
}

export function storeReportPhoto(
  reportId: string,
  dataUrl: string,
  dir: string = REPORT_PHOTO_DIR
): { photoPath: string; bytes: number } {
  const { ext, buffer } = parseImageDataUrl(dataUrl);
  fs.mkdirSync(dir, { recursive: true });

  const fileName = `${reportId}.${ext}`;
  const target = path.join(dir, fileName);
  const tmp = path.join(dir, `.${fileName}.tmp-${process.pid}-${Date.now()}`);

  fs.writeFileSync(tmp, buffer);
  fs.renameSync(tmp, target);

  return { photoPath: `reports/${fileName}`, bytes: buffer.length };
}

/** Resolve a stored relative path to an absolute file, rejecting traversal. */
export function resolveReportPhotoFile(
  photoPath: string,
  dir: string = REPORT_PHOTO_DIR
): string | null {
  const normalized = photoPath.replace(/\\/g, '/');
  if (!normalized.startsWith('reports/')) return null;

  const fileName = normalized.slice('reports/'.length);
  if (!fileName || fileName.includes('/') || fileName.includes('..')) return null;

  const absolute = path.resolve(dir, fileName);
  if (!absolute.startsWith(path.resolve(dir) + path.sep)) return null;
  if (!fs.existsSync(absolute)) return null;

  return absolute;
}

export function reportPhotoContentType(absolutePath: string): string | null {
  return MIME_BY_EXT[path.extname(absolutePath).toLowerCase()] ?? null;
}

export function deleteReportPhoto(photoPath: string, dir: string = REPORT_PHOTO_DIR): void {
  const absolute = resolveReportPhotoFile(photoPath, dir);
  if (!absolute) return;
  try {
    fs.unlinkSync(absolute);
  } catch {
    /* best-effort cleanup */
  }
}

/** Decode a legacy data URL for the transitional read path. */
export function parseLegacyPhotoDataUrl(value: string): { mime: string; buffer: Buffer } | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/.exec(value);
  if (!match) return null;
  return { mime: match[1].toLowerCase(), buffer: Buffer.from(match[2], 'base64') };
}
