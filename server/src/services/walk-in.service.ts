import { PrismaClient, Prisma, Role } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// ─── Errors ───────────────────────────────────────────────────────────

export class WalkInError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// ─── Constants & formulas ─────────────────────────────────────────────

export const WALK_IN_LIMITS = {
  minBottleMl: 100,
  maxBottleMl: 20000,
  maxQuantity: 200,
  maxLines: 6,
} as const;

/**
 * Estimated bottle weight in grams (bottle + cap + label) for common PH PET
 * sizes. Sources: NEA (Singapore) packaging benchmarks for PET water bottles
 * (median incl. cap + label) and Coca-Cola's 2024 small-PET lightweighting.
 * These are planning estimates; calibrate from a 100-bottle sample at the MRF.
 * Snapshotted into every turnover item so recalibration never rewrites history.
 */
const GRAM_PRESETS: { ml: number; grams: number }[] = [
  { ml: 250, grams: 12 },
  { ml: 330, grams: 15 },
  { ml: 350, grams: 14 },
  { ml: 500, grams: 19 },
  { ml: 600, grams: 22 },
  { ml: 1000, grams: 39 },
  { ml: 1500, grams: 36 },
  { ml: 2000, grams: 48 },
];

export function gramsForBottle(bottleMl: number): number {
  if (!Number.isFinite(bottleMl) || bottleMl <= 0) return 0;
  if (bottleMl > 2000) return Math.round(bottleMl * 0.024);
  let best = GRAM_PRESETS[0];
  for (const preset of GRAM_PRESETS) {
    if (Math.abs(preset.ml - bottleMl) < Math.abs(best.ml - bottleMl)) best = preset;
  }
  return best.grams;
}

/**
 * Session-total point rule: every full 500 ml earns `ratePer500ml` points,
 * with a minimum of 1 point for any visit. Computing on the session total (not
 * per bottle) prevents small-bottle farming while still rewarding tiny bottles
 * that are the whole visit.
 */
export function computeWalkInPoints(totalMl: number, ratePer500ml: number): number {
  if (!Number.isFinite(totalMl) || totalMl <= 0) return 0;
  const rate = Number.isFinite(ratePer500ml) && ratePer500ml > 0 ? Math.floor(ratePer500ml) : 1;
  return Math.max(1, Math.floor((totalMl / 500) * rate));
}

export function formatLitres(totalMl: number): string {
  const litres = totalMl / 1000;
  return litres.toFixed(2).replace(/\.?0+$/, '');
}

// ─── Types ────────────────────────────────────────────────────────────

export interface WalkInItemInput {
  bottleMl: number;
  quantity: number;
}

export interface RecordWalkInInput {
  studentId: string;
  items: WalkInItemInput[];
  notes?: string;
  idempotencyKey: string;
  recordedById?: string | null;
  recordedByName?: string;
}

export interface WalkInProgress {
  yearGrams: number;
  yearMl: number;
  yearBottles: number;
  nextReward: {
    id: string;
    code: string;
    title: string;
    iconName: string;
    rewardType: string;
    requiredGrams: number;
    remainingGrams: number;
  } | null;
}

export interface UnlockedClaimSummary {
  claimId: string;
  claimCode: string;
  reward: {
    id: string;
    code: string;
    title: string;
    iconName: string;
    rewardType: string;
    requiredGrams: number;
  };
}

export interface RecordWalkInResult {
  alreadyProcessed: boolean;
  turnover: ReturnType<typeof serializeTurnover>;
  student: { id: string; name: string; points: number };
  progress: WalkInProgress;
  newlyUnlocked: UnlockedClaimSummary[];
}

type DbClient = Prisma.TransactionClient | PrismaClient;

// ─── Helpers ──────────────────────────────────────────────────────────

