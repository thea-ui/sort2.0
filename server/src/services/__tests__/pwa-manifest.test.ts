import test from 'node:test';
import assert from 'node:assert/strict';

import { toPublicBranding } from '../branding.service.js';
import {
  buildFallbackPwaManifest,
  buildPwaManifest,
  resolveManifestThemeColor,
  DEFAULT_PWA_ICONS,
  PWA_DEFAULT_THEME_COLOR,
} from '../pwa-manifest.service.js';
import type { TenantPwaIcons } from '../pwa-icons.service.js';

const TENANT_ICONS: TenantPwaIcons = {
  icon192: '/uploads/pwa/abc123abcd/icon-192.png',
  icon512: '/uploads/pwa/abc123abcd/icon-512.png',
  maskable192: '/uploads/pwa/abc123abcd/icon-maskable-192.png',
  maskable512: '/uploads/pwa/abc123abcd/icon-maskable-512.png',
  appleTouch: '/uploads/pwa/abc123abcd/apple-touch-icon.png',
};

test('PWA manifest: default deployment is installable with SORT identity', () => {
  const manifest = buildPwaManifest(null);

  assert.equal(manifest.id, '/');
  assert.equal(manifest.name, 'S.O.R.T.');
  assert.equal(manifest.short_name, 'SORT');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.background_color, '#F9F3F0');
  assert.equal(manifest.theme_color, PWA_DEFAULT_THEME_COLOR);
  assert.deepEqual(manifest.icons, DEFAULT_PWA_ICONS);
  assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192' && icon.purpose === 'any'));
  assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'any'));
});

test('PWA manifest: tenant branding drives name, short name, and theme', () => {
  const branding = toPublicBranding({
    schoolName: 'Bagong Silang National High School',
    schoolAcronym: 'BSNHS',
    primaryColor: '#0B5D4B',
  });
  const manifest = buildPwaManifest(branding, TENANT_ICONS);

  assert.equal(manifest.name, 'Bagong Silang National High School');
  assert.equal(manifest.short_name, 'BSNHS');
  assert.equal(manifest.theme_color, '#0b5d4b');
  assert.equal(manifest.icons[0].src, TENANT_ICONS.icon192);
  assert.equal(manifest.icons[2].purpose, 'maskable');
});

test('PWA manifest: long tenant names are clamped to stable manifest limits', () => {
  const branding = toPublicBranding({
    schoolName: 'A'.repeat(120),
    schoolAcronym: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  });
  const manifest = buildPwaManifest(branding);

  assert.equal(manifest.name.length, 60);
  assert.equal(manifest.short_name.length, 12);
});

test('PWA manifest: short name falls back to school initials without an acronym', () => {
  const branding = toPublicBranding({ schoolName: 'Hinigaran National High School' });
  assert.equal(buildPwaManifest(branding).short_name, 'HNHS');

  const single = toPublicBranding({ schoolName: 'Montessori' });
  assert.equal(buildPwaManifest(single).short_name, 'MON');
});

test('PWA manifest: light brand colors fall back to the readable dark theme color', () => {
  assert.equal(resolveManifestThemeColor('#FFFFFF'), PWA_DEFAULT_THEME_COLOR);
  assert.equal(resolveManifestThemeColor('#f9f3f0'), PWA_DEFAULT_THEME_COLOR);
  assert.equal(resolveManifestThemeColor('#00271D'), '#00271d');
  assert.equal(resolveManifestThemeColor('not-a-color'), PWA_DEFAULT_THEME_COLOR);
  assert.equal(resolveManifestThemeColor(null), PWA_DEFAULT_THEME_COLOR);
  assert.equal(resolveManifestThemeColor(undefined), PWA_DEFAULT_THEME_COLOR);
});

test('PWA manifest: tenant identity fields never leak into the public manifest', () => {
  const branding = toPublicBranding({
    schoolName: 'Sample NHS',
    schoolAcronym: 'SNHS',
    schoolId: '123456',
    address: '123 DepEd Road',
    schoolHeadName: 'Jane Doe',
    enrollproPublicUrl: 'https://enrollpro.example.ts.net',
  });
  const serialized = JSON.stringify(buildPwaManifest(branding));

  assert.ok(!serialized.includes('123456'));
  assert.ok(!serialized.includes('123 DepEd Road'));
  assert.ok(!serialized.includes('Jane Doe'));
  assert.ok(!serialized.includes('enrollpro.example.ts.net'));
});

test('PWA manifest: fallback builder matches the default installable manifest', () => {
  assert.deepEqual(buildFallbackPwaManifest(), buildPwaManifest(null));
});
