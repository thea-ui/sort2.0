import { Prisma } from '@prisma/client';
import { getTermStatus, TermState } from './certificate.service.js';

// Challenges with no academic-term scope are treated as global/legacy.
export const GLOBAL_QUARTER_CODE = 'GLOBAL';

export interface ChallengeScope {
  termState: TermState;
  quarterCode: string | null;
  // Term codes whose challenges are visible/accruable right now.
  visibleQuarterCodes: string[];
  canAccrue: boolean;
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
  const term = await getTermStatus();

  if (term.state === 'IN_TERM' && term.quarterCode) {
    return {
      termState: term.state,
      quarterCode: term.quarterCode,
      visibleQuarterCodes: [term.quarterCode],
      canAccrue: true,
    };
  }

  if (term.state === 'NO_TERM') {
    return {
      termState: term.state,
      quarterCode: null,
      visibleQuarterCodes: [GLOBAL_QUARTER_CODE],
      canAccrue: true,
    };
  }

  return {
    termState: term.state,
    quarterCode: term.quarterCode,
    visibleQuarterCodes: [],
    canAccrue: false,
  };
}

/** A challenge is only visible inside its own start/end window. */
export function challengeWindowWhere(now: Date = new Date()): Prisma.ChallengeWhereInput {
  return {
    AND: [
      { OR: [{ startDate: null }, { startDate: { lte: now } }] },
      { OR: [{ endDate: null }, { endDate: { gte: now } }] },
    ],
  };
}
