import path from 'node:path';

/**
 * Persistent uploads root (tenant logo, report photos, generated PWA icons).
 * Kept in its own module so branding, report-photo, and PWA services can share
 * it without importing each other.
 */
export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
