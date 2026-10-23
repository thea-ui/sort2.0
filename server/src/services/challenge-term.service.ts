import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getTermStatus, TermState } from './certificate.service.js';
import { startOfDay, endOfDay } from './term-clock.service.js';

// Challenges with no academic-term scope are treated as global/legacy.
export const GLOBAL_QUARTER_CODE = 'GLOBAL';

export interface ChallengeScope {
  termState: TermState;
  quarterCode: string | null;
  /** Active school year, so callers can scope to this year's instances. */
  schoolYearId: string | null;
  // Term codes whose challenges are visible/accruable right now.
  visibleQuarterCodes: string[];
  canAccrue: boolean;
  /**
   * Term-aware clock for challenge windows: real time while inside the
   * mirrored active term, clamped to its boundary when EnrollPro time-travels.
   */
  effectiveNow: Date;
  /** True when EnrollPro's active term does not contain the real date. */
  timeShifted: boolean;
}

/**
 * Restrict a challenge query to the active school year's instances (plus
 * unscoped legacy rows for pre-scoping data). No-op when no year is active.
 */
export function challengeSchoolYearWhere(scope: ChallengeScope): Prisma.ChallengeWhereInput {
  if (!scope.schoolYearId) return {};
  return {
    OR: [{ schoolYearId: scope.schoolYearId }, { schoolYearId: null }],
  };
}

/**
 * Resolve which challenge instances are currently in play, based on the active
 * academic quarter (single source of truth = getTermStatus).
 *
 * - IN_TERM  → only the active term's challenges
 * - NO_TERM  → legacy/global challenges (no quarter configured)
 * - GRACE    → term is over for students; nothing accrues or shows as active
 * - CLOSED   → term closed; nothing accrues or shows as active
 */
export async function resolveChallengeScope(): Promise<ChallengeScope> {
  const [term, activeYear] = await Promise.all([
    getTermStatus(),
    prisma.schoolYear.findFirst({
      where: { isActive: true, isArchived: false },
      orderBy: { startDate: 'desc' },
      select: { id: true },
    }),
  ]);
  const schoolYearId = activeYear?.id ?? null;
  const effectiveNow = term.effectiveNow ? new Date(term.effectiveNow) : new Date();
  const timeShifted = term.timeShifted;

  if (term.state === 'IN_TERM' && term.quarterCode) {
    return {
      termState: term.state,
      quarterCode: term.quarterCode,
      schoolYearId,
      visibleQuarterCodes: [term.quarterCode],
      canAccrue: true,
      effectiveNow,
      timeShifted,
    };
  }

  if (term.state === 'NO_TERM') {
    return {
      termState: term.state,
      quarterCode: null,
      schoolYearId,
      visibleQuarterCodes: [GLOBAL_QUARTER_CODE],
      canAccrue: true,
      effectiveNow,
      timeShifted,
    };
  }

  return {
    termState: term.state,
    quarterCode: term.quarterCode,
    schoolYearId,
    visibleQuarterCodes: [],
    canAccrue: false,
    effectiveNow,
    timeShifted,
  };
}

/** A challenge is only visible inside its own start/end window. */
export function challengeWindowWhere(now: Date = new Date()): Prisma.ChallengeWhereInput {
  return {
    AND: [
      { OR: [{ startDate: null }, { startDate: { lte: endOfDay(now) } }] },
      { OR: [{ endDate: null }, { endDate: { gte: startOfDay(now) } }] },
    ],
  };
}

/**
 * Date-granular counterpart of `challengeWindowWhere` for in-memory rows.
 * Windows are stored at day resolution, so the first and last day both count.
 */
export function isChallengeWindowOpen(
  challenge: { startDate: Date | null; endDate: Date | null },
  now: Date = new Date()
): boolean {
  return (
    (challenge.startDate === null || challenge.startDate <= endOfDay(now)) &&
    (challenge.endDate === null || challenge.endDate >= startOfDay(now))
  );
}
