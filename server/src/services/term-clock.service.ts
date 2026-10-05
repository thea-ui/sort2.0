import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A term row as mirrored from EnrollPro. The `isActive` flag is authoritative:
 * it comes from EnrollPro's `/integration/v1/active-term`, which follows the
 * partner's virtual (time-traveled) clock on development instances.
 */
export interface TermClockRow {
  id: string;
  quarterCode: string;
  quarterName: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface TermClock {
  term: TermClockRow | null;
  realNow: Date;
  effectiveNow: Date;
  timeShifted: boolean;
  daysRemaining: number;
}

export function startOfDay(value: string | Date): Date {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(value: string | Date): Date {
  const d = new Date(value);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Resolve the clock used for term-scoped math.
 *
 * EnrollPro's `/active-term` reports which term is current but not the
 * simulated date behind its time-travel feature. So SORT uses the real clock
 * while it falls inside the mirrored active term, and clamps to the nearest
 * term boundary when it does not. That keeps "the active term is in progress"
 * true no matter where EnrollPro's virtual clock points, without inventing a
 * date EnrollPro never exposed.
 */
export function effectiveNowForTerm(
  term: { isActive: boolean; startDate: string; endDate: string },
  realNow: Date = new Date()
): { now: Date; timeShifted: boolean } {
  if (!term.isActive) return { now: realNow, timeShifted: false };
  const start = startOfDay(term.startDate);
  const end = endOfDay(term.endDate);
  if (realNow < start) return { now: start, timeShifted: true };
  if (realNow > end) return { now: end, timeShifted: true };
  return { now: realNow, timeShifted: false };
}

/** Read the EnrollPro-mirrored active term and resolve its clock. */
export async function resolveTermClock(): Promise<TermClock> {
  const term = await prisma.academicQuarter.findFirst({
    where: { isActive: true },
    orderBy: { startDate: 'asc' },
  });

  const realNow = new Date();
  if (!term) {
    return { term: null, realNow, effectiveNow: realNow, timeShifted: false, daysRemaining: 0 };
  }

  const { now: effectiveNow, timeShifted } = effectiveNowForTerm(term, realNow);
  const daysRemaining = Math.max(
    0,
    Math.ceil((endOfDay(term.endDate).getTime() - effectiveNow.getTime()) / DAY_MS)
  );

  return { term, realNow, effectiveNow, timeShifted, daysRemaining };
}
