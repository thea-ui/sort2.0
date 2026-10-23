import {
  Prisma,
  ChallengeType,
  ReportStatus,
  ReportType,
  RewardClaimStatus,
  Role,
  Severity,
  SyncSource,
  Urgency,
  WasteCategory,
} from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import crypto from 'node:crypto';
import { BIN_RESET_TZ, DEFAULT_RESET_TIME, computeResetCycleStart } from './reset-cycle.service.js';
import { computeWalkInPoints, gramsForBottle } from './walk-in.service.js';
import { resolveChallengeScope, challengeSchoolYearWhere } from './challenge-term.service.js';
import { ensureChallengesForSchoolYear } from './challenge-catalog.service.js';
import { isRolloverInProgress } from './rollover.service.js';

// ─── Public types ─────────────────────────────────────────────────────

export type DataSeedVolume = 'LIGHT' | 'NORMAL' | 'HEAVY';
export type DataSeedMode = 'SEED_EMPTY' | 'RESEED_YEAR';

export interface DataSeedInclude {
  walkIns: boolean;
  marketSales: boolean;
  offenses: boolean;
  assetScrap: boolean;
}

export interface DataSeedOptions {
  mode: DataSeedMode;
  volume: DataSeedVolume;
  include?: Partial<DataSeedInclude>;
  seed?: number;
  actorName?: string;
  actorRole?: string;
}

export interface DataSeedResult {
  schoolYearId: string;
  schoolYearLabel: string;
  mode: DataSeedMode;
  volume: DataSeedVolume;
  reports: number;
  collectedReports: number;
  pointsAwarded: number;
  studentsCredited: number;
  walkIns: number;
  walkInPoints: number;
  rewardClaims: number;
  sales: number;
  salesRevenue: number;
  offenses: number;
  challengeCompletions: number;
  durationMs: number;
}

export interface DataSeedCounts {
  reports: number;
  pointHistories: number;
  walkIns: number;
  offenses: number;
  sales: number;
  assetRecords: number;
}

export interface DataSeedStatus {
  schoolYear: { id: string; label: string; startDate: string; endDate: string } | null;
  students: { active: number; archived: number };
  staff: number;
  counts: DataSeedCounts;
  lastSeed: { at: string; actorName: string; details: string } | null;
  isSeeding: boolean;
}

export class DataSeedError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// ─── Planner input/output (pure) ──────────────────────────────────────

export interface SeedUserRef {
  id: string;
  name: string;
  role: Role;
  points: number;
  gradeLevel?: string | null;
  sectionName?: string | null;
}

export interface SeedBinRef {
  id: string;
  name: string;
  locationName: string;
  lat: number;
  lng: number;
}

export interface SeedPointRuleRef {
  rank: number;
  pointsAwarded: number;
}

export interface SeedSettingsRef {
  dismissPointPenalty: number;
  falseReportPointPenalty: number;
  warningAutoDeductAmount: number;
  warningThreshold: number;
  walkInPointsPer500ml: number;
  defaultVendorName: string;
}

export interface SeedMarketStockRef {
  categoryCode: string;
  categoryName: string;
  marketPricePerKg: number;
  thresholdLimitKg: number;
}

export interface SeedRewardRef {
  id: string;
  title: string;
  requiredGrams: number;
}

export interface SeedChallengeRef {
  id: string;
  title: string;
  challengeType: ChallengeType;
  pointsAwarded: number;
  target: number;
  startDate: Date | null;
  endDate: Date | null;
}

export interface SeedPlanInput {
  schoolYearId: string;
  schoolYearStart: Date;
  schoolYearEnd: Date;
  now: Date;
  resetTime: string;
  timezone: string;
  volume: DataSeedVolume;
  include: DataSeedInclude;
  seed: number;
  /** Test/override hook: force an exact report count. */
  reportTarget?: number;
  /** Test/override hook: force the number of participating students. */
  participantsTarget?: number;
  students: SeedUserRef[];
  staff: SeedUserRef[];
  bins: SeedBinRef[];
  pointRules: SeedPointRuleRef[];
  settings: SeedSettingsRef;
  marketStocks: SeedMarketStockRef[];
  rewards: SeedRewardRef[];
  challenges: SeedChallengeRef[];
  /**
   * Challenge rewards already granted (any school year), keyed
   * `${userId}::${challengeId}`. The DB enforces a unique (user_id,
   * challenge_id) index and the live award path only rewards a challenge once
   * per user ever, so repeat years must not create a second reward row.
   */
  rewardedChallengePairs?: ReadonlySet<string>;
}

export interface ReportDraft {
  id: string;
  title: string;
  description: string;
  status: ReportStatus;
  urgency: Urgency;
  category: WasteCategory;
  lat: number;
  lng: number;
  locationName: string;
  locationKey: string;
  reporterId: string;
  pointsAwarded: number;
  pointsAwardedAt: Date | null;
  imageUrl: null;
  weightCollected: number | null;
  isVerified: boolean;
  reportType: ReportType;
  assignedMrfId: string | null;
  reporterRank: number | null;
  completedAt: Date | null;
  createdAt: Date;
  schoolYearId: string;
}

export interface PointHistoryDraft {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  reportId: string | null;
  challengeId: string | null;
  walkInTurnoverId: string | null;
  schoolYearId: string;
  createdAt: Date;
}

export interface WalkInTurnoverDraft {
  id: string;
  studentId: string;
  recordedById: string | null;
  recordedByName: string;
  totalMl: number;
  totalBottles: number;
  totalGrams: number;
  pointsAwarded: number;
  ratePer500ml: number;
  notes: string | null;
  idempotencyKey: string;
  schoolYearId: string;
  createdAt: Date;
}

export interface WalkInItemDraft {
  id: string;
  turnoverId: string;
  bottleMl: number;
  quantity: number;
  grams: number;
  createdAt: Date;
}

export interface RewardClaimDraft {
  id: string;
  userId: string;
  rewardId: string;
  turnoverId: string | null;
  status: RewardClaimStatus;
  claimCode: string;
  gramsAtUnlock: number;
  unlockedAt: Date;
  requestedAt: Date | null;
  releasedAt: Date | null;
  releasedById: string | null;
  schoolYearId: string;
  notes: string | null;
}

export interface OffenseDraft {
  id: string;
  userId: string;
  description: string;
  severity: Severity;
  expiresAt: Date | null;
  schoolYearId: string;
  createdAt: Date;
}

export interface SaleDraft {
  id: string;
  categoryCode: string;
  categoryName: string;
  weightKg: number;
  marketPriceKg: number;
  totalRevenue: number;
  buyerName: string;
  schoolYearId: string;
  soldAt: Date;
}

export interface ScrapItemDraft {
  id: string;
  materialCode: string;
  materialName: string;
  weightKg: number;
  status: string;
  description: string | null;
  sourceReportId: string | null;
  weighedBy: string | null;
  weighedAt: Date | null;
  saleTransactionId: string | null;
  schoolYearId: string;
  createdAt: Date;
}

export interface ScrapSaleDraft {
  id: string;
  materialCode: string;
  materialName: string;
  weightKg: number;
  marketPriceKg: number;
  totalRevenue: number;
  buyerName: string;
  approvalReference: string;
  schoolYearId: string;
  soldAt: Date;
}

export interface AssetRecordDraft {
  id: string;
  assetName: string;
  category: string;
  action: string;
  disposition: string | null;
  quantity: number;
  unit: string;
  condition: string | null;
  sourceReportId: string | null;
  locationName: string | null;
  notes: string | null;
  performedBy: string | null;
  schoolYearId: string;
  createdAt: Date;
}

