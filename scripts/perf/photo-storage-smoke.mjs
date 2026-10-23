/**
 * Phase 6 photo-storage smoke: proves new report uploads are written to disk
 * (not base64 in PostgreSQL) and served back through the authenticated route.
 *
 * Usage: node scripts/perf/photo-storage-smoke.mjs [baseUrl]
 * Creates one small PENDING report in the dev tenant.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// @ts-ignore - plain ESM helper without type declarations
import { resolveToken } from '../e2e/token.mjs';

const baseUrl = process.argv[2] || process.env.SMOKE_BASE_URL || 'http://localhost:5000';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const uploadsDir = path.join(repoRoot, 'server', 'uploads', 'reports');

const ONE_PX_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const student = await resolveToken(baseUrl, 'STUDENT');
if (!student?.token) {
  console.error('[photo-smoke] No usable STUDENT token — is the API running?');
  process.exit(1);
}
const headers = { Authorization: `Bearer ${student.token}`, 'Content-Type': 'application/json' };

const stamp = Date.now();
const createResponse = await fetch(`${baseUrl}/api/reports`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    title: `Phase 6 photo smoke ${stamp}`,
    description: 'Automated photo storage verification.',
    category: 'RECYCLABLE',
    urgency: 'LOW',
    coordinates: { lat: 14.6, lng: 120.985 },
    locationName: `Phase 6 Smoke Zone ${stamp}`,
    imageUrl: ONE_PX_PNG,
  }),
});

const created = await createResponse.json().catch(() => ({}));
if (createResponse.status !== 201) {
  console.error(`[photo-smoke] FAIL: create returned ${createResponse.status}`, created);
  process.exit(1);
}

const reportId = created.id;
const photoUrl = created.photoUrl;
console.log(`[photo-smoke] created report ${reportId} (photoUrl=${photoUrl})`);

if (typeof photoUrl !== 'string' || !photoUrl.includes('/photo')) {
  console.error('[photo-smoke] FAIL: response did not include a photoUrl');
  process.exit(1);
}
if (Object.prototype.hasOwnProperty.call(created, 'imageUrl')) {
  console.error('[photo-smoke] FAIL: create response leaked imageUrl');
  process.exit(1);
}

const photoResponse = await fetch(`${baseUrl}${photoUrl}`, { headers });
const photoBytes = Buffer.from(await photoResponse.arrayBuffer());
console.log(`[photo-smoke] photo endpoint: ${photoResponse.status} ${photoResponse.headers.get('content-type')} (${photoBytes.length} bytes)`);
if (!photoResponse.ok || !photoResponse.headers.get('content-type')?.startsWith('image/')) {
  console.error('[photo-smoke] FAIL: photo endpoint did not return an image');
  process.exit(1);
}

const storedFile = path.join(uploadsDir, `${reportId}.png`);
if (!existsSync(storedFile)) {
  console.error(`[photo-smoke] FAIL: expected file missing at ${storedFile}`);
  process.exit(1);
}
console.log('[photo-smoke] PASS: upload stored on disk and served via /photo');
