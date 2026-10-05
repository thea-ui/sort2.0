import test from 'node:test';
import assert from 'node:assert/strict';

import { effectiveNowForTerm } from '../term-clock.service.js';

const T1 = { isActive: true, startDate: '2026-06-08', endDate: '2026-09-15' };

test('C1 clock: real time inside the mirrored active term is used as-is', () => {
  const realNow = new Date(2026, 8, 1, 10, 30); // Sep 1, local
  const { now, timeShifted } = effectiveNowForTerm(T1, realNow);
  assert.equal(now.getTime(), realNow.getTime());
  assert.equal(timeShifted, false);
});

test('C2 clock: EnrollPro time-traveled back clamps to the term end (Term 1 while it is September)', () => {
  const realNow = new Date(2026, 8, 30, 12, 0); // Sep 30, past T1 end
  const { now, timeShifted } = effectiveNowForTerm(T1, realNow);
  assert.equal(timeShifted, true);
  assert.equal(now.getFullYear(), 2026);
  assert.equal(now.getMonth(), 8);
  assert.equal(now.getDate(), 15);
  assert.equal(now.getHours(), 23);
});

test('C3 clock: EnrollPro time-traveled forward clamps to the term start', () => {
  const T3 = { isActive: true, startDate: '2027-01-04', endDate: '2027-04-08' };
  const realNow = new Date(2026, 8, 30, 12, 0); // Sep 30, before T3 start
  const { now, timeShifted } = effectiveNowForTerm(T3, realNow);
  assert.equal(timeShifted, true);
  assert.equal(now.getFullYear(), 2027);
  assert.equal(now.getMonth(), 0);
  assert.equal(now.getDate(), 4);
  assert.equal(now.getHours(), 0);
});

test('C4 clock: an inactive term never shifts the clock', () => {
  const realNow = new Date(2026, 8, 30, 12, 0);
  const { now, timeShifted } = effectiveNowForTerm({ ...T1, isActive: false }, realNow);
  assert.equal(now.getTime(), realNow.getTime());
  assert.equal(timeShifted, false);
});

test('C5 clock: boundary days stay inside the term window', () => {
  const firstDay = new Date(2026, 5, 8, 0, 0); // Jun 8 local, term start day
  const lastDay = new Date(2026, 8, 15, 23, 0); // Sep 15 local, term end day
  const startClock = effectiveNowForTerm(T1, firstDay);
  const endClock = effectiveNowForTerm(T1, lastDay);
  assert.equal(startClock.timeShifted, false);
  assert.equal(startClock.now.getTime(), firstDay.getTime());
  assert.equal(endClock.timeShifted, false);
  assert.equal(endClock.now.getTime(), lastDay.getTime());
});
