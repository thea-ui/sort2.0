import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertValidOfflinePin,
  nextOnlineStreak,
  OfflinePinValidationError,
  OFFLINE_PIN_MIN_LENGTH,
  OFFLINE_PIN_MAX_LENGTH,
} from '../offline-auth.service.js';

test('O1 PIN policy: accepts a reasonable numeric PIN', () => {
  assert.doesNotThrow(() => assertValidOfflinePin('864297'));
  assert.doesNotThrow(() => assertValidOfflinePin('13579246'));
});

test('O2 PIN policy: rejects non-numeric input', () => {
  assert.throws(() => assertValidOfflinePin('abc123'), OfflinePinValidationError);
  assert.throws(() => assertValidOfflinePin('12 3456'), OfflinePinValidationError);
});

test('O3 PIN policy: enforces length bounds', () => {
  assert.throws(() => assertValidOfflinePin('1'.repeat(OFFLINE_PIN_MIN_LENGTH - 1)), OfflinePinValidationError);
  assert.throws(() => assertValidOfflinePin('1'.repeat(OFFLINE_PIN_MAX_LENGTH + 1)), OfflinePinValidationError);
});

test('O4 PIN policy: rejects obvious sequences', () => {
  assert.throws(() => assertValidOfflinePin('123456'), OfflinePinValidationError);
  assert.throws(() => assertValidOfflinePin('111111'), OfflinePinValidationError);
  assert.throws(() => assertValidOfflinePin('654321'), OfflinePinValidationError);
});

test('O5 auto-revert: a failed probe resets the streak', () => {
  assert.deepEqual(nextOnlineStreak(1, false), { streak: 0, shouldDisable: false });
  assert.deepEqual(nextOnlineStreak(0, false), { streak: 0, shouldDisable: false });
});

test('O6 auto-revert: one successful probe does not disarm the fallback', () => {
  assert.deepEqual(nextOnlineStreak(0, true), { streak: 1, shouldDisable: false });
});

test('O7 auto-revert: two consecutive successes disarm and reset', () => {
  assert.deepEqual(nextOnlineStreak(1, true), { streak: 0, shouldDisable: true });
});

test('O8 auto-revert: a blip between successes restarts the count', () => {
  const first = nextOnlineStreak(0, true);
  assert.equal(first.shouldDisable, false);
  const blip = nextOnlineStreak(first.streak, false);
  assert.equal(blip.streak, 0);
  const after = nextOnlineStreak(blip.streak, true);
  assert.equal(after.shouldDisable, false);
  assert.equal(after.streak, 1);
});