export interface SeedPlan {
  reports: ReportDraft[];
  pointHistories: PointHistoryDraft[];
  contributions: { userId: string; challengeId: string; reportId: string; value: number; createdAt: Date }[];
  progress: { userId: string; challengeId: string; currentCount: number; completedAt: Date | null; rewardedAt: Date | null }[];
  walkInTurnovers: WalkInTurnoverDraft[];
  walkInItems: WalkInItemDraft[];
  rewardClaims: RewardClaimDraft[];
  offenses: OffenseDraft[];
  sales: SaleDraft[];
  assetRecords: AssetRecordDraft[];
  marketFill: { categoryCode: string; accumulatedKg: number; isApprovedForSale: boolean }[];
  scrapStocks: { materialCode: string; accumulatedKg: number; isApprovedForSale: boolean }[];
  scrapItems: ScrapItemDraft[];
  scrapSales: ScrapSaleDraft[];
  binFill: { id: string; fillLevel: number; activeDispatch: boolean }[];
  userUpdates: { userId: string; points: number; warningsDelta: number }[];
  stats: {
    reports: number;
    collectedReports: number;
    pointsAwarded: number;
    studentsCredited: number;
    walkIns: number;
    walkInPoints: number;
    rewardClaims: number;
    sales: number;
    salesRevenue: number;
    assetRecords: number;
    offenses: number;
    challengeCompletions: number;
  };
}

// ─── Deterministic RNG ────────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, list: T[]): T {
  return list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
}

