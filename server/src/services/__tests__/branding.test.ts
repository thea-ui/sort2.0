import test from 'node:test';
import assert from 'node:assert/strict';

import { brandLogoFileName, enrollProOrigin, pickColorsFromPalette } from '../enrollpro-branding.service.js';
import {
  BRANDING_DEFAULTS,
  getEnrollProPublicUrl,
  sanitizeBrandingPatch,
  toPublicBranding,
} from '../branding.service.js';
import { resolveCertificateHeader, shiftHex } from '../certificate-pdf.service.js';

test('B1 palette: takes the first three vibrant colors in order (EnrollPro sample)', () => {
  const result = pickColorsFromPalette([
    { hex: '#861313' },
    { hex: '#c79229' },
    { hex: '#ebd8b7' },
    { hex: '#d6d6d6' },
    { hex: '#a8a8a8' },
  ]);
  assert.deepEqual(result, { primary: '#861313', secondary: '#c79229', accent: '#a8a8a8' });
});

test('B2 palette: rejects near-black (lum <= 30) and near-white (lum >= 210)', () => {
  const result = pickColorsFromPalette([
    { hex: '#000000' },
    { hex: '#0f0f0f' },
    { hex: '#ffffff' },
    { hex: '#ebd8b7' },
    { hex: '#7f1d1d' },
  ]);
  assert.deepEqual(result, { primary: '#7f1d1d', secondary: '#34d399', accent: '#6ee7b7' });
});

test('B3 palette: fills only the missing slots with per-slot defaults', () => {
  assert.deepEqual(pickColorsFromPalette([]), {
    primary: '#10b981',
    secondary: '#34d399',
    accent: '#6ee7b7',
  });
  assert.deepEqual(pickColorsFromPalette([{ hex: '#7f1d1d' }]), {
    primary: '#7f1d1d',
    secondary: '#34d399',
    accent: '#6ee7b7',
  });
  assert.deepEqual(pickColorsFromPalette([{ hex: '#7f1d1d' }, { hex: '#991b1b' }]), {
    primary: '#7f1d1d',
    secondary: '#991b1b',
    accent: '#6ee7b7',
  });
});

test('B4 palette: rejects malformed hex values', () => {
  const result = pickColorsFromPalette([
    { hex: '#12345' },
    { hex: '#zzzzzz' },
    { hex: '' },
    { hex: '#b91c1c' },
  ]);
  assert.deepEqual(result, { primary: '#b91c1c', secondary: '#34d399', accent: '#6ee7b7' });
});

test('B5 origin: strips the /api suffix and trailing slashes', () => {
  assert.equal(enrollProOrigin('https://dev-jegs.buru-degree.ts.net/api'), 'https://dev-jegs.buru-degree.ts.net');
  assert.equal(enrollProOrigin('https://example.ts.net/api/'), 'https://example.ts.net');
  assert.equal(enrollProOrigin('https://example.ts.net'), 'https://example.ts.net');
});

test('B6 defaults: an unconfigured tenant has null identity, SORT palette, source=default', () => {
  assert.equal(BRANDING_DEFAULTS.schoolName, null);

  const branding = toPublicBranding(null);
  assert.equal(branding.schoolName, null);
  assert.equal(branding.schoolAcronym, null);
  assert.equal(branding.schoolId, null);
  assert.equal(branding.division, null);
  assert.equal(branding.region, null);
  assert.equal(branding.address, null);
  assert.equal(branding.schoolHeadName, null);
  assert.equal(branding.logoUrl, null);
  assert.equal(branding.primaryColor, BRANDING_DEFAULTS.primaryColor);
  assert.equal(branding.secondaryColor, BRANDING_DEFAULTS.secondaryColor);
  assert.equal(branding.accentColor, BRANDING_DEFAULTS.accentColor);
  assert.equal(branding.goldColor, BRANDING_DEFAULTS.goldColor);
  assert.equal(branding.brandingSource, 'default');
});

test('B7 whitespace-only identity fields are treated as unset', () => {
  const branding = toPublicBranding({ schoolName: '   ', logoUrl: '  ', address: '\t' });
  assert.equal(branding.schoolName, null);
  assert.equal(branding.logoUrl, null);
  assert.equal(branding.address, null);
  assert.equal(branding.brandingSource, 'default');
});

test('B8 source=tenant: name alone or logo alone is enough', () => {
  const named = toPublicBranding({ schoolName: 'Bagong Silang NHS' });
  assert.equal(named.brandingSource, 'tenant');
  assert.equal(named.schoolName, 'Bagong Silang NHS');

  const withLogo = toPublicBranding({ logoUrl: '/uploads/logo-enrollpro-sync.png' });
  assert.equal(withLogo.brandingSource, 'tenant');
  assert.equal(withLogo.schoolName, null);

  const addressOnly = toPublicBranding({ address: '123 DepEd Rd' });
  assert.equal(addressOnly.brandingSource, 'tenant');
});

