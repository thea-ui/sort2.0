import test from 'node:test';
import assert from 'node:assert/strict';

import { ReportStatus, WasteCategory } from '@prisma/client';
import {
  countUnverifiedActiveStreamReports,
  dispatchStreamWithinTransaction,
} from '../report-dispatch.service.js';
import { buildStreamAwardPlan } from '../report-award-plan.js';

type ReportClient = Parameters<typeof countUnverifiedActiveStreamReports>[0];

interface CapturedCall {
  method: 'count' | 'updateMany';
  args: Record<string, any>;
}

function fakeClient(countResult = 0) {
  const calls: CapturedCall[] = [];
  const client = {
    report: {
      count: async (args: Record<string, any>) => {
        calls.push({ method: 'count', args });
        return countResult;
      },
      updateMany: async (args: Record<string, any>) => {
        calls.push({ method: 'updateMany', args });
        return { count: 2 };
      },
    },
  } as unknown as ReportClient;
  return { client, calls };
}

const STREAM = {
  locationKey: 'g8 building',
  category: WasteCategory.RECYCLABLE,
  schoolYearId: 'sy-1',
};

test('D1 stream gate: counts only unverified active reports in the stream', async () => {
  const { client, calls } = fakeClient(1);
  const unverified = await countUnverifiedActiveStreamReports(client, STREAM);

  assert.equal(unverified, 1);
  assert.deepEqual(calls[0].args.where, {
    locationKey: 'g8 building',
    category: WasteCategory.RECYCLABLE,
    schoolYearId: 'sy-1',
    status: { in: [ReportStatus.PENDING, ReportStatus.DISPATCHED] },
    isVerified: false,
  });
});

test('D2 stream dispatch: one assignee covers every active report in the stream', async () => {
  const { client, calls } = fakeClient();
  const affected = await dispatchStreamWithinTransaction(client, STREAM, 'mrf-1');

  assert.equal(affected, 2);
  assert.deepEqual(calls[0].args.where, {
    locationKey: 'g8 building',
    category: WasteCategory.RECYCLABLE,
    schoolYearId: 'sy-1',
    status: { in: [ReportStatus.PENDING, ReportStatus.DISPATCHED] },
  });
  assert.deepEqual(calls[0].args.data, {
    status: ReportStatus.DISPATCHED,
    assignedMrfId: 'mrf-1',
  });
});

test('D3 stream dispatch: no assignee only advances status, never clears it', async () => {
  const { client, calls } = fakeClient();
  await dispatchStreamWithinTransaction(client, STREAM, null);

  assert.deepEqual(calls[0].args.data, { status: ReportStatus.DISPATCHED });
});

function awardEntry(
  id: string,
  reporterId: string,
  isVerified = true,
  pointsAwardedAt: Date | null = null,
) {
  return { id, reporterId, isVerified, pointsAwardedAt };
}

test('P1 first three students get 15/10/5; faculty are skipped and consume no rank', () => {
  const plan = buildStreamAwardPlan(
    [
      awardEntry('r1', 'student-1'),
      awardEntry('r2', 'teacher-1'),
      awardEntry('r3', 'student-2'),
      awardEntry('r4', 'student-3'),
      awardEntry('r5', 'student-4'),
    ],
    { facultyIds: new Set(['teacher-1']), startRank: 0, rankPointsMap: [15, 10, 5, 0] },
  );

  assert.deepEqual(
    plan.map((p) => [p.report.id, p.rank, p.points]),
    [
      ['r1', 1, 15],
      ['r2', null, 0],
      ['r3', 2, 10],
      ['r4', 3, 5],
      ['r5', 4, 0],
    ],
  );
});

test('P2 unverified and already-credited reports earn nothing', () => {
  const plan = buildStreamAwardPlan(
    [
      awardEntry('r1', 'student-1', false),
      awardEntry('r2', 'student-2', true, new Date('2026-09-28T00:00:00.000Z')),
      awardEntry('r3', 'student-3'),
    ],
    { facultyIds: new Set(), startRank: 0, rankPointsMap: [15, 10, 5] },
  );

  assert.deepEqual(
    plan.map((p) => [p.report.id, p.rank, p.points]),
    [['r3', 1, 15]],
  );
});

test('P3 ranks continue from the current reset cycle start rank', () => {
  const plan = buildStreamAwardPlan(
    [awardEntry('r1', 'student-1'), awardEntry('r2', 'student-2')],
    { facultyIds: new Set(), startRank: 2, rankPointsMap: [15, 10, 5] },
  );

  assert.deepEqual(
    plan.map((p) => [p.report.id, p.rank, p.points]),
    [
      ['r1', 3, 5],
      ['r2', 4, 0],
    ],
  );
});
