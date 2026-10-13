import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ASSET_DESCRIPTION_MARKERS,
  buildExpirableWasteWhere,
} from '../report-expiry.js';

interface ExpirableWhere {
  reportType: string;
  NOT: { OR: { description: { contains: string; mode: string } }[] };
}

interface Row {
  reportType: string;
  description: string;
}

const asWhere = (): ExpirableWhere => buildExpirableWasteWhere() as unknown as ExpirableWhere;

/**
 * Minimal evaluator for the shape returned by buildExpirableWasteWhere, so the
 * tests assert the predicate's semantics rather than just the object shape.
 * (The real query runs the same clause inside Prisma.)
 */
function matchesExpirableWaste(where: ExpirableWhere, row: Row): boolean {
  if (row.reportType !== where.reportType) return false;
  const markers = where.NOT.OR.map((condition) => condition.description.contains);
  const desc = row.description.toUpperCase();
  return !markers.some((marker) => desc.includes(marker));
}

test('E1: plain WASTE rows are expirable', () => {
  const where = asWhere();
  assert.equal(
    matchesExpirableWaste(where, { reportType: 'WASTE', description: 'Overflowing bin' }),
    true,
  );
});

test('E2: ASSET-typed rows are never expirable', () => {
  const where = asWhere();
  assert.equal(
    matchesExpirableWaste(where, { reportType: 'ASSET', description: 'Broken ceiling fan' }),
    false,
  );
});

test('E3: WASTE rows carrying any pillar marker are spared, case-insensitively', () => {
  const where = asWhere();
  for (const marker of ASSET_DESCRIPTION_MARKERS) {
    assert.equal(
      matchesExpirableWaste(where, { reportType: 'WASTE', description: `broken ${marker} chair` }),
      false,
      `marker ${marker} should spare the row`,
    );
    assert.equal(
      matchesExpirableWaste(where, {
        reportType: 'WASTE',
        description: `broken ${marker.toLowerCase()} chair`,
      }),
      false,
      `marker ${marker.toLowerCase()} should spare the row`,
    );
  }
});

test('E4: where clause targets WASTE only and covers every pillar marker', () => {
  const where = asWhere();
  assert.equal(where.reportType, 'WASTE');
  assert.deepEqual(
    where.NOT.OR.map((condition) => condition.description.contains),
    [...ASSET_DESCRIPTION_MARKERS],
  );
  for (const condition of where.NOT.OR) {
    assert.equal(condition.description.mode, 'insensitive');
  }
});
