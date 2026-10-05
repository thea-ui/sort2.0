import test from 'node:test';
import assert from 'node:assert/strict';
import { ChallengeType, ReportStatus, ReportType, Role } from '@prisma/client';

import {
  assignReportAwards,
  planDataSeed,
  type SeedPlanInput,
  type SeedUserRef,
} from '../data-seeder.service.js';
import {
  planChallengeProvisioning,
  DEFAULT_CHALLENGE_CATALOG,
  type ProvisionDefinition,
} from '../challenge-catalog.service.js';
import { computeResetCycleStart } from '../reset-cycle.service.js';
import { computeWalkInPoints } from '../walk-in.service.js';

const MANILA = 'Asia/Manila';
const NOW = new Date('2026-09-29T03:00:00.000Z'); // 2026-09-29 11:00 Manila
const RANGE_START = new Date('2026-06-01T00:00:00.000Z');
const RANGE_END = new Date('2027-03-31T00:00:00.000Z');

const STUDENTS: SeedUserRef[] = [
  { id: 's1', name: 'Student One', role: Role.STUDENT, points: 0, gradeLevel: 'Grade 10' },
  { id: 's2', name: 'Student Two', role: Role.STUDENT, points: 0, gradeLevel: 'Grade 10' },
  { id: 's3', name: 'Student Three', role: Role.STUDENT, points: 40, gradeLevel: 'Grade 11' },
];

const STAFF: SeedUserRef[] = [
  { id: 't1', name: 'Teacher One', role: Role.TEACHER, points: 0 },
  { id: 'm1', name: 'MRF One', role: Role.MRF, points: 0 },
  { id: 'a1', name: 'Admin One', role: Role.ADMIN, points: 0 },
];

function baseInput(overrides: Partial<SeedPlanInput> = {}): SeedPlanInput {
  return {
    schoolYearId: 'sy-1',
    schoolYearStart: RANGE_START,
    schoolYearEnd: RANGE_END,
    now: NOW,
    resetTime: '18:00',
    timezone: MANILA,
    volume: 'LIGHT',
    include: { walkIns: true, marketSales: true, offenses: true, assetScrap: true },
    seed: 42,
    reportTarget: 60,
    participantsTarget: 3,
    students: STUDENTS,
    staff: STAFF,
    bins: [
      { id: 'b1', name: 'Lib Bin', locationName: 'Library Ground Floor - North Wing', lat: 14.5995, lng: 120.9842 },
      { id: 'b2', name: 'Caf Bin', locationName: 'Main Cafeteria - East Entrance', lat: 14.6001, lng: 120.985 },
    ],
    pointRules: [
      { rank: 1, pointsAwarded: 15 },
      { rank: 2, pointsAwarded: 10 },
      { rank: 3, pointsAwarded: 5 },
      { rank: 4, pointsAwarded: 0 },
    ],
    settings: {
      dismissPointPenalty: 10,
      falseReportPointPenalty: 50,
      warningAutoDeductAmount: 10,
      warningThreshold: 3,
      walkInPointsPer500ml: 1,
      defaultVendorName: 'GreenCycle Recycling Vendor',
    },
    marketStocks: [
      { categoryCode: 'pet_plastic', categoryName: 'PET Plastic Bottles', marketPricePerKg: 18, thresholdLimitKg: 50 },
      { categoryCode: 'cardboard', categoryName: 'Cardboard & Paper', marketPricePerKg: 12, thresholdLimitKg: 60 },
    ],
    rewards: [
      { id: 'r1', title: '500 g milestone', requiredGrams: 500 },
      { id: 'r2', title: '1 kg milestone', requiredGrams: 1000 },
    ],
    challenges: [
      {
        id: 'c1',
        title: 'Weekly Recycling Pioneer',
        challengeType: ChallengeType.REPORT_COUNT,
        pointsAwarded: 150,
        target: 5,
        startDate: null,
        endDate: null,
      },
    ],
    ...overrides,
  };
}