function between(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function shuffled<T>(list: readonly T[], rng: () => number): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ─── Content pools ────────────────────────────────────────────────────

// Every active student participates in report generation; volume only controls
// the total report count and how many students also do MRF walk-ins.
const VOLUME_CONFIG: Record<DataSeedVolume, { reports: number; walkInRatio: number; sales: number; offenses: number; scrapItems: number }> = {
  LIGHT: { reports: 120, walkInRatio: 0.35, sales: 2, offenses: 2, scrapItems: 6 },
  NORMAL: { reports: 350, walkInRatio: 0.6, sales: 4, offenses: 4, scrapItems: 12 },
  HEAVY: { reports: 700, walkInRatio: 0.85, sales: 6, offenses: 6, scrapItems: 20 },
};

const CATEGORY_POOL: WasteCategory[] = [
  WasteCategory.RECYCLABLE,
  WasteCategory.RECYCLABLE,
  WasteCategory.RECYCLABLE,
  WasteCategory.BIODEGRADABLE,
  WasteCategory.BIODEGRADABLE,
  WasteCategory.NON_BIODEGRADABLE,
  WasteCategory.NON_BIODEGRADABLE,
];

const WASTE_TITLES: Record<WasteCategory, string[]> = {
  [WasteCategory.RECYCLABLE]: [
    'Overflowing recyclables bin',
    'Scattered PET bottles',
    'Cardboard pile blocking walkway',
    'Mixed cans and bottles dumped',
  ],
  [WasteCategory.BIODEGRADABLE]: [
    'Food waste spill',
    'Overflowing compost bin',
    'Garden waste pile near pathway',
  ],
  [WasteCategory.NON_BIODEGRADABLE]: [
    'Unsegregated trash bags',
    'Wrappers and sachets scattered',
    'Overflowing residual waste bin',
  ],
};

const WASTE_NOTES = [
  'Needs immediate collection before it spreads.',
  'Bin is already full and waste is spilling out.',
  'Observed during morning break; strong odor.',
  'Blocking the corridor for other students.',
  'Repeatedly overflowing for the past few days.',
];

const ASSET_TEMPLATES = [
  { pillar: 'FURNITURE', name: 'Broken armchair', category: WasteCategory.NON_BIODEGRADABLE },
  { pillar: 'FURNITURE', name: 'Damaged student desk', category: WasteCategory.NON_BIODEGRADABLE },
  { pillar: 'ELECTRONICS', name: 'Faulty LCD projector', category: WasteCategory.NON_BIODEGRADABLE },
  { pillar: 'ELECTRONICS', name: 'Non-working desktop computer', category: WasteCategory.NON_BIODEGRADABLE },
  { pillar: 'FIXTURES', name: 'Damaged ceiling fan', category: WasteCategory.NON_BIODEGRADABLE },
  { pillar: 'FIXTURES', name: 'Leaking faucet assembly', category: WasteCategory.NON_BIODEGRADABLE },
  { pillar: 'EQUIPMENT', name: 'Defective science microscope', category: WasteCategory.NON_BIODEGRADABLE },
  { pillar: 'OTHER', name: 'Damaged trash bin', category: WasteCategory.NON_BIODEGRADABLE },
];

const BUYERS = ['EcoTrade Philippines', 'Metro Junk Shop', 'San Roque Scrap Dealer'];

const OFFENSE_NOTES = [
  'Littering in a restricted area',
  'Repeated non-segregation of waste',
  'Improper disposal of food waste',
  'Failure to follow campus waste guidelines',
];

// MRF asset ledger dispositions, mirroring src/utils/assetDispositions.ts so
// generated ledger rows match the exact labels the UI understands.
const ASSET_LEDGER_DISPOSITIONS = [
  { action: 'RECOVERED', disposition: 'Recovered — awaiting assessment', condition: 'NEEDS_REPAIR' },
  { action: 'REPAIRED', disposition: 'Repaired On-Site (returned to service)', condition: 'GOOD' },
  { action: 'REPAIRED', disposition: 'Repaired at MRF Workshop', condition: 'GOOD' },
  { action: 'REPAIRED', disposition: 'Repurposed / Upcycled', condition: 'FAIR' },
  { action: 'REPAIRED', disposition: 'Reassigned / Redeployed', condition: 'GOOD' },
  { action: 'RECOVERED', disposition: 'Stored for Future Repair', condition: 'NEEDS_REPAIR' },
  { action: 'DISPOSED', disposition: 'Cannibalized for Spare Parts', condition: 'DISPOSED' },
  { action: 'DISPOSED', disposition: 'Declared Unserviceable → Scrap', condition: 'DISPOSED' },
  { action: 'DISPOSED', disposition: 'e-Waste → Accredited Handler', condition: 'DISPOSED' },
];

const PILLAR_CATEGORY: Record<string, string> = {
  FURNITURE: 'Furniture',
  ELECTRONICS: 'Electronics',
  FIXTURES: 'Fixtures',
  EQUIPMENT: 'Equipment',
  OTHER: 'Other',
};

const DEFAULT_SCRAP_STOCKS = [
  { materialCode: 'ferrous_metal', materialName: 'Ferrous Metal (Steel / Iron)', thresholdLimitKg: 50, marketPricePerKg: 12 },
  { materialCode: 'non_ferrous_metal', materialName: 'Non-Ferrous Metal (Aluminum / Copper)', thresholdLimitKg: 20, marketPricePerKg: 55 },
  { materialCode: 'e_waste', materialName: 'E-Waste (Electronics)', thresholdLimitKg: 20, marketPricePerKg: 20 },
  { materialCode: 'plastic', materialName: 'Hard Plastic', thresholdLimitKg: 40, marketPricePerKg: 8 },
  { materialCode: 'wood', materialName: 'Wood / Lumber', thresholdLimitKg: 60, marketPricePerKg: 3 },
  { materialCode: 'glass', materialName: 'Glass', thresholdLimitKg: 40, marketPricePerKg: 5 },
  { materialCode: 'mixed', materialName: 'Mixed / Other Scrap', thresholdLimitKg: 50, marketPricePerKg: 5 },
];

export const WALK_IN_BOTTLE_SIZES = [250, 330, 500, 600, 1000, 1500];

// ─── Rank / points assignment ─────────────────────────────────────────

interface AwardableReport {
  id: string;
  reporterId: string;
  createdAt: Date;
  status: ReportStatus;
  isVerified: boolean;
  pointsAwardedAt: Date | null;
  reporterRank: number | null;
  pointsAwarded: number;
  locationKey: string;
  category: string;
}

/**
 * Assign reporter ranks and points the exact way the live award path does:
 * per bin stream per daily reset cycle, in submission order, restarting at 1
 * each cycle. Faculty never earn points or consume a student slot.
 */
export function assignReportAwards<T extends AwardableReport>(
  reports: T[],
  options: {
    facultyIds: ReadonlySet<string>;
    rankPointsMap: number[];
    resetTime: string;
    timezone: string;
  }
): void {
  const buckets = new Map<string, T[]>();

  for (const report of reports) {
    if (report.status !== ReportStatus.COLLECTED && report.status !== ReportStatus.RESOLVED) continue;
    report.isVerified = true;
    const cycle = computeResetCycleStart(report.createdAt, options.resetTime, options.timezone).getTime();
    const key = `${report.locationKey}::${report.category}::${cycle}`;
    const list = buckets.get(key) ?? [];
    list.push(report);
    buckets.set(key, list);
  }

  for (const list of buckets.values()) {
    list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
    let studentRank = 0;

    for (const report of list) {
      report.pointsAwardedAt = new Date(report.createdAt.getTime() + 45 * 60 * 1000);

      if (options.facultyIds.has(report.reporterId)) {
        report.reporterRank = null;
        report.pointsAwarded = 0;
        continue;
      }

      studentRank++;
      report.reporterRank = studentRank;
      report.pointsAwarded =
        studentRank <= options.rankPointsMap.length ? options.rankPointsMap[studentRank - 1] : 0;
    }
  }
}

// ─── Planner ──────────────────────────────────────────────────────────

export function planDataSeed(input: SeedPlanInput): SeedPlan {
  const rng = mulberry32(input.seed);
  const config = VOLUME_CONFIG[input.volume];
  const reportCount = Math.max(1, input.reportTarget ?? config.reports);
  const include = input.include;

  const rangeStart = input.schoolYearStart.getTime();
  let rangeEnd = Math.min(input.schoolYearEnd.getTime(), input.now.getTime());
  if (rangeEnd <= rangeStart) rangeEnd = rangeStart + 12 * 60 * 60 * 1000;

  const students = input.students;
  const staffReporters = input.staff;
  const facultyIds = new Set(staffReporters.map((s) => s.id));
  const mrfUsers = staffReporters.filter((s) => s.role === Role.MRF || s.role === Role.ADMIN);

  // Shuffle once so report assignment is spread evenly across every active
  // student (round-robin below), instead of random-with-replacement clumps.
  const shuffledStudents = shuffled(students, rng);
  const participants = input.participantsTarget
    ? shuffledStudents.slice(0, Math.min(students.length, Math.max(1, input.participantsTarget)))
    : shuffledStudents;

  // Location pool from real bins; jitter coordinates slightly so the map is not
  // a single dot per bin while keeping the same location stream (same locationKey).
  const locations = input.bins.length > 0
    ? input.bins.map((bin) => ({
        name: bin.locationName || bin.name,
        lat: bin.lat,
        lng: bin.lng,
        key: normalizeLocation(bin.locationName || bin.name),
      }))
    : [{ name: 'Campus Main', lat: 14.5995, lng: 120.9842, key: 'campus main' }];

  const assetShares = staffReporters.length > 0 ? 0.25 : 0;
  const assetCount = Math.round(reportCount * assetShares);
  const wasteCount = reportCount - assetCount;

  const reports: ReportDraft[] = [];

  for (let i = 0; i < wasteCount; i++) {
    // Round-robin guarantees every active student files at least one report
    // when the requested volume is at least the student count.
    const reporter = participants[i % participants.length];
    const location = pick(rng, locations);
    const category = pick(rng, CATEGORY_POOL);
    const createdAt = new Date(rangeStart + rng() * (rangeEnd - rangeStart));
    const title = pick(rng, WASTE_TITLES[category]);
    const locationName = location.name;
    reports.push({
      id: crypto.randomUUID(),
      title: `${title} at ${locationName}`,
      description: `${pick(rng, WASTE_NOTES)} (${category.toLowerCase().replace(/_/g, ' ')})`,
      status: ReportStatus.PENDING,
      urgency: pick(rng, [Urgency.HIGH, Urgency.MEDIUM, Urgency.MEDIUM, Urgency.LOW]),
      category,
      lat: round6(location.lat + (rng() - 0.5) * 0.0006),
      lng: round6(location.lng + (rng() - 0.5) * 0.0006),
      locationName,
      locationKey: location.key,
      reporterId: reporter.id,
      pointsAwarded: 0,
      pointsAwardedAt: null,
      imageUrl: null,
      weightCollected: null,
      isVerified: false,
      reportType: ReportType.WASTE,
      assignedMrfId: null,
      reporterRank: null,
      completedAt: null,
      createdAt,
      schoolYearId: input.schoolYearId,
    });
  }

  for (let i = 0; i < assetCount; i++) {
    const reporter = pick(rng, staffReporters);
    const location = pick(rng, locations);
    const template = pick(rng, ASSET_TEMPLATES);
    const createdAt = new Date(rangeStart + rng() * (rangeEnd - rangeStart));
    reports.push({
      id: crypto.randomUUID(),
      title: `${template.name} at ${location.name}`,
      description: `${template.name} needs assessment. [PILLAR: ${template.pillar}]`,
      status: ReportStatus.PENDING,
      urgency: pick(rng, [Urgency.HIGH, Urgency.MEDIUM, Urgency.LOW]),
      category: template.category,
      lat: round6(location.lat + (rng() - 0.5) * 0.0006),
      lng: round6(location.lng + (rng() - 0.5) * 0.0006),
      locationName: location.name,
      locationKey: location.key,
      reporterId: reporter.id,
      pointsAwarded: 0,
      pointsAwardedAt: null,
      imageUrl: null,
      weightCollected: null,
      isVerified: false,
      reportType: ReportType.ASSET,
      assignedMrfId: null,
      reporterRank: null,
      completedAt: null,
      createdAt,
      schoolYearId: input.schoolYearId,
    });
  }

  assignStatuses(reports, {
    rng,
    now: input.now,
    cycleStart: computeResetCycleStart(input.now, input.resetTime, input.timezone),
    mrfUsers,
  });

  assignReportAwards(reports, {
    facultyIds,
    rankPointsMap: input.pointRules.map((r) => r.pointsAwarded),
    resetTime: input.resetTime,
    timezone: input.timezone,
  });

  const pointHistories: PointHistoryDraft[] = [];
  const earnedByUser = new Map<string, number>();
  const addEarned = (userId: string, amount: number) => {
    earnedByUser.set(userId, (earnedByUser.get(userId) ?? 0) + amount);
  };

  for (const report of reports) {
    if (report.pointsAwarded <= 0 || report.reporterRank === null) continue;
    const ordinal =
      report.reporterRank === 1 ? '1st' : report.reporterRank === 2 ? '2nd' : report.reporterRank === 3 ? '3rd' : `${report.reporterRank}th`;
    pointHistories.push({
      id: crypto.randomUUID(),
      userId: report.reporterId,
      amount: report.pointsAwarded,
      reason: `Collected Report: ${ordinal} Reporter Bonus (+${report.pointsAwarded} pts) for ${report.locationName}`,
      reportId: report.id,
      challengeId: null,
      walkInTurnoverId: null,
      schoolYearId: input.schoolYearId,
      createdAt: report.pointsAwardedAt!,
    });
    addEarned(report.reporterId, report.pointsAwarded);
  }

  const collectedReports = reports.filter(
    (r) => r.status === ReportStatus.COLLECTED || r.status === ReportStatus.RESOLVED
  );

  // ── Challenges ─────────────────────────────────────────────────────
  const contributions: SeedPlan['contributions'] = [];
  const progress: SeedPlan['progress'] = [];
  let challengeCompletions = 0;

  for (const challenge of input.challenges) {
    const windowStart = challenge.startDate ? challenge.startDate.getTime() : -Infinity;
    const windowEnd = challenge.endDate ? challenge.endDate.getTime() : Infinity;

    const eligibleByUser = new Map<string, ReportDraft[]>();
    for (const report of collectedReports) {
      if (report.reportType !== ReportType.WASTE) continue;
      if (report.createdAt.getTime() < windowStart || report.createdAt.getTime() > windowEnd) continue;
      const list = eligibleByUser.get(report.reporterId) ?? [];
      list.push(report);
      eligibleByUser.set(report.reporterId, list);
    }

    for (const [userId, list] of eligibleByUser) {
      list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      let count = 0;
      let grams = 0;
      let crossedAt: Date | null = null;

      for (const report of list) {
        const value = challenge.challengeType === ChallengeType.WEIGHT_COLLECTED ? report.weightCollected ?? 0 : 1;
        contributions.push({
          userId,
          challengeId: challenge.id,
          reportId: report.id,
          value,
          createdAt: report.createdAt,
        });
        if (challenge.challengeType === ChallengeType.WEIGHT_COLLECTED) {
          grams += Math.round(value * 1000);
        } else {
          count += 1;
        }
        const total = challenge.challengeType === ChallengeType.WEIGHT_COLLECTED ? grams : count;
        if (!crossedAt && total >= challenge.target) crossedAt = report.createdAt;
      }

      const currentCount = challenge.challengeType === ChallengeType.WEIGHT_COLLECTED ? grams : count;
      if (currentCount <= 0) continue;

      const completedAt = crossedAt;
      // Live rule: a challenge is rewarded at most once per user ever (unique
      // user_id + challenge_id index). Later years still record progress and a
      // completion timestamp but no second reward row.
      const alreadyRewarded =
        completedAt !== null && input.rewardedChallengePairs?.has(`${userId}::${challenge.id}`) === true;
      const rewardedAt =
        completedAt && !alreadyRewarded ? new Date(completedAt.getTime() + 60 * 60 * 1000) : null;

      progress.push({ userId, challengeId: challenge.id, currentCount, completedAt, rewardedAt });

      if (rewardedAt && challenge.pointsAwarded > 0) {
        challengeCompletions++;
        pointHistories.push({
          id: crypto.randomUUID(),
          userId,
          amount: challenge.pointsAwarded,
          reason: `Challenge Completed: ${challenge.title} (+${challenge.pointsAwarded} pts)`,
          reportId: null,
          challengeId: challenge.id,
          walkInTurnoverId: null,
          schoolYearId: input.schoolYearId,
          createdAt: rewardedAt,
        });
        addEarned(userId, challenge.pointsAwarded);
      }
    }
  }

  // ── Walk-ins ───────────────────────────────────────────────────────
  const walkInTurnovers: WalkInTurnoverDraft[] = [];
  const walkInItems: WalkInItemDraft[] = [];
  const rewardClaims: RewardClaimDraft[] = [];
  let walkInPoints = 0;

  if (include.walkIns) {
    const walkInCount = Math.max(1, Math.round(participants.length * config.walkInRatio));
    const walkInStudents = shuffled(participants, rng).slice(0, walkInCount);
    const rate = Math.max(1, input.settings.walkInPointsPer500ml);

    for (const student of walkInStudents) {
      const visits = 1 + Math.floor(rng() * 3);
      let cumulativeGrams = 0;
      const claimsForStudent = new Set<string>();

      for (let v = 0; v < visits; v++) {
        const lines = 1 + Math.floor(rng() * 2);
        const turnoverId = crypto.randomUUID();
        const createdAt = new Date(rangeStart + rng() * (rangeEnd - rangeStart));
        let totalMl = 0;
        let totalBottles = 0;
        let totalGrams = 0;

        for (let l = 0; l < lines; l++) {
          const bottleMl = pick(rng, WALK_IN_BOTTLE_SIZES);
          const quantity = 1 + Math.floor(rng() * 15);
          const grams = gramsForBottle(bottleMl);
          walkInItems.push({
            id: crypto.randomUUID(),
            turnoverId,
            bottleMl,
            quantity,
            grams,
            createdAt,
          });
          totalMl += bottleMl * quantity;
          totalBottles += quantity;
          totalGrams += grams * quantity;
        }

        const points = computeWalkInPoints(totalMl, rate);
        const recorder = mrfUsers.length > 0 ? pick(rng, mrfUsers) : null;

        walkInTurnovers.push({
          id: turnoverId,
          studentId: student.id,
          recordedById: recorder?.id ?? null,
          recordedByName: recorder?.name ?? 'MRF Station',
          totalMl,
          totalBottles,
          totalGrams,
          pointsAwarded: points,
          ratePer500ml: rate,
          notes: null,
          idempotencyKey: crypto.randomUUID(),
          schoolYearId: input.schoolYearId,
          createdAt,
        });

        pointHistories.push({
          id: crypto.randomUUID(),
          userId: student.id,
          amount: points,
          reason: `Walk-in Bottle Turnover: ${totalBottles} bottle(s), ${formatLitres(totalMl)}L (+${points} pts) at MRF`,
          reportId: null,
          challengeId: null,
          walkInTurnoverId: turnoverId,
          schoolYearId: input.schoolYearId,
          createdAt,
        });
        walkInPoints += points;
        addEarned(student.id, points);

        cumulativeGrams += totalGrams;
        for (const reward of input.rewards) {
          if (claimsForStudent.has(reward.id) || cumulativeGrams < reward.requiredGrams) continue;
          claimsForStudent.add(reward.id);
          const roll = rng();
          const status =
            roll > 0.75 ? RewardClaimStatus.RELEASED : roll > 0.45 ? RewardClaimStatus.REQUESTED : RewardClaimStatus.UNLOCKED;
          const unlockedAt = createdAt;
          const requestedAt =
            status === RewardClaimStatus.UNLOCKED ? null : new Date(unlockedAt.getTime() + 24 * 60 * 60 * 1000);
          const releasedAt =
            status === RewardClaimStatus.RELEASED ? new Date(unlockedAt.getTime() + 3 * 24 * 60 * 60 * 1000) : null;
          rewardClaims.push({
            id: crypto.randomUUID(),
            userId: student.id,
            rewardId: reward.id,
            turnoverId,
            status,
            claimCode: claimCode(),
            gramsAtUnlock: cumulativeGrams,
            unlockedAt,
            requestedAt,
            releasedAt,
            releasedById: status === RewardClaimStatus.RELEASED && mrfUsers.length > 0 ? pick(rng, mrfUsers).id : null,
            schoolYearId: input.schoolYearId,
            notes: null,
          });
        }
      }
    }
  }

  // ── Offenses & penalties ───────────────────────────────────────────
  const offenses: OffenseDraft[] = [];
  const penaltiesByUser = new Map<string, number>();

  if (include.offenses && students.length > 0) {
    const offenseCount = Math.min(config.offenses, students.length);
    const picked = new Set<string>();
    for (let i = 0; i < offenseCount; i++) {
      const student = pick(rng, participants);
      if (picked.has(student.id)) continue;
      picked.add(student.id);
      const severity = rng() > 0.5 ? Severity.WARNING : Severity.DEDUCT;
      const createdAt = new Date(rangeStart + rng() * (rangeEnd - rangeStart));
      const description = pick(rng, OFFENSE_NOTES);

      offenses.push({
        id: crypto.randomUUID(),
        userId: student.id,
        description,
        severity,
        expiresAt: new Date(createdAt.getTime() + 90 * 24 * 60 * 60 * 1000),
        schoolYearId: input.schoolYearId,
        createdAt,
      });

      if (severity === Severity.DEDUCT) {
        const amount = input.settings.warningAutoDeductAmount;
        const earned = earnedByUser.get(student.id) ?? 0;
        const applied = Math.min(amount, Math.max(0, earned - (penaltiesByUser.get(student.id) ?? 0)));
        if (applied > 0) {
          penaltiesByUser.set(student.id, (penaltiesByUser.get(student.id) ?? 0) + applied);
          pointHistories.push({
            id: crypto.randomUUID(),
            userId: student.id,
            amount: -applied,
            reason: `Offense penalty: ${description}`,
            reportId: null,
            challengeId: null,
            walkInTurnoverId: null,
            schoolYearId: input.schoolYearId,
            createdAt,
          });
        }
      }
    }
  }

  // Dismissed reports deduct the configured dismiss penalty (truthful history,
  // same shape as a DEDUCT offense).
  for (const report of reports) {
    if (report.status !== ReportStatus.DISMISSED) continue;
    const earned = earnedByUser.get(report.reporterId) ?? 0;
    const applied = Math.min(
      input.settings.dismissPointPenalty,
      Math.max(0, earned - (penaltiesByUser.get(report.reporterId) ?? 0))
    );
    if (applied > 0) {
      penaltiesByUser.set(report.reporterId, (penaltiesByUser.get(report.reporterId) ?? 0) + applied);
      pointHistories.push({
        id: crypto.randomUUID(),
        userId: report.reporterId,
        amount: -applied,
        reason: `Dismissed report penalty: ${report.title}`,
        reportId: null,
        challengeId: null,
        walkInTurnoverId: null,
        schoolYearId: input.schoolYearId,
        createdAt: new Date(report.createdAt.getTime() + 24 * 60 * 60 * 1000),
      });
    }
  }

  // ── Market sales & ending stock ────────────────────────────────────
  const sales: SaleDraft[] = [];
  const marketFill: SeedPlan['marketFill'] = [];

  if (include.marketSales && input.marketStocks.length > 0) {
    for (const stock of input.marketStocks) {
      const roll = rng();
      const accumulated =
        roll < 0.2 ? 0 : round1(stock.thresholdLimitKg * between(rng, 0.15, 0.95));
      marketFill.push({
        categoryCode: stock.categoryCode,
        accumulatedKg: accumulated,
        isApprovedForSale: false,
      });
    }

    for (let i = 0; i < config.sales; i++) {
      const stock = pick(rng, input.marketStocks);
      const weightKg = round1(Math.max(5, stock.thresholdLimitKg * between(rng, 0.35, 1)));
      const soldAt = new Date(rangeStart + rng() * (rangeEnd - rangeStart));
      sales.push({
        id: crypto.randomUUID(),
        categoryCode: stock.categoryCode,
        categoryName: stock.categoryName,
        weightKg,
        marketPriceKg: stock.marketPricePerKg,
        totalRevenue: Math.round(weightKg * stock.marketPricePerKg),
        buyerName: rng() > 0.4 ? input.settings.defaultVendorName : pick(rng, BUYERS),
        schoolYearId: input.schoolYearId,
        soldAt,
      });
    }

    // One category may be approved for the next sale while stock sits over threshold.
    const overThreshold = marketFill.find(
      (m) => (input.marketStocks.find((s) => s.categoryCode === m.categoryCode)?.thresholdLimitKg ?? 0) <= m.accumulatedKg
    );
    if (overThreshold) overThreshold.isApprovedForSale = true;
  }

  // ── Asset ledger (MRF recovered/repaired/disposed records) ─────────
  // Every completed asset report gets an MRF disposition record so the asset
  // ledger and its summary tiles are populated.
  const assetRecords: AssetRecordDraft[] = [];
  const completedAssetReports = reports.filter(
    (r) =>
      r.reportType === ReportType.ASSET &&
      (r.status === ReportStatus.COLLECTED || r.status === ReportStatus.RESOLVED)
  );

  for (const report of completedAssetReports) {
    const outcome = pick(rng, ASSET_LEDGER_DISPOSITIONS);
    const pillarMatch = /\[PILLAR: ([A-Z_]+)\]/.exec(report.description);
    const assetName = report.title.replace(/\s+at\s+.+$/i, '').trim() || 'Unserviceable asset';
    const base = report.completedAt ?? report.createdAt;
    assetRecords.push({
      id: crypto.randomUUID(),
      assetName,
      category: PILLAR_CATEGORY[pillarMatch?.[1] ?? ''] ?? 'Other',
      action: outcome.action,
      disposition: outcome.disposition,
      quantity: 1,
      unit: 'pcs',
      condition: outcome.condition,
      sourceReportId: report.id,
      locationName: report.locationName,
      notes: null,
      performedBy: mrfUsers.length > 0 ? pick(rng, mrfUsers).name : 'MRF',
      schoolYearId: input.schoolYearId,
      createdAt: clamp(new Date(base.getTime() + rng() * 48 * 60 * 60 * 1000), input.now),
    });
  }

  // ── Asset scrap ────────────────────────────────────────────────────
  const scrapItems: ScrapItemDraft[] = [];
  const scrapSales: ScrapSaleDraft[] = [];
  const scrapStocks: SeedPlan['scrapStocks'] = [];

  if (include.assetScrap) {
    const assetReports = reports.filter((r) => r.reportType === ReportType.ASSET);
    const scrapSourceCount = Math.min(config.scrapItems, assetReports.length);

    for (let i = 0; i < scrapSourceCount; i++) {
      const report = assetReports[i];
      const material = DEFAULT_SCRAP_STOCKS[i % DEFAULT_SCRAP_STOCKS.length];
      const weightKg = round1(between(rng, 2, 35));
      scrapItems.push({
        id: crypto.randomUUID(),
        materialCode: material.materialCode,
        materialName: material.materialName,
        weightKg,
        status: 'IN_STOCK',
        description: report.title,
        sourceReportId: report.id,
        weighedBy: mrfUsers.length > 0 ? mrfUsers[0].name : 'MRF',
        weighedAt: report.completedAt ?? report.createdAt,
        saleTransactionId: null,
        schoolYearId: input.schoolYearId,
        createdAt: report.completedAt ?? report.createdAt,
      });
    }

    const byMaterial = new Map<string, ScrapItemDraft[]>();
    for (const item of scrapItems) {
      const list = byMaterial.get(item.materialCode) ?? [];
      list.push(item);
      byMaterial.set(item.materialCode, list);
    }

    let saleSequence = 0;
    for (const material of DEFAULT_SCRAP_STOCKS) {
      const items = byMaterial.get(material.materialCode) ?? [];
      let accumulated = round1(items.reduce((sum, item) => sum + (item.weightKg ?? 0), 0));

      if (items.length > 0 && accumulated >= material.thresholdLimitKg && rng() > 0.35) {
        const saleId = crypto.randomUUID();
        const sellable: ScrapItemDraft[] = [];
        let soldKg = 0;
        for (const item of items) {
          if (soldKg + (item.weightKg ?? 0) > material.thresholdLimitKg) break;
          sellable.push(item);
          soldKg += item.weightKg ?? 0;
        }
        if (soldKg > 0) {
          for (const item of sellable) item.saleTransactionId = saleId;
          saleSequence++;
          const soldAt = new Date(rangeStart + rng() * (rangeEnd - rangeStart));
          scrapSales.push({
            id: saleId,
            materialCode: material.materialCode,
            materialName: material.materialName,
            weightKg: round1(soldKg),
            marketPriceKg: material.marketPricePerKg,
            totalRevenue: Math.round(soldKg * material.marketPricePerKg),
            buyerName: input.settings.defaultVendorName,
            approvalReference: `SCRAP-${new Date().getUTCFullYear()}-${String(saleSequence).padStart(4, '0')}`,
            schoolYearId: input.schoolYearId,
            soldAt,
          });
          accumulated = round1(accumulated - soldKg);
        }
      }

      scrapStocks.push({
        materialCode: material.materialCode,
        accumulatedKg: Math.max(0, accumulated),
        isApprovedForSale: false,
      });
    }
  }

  // ── Bins ───────────────────────────────────────────────────────────
  const dispatchedLocationKeys = new Set(
    reports
      .filter((r) => r.status === ReportStatus.DISPATCHED)
      .map((r) => r.locationKey)
  );
  const binFill = input.bins.map((bin) => ({
    id: bin.id,
    fillLevel: 5 + Math.floor(rng() * 90),
    activeDispatch: dispatchedLocationKeys.has(normalizeLocation(bin.locationName || bin.name)),
  }));

  // ── User balances ──────────────────────────────────────────────────
  const userUpdates: SeedPlan['userUpdates'] = [];
  const allUserIds = new Set<string>([...earnedByUser.keys(), ...penaltiesByUser.keys()]);

  for (const userId of allUserIds) {
    const earned = earnedByUser.get(userId) ?? 0;
    const penalties = penaltiesByUser.get(userId) ?? 0;
    const warningsDelta = offenses.filter((o) => o.userId === userId).length;
    if (earned === 0 && penalties === 0 && warningsDelta === 0) continue;
    userUpdates.push({ userId, points: earned - penalties, warningsDelta });
  }

  const studentsCredited = [...earnedByUser.entries()].filter(([, v]) => v > 0).length;

  return {
    reports,
    pointHistories,
    contributions,
    progress,
    walkInTurnovers,
    walkInItems,
    rewardClaims,
    offenses,
    sales,
    assetRecords,
    marketFill,
    scrapStocks,
    scrapItems,
    scrapSales,
    binFill,
    userUpdates,
    stats: {
      reports: reports.length,
      collectedReports: collectedReports.length,
      pointsAwarded: [...earnedByUser.values()].reduce((a, b) => a + b, 0),
      studentsCredited,
      walkIns: walkInTurnovers.length,
      walkInPoints,
      rewardClaims: rewardClaims.length,
      sales: sales.length,
      salesRevenue: sales.reduce((sum, sale) => sum + sale.totalRevenue, 0),
      assetRecords: assetRecords.length,
      offenses: offenses.length,
      challengeCompletions,
    },
  };
}

// ─── Status assignment ────────────────────────────────────────────────

function assignStatuses(
  reports: ReportDraft[],
  context: {
    rng: () => number;
    now: Date;
    cycleStart: Date;
    mrfUsers: SeedUserRef[];
  }
): void {
  const { rng, now, cycleStart, mrfUsers } = context;

  for (const report of reports) {
    const isRecent = report.createdAt.getTime() >= cycleStart.getTime();
    const isWithinDispatchWindow = now.getTime() - report.createdAt.getTime() <= 21 * 24 * 60 * 60 * 1000;
    const roll = rng();

    if (isRecent) {
      if (roll < 0.25) {
        report.status = ReportStatus.PENDING;
        report.isVerified = rng() < 0.5;
        continue;
      }
      if (roll < 0.5 && mrfUsers.length > 0) {
        report.status = ReportStatus.DISPATCHED;
        report.isVerified = true;
        report.assignedMrfId = pick(rng, mrfUsers).id;
        continue;
      }
      if (roll < 0.85) {
        report.status = ReportStatus.COLLECTED;
        report.weightCollected = report.reportType === ReportType.WASTE ? round1(between(rng, 0.5, 8)) : null;
        report.completedAt = clamp(new Date(report.createdAt.getTime() + rng() * 6 * 60 * 60 * 1000), now);
        continue;
      }
      report.status = ReportStatus.RESOLVED;
      report.weightCollected = report.reportType === ReportType.WASTE ? round1(between(rng, 0.5, 6)) : null;
      report.completedAt = clamp(new Date(report.createdAt.getTime() + rng() * 6 * 60 * 60 * 1000), now);
      continue;
    }

    if (report.reportType === ReportType.WASTE) {
      if (roll < 0.55) {
        report.status = ReportStatus.COLLECTED;
        report.weightCollected = round1(between(rng, 0.5, 9));
        report.completedAt = clamp(new Date(report.createdAt.getTime() + rng() * 12 * 60 * 60 * 1000), now);
        continue;
      }
      if (roll < 0.68) {
        report.status = ReportStatus.EXPIRED;
        report.isVerified = rng() < 0.4;
        report.completedAt = cycleStart;
        continue;
      }
      if (roll < 0.8) {
        report.status = ReportStatus.DISMISSED;
        report.isVerified = rng() < 0.5;
        report.completedAt = clamp(new Date(report.createdAt.getTime() + 2 * 24 * 60 * 60 * 1000), now);
        continue;
      }
      if (roll < 0.92 && mrfUsers.length > 0 && isWithinDispatchWindow) {
        report.status = ReportStatus.DISPATCHED;
        report.isVerified = true;
        report.assignedMrfId = pick(rng, mrfUsers).id;
        continue;
      }
      report.status = ReportStatus.COLLECTED;
      report.weightCollected = round1(between(rng, 0.5, 9));
      report.completedAt = clamp(new Date(report.createdAt.getTime() + rng() * 12 * 60 * 60 * 1000), now);
      continue;
    }

    // Asset reports: no expiry; mostly completed, some dismissed or in queue.
    if (roll < 0.6) {
      report.status = ReportStatus.COLLECTED;
      report.weightCollected = null;
      report.completedAt = clamp(new Date(report.createdAt.getTime() + rng() * 3 * 24 * 60 * 60 * 1000), now);
      continue;
    }
    if (roll < 0.75) {
      report.status = ReportStatus.RESOLVED;
      report.completedAt = clamp(new Date(report.createdAt.getTime() + rng() * 3 * 24 * 60 * 60 * 1000), now);
      continue;
    }
    if (roll < 0.88 && mrfUsers.length > 0 && isWithinDispatchWindow) {
      report.status = ReportStatus.DISPATCHED;
      report.isVerified = true;
      report.assignedMrfId = pick(rng, mrfUsers).id;
      continue;
    }
    report.status = ReportStatus.DISMISSED;
    report.completedAt = clamp(new Date(report.createdAt.getTime() + 2 * 24 * 60 * 60 * 1000), now);
  }
}

// ─── Persistence ──────────────────────────────────────────────────────

const BATCH = 500;
const CREATE_CHUNK_SIZE = 1000;

/** Insert large arrays in bounded chunks (Postgres bind-parameter limits). */
async function insertInChunks<T>(
  rows: T[],
  insert: (chunk: T[]) => Promise<unknown>,
  chunkSize = CREATE_CHUNK_SIZE
): Promise<void> {
  for (let i = 0; i < rows.length; i += chunkSize) {
    await insert(rows.slice(i, i + chunkSize));
  }
}

async function persistPlan(tx: Prisma.TransactionClient, plan: SeedPlan): Promise<void> {
  // Insert order must respect foreign keys:
  // reports → walk-in turnovers/items → point histories (they reference both
  // reportId and walkInTurnoverId) → challenge rows → reward claims → offenses.
  console.log(
    `[DataSeed] Persisting: ${plan.reports.length} reports, ${plan.walkInTurnovers.length} walk-in turnovers, ` +
      `${plan.pointHistories.length} point rows, ${plan.progress.length} challenge progress rows`
  );

  await insertInChunks(plan.reports, (chunk) => tx.report.createMany({ data: chunk }));
  await insertInChunks(plan.walkInTurnovers, (chunk) => tx.walkInTurnover.createMany({ data: chunk }));
  await insertInChunks(plan.walkInItems, (chunk) => tx.walkInTurnoverItem.createMany({ data: chunk }));
  await insertInChunks(plan.pointHistories, (chunk) => tx.pointHistory.createMany({ data: chunk }));

  for (let i = 0; i < plan.contributions.length; i += BATCH) {
    await tx.challengeContribution.createMany({ data: plan.contributions.slice(i, i + BATCH), skipDuplicates: true });
  }
  // Challenge progress upserts in small parallel chunks: per-row upserts, but
  // batched round-trips instead of one await per student.
  for (let i = 0; i < plan.progress.length; i += 25) {
    const chunk = plan.progress.slice(i, i + 25);
    await Promise.all(
      chunk.map((entry) =>
        tx.userChallengeProgress.upsert({
          where: { userId_challengeId: { userId: entry.userId, challengeId: entry.challengeId } },
          create: {
            userId: entry.userId,
            challengeId: entry.challengeId,
            currentCount: entry.currentCount,
            completedAt: entry.completedAt,
            rewardedAt: entry.rewardedAt,
          },
          update: {
            currentCount: entry.currentCount,
            completedAt: entry.completedAt,
            rewardedAt: entry.rewardedAt,
          },
        })
      )
    );
  }

  await insertInChunks(plan.rewardClaims, (chunk) => tx.rewardClaim.createMany({ data: chunk }));
  await insertInChunks(plan.offenses, (chunk) => tx.offense.createMany({ data: chunk }));
  await insertInChunks(plan.assetRecords, (chunk) => tx.mrfAssetRecord.createMany({ data: chunk }));

  for (const fill of plan.marketFill) {
    await tx.recycleMarketStock.updateMany({
      where: { categoryCode: fill.categoryCode },
      data: { accumulatedKg: fill.accumulatedKg, isApprovedForSale: fill.isApprovedForSale, approvedAt: null },
    });
  }
  for (let i = 0; i < plan.sales.length; i += CREATE_CHUNK_SIZE) {
    await tx.recycleSaleTransaction.createMany({ data: plan.sales.slice(i, i + CREATE_CHUNK_SIZE) });
  }

  if (plan.scrapStocks.length > 0 || plan.scrapItems.length > 0 || plan.scrapSales.length > 0) {
    const existing = await tx.assetScrapStock.findMany({ select: { materialCode: true } });
    const existingCodes = new Set(existing.map((s) => s.materialCode));
    for (const material of DEFAULT_SCRAP_STOCKS) {
      if (existingCodes.has(material.materialCode)) continue;
      await tx.assetScrapStock.create({
        data: {
          materialCode: material.materialCode,
          materialName: material.materialName,
          thresholdLimitKg: material.thresholdLimitKg,
          marketPricePerKg: material.marketPricePerKg,
        },
      });
    }

    await insertInChunks(plan.scrapItems, (chunk) => tx.assetScrapItem.createMany({ data: chunk }));
    await insertInChunks(plan.scrapSales, (chunk) => tx.assetScrapSaleTransaction.createMany({ data: chunk }));

    for (const stock of plan.scrapStocks) {
      await tx.assetScrapStock.updateMany({
        where: { materialCode: stock.materialCode },
        data: { accumulatedKg: stock.accumulatedKg, isApprovedForSale: stock.isApprovedForSale, approvedAt: null, approvalReference: null },
      });
    }
  }

  for (const bin of plan.binFill) {
    await tx.wasteBin.update({
      where: { id: bin.id },
      data: { fillLevel: bin.fillLevel, activeDispatch: bin.activeDispatch },
    });
  }

  if (plan.userUpdates.length > 0) {
    // Preload balances once: the old loop issued a findUnique per user inside
    // the long transaction. userUpdates already holds one row per user.
    const userIds = plan.userUpdates.map((update) => update.userId);
    const users = await tx.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, points: true },
    });
    const pointsById = new Map(users.map((user) => [user.id, user.points]));
    console.log(`[DataSeed] Updating balances for ${users.length} users`);

    for (const update of plan.userUpdates) {
      const currentPoints = pointsById.get(update.userId);
      if (currentPoints === undefined) continue;
      const nextPoints = Math.max(0, currentPoints + update.points);
      await tx.user.update({
        where: { id: update.userId },
        data: {
          points: nextPoints,
          ...(update.warningsDelta > 0 ? { warningsCount: { increment: update.warningsDelta } } : {}),
        },
      });
    }
  }
}

