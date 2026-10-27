import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BCRYPT_COST,
  canUseLocalFastPath,
  hashPassword,
  isRevalidationDue,
  verifyLocalPassword,
} from '../offline-auth.service.js';

const verifiedNow = new Date('2026-10-25T12:00:00Z');

function baseInput() {
  return {
    enabled: true,
    hasLocalHash: true,
    localMatches: true,
    verifiedAt: verifiedNow,
    passwordChangeRequired: false,
    passwordResetRequired: false,
    revalidationDue: false,
  };
}

test('LF1 local fast path accepts a verified matching hash with no gates', () => {
  assert.equal(canUseLocalFastPath(baseInput()), true);
});

test('LF2 local fast path is disabled by the feature flag', () => {
  assert.equal(canUseLocalFastPath({ ...baseInput(), enabled: false }), false);
});

test('LF3 local fast path requires a local hash and a match', () => {
  assert.equal(canUseLocalFastPath({ ...baseInput(), hasLocalHash: false }), false);
  assert.equal(canUseLocalFastPath({ ...baseInput(), localMatches: false }), false);
});

test('LF4 local fast path rejects an unverified hash', () => {
  assert.equal(canUseLocalFastPath({ ...baseInput(), verifiedAt: null }), false);
});

test('LF5 local fast path rejects must-change and reset flags', () => {
  assert.equal(canUseLocalFastPath({ ...baseInput(), passwordChangeRequired: true }), false);
  assert.equal(canUseLocalFastPath({ ...baseInput(), passwordResetRequired: true }), false);
});

test('LF6 local fast path rejects a due revalidation', () => {
  assert.equal(canUseLocalFastPath({ ...baseInput(), revalidationDue: true }), false);
});

test('LF7 revalidation: zero days means never, positive days use a strict window', () => {
  assert.equal(isRevalidationDue(null, 7), false);
  assert.equal(isRevalidationDue(verifiedNow, 0, verifiedNow), false);
  assert.equal(
    isRevalidationDue(verifiedNow, 7, new Date('2026-11-01T11:59:59Z')),
    false
  );
  assert.equal(
    isRevalidationDue(verifiedNow, 7, new Date('2026-11-01T12:00:01Z')),
    true
  );
});

test('LF8 verifyLocalPassword checks the bcrypt hash and handles a missing hash', async () => {
  assert.equal(BCRYPT_COST, 12);
  const hash = await hashPassword('CorrectHorse#1');

  assert.deepEqual(await verifyLocalPassword({ passwordHash: hash }, 'CorrectHorse#1'), {
    hasHash: true,
    matches: true,
  });
  assert.deepEqual(await verifyLocalPassword({ passwordHash: hash }, 'wrong'), {
    hasHash: true,
    matches: false,
  });
  assert.deepEqual(await verifyLocalPassword({ passwordHash: null }, 'anything'), {
    hasHash: false,
    matches: false,
  });
});