test('S1 awards: ranks restart at each daily reset boundary per stream', () => {
  const cycleA = computeResetCycleStart(NOW, '18:00', MANILA);
  const beforeReset = new Date(cycleA.getTime() - 3 * 60 * 60 * 1000);
  const afterReset = new Date(cycleA.getTime() + 60 * 60 * 1000);

  const mk = (id: string, reporterId: string, createdAt: Date) => ({
    id,
    reporterId,
    createdAt,
    status: ReportStatus.COLLECTED,
    isVerified: true,
    pointsAwardedAt: null,
    reporterRank: null,
    pointsAwarded: 0,
    locationKey: 'library',
    category: 'RECYCLABLE',
  });

  const reports = [
    mk('r1', 's1', beforeReset),
    mk('r2', 's2', beforeReset),
    mk('r3', 't1', beforeReset), // faculty: no rank, no points
    mk('r4', 's1', afterReset), // new cycle → rank restarts at 1
    mk('r5', 's3', afterReset),
  ];

  assignReportAwards(reports, {
    facultyIds: new Set(['t1']),
    rankPointsMap: [15, 10, 5, 0],
    resetTime: '18:00',
    timezone: MANILA,
  });

  const byId = Object.fromEntries(reports.map((r) => [r.id, r]));
  assert.equal(byId.r1.reporterRank, 1);
  assert.equal(byId.r1.pointsAwarded, 15);
  assert.equal(byId.r2.reporterRank, 2);
  assert.equal(byId.r2.pointsAwarded, 10);
  assert.equal(byId.r3.reporterRank, null);
  assert.equal(byId.r3.pointsAwarded, 0);
  assert.equal(byId.r4.reporterRank, 1);
  assert.equal(byId.r4.pointsAwarded, 15);
  assert.equal(byId.r5.reporterRank, 2);
  assert.equal(byId.r5.pointsAwarded, 10);
  assert.ok(reports.every((r) => r.pointsAwardedAt !== null));
});

test('S2 planner is deterministic for the same seed', () => {
  const a = planDataSeed(baseInput());
  const b = planDataSeed(baseInput());

  assert.equal(a.reports.length, b.reports.length);
  assert.deepEqual(
    a.reports.map((r) => [r.title, r.status, r.createdAt.toISOString(), r.pointsAwarded, r.reporterRank]),
    b.reports.map((r) => [r.title, r.status, r.createdAt.toISOString(), r.pointsAwarded, r.reporterRank])
  );
  assert.deepEqual(a.stats, b.stats);
});

test('S3 planner respects report lifecycle invariants', () => {
  const plan = planDataSeed(baseInput());
  const cycleStart = computeResetCycleStart(NOW, '18:00', MANILA);

  for (const report of plan.reports) {
    assert.ok(report.createdAt.getTime() >= RANGE_START.getTime(), 'createdAt before year start');
    assert.ok(report.createdAt.getTime() <= NOW.getTime(), 'createdAt after now');
    assert.equal(report.schoolYearId, 'sy-1');

    if (report.status === ReportStatus.PENDING) {
      assert.ok(report.createdAt.getTime() >= cycleStart.getTime(), 'stale pending report');
    }
    if (report.status === ReportStatus.EXPIRED) {
      assert.equal(report.reportType, ReportType.WASTE);
    }
    if (report.status === ReportStatus.COLLECTED || report.status === ReportStatus.RESOLVED) {
      assert.equal(report.isVerified, true);
      assert.ok(report.pointsAwardedAt !== null);
      assert.ok(report.completedAt !== null);
    }
    if (report.status === ReportStatus.DISMISSED) {
      assert.equal(report.pointsAwarded, 0);
    }
    if (report.reportType === ReportType.ASSET) {
      assert.ok(report.description.includes('[PILLAR:'), 'asset report missing pillar marker');
      assert.ok(report.reporterId.startsWith('t') || report.reporterId.startsWith('m') || report.reporterId.startsWith('a'), 'asset filed by student');
      assert.notEqual(report.status, ReportStatus.EXPIRED);
    }
  }
});

test('S4 user points equal the sum of their point histories (penalties capped at earnings)', () => {
  const plan = planDataSeed(baseInput());

  const historyTotals = new Map<string, number>();
  for (const entry of plan.pointHistories) {
    historyTotals.set(entry.userId, (historyTotals.get(entry.userId) ?? 0) + entry.amount);
  }

  for (const update of plan.userUpdates) {
    assert.equal(update.points, historyTotals.get(update.userId) ?? 0, `delta mismatch for ${update.userId}`);
    assert.ok(update.points >= 0, 'points delta must never be negative');
  }
});

