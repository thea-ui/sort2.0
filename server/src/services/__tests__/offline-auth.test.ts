import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BCRYPT_COST,
  DEFAULT_MAX_CACHE_DAYS,
  MAX_CACHE_DAYS,
  clampMaxCacheDays,
  hashPassword,
  isCacheWithinWindow,
  verifyPasswordHash,
} from '../offline-auth.service.js';

test('OA1 clamp: defaults, bounds and coercion', () => {
  assert.equal(clampMaxCacheDays(undefined), DEFAULT_MAX_CACHE_DAYS);
  assert.equal(clampMaxCacheDays('not-a-number'), DEFAULT_MAX_CACHE_DAYS);
  assert.equal(clampMaxCacheDays(NaN), DEFAULT_MAX_CACHE_DAYS);
  assert.equal(clampMaxCacheDays(0), 1);
  assert.equal(clampMaxCacheDays(-5), 1);
  assert.equal(clampMaxCacheDays(999), MAX_CACHE_DAYS);
  assert.equal(clampMaxCacheDays('15'), 15);
  assert.equal(clampMaxCacheDays(12.6), 13);
});

test('OA2 freshness window: accepts fresh cache, rejects stale/missing/invalid', () => {
  const now = new Date('2026-09-26T12:00:00Z');
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  assert.equal(isCacheWithinWindow(daysAgo(0), 30, now), true);
  assert.equal(isCacheWithinWindow(daysAgo(29), 30, now), true);
  assert.equal(isCacheWithinWindow(daysAgo(30), 30, now), true);
  assert.equal(isCacheWithinWindow(daysAgo(31), 30, now), false);
  assert.equal(isCacheWithinWindow(daysAgo(400), 365, now), false);
  assert.equal(isCacheWithinWindow(null, 30, now), false);
  assert.equal(isCacheWithinWindow(undefined, 30, now), false);
  assert.equal(isCacheWithinWindow('not-a-date', 30, now), false);
  assert.equal(isCacheWithinWindow(now.toISOString(), 30, now), true);
});

test('OA3 bcrypt roundtrip: correct password verifies, wrong one does not', async () => {
  const hash = await hashPassword('DepEdSY2026!');

  assert.ok(hash.startsWith('$2'), 'hash should be bcrypt-formatted');
  assert.ok(hash.includes(`$${BCRYPT_COST}$`), 'hash should use the configured cost');
  assert.equal(await verifyPasswordHash('DepEdSY2026!', hash), true);
  assert.equal(await verifyPasswordHash('DepEd2026!', hash), false);
});
