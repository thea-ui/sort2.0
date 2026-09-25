import test from 'node:test';
import assert from 'node:assert/strict';

import { assessRoster, isPurgeableLocalAccount } from '../enrollpro-sync-guard.js';

test('G1 empty-roster guard: refuses to reconcile when the roster is empty but locals exist', () => {
  const decision = assessRoster({ pulled: 0, localCount: 135, allowEmpty: false });
  assert.equal(decision.reconcile, false);
  assert.match(decision.reason ?? '', /EMPTY_ROSTER_SUSPECTED/);
  assert.match(decision.reason ?? '', /135 local accounts/);
});

test('G2 empty-roster guard: allowEmpty is the only way to reconcile an empty roster with locals', () => {
  const decision = assessRoster({ pulled: 0, localCount: 135, allowEmpty: true });
  assert.equal(decision.reconcile, true);
  assert.equal(decision.reason, undefined);
});

test('G3 empty-roster guard: an empty roster on a fresh install still reconciles (nothing to archive)', () => {
  const decision = assessRoster({ pulled: 0, localCount: 0, allowEmpty: false });
  assert.equal(decision.reconcile, true);
});

test('G4 empty-roster guard: a failed fetch never reconciles, even with allowEmpty', () => {
  const decision = assessRoster({
    pulled: 0,
    fetchError: 'learners returned 500',
    localCount: 0,
    allowEmpty: true,
  });
  assert.equal(decision.reconcile, false);
  assert.equal(decision.reason, 'learners returned 500');
});

test('G5 empty-roster guard: a non-empty roster reconciles normally', () => {
  const decision = assessRoster({ pulled: 178, localCount: 135, allowEmpty: false });
  assert.equal(decision.reconcile, true);
});

test('P1 local purge: activity-free accounts may be purged', () => {
  assert.equal(
    isPurgeableLocalAccount({ enrollmentStatus: null, activityCounts: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }),
    true
  );
});

test('P2 local purge: any activity protects the account', () => {
  assert.equal(
    isPurgeableLocalAccount({ enrollmentStatus: null, activityCounts: [0, 0, 0, 1, 0, 0, 0, 0, 0, 0] }),
    false
  );
});

test('P3 local purge: OFFLINE_DEMO accounts are never purged, even while activity-free', () => {
  assert.equal(
    isPurgeableLocalAccount({ enrollmentStatus: 'OFFLINE_DEMO', activityCounts: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }),
    false
  );
});