test('B9 origin: no stored value + no env = empty (never a dev hub)', () => {
  const saved = {
    publicUrl: process.env.ENROLLPRO_PUBLIC_URL,
    baseUrl: process.env.ENROLLPRO_BASE_URL,
  };
  delete process.env.ENROLLPRO_PUBLIC_URL;
  delete process.env.ENROLLPRO_BASE_URL;
  try {
    assert.equal(getEnrollProPublicUrl(null), '');
    assert.equal(getEnrollProPublicUrl('   '), '');
    assert.equal(getEnrollProPublicUrl('https://example.ts.net/api/'), 'https://example.ts.net');
    assert.equal(toPublicBranding(null).enrollproPublicUrl, '');
  } finally {
    if (saved.publicUrl === undefined) delete process.env.ENROLLPRO_PUBLIC_URL;
    else process.env.ENROLLPRO_PUBLIC_URL = saved.publicUrl;
    if (saved.baseUrl === undefined) delete process.env.ENROLLPRO_BASE_URL;
    else process.env.ENROLLPRO_BASE_URL = saved.baseUrl;
  }
});

test('B11 legacy rows: the old "School Name" placeholder is treated as unset', () => {
  const branding = toPublicBranding({ schoolName: 'School Name', logoUrl: null });
  assert.equal(branding.schoolName, null);
  assert.equal(branding.brandingSource, 'default');

  const placeholderOnly = toPublicBranding({ schoolName: 'school name ' });
  assert.equal(placeholderOnly.schoolName, null);
  assert.equal(placeholderOnly.brandingSource, 'default');
});

test('B10 sanitize: clearing a field maps to null, not a placeholder', () => {
  assert.deepEqual(sanitizeBrandingPatch({ schoolName: '' }), { schoolName: null });
  assert.deepEqual(sanitizeBrandingPatch({ schoolName: '   ' }), { schoolName: null });
  assert.deepEqual(sanitizeBrandingPatch({ schoolName: 'Test NHS' }), { schoolName: 'Test NHS' });
  assert.deepEqual(sanitizeBrandingPatch({ schoolName: null }), { schoolName: null });
});

test('B12 certificate header: unconfigured branding prints S.O.R.T., never a hardcoded school', () => {
  const header = resolveCertificateHeader(toPublicBranding(null));
  assert.equal(header.schoolName, 'S.O.R.T.');
  assert.ok(!header.republicLine.includes('REGION'));
  assert.equal(header.conferredLine('June 1, 2026'), 'Conferred on June 1, 2026.');
  assert.equal(header.serialPrefix, 'SORT');
  assert.ok(!JSON.stringify(header).toUpperCase().includes('HINIGARAN'));
});

test('B13 certificate header: tenant branding drives name, region, address and serial prefix', () => {
  const header = resolveCertificateHeader(
    toPublicBranding({
      schoolName: 'Bagong Silang National High School',
      region: 'Region VI',
      address: 'Hinigaran, Negros Occidental',
    })
  );
  assert.equal(header.schoolName, 'BAGONG SILANG NATIONAL HIGH SCHOOL');
  assert.ok(header.republicLine.includes('REGION VI'));
  assert.equal(
    header.conferredLine('June 1, 2026'),
    'Conferred on June 1, 2026 at Bagong Silang National High School, Hinigaran, Negros Occidental.'
  );
  assert.equal(header.serialPrefix, 'BSNHS');
  assert.equal(header.colors.primary, BRANDING_DEFAULTS.primaryColor);
});

test('B15 logo file name is content-addressed (new bytes = new URL)', () => {
  const first = brandLogoFileName(Buffer.from('logo-one'), '.png');
  const second = brandLogoFileName(Buffer.from('logo-two'), '.png');
  assert.match(first, /^logo-enrollpro-sync-[0-9a-f]{10}\.png$/);
  assert.notEqual(first, second);
  assert.equal(first, brandLogoFileName(Buffer.from('logo-one'), '.png'));
});

test('B14 shiftHex: shifts channels and clamps at the bounds', () => {
  assert.equal(shiftHex('#C69B26', 17), '#d7ac37');
  assert.equal(shiftHex('#ffffff', 20), '#ffffff');
  assert.equal(shiftHex('#000000', -20), '#000000');
  assert.equal(shiftHex('not-a-hex', 10), 'not-a-hex');
});
