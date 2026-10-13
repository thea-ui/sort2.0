import { ChallengeType, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Catalog ──────────────────────────────────────────────────────────

export interface ChallengeDefinition {
  code: string;
  title: string;
  description: string;
  challengeType: ChallengeType;
  pointsAwarded: number;
  target: number;
  iconName: string;
}

/**
 * Default challenge catalog. Codes listed here are term-agnostic: they are
 * provisioned for every academic term of a school year (T1/T2/T3).
 */
export const DEFAULT_CHALLENGE_CATALOG: ChallengeDefinition[] = [
  {
    code: 'WEEKLY_RECYCLING_PIONEER',
    title: 'Weekly Recycling Pioneer',
    description: 'Submit 5 verified recyclable waste reports this week.',
    challengeType: ChallengeType.REPORT_COUNT,
    pointsAwarded: 150,
    target: 5,
    iconName: 'Recycle',
  },
  {
    code: 'ZERO_SINGLE_USE_PLASTICS',
    title: 'Zero Single-Use Plastics',
    description: 'Participate in campus-wide plastic segregation audit.',
    challengeType: ChallengeType.REPORT_COUNT,
    pointsAwarded: 200,
    target: 1,
    iconName: 'Award',
  },
];

const DEFAULT_CODES = new Set(DEFAULT_CHALLENGE_CATALOG.map((d) => d.code));

export interface ProvisionDefinition extends ChallengeDefinition {
  /** Term this definition belongs to. Ignored for catalog codes (all terms). */
  quarterCode: string;
}

export interface TermWindow {
  quarterCode: string;
  startDate: Date | null;
  endDate: Date | null;
}

export interface ExistingChallengeRef {
  id: string;
  code: string;
  quarterCode: string;
  startDate: Date | null;
  endDate: Date | null;
}

export interface ChallengeProvisionPlan {
  creates: { definition: ProvisionDefinition; quarterCode: string; startDate: Date | null; endDate: Date | null }[];
  updates: { id: string; startDate: Date | null; endDate: Date | null }[];
  unchanged: number;
  skipped: number;
}

/**
 * Pure planner for challenge provisioning.
 *
 * - Catalog codes get one instance per term.
 * - Custom definitions keep their own term when that term exists.
 * - Windows are refreshed only when missing or stale (pointing at a previous
 *   term/year) unless `forceWindows` is set, so admin edits are preserved.
 */
export function planChallengeProvisioning(
  definitions: ProvisionDefinition[],
  terms: TermWindow[],
  existing: ExistingChallengeRef[],
  options: { forceWindows?: boolean } = {}
): ChallengeProvisionPlan {
  const plan: ChallengeProvisionPlan = { creates: [], updates: [], unchanged: 0, skipped: 0 };
  const effectiveTerms = terms.length > 0 ? terms : [{ quarterCode: 'GLOBAL', startDate: null, endDate: null }];
  const byKey = new Map(existing.map((row) => [`${row.code}::${row.quarterCode}`, row]));

  for (const definition of definitions) {
    const isCatalog = DEFAULT_CODES.has(definition.code);
    const targetTerms = isCatalog
      ? effectiveTerms
      : effectiveTerms.filter((term) => term.quarterCode === definition.quarterCode);

    if (targetTerms.length === 0) {
      plan.skipped++;
      continue;
    }

    for (const term of targetTerms) {
      const row = byKey.get(`${definition.code}::${term.quarterCode}`);
      if (!row) {
        plan.creates.push({
          definition,
          quarterCode: term.quarterCode,
          startDate: term.startDate,
          endDate: term.endDate,
        });
        continue;
      }

      const stale =
        options.forceWindows === true ||
        row.startDate === null ||
        row.endDate === null ||
        (term.startDate !== null && row.endDate < term.startDate);

      if (stale) {
        plan.updates.push({ id: row.id, startDate: term.startDate, endDate: term.endDate });
      } else {
        plan.unchanged++;
      }
    }
  }

  return plan;
}

// ─── Provisioning ─────────────────────────────────────────────────────

export interface ChallengeProvisionResult {
  schoolYearId: string;
  created: number;
  windowRefreshed: number;
  unchanged: number;
  skipped: number;
  /** Scoped GLOBAL placeholder rows deactivated because term instances exist. */
  retiredGlobal: number;
}

function toWindow(term: { quarterCode: string; startDate: string; endDate: string }): TermWindow {
  const startDate = new Date(term.startDate);
  const endDate = new Date(term.endDate);
  return {
    quarterCode: term.quarterCode,
    startDate: isNaN(startDate.getTime()) ? null : startDate,
    endDate: isNaN(endDate.getTime()) ? null : endDate,
  };
}

/**
 * Ensure every school year has its own challenge instances.
 *
 * Definitions are copied forward from the previous school year (preserving
 * admin-created challenges and edits); catalog codes are always expanded to
 * every configured term. Legacy rows (`schoolYearId = null`) seed the first
 * provisioned year. Idempotent and safe to call from rollover, term sync,
 * seed and the data seeder.
 */
export async function ensureChallengesForSchoolYear(
  schoolYearId: string,
  options: { forceWindows?: boolean } = {}
): Promise<ChallengeProvisionResult> {
  const targetYear = await prisma.schoolYear.findUnique({
    where: { id: schoolYearId },
    select: { id: true, startDate: true },
  });
  if (!targetYear) {
    throw new Error(`School year ${schoolYearId} not found`);
  }

  const [quarterRows, existing, previousYear] = await Promise.all([
    prisma.academicQuarter.findMany({ orderBy: { quarterCode: 'asc' } }),
    prisma.challenge.findMany({
      where: { schoolYearId },
      select: { id: true, code: true, quarterCode: true, startDate: true, endDate: true },
    }),
    prisma.schoolYear.findFirst({
      where: { id: { not: schoolYearId }, startDate: { lt: targetYear.startDate } },
      orderBy: { startDate: 'desc' },
      select: { id: true },
    }),
  ]);

  const [previousChallenges, legacyChallenges] = await Promise.all([
    previousYear
      ? prisma.challenge.findMany({ where: { schoolYearId: previousYear.id }, orderBy: { createdAt: 'desc' } })
      : Promise.resolve([]),
    prisma.challenge.findMany({ where: { schoolYearId: null }, orderBy: { createdAt: 'desc' } }),
  ]);

  // Definition map: previous year wins, then legacy, then the default catalog.
  const definitions = new Map<string, ProvisionDefinition>();
  const source = [...previousChallenges, ...legacyChallenges];
  for (const row of source) {
    if (definitions.has(row.code)) continue;
    definitions.set(row.code, {
      code: row.code,
      title: row.title,
      description: row.description,
      challengeType: row.challengeType,
      pointsAwarded: row.pointsAwarded,
      target: row.target,
      iconName: row.iconName,
      quarterCode: row.quarterCode,
    });
  }
  for (const entry of DEFAULT_CHALLENGE_CATALOG) {
    if (!definitions.has(entry.code)) {
      definitions.set(entry.code, { ...entry, quarterCode: 'GLOBAL' });
    }
  }

  const terms = quarterRows.map(toWindow);
  const plan = planChallengeProvisioning([...definitions.values()], terms, existing, options);

  // Catalog codes that now have real term instances (created or existing) —
  // any scoped GLOBAL placeholder for those codes is retired (deactivated, not
  // deleted, so history survives) to avoid duplicates in student/admin views.
  const codesWithTermInstances = new Set<string>();
  for (const entry of plan.creates) {
    if (entry.quarterCode !== 'GLOBAL') codesWithTermInstances.add(entry.definition.code);
  }
  for (const row of existing) {
    if (row.quarterCode !== 'GLOBAL') codesWithTermInstances.add(row.code);
  }
  const globalPlaceholders = existing.filter(
    (row) => row.quarterCode === 'GLOBAL' && DEFAULT_CODES.has(row.code) && codesWithTermInstances.has(row.code)
  );

  let created = 0;
  let windowRefreshed = 0;
  let retiredGlobal = 0;

  // Provisioning can run concurrently (sync scheduler runs EnrollPro sync and
  // term sync in parallel, and both call this). Serialize on the school year so
  // the existence checks below stay truthful; a P2002 caught inside a Postgres
  // transaction would abort every statement that follows it.
  let lockKey = 0;
  for (let i = 0; i < schoolYearId.length; i++) {
    lockKey = ((lockKey << 5) - lockKey + schoolYearId.charCodeAt(i)) | 0;
  }
  lockKey = Math.abs(lockKey) % 2147483647;

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

    for (const entry of plan.creates) {
      const exists = await tx.challenge.findFirst({
        where: {
          code: entry.definition.code,
          quarterCode: entry.quarterCode,
          schoolYearId,
        },
        select: { id: true },
      });
      if (exists) continue;

      await tx.challenge.create({
        data: {
          code: entry.definition.code,
          title: entry.definition.title,
          description: entry.definition.description,
          challengeType: entry.definition.challengeType,
          pointsAwarded: entry.definition.pointsAwarded,
          target: entry.definition.target,
          iconName: entry.definition.iconName,
          quarterCode: entry.quarterCode,
          schoolYearId,
          startDate: entry.startDate,
          endDate: entry.endDate,
          isActive: true,
        },
      });
      created++;
    }

    for (const entry of plan.updates) {
      await tx.challenge.update({
        where: { id: entry.id },
        data: { startDate: entry.startDate, endDate: entry.endDate },
      });
      windowRefreshed++;
    }

    for (const placeholder of globalPlaceholders) {
      await tx.challenge.update({
        where: { id: placeholder.id },
        data: { isActive: false },
      });
      retiredGlobal++;
    }
  });

  return {
    schoolYearId,
    created,
    windowRefreshed,
    unchanged: plan.unchanged,
    skipped: plan.skipped,
    retiredGlobal,
  };
}
