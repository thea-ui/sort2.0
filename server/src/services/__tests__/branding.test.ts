import test from 'node:test';
import assert from 'node:assert/strict';

import { enrollProOrigin, pickColorsFromPalette } from '../enrollpro-branding.service.js';

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