function normalizeItems(items: unknown): { bottleMl: number; quantity: number; grams: number }[] {
  if (!Array.isArray(items) || items.length === 0) {
    throw new WalkInError(400, 'VALIDATION_ERROR', 'At least one bottle line is required');
  }
  if (items.length > WALK_IN_LIMITS.maxLines) {
    throw new WalkInError(400, 'VALIDATION_ERROR', `Too many bottle lines (max ${WALK_IN_LIMITS.maxLines})`);
  }
  return items.map((raw: any) => {
    const bottleMl = Number(raw?.bottleMl);
    const quantity = Number(raw?.quantity);
    if (!Number.isInteger(bottleMl) || bottleMl < WALK_IN_LIMITS.minBottleMl || bottleMl > WALK_IN_LIMITS.maxBottleMl) {
      throw new WalkInError(400, 'VALIDATION_ERROR', `bottleMl must be an integer between ${WALK_IN_LIMITS.minBottleMl} and ${WALK_IN_LIMITS.maxBottleMl}`);
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > WALK_IN_LIMITS.maxQuantity) {
      throw new WalkInError(400, 'VALIDATION_ERROR', `quantity must be an integer between 1 and ${WALK_IN_LIMITS.maxQuantity}`);
    }
    return { bottleMl, quantity, grams: gramsForBottle(bottleMl) };
  });
}