// ─── Orchestration ────────────────────────────────────────────────────

let dataSeedInProgress = false;

export function isDataSeedInProgress(): boolean {
  return dataSeedInProgress;
}

async function getActiveSchoolYear() {
  return prisma.schoolYear.findFirst({
    where: { isActive: true, isArchived: false },
    orderBy: { startDate: 'desc' },
  });
}

export async function getYearActivityCounts(schoolYearId: string): Promise<DataSeedCounts> {
  const [reports, pointHistories, walkIns, offenses, sales, assetRecords] = await Promise.all([
    prisma.report.count({ where: { schoolYearId } }),
    prisma.pointHistory.count({ where: { schoolYearId } }),
    prisma.walkInTurnover.count({ where: { schoolYearId } }),
    prisma.offense.count({ where: { schoolYearId } }),
    prisma.recycleSaleTransaction.count({ where: { schoolYearId } }),
    prisma.mrfAssetRecord.count({ where: { schoolYearId } }),
  ]);
  return { reports, pointHistories, walkIns, offenses, sales, assetRecords };
}

export async function getDataSeedStatus(): Promise<DataSeedStatus> {
  const sy = await getActiveSchoolYear();

  const [activeStudents, archivedStudents, staff, lastAudit] = await Promise.all([
    prisma.user.count({ where: { role: Role.STUDENT, syncSource: SyncSource.ENROLLPRO, archivedAt: null } }),
    prisma.user.count({ where: { role: Role.STUDENT, syncSource: SyncSource.ENROLLPRO, archivedAt: { not: null } } }),
    prisma.user.count({
      where: { role: { in: [Role.TEACHER, Role.ADMIN, Role.MRF] }, syncSource: SyncSource.ENROLLPRO, archivedAt: null },
    }),
    prisma.auditLog.findFirst({ where: { actionType: 'DATA_SEED' }, orderBy: { createdAt: 'desc' } }),
  ]);

  const counts = sy
    ? await getYearActivityCounts(sy.id)
    : { reports: 0, pointHistories: 0, walkIns: 0, offenses: 0, sales: 0, assetRecords: 0 };

  return {
    schoolYear: sy
      ? { id: sy.id, label: sy.label, startDate: sy.startDate.toISOString(), endDate: sy.endDate.toISOString() }
      : null,
    students: { active: activeStudents, archived: archivedStudents },
    staff,
    counts,
    lastSeed: lastAudit
      ? { at: lastAudit.createdAt.toISOString(), actorName: lastAudit.actorName, details: lastAudit.details }
      : null,
    isSeeding: dataSeedInProgress,
  };
}