test('S5 walk-in totals, points and history are consistent', () => {
  const plan = planDataSeed(baseInput());
  assert.ok(plan.walkInTurnovers.length > 0, 'expected seeded walk-ins');

  const itemsByTurnover = new Map<string, typeof plan.walkInItems>();
  for (const item of plan.walkInItems) {
    const list = itemsByTurnover.get(item.turnoverId) ?? [];
    list.push(item);
    itemsByTurnover.set(item.turnoverId, list);
  }

  for (const turnover of plan.walkInTurnovers) {
    const items = itemsByTurnover.get(turnover.id) ?? [];
    const totalMl = items.reduce((sum, i) => sum + i.bottleMl * i.quantity, 0);
    const totalGrams = items.reduce((sum, i) => sum + i.grams * i.quantity, 0);
    assert.equal(turnover.totalMl, totalMl);
    assert.equal(turnover.totalGrams, totalGrams);
    assert.equal(turnover.pointsAwarded, computeWalkInPoints(totalMl, turnover.ratePer500ml));

    const history = plan.pointHistories.find((h) => h.walkInTurnoverId === turnover.id);
    assert.ok(history, 'walk-in missing point history');
    assert.equal(history.amount, turnover.pointsAwarded);
  }
});

test('S6 challenge completion grants points exactly once', () => {
  const plan = planDataSeed(baseInput());

  const completions = plan.pointHistories.filter((h) => h.challengeId === 'c1');
  const progress = plan.progress.filter((p) => p.challengeId === 'c1');

  assert.equal(completions.length, progress.filter((p) => p.completedAt !== null).length);
  for (const completion of completions) {
    assert.equal(completion.amount, 150);
    assert.match(completion.reason, /^Challenge Completed: /);
  }
  for (const entry of progress) {
    assert.ok(entry.currentCount >= 0);
  }
});

test('S8 every active student files at least one report when volume covers the roster', () => {
  const plan = planDataSeed(baseInput());
  const wasteReporters = new Set(
    plan.reports.filter((r) => r.reportType === ReportType.WASTE).map((r) => r.reporterId)
  );

  for (const student of STUDENTS) {
    assert.ok(wasteReporters.has(student.id), `student ${student.id} has no seeded report`);
  }
});

test('S9 completed asset reports produce MRF asset ledger records', () => {
  const plan = planDataSeed(baseInput());
  const completedAsset = plan.reports.filter(
    (r) =>
      r.reportType === ReportType.ASSET &&
      (r.status === ReportStatus.COLLECTED || r.status === ReportStatus.RESOLVED)
  );

  assert.ok(completedAsset.length > 0, 'expected completed asset reports');
  assert.equal(plan.assetRecords.length, completedAsset.length);

  const validActions = new Set(['RECOVERED', 'REPAIRED', 'DISPOSED']);
  const validCategories = new Set(['Furniture', 'Electronics', 'Fixtures', 'Equipment', 'Other']);
  const reportIds = new Set(plan.reports.map((r) => r.id));

  for (const record of plan.assetRecords) {
    assert.ok(validActions.has(record.action), `unexpected action ${record.action}`);
    assert.ok(record.disposition, 'ledger record missing disposition');
    assert.ok(validCategories.has(record.category), `unexpected category ${record.category}`);
    assert.ok(record.sourceReportId && reportIds.has(record.sourceReportId), 'ledger record not linked to a report');
    assert.equal(record.schoolYearId, 'sy-1');
  }
});

test('S10 challenges rewarded in a prior year are not rewarded twice', () => {
  const plan = planDataSeed(
    baseInput({
      // Student One already earned challenge c1 in a previous school year.
      rewardedChallengePairs: new Set(['s1::c1']),
    })
  );

  const rewardRows = plan.pointHistories.filter((h) => h.challengeId === 'c1');
  assert.equal(rewardRows.filter((h) => h.userId === 's1').length, 0);

  const progress = plan.progress.find((p) => p.challengeId === 'c1' && p.userId === 's1');
  assert.ok(progress, 'expected s1 challenge progress');
  if (progress.completedAt) {
    assert.equal(progress.rewardedAt, null, 'repeat completion must not be marked rewarded');
  }
});