function generateClaimCode(): string {
  return `ECO-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function serializeTurnover(turnover: any) {
  return {
    id: turnover.id,
    studentId: turnover.studentId,
    recordedByName: turnover.recordedByName,
    totalMl: turnover.totalMl,
    totalBottles: turnover.totalBottles,
    totalGrams: turnover.totalGrams,
    pointsAwarded: turnover.pointsAwarded,
    ratePer500ml: turnover.ratePer500ml,
    notes: turnover.notes,
    createdAt: turnover.createdAt instanceof Date ? turnover.createdAt.toISOString() : turnover.createdAt,
    items: (turnover.items || []).map((item: any) => ({
      bottleMl: item.bottleMl,
      quantity: item.quantity,
      grams: item.grams,
    })),
  };
}

async function computeProgress(client: DbClient, studentId: string, schoolYearId: string): Promise<WalkInProgress> {
  const agg = await client.walkInTurnover.aggregate({
    where: { studentId, schoolYearId },
    _sum: { totalGrams: true, totalMl: true, totalBottles: true },
  });

  const yearGrams = agg._sum.totalGrams ?? 0;
  const yearMl = agg._sum.totalMl ?? 0;
  const yearBottles = agg._sum.totalBottles ?? 0;

  // The next reward is the cheapest active tier still above current progress.
  const upcoming = await client.reward.findFirst({
    where: { isActive: true, requiredGrams: { gt: yearGrams } },
    orderBy: { requiredGrams: 'asc' },
    select: { id: true, code: true, title: true, iconName: true, rewardType: true, requiredGrams: true },
  });

  return {
    yearGrams,
    yearMl,
    yearBottles,
    nextReward: upcoming
      ? { ...upcoming, remainingGrams: Math.max(0, upcoming.requiredGrams - yearGrams) }
      : null,
  };
}

/**
 * Insert a milestone claim if the student has not unlocked this reward for the
 * school year yet. Uses INSERT ... ON CONFLICT DO NOTHING because catching a
 * unique-constraint error inside a Postgres transaction aborts the whole
 * transaction (25P02) — this keeps the turnover transaction alive and makes
 * concurrent unlocks idempotent.
 */
async function insertClaimIfAbsent(
  tx: Prisma.TransactionClient,
  data: { userId: string; rewardId: string; turnoverId: string; schoolYearId: string; gramsAtUnlock: number }
): Promise<{ id: string; claimCode: string } | null> {
  const rows = await tx.$queryRaw<{ id: string; claim_code: string }[]>`
    INSERT INTO "reward_claims"
      ("id", "user_id", "reward_id", "turnover_id", "status", "claim_code", "grams_at_unlock", "unlocked_at", "school_year_id")
    VALUES
      (${crypto.randomUUID()}::text,
       ${data.userId}::text,
       ${data.rewardId}::text,
       ${data.turnoverId}::text,
       'UNLOCKED'::"RewardClaimStatus",
       ${generateClaimCode()}::text,
       ${data.gramsAtUnlock}::int,
       NOW(),
       ${data.schoolYearId}::text)
    ON CONFLICT ("user_id", "reward_id", "school_year_id") DO NOTHING
    RETURNING "id", "claim_code"
  `;
  if (rows.length === 0) return null;
  return { id: rows[0].id, claimCode: rows[0].claim_code };
}

async function unlockMilestones(
  tx: Prisma.TransactionClient,
  params: { studentId: string; schoolYearId: string; turnoverId: string }
): Promise<UnlockedClaimSummary[]> {
  const agg = await tx.walkInTurnover.aggregate({
    where: { studentId: params.studentId, schoolYearId: params.schoolYearId },
    _sum: { totalGrams: true },
  });
  const yearGrams = agg._sum.totalGrams ?? 0;

  const eligible = await tx.reward.findMany({
    where: { isActive: true, requiredGrams: { lte: yearGrams } },
    orderBy: { requiredGrams: 'asc' },
  });

  const unlocked: UnlockedClaimSummary[] = [];
  for (const reward of eligible) {
    const claim = await insertClaimIfAbsent(tx, {
      userId: params.studentId,
      rewardId: reward.id,
      turnoverId: params.turnoverId,
      schoolYearId: params.schoolYearId,
      gramsAtUnlock: yearGrams,
    });
    if (!claim) continue;
    unlocked.push({
      claimId: claim.id,
      claimCode: claim.claimCode,
      reward: {
        id: reward.id,
        code: reward.code,
        title: reward.title,
        iconName: reward.iconName,
        rewardType: reward.rewardType,
        requiredGrams: reward.requiredGrams,
      },
    });
  }
  return unlocked;
}

async function buildExistingResult(turnover: any): Promise<RecordWalkInResult> {
  const [student, progress] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: turnover.studentId },
      select: { id: true, name: true, points: true },
    }),
    computeProgress(prisma, turnover.studentId, turnover.schoolYearId),
  ]);
  return {
    alreadyProcessed: true,
    turnover: serializeTurnover(turnover),
    student,
    progress,
    newlyUnlocked: [],
  };
}

// ─── Public API ───────────────────────────────────────────────────────

export async function recordWalkIn(input: RecordWalkInInput): Promise<RecordWalkInResult> {
  const idempotencyKey = String(input.idempotencyKey || '').trim();
  if (!/^[0-9a-fA-F-]{8,64}$/.test(idempotencyKey)) {
    throw new WalkInError(400, 'VALIDATION_ERROR', 'idempotencyKey must be a UUID-like string');
  }

  const existing = await prisma.walkInTurnover.findUnique({
    where: { idempotencyKey },
    include: { items: true },
  });
  if (existing) return buildExistingResult(existing);

  const studentId = String(input.studentId || '').trim();
  if (!studentId) throw new WalkInError(400, 'VALIDATION_ERROR', 'studentId is required');

  const items = normalizeItems(input.items);
  const totalMl = items.reduce((sum, item) => sum + item.bottleMl * item.quantity, 0);
  const totalBottles = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalGrams = items.reduce((sum, item) => sum + item.grams * item.quantity, 0);

  const [student, settings, activeSy] = await Promise.all([
    prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, role: true, archivedAt: true },
    }),
    prisma.systemSetting.findUnique({ where: { id: 'default_setting' } }),
    prisma.schoolYear.findFirst({
      where: { isActive: true, isArchived: false },
      orderBy: { startDate: 'desc' },
      select: { id: true },
    }),
  ]);

  if (!student) throw new WalkInError(404, 'STUDENT_NOT_FOUND', 'Student not found');
  if (student.role !== Role.STUDENT) {
    throw new WalkInError(409, 'STUDENT_NOT_ELIGIBLE', 'Only students can earn walk-in points');
  }
  if (student.archivedAt) {
    throw new WalkInError(409, 'STUDENT_NOT_ELIGIBLE', 'This student is archived and cannot earn points');
  }
  if (settings && !settings.walkInEnabled) {
    throw new WalkInError(403, 'WALK_IN_DISABLED', 'Walk-in recording is currently disabled');
  }
  if (!activeSy) {
    throw new WalkInError(409, 'NO_ACTIVE_SCHOOL_YEAR', 'No active school year — points cannot be recorded');
  }

  const ratePer500ml = Math.max(1, settings?.walkInPointsPer500ml ?? 1);
  const points = computeWalkInPoints(totalMl, ratePer500ml);
  const recordedByName = (input.recordedByName || 'MRF').slice(0, 120);
  const schoolYearId = activeSy.id;

  try {
    return await prisma.$transaction(async (tx) => {
      const turnover = await tx.walkInTurnover.create({
        data: {
          studentId,
          recordedById: input.recordedById ?? null,
          recordedByName,
          totalMl,
          totalBottles,
          totalGrams,
          pointsAwarded: points,
          ratePer500ml,
          notes: input.notes ? String(input.notes).slice(0, 500) : null,
          idempotencyKey,
          schoolYearId,
          items: { create: items },
        },
        include: { items: true },
      });

      const updatedStudent = await tx.user.update({
        where: { id: studentId },
        data: { points: { increment: points } },
        select: { id: true, name: true, points: true },
      });

      await tx.pointHistory.create({
        data: {
          userId: studentId,
          amount: points,
          reason: `Walk-in Bottle Turnover: ${totalBottles} bottle(s), ${formatLitres(totalMl)}L (+${points} pts) at MRF`,
          walkInTurnoverId: turnover.id,
          schoolYearId,
        },
      });

      await tx.auditLog.create({
        data: {
          actorName: recordedByName,
          actorRole: 'MRF',
          actionType: 'WALK_IN_TURNOVER',
          details: `${updatedStudent.name} · ${totalBottles} bottle(s) · ${formatLitres(totalMl)}L · ${totalGrams} g · +${points} pts`,
          schoolYearId,
        },
      });

      const newlyUnlocked = await unlockMilestones(tx, { studentId, schoolYearId, turnoverId: turnover.id });
      const progress = await computeProgress(tx, studentId, schoolYearId);

      return {
        alreadyProcessed: false,
        turnover: serializeTurnover(turnover),
        student: updatedStudent,
        progress,
        newlyUnlocked,
      };
    });
  } catch (err: any) {
    // Concurrent duplicate submit lost the unique-key race: return the winner.
    if (err?.code === 'P2002' && String(err?.meta?.target ?? '').includes('idempotency_key')) {
      const race = await prisma.walkInTurnover.findUnique({
        where: { idempotencyKey },
        include: { items: true },
      });
      if (race) return buildExistingResult(race);
    }
    throw err;
  }
}

export async function listWalkIns(opts: { date?: string; studentId?: string; limit?: number }) {
  const where: Prisma.WalkInTurnoverWhereInput = {};
  if (opts.studentId) where.studentId = opts.studentId;

  if (opts.date) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(opts.date);
    if (match) {
      const start = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      where.createdAt = { gte: start, lt: end };
    }
  }

  const rows = await prisma.walkInTurnover.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(opts.limit ?? 100, 1), 100),
    include: {
      items: true,
      student: { select: { id: true, name: true, gradeLevel: true, sectionName: true } },
    },
  });

  return rows.map((row) => ({
    ...serializeTurnover(row),
    student: row.student,
  }));
}

export async function listStudentWalkIns(studentId: string, limit = 20) {
  const activeSy = await prisma.schoolYear.findFirst({
    where: { isActive: true, isArchived: false },
    orderBy: { startDate: 'desc' },
    select: { id: true },
  });

  const [rows, progress] = await Promise.all([
    prisma.walkInTurnover.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 50),
      include: { items: true },
    }),
    activeSy ? computeProgress(prisma, studentId, activeSy.id) : Promise.resolve(null),
  ]);

  return {
    turnovers: rows.map(serializeTurnover),
    progress,
  };
}

export async function getStudentProgress(studentId: string): Promise<WalkInProgress | null> {
  const activeSy = await prisma.schoolYear.findFirst({
    where: { isActive: true, isArchived: false },
    orderBy: { startDate: 'desc' },
    select: { id: true },
  });
  if (!activeSy) return null;
  return computeProgress(prisma, studentId, activeSy.id);
}

/** Students available for walk-in search: local roster, offline accounts included. */
export async function searchWalkInStudents(query: string, limit = 10) {
  const q = query.trim();
  if (q.length < 2) return [];

  const students = await prisma.user.findMany({
    where: {
      role: Role.STUDENT,
      archivedAt: null,
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { enrollproLrn: { contains: q, mode: 'insensitive' } },
        { employeeId: { contains: q, mode: 'insensitive' } },
        { sectionName: { contains: q, mode: 'insensitive' } },
      ],
    },
    orderBy: { name: 'asc' },
    take: Math.min(Math.max(limit, 1), 25),
    select: {
      id: true,
      name: true,
      gradeLevel: true,
      sectionName: true,
      classroomSection: true,
      points: true,
      syncSource: true,
    },
  });

  return students.map((s) => ({
    id: s.id,
    name: s.name,
    gradeLevel: s.gradeLevel,
    sectionName: s.sectionName || s.classroomSection || null,
    points: s.points,
    syncSource: s.syncSource,
  }));
}