/**
 * Delete ONLY the active school year's activity. Accounts, school years,
 * audit logs, snapshots and configuration are never touched.
 */
export async function clearActiveYearActivity(): Promise<DataSeedCounts> {
  const sy = await getActiveSchoolYear();
  if (!sy) throw new DataSeedError(409, 'NO_ACTIVE_SCHOOL_YEAR', 'No active school year.');

  return prisma.$transaction(
    async (tx) => {
      const contributions = await tx.challengeContribution.deleteMany({
        where: { report: { schoolYearId: sy.id } },
      });
      const pointHistories = await tx.pointHistory.deleteMany({ where: { schoolYearId: sy.id } });
      await tx.userChallengeProgress.deleteMany({});
      const rewardClaims = await tx.rewardClaim.deleteMany({ where: { schoolYearId: sy.id } });
      await tx.walkInTurnoverItem.deleteMany({ where: { turnover: { schoolYearId: sy.id } } });
      const walkIns = await tx.walkInTurnover.deleteMany({ where: { schoolYearId: sy.id } });
      const reports = await tx.report.deleteMany({ where: { schoolYearId: sy.id } });
      const offenses = await tx.offense.deleteMany({ where: { schoolYearId: sy.id } });
      const sales = await tx.recycleSaleTransaction.deleteMany({ where: { schoolYearId: sy.id } });
      const assetRecords = await tx.mrfAssetRecord.deleteMany({ where: { schoolYearId: sy.id } });
      await tx.assetScrapSaleTransaction.deleteMany({ where: { schoolYearId: sy.id } });
      await tx.assetScrapItem.deleteMany({ where: { schoolYearId: sy.id } });

      await tx.recycleMarketStock.updateMany({
        data: { accumulatedKg: 0, isApprovedForSale: false, approvedAt: null },
      });
      await tx.assetScrapStock.updateMany({
        data: { accumulatedKg: 0, isApprovedForSale: false, approvedAt: null, approvalReference: null },
      });
      await tx.user.updateMany({
        where: { role: Role.STUDENT, syncSource: SyncSource.ENROLLPRO },
        data: { points: 0, warningsCount: 0 },
      });

      void contributions;
      void rewardClaims;
      return {
        reports: reports.count,
        pointHistories: pointHistories.count,
        walkIns: walkIns.count,
        offenses: offenses.count,
        sales: sales.count,
        assetRecords: assetRecords.count,
      };
    },
    { timeout: 120_000 }
  );
}