test('S7 offenses are never assigned to non-students and warnings are counted', () => {
  const plan = planDataSeed(baseInput());
  const studentIds = new Set(STUDENTS.map((s) => s.id));

  for (const offense of plan.offenses) {
    assert.ok(studentIds.has(offense.userId), 'offense assigned to a non-student');
  }
  for (const update of plan.userUpdates) {
    assert.ok(update.warningsDelta >= 0);
  }
});

test('S11 per-year challenge instances are independently earnable', () => {
  // Two instances of the same challenge code (e.g. T1 of SY A and T1 of SY B).
  const plan = planDataSeed(
    baseInput({
      challenges: [
        {
          id: 'c1',
          title: 'Weekly Recycling Pioneer',
          challengeType: ChallengeType.REPORT_COUNT,
          pointsAwarded: 150,
          target: 5,
          startDate: null,
          endDate: null,
        },
        {
          id: 'c2',
          title: 'Weekly Recycling Pioneer',
          challengeType: ChallengeType.REPORT_COUNT,
          pointsAwarded: 150,
          target: 5,
          startDate: null,
          endDate: null,
        },
      ],
    })
  );

  const first = plan.pointHistories.filter((h) => h.challengeId === 'c1');
  const second = plan.pointHistories.filter((h) => h.challengeId === 'c2');
  assert.ok(first.length > 0, 'expected rewards for the first instance');
  assert.ok(second.length > 0, 'expected rewards for the second instance');

  // A student rewarded on the first instance still earns the second.
  const student = first[0].userId;
  assert.ok(second.some((h) => h.userId === student));
});

test('C1 provisioning expands catalog codes to every term, customs stay on their term', () => {
  const definitions: ProvisionDefinition[] = [
    { ...DEFAULT_CHALLENGE_CATALOG[0], quarterCode: 'GLOBAL' },
    {
      code: 'CUSTOM_T1',
      title: 'Custom Challenge',
      description: '',
      challengeType: ChallengeType.REPORT_COUNT,
      pointsAwarded: 10,
      target: 1,
      iconName: 'Star',
      quarterCode: 'T1',
    },
  ];
  const terms = [
    { quarterCode: 'T1', startDate: new Date('2026-06-01'), endDate: new Date('2026-09-30') },
    { quarterCode: 'T2', startDate: new Date('2026-10-01'), endDate: new Date('2027-01-31') },
    { quarterCode: 'T3', startDate: new Date('2027-02-01'), endDate: new Date('2027-04-30') },
  ];

  const plan = planChallengeProvisioning(definitions, terms, []);
  assert.equal(plan.creates.filter((c) => c.definition.code === 'WEEKLY_RECYCLING_PIONEER').length, 3);
  assert.equal(plan.creates.filter((c) => c.definition.code === 'CUSTOM_T1').length, 1);
  assert.equal(plan.creates.find((c) => c.definition.code === 'CUSTOM_T1')?.quarterCode, 'T1');
});

test('C2 provisioning refreshes stale windows and leaves current ones untouched', () => {
  const terms = [
    { quarterCode: 'T1', startDate: new Date('2026-06-01'), endDate: new Date('2026-09-30') },
  ];
  const definitions: ProvisionDefinition[] = [{ ...DEFAULT_CHALLENGE_CATALOG[0], quarterCode: 'GLOBAL' }];

  const stale = planChallengeProvisioning(definitions, terms, [
    {
      id: 'old',
      code: 'WEEKLY_RECYCLING_PIONEER',
      quarterCode: 'T1',
      startDate: new Date('2025-06-01'),
      endDate: new Date('2025-09-30'),
    },
  ]);
  assert.equal(stale.updates.length, 1);
  assert.equal(stale.updates[0].id, 'old');
  assert.equal(stale.updates[0].endDate?.toISOString().slice(0, 10), '2026-09-30');

  const fresh = planChallengeProvisioning(definitions, terms, [
    {
      id: 'new',
      code: 'WEEKLY_RECYCLING_PIONEER',
      quarterCode: 'T1',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-09-30'),
    },
  ]);
  assert.equal(fresh.updates.length, 0);
  assert.equal(fresh.unchanged, 1);
});
