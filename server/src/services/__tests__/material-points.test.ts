import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeMaterialPoints,
  sanitizeMaterials,
  sanitizeOtherMaterialLabel,
  DEFAULT_MATERIAL_POINTS,
} from '../material-point-rules.js';

const points = new Map<string, number>(Object.entries(DEFAULT_MATERIAL_POINTS));

test('MP1 sanitize: keeps known codes, drops unknown and duplicates', () => {
  assert.deepEqual(
    sanitizeMaterials(['pet_plastic', 'glass', 'pet_plastic', 'bogus', 42]),
    ['pet_plastic', 'glass'],
  );
  assert.deepEqual(sanitizeMaterials(null), []);
  assert.deepEqual(sanitizeMaterials('pet_plastic'), []);
});

test('MP2 label: trims, caps and nulls empty values', () => {
  assert.equal(sanitizeOtherMaterialLabel('  Tetra Pak  '), 'Tetra Pak');
  assert.equal(sanitizeOtherMaterialLabel(''), null);
  assert.equal(sanitizeOtherMaterialLabel(123), null);
  assert.equal(sanitizeOtherMaterialLabel('x'.repeat(80))?.length, 60);
});

test('MP3 points: each selected material earns its own configured points', () => {
  assert.equal(computeMaterialPoints(['pet_plastic'], points), 2);
  assert.equal(computeMaterialPoints(['glass'], points), 2);
  assert.equal(computeMaterialPoints(['pet_plastic', 'glass'], points), 4);
  assert.equal(computeMaterialPoints(['pet_plastic', 'cardboard', 'glass'], points), 6);
});

test('MP4 points: Mixed / Others is always exactly 1 point', () => {
  assert.equal(computeMaterialPoints(['others'], points), 1);
  assert.equal(computeMaterialPoints(['others'], new Map([['others', 9]])), 1);
  assert.equal(computeMaterialPoints(['pet_plastic', 'others'], points), 3);
});

test('MP5 points: no materials or unknown material earns nothing', () => {
  assert.equal(computeMaterialPoints([], points), 0);
  assert.equal(computeMaterialPoints(undefined, points), 0);
  assert.equal(computeMaterialPoints(['bogus'], points), 0);
});