export async function runDataSeed(options: DataSeedOptions): Promise<DataSeedResult> {
  if (isRolloverInProgress()) {
    throw new DataSeedError(409, 'ROLLOVER_IN_PROGRESS', 'A school-year rollover is in progress. Try again when it finishes.');
  }
  if (dataSeedInProgress) {
    throw new DataSeedError(409, 'SEED_IN_PROGRESS', 'A data generation run is already in progress.');
  }

  dataSeedInProgress = true;
  const start = Date.now();

  try {
    const mode: DataSeedMode = options.mode === 'RESEED_YEAR' ? 'RESEED_YEAR' : 'SEED_EMPTY';
    const volume: DataSeedVolume =
      options.volume === 'LIGHT' || options.volume === 'HEAVY' ? options.volume : 'NORMAL';
    const include: DataSeedInclude = {
      walkIns: options.include?.walkIns ?? true,
      marketSales: options.include?.marketSales ?? true,
      offenses: options.include?.offenses ?? true,
      assetScrap: options.include?.assetScrap ?? true,
    };

    const sy = await getActiveSchoolYear();
    if (!sy) {
      throw new DataSeedError(409, 'NO_ACTIVE_SCHOOL_YEAR', 'No active school year. Sync the school year first.');
    }

    if (mode === 'SEED_EMPTY') {
      const counts = await getYearActivityCounts(sy.id);
      const total =
        counts.reports +
        counts.pointHistories +
        counts.walkIns +
        counts.offenses +
        counts.sales +
        counts.assetRecords;
      if (total > 0) {
        throw new DataSeedError(
          409,
          'YEAR_NOT_EMPTY',
          `The active school year already has activity (${counts.reports} reports, ${counts.pointHistories} point entries, ${counts.walkIns} walk-ins, ${counts.assetRecords} asset ledger records). Use reseed mode to replace it.`
        );
      }
    } else {
      await clearActiveYearActivity();
    }

    const [students, staff, bins, pointRules, settings, marketStocks, rewards, challengeScope, rewardedChallengeRows] = await Promise.all([
      prisma.user.findMany({
        where: { role: Role.STUDENT, syncSource: SyncSource.ENROLLPRO, archivedAt: null },
        select: { id: true, name: true, role: true, points: true, gradeLevel: true, sectionName: true },
        orderBy: { name: 'asc' },
      }),
      prisma.user.findMany({
        where: {
          role: { in: [Role.TEACHER, Role.ADMIN, Role.MRF] },
          syncSource: SyncSource.ENROLLPRO,
          archivedAt: null,
        },
        select: { id: true, name: true, role: true, points: true },
        orderBy: { name: 'asc' },
      }),
      prisma.wasteBin.findMany({ select: { id: true, name: true, locationName: true, lat: true, lng: true } }),
      prisma.pointRule.findMany({ orderBy: { rank: 'asc' }, select: { rank: true, pointsAwarded: true } }),
      prisma.systemSetting.findUnique({ where: { id: 'default_setting' } }),
      prisma.recycleMarketStock.findMany({
        select: { categoryCode: true, categoryName: true, marketPricePerKg: true, thresholdLimitKg: true },
      }),
      prisma.reward.findMany({
        where: { isActive: true },
        orderBy: { requiredGrams: 'asc' },
        select: { id: true, title: true, requiredGrams: true },
      }),
      resolveChallengeScope(),
      prisma.pointHistory.findMany({
        where: { challengeId: { not: null } },
        select: { userId: true, challengeId: true },
      }),
    ]);

    if (students.length === 0) {
      throw new DataSeedError(
        409,
        'NO_ACTIVE_STUDENTS',
        'No active enrolled students found. Sync EnrollPro after learners are enrolled, then retry.'
      );
    }
    if (pointRules.length === 0) {
      throw new DataSeedError(409, 'POINT_RULES_MISSING', 'Point rules are not configured. Run the database seed first.');
    }

    // All challenge instances of the active school year (every term), so the
    // seeded reports — which span the whole year — accrue against the correct
    // term instance. Provision defensively when the year predates scoping.
    const challengeSelect = {
      id: true,
      title: true,
      challengeType: true,
      pointsAwarded: true,
      target: true,
      startDate: true,
      endDate: true,
    } as const;

    try {
      const provision = await ensureChallengesForSchoolYear(sy.id);
      if (provision.created > 0 || provision.windowRefreshed > 0) {
        console.log(
          `[DataSeed] Challenge instances: ${provision.created} created, ${provision.windowRefreshed} windows refreshed`
        );
      }
    } catch (provisionErr: any) {
      console.error('[DataSeed] Challenge provisioning failed:', provisionErr.message);
    }

    const challenges: SeedChallengeRef[] = await prisma.challenge.findMany({
      where: { isActive: true, ...challengeSchoolYearWhere(challengeScope) },
      select: challengeSelect,
    });

    const plan = planDataSeed({
      schoolYearId: sy.id,
      schoolYearStart: sy.startDate,
      schoolYearEnd: sy.endDate,
      now: new Date(),
      resetTime: settings?.binResetTime || DEFAULT_RESET_TIME,
      timezone: BIN_RESET_TZ,
      volume,
      include,
      seed: Number.isFinite(options.seed) ? Number(options.seed) : hashSeed(sy.id),
      students,
      staff,
      bins,
      pointRules,
      settings: {
        dismissPointPenalty: settings?.dismissPointPenalty ?? 10,
        falseReportPointPenalty: settings?.falseReportPointPenalty ?? 50,
        warningAutoDeductAmount: settings?.warningAutoDeductAmount ?? 10,
        warningThreshold: settings?.warningThreshold ?? 3,
        walkInPointsPer500ml: settings?.walkInPointsPer500ml ?? 1,
        defaultVendorName: settings?.defaultVendorName || 'GreenCycle Recycling Vendor',
      },
      marketStocks,
      rewards,
      challenges,
      rewardedChallengePairs: new Set(
        rewardedChallengeRows
          .filter((row): row is { userId: string; challengeId: string } => row.challengeId !== null)
          .map((row) => `${row.userId}::${row.challengeId}`)
      ),
    });

    await prisma.$transaction(
      async (tx) => {
        await persistPlan(tx, plan);
        await tx.auditLog.create({
          data: {
            actorName: options.actorName || 'Admin',
            actorRole: options.actorRole || 'ADMIN',
            actionType: 'DATA_SEED',
            details: `Generated ${plan.stats.reports} reports (${plan.stats.collectedReports} collected), ${plan.stats.walkIns} walk-ins, ${plan.stats.sales} market sales, ${plan.stats.offenses} offenses for ${sy.label}. Mode: ${mode}, volume: ${volume}.`,
            schoolYearId: sy.id,
          },
        });
      },
      { timeout: 180_000, maxWait: 15_000 }
    );

    return {
      schoolYearId: sy.id,
      schoolYearLabel: sy.label,
      mode,
      volume,
      ...plan.stats,
      durationMs: Date.now() - start,
    };
  } finally {
    dataSeedInProgress = false;
  }
}

// ─── Small helpers ────────────────────────────────────────────────────

function normalizeLocation(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

function clamp(date: Date, max: Date): Date {
  return date.getTime() > max.getTime() ? max : date;
}

function claimCode(): string {
  return `SORT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function formatLitres(totalMl: number): string {
  const litres = totalMl / 1000;
  return litres.toFixed(2).replace(/\.?0+$/, '');
}

function hashSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (Math.imul(hash, 31) + value.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}
