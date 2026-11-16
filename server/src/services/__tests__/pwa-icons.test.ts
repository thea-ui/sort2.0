import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, promises as fs } from 'node:fs';

import sharp from 'sharp';

import { PWA_ICON_DIR, generateTenantPwaIcons, logoHashFromPath, resolveTenantPwaIcons } from '../pwa-icons.service.js';

const HASH = 'deadbeef00';
const LOGO_URL = `/uploads/logo-enrollpro-sync-${HASH}.png`;

function pngDimensions(buffer: Buffer): { width: number; height: number } {
  assert.equal(buffer.subarray(1, 4).toString('ascii'), 'PNG');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test('PWA icons: hash is read only from a synced logo filename', () => {
  assert.equal(logoHashFromPath(LOGO_URL), HASH);
  assert.equal(logoHashFromPath('/uploads/logo-enrollpro-sync-0123456789.webp'), '0123456789');
  assert.equal(logoHashFromPath('/uploads/logo-enrollpro-sync.png'), null);
  assert.equal(logoHashFromPath('/uploads/random.png'), null);
  assert.equal(logoHashFromPath(null), null);
});

test('PWA icons: missing generated files are never advertised', () => {
  assert.equal(resolveTenantPwaIcons(`/uploads/logo-enrollpro-sync-ffffffffff.png`), null);
  assert.equal(resolveTenantPwaIcons(null), null);
});

test('PWA icons: generation produces every install variant with exact sizes', async () => {
  const dir = path.join(PWA_ICON_DIR, HASH);
  await fs.rm(dir, { recursive: true, force: true });

  const input = await sharp({
    create: { width: 128, height: 128, channels: 4, background: '#00A77C' },
  })
    .png()
    .toBuffer();

  try {
    const icons = await generateTenantPwaIcons(input, HASH);
    assert.ok(icons);
    assert.equal(icons.icon192, `/uploads/pwa/${HASH}/icon-192.png`);

    const resolved = resolveTenantPwaIcons(LOGO_URL);
    assert.deepEqual(resolved, icons);

    const expectations: Array<[string, number]> = [
      ['icon-192.png', 192],
      ['icon-512.png', 512],
      ['icon-maskable-192.png', 192],
      ['icon-maskable-512.png', 512],
      ['apple-touch-icon.png', 180],
    ];
    for (const [file, size] of expectations) {
      const absolute = path.join(dir, file);
      assert.ok(existsSync(absolute), `${file} exists`);
      const dims = pngDimensions(await fs.readFile(absolute));
      assert.deepEqual(dims, { width: size, height: size });
    }
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
