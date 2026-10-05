import test from 'node:test';
import assert from 'node:assert/strict';

import { computeResetCycleStart } from '../reset-cycle.service.js';

const MANILA = 'Asia/Manila'; // UTC+8, no DST

test('R1 cycle: after the reset time the cycle starts earlier the same day', () => {
  // 2026-09-28 19:47:59 Manila
  const start = computeResetCycleStart(new Date('2026-09-28T11:47:59.035Z'), '18:00', MANILA);
  assert.equal(start.toISOString(), '2026-09-28T10:00:00.000Z');
});

test('R2 cycle: before the reset time the cycle started the previous day', () => {
  // 2026-09-28 16:00 Manila
  const start = computeResetCycleStart(new Date('2026-09-28T08:00:00.000Z'), '18:00', MANILA);
  assert.equal(start.toISOString(), '2026-09-27T10:00:00.000Z');
});

test('R3 cycle: exactly at the reset time starts the new cycle', () => {
  // 2026-09-28 18:00 Manila
  const start = computeResetCycleStart(new Date('2026-09-28T10:00:00.000Z'), '18:00', MANILA);
  assert.equal(start.toISOString(), '2026-09-28T10:00:00.000Z');
});

test('R4 cycle: honors a custom reset time', () => {
  // 17:00 Manila — before a 17:30 reset
  const before = computeResetCycleStart(new Date('2026-09-28T09:00:00.000Z'), '17:30', MANILA);
  assert.equal(before.toISOString(), '2026-09-27T09:30:00.000Z');

  // 17:45 Manila — after a 17:30 reset
  const after = computeResetCycleStart(new Date('2026-09-28T09:45:00.000Z'), '17:30', MANILA);
  assert.equal(after.toISOString(), '2026-09-28T09:30:00.000Z');
});

test('R5 cycle: invalid reset time falls back to 18:00', () => {
  const start = computeResetCycleStart(new Date('2026-09-28T11:00:00.000Z'), '25:99', MANILA);
  assert.equal(start.toISOString(), '2026-09-28T10:00:00.000Z');
});

test('R6 cycle: uses the requested timezone, including DST offsets', () => {
  // 2026-11-01 19:00 EST (UTC-5, DST already ended) → cycle started 18:00 EST
  const afterDst = computeResetCycleStart(new Date('2026-11-02T00:00:00.000Z'), '18:00', 'America/New_York');
  assert.equal(afterDst.toISOString(), '2026-11-01T23:00:00.000Z');

  // 2026-10-31 16:00 EDT (UTC-4) → before reset, cycle started 18:00 EDT the day before
  const duringDst = computeResetCycleStart(new Date('2026-10-31T20:00:00.000Z'), '18:00', 'America/New_York');
  assert.equal(duringDst.toISOString(), '2026-10-30T22:00:00.000Z');
});
