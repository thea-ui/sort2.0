/**
 * Pure decision helpers for the EnrollPro sync engine.
 *
 * These guard the two ways a sync can destroy local data when the provider
 * misbehaves: archiving a cohort because a degraded response looked empty, and
 * purging LOCAL accounts that exist on purpose. They are separated from the
 * service so the rules can be unit-tested without a database or a network.
 */

export type RosterCohort = 'learners' | 'faculty' | 'staff';

export interface RosterGuardInput {
  /** Records returned by the cohort fetch. */
  pulled: number;
  /** Set when the fetch itself failed (rejected or non-OK page). */
  fetchError?: string;
  /** Local, un-archived, EnrollPro-sourced accounts belonging to this cohort. */
  localCount: number;
  /** Explicit operator override for a genuinely empty roster. */
  allowEmpty: boolean;
}

export interface RosterGuardDecision {
  /** True only when the roster is trustworthy enough to archive missing accounts. */
  reconcile: boolean;
  reason?: string;
}

/**
 * Decide whether a roster may drive archive reconciliation.
 *
 * An HTTP 200 with an empty payload is indistinguishable from "nobody is
 * enrolled" once it reaches us, yet treating it as authoritative archives the
 * entire cohort. So an empty roster is only trusted when there is nothing local
 * to archive, or when an operator explicitly overrides it.
 */
export function assessRoster(input: RosterGuardInput): RosterGuardDecision {
  if (input.fetchError) {
    return { reconcile: false, reason: input.fetchError };
  }
  if (input.pulled === 0 && input.localCount > 0 && !input.allowEmpty) {
    return {
      reconcile: false,
      reason:
        `EMPTY_ROSTER_SUSPECTED: 0 records returned while ${input.localCount} local accounts exist; ` +
        'reconciliation skipped (pass allowEmpty to override)',
    };
  }
  return { reconcile: true };
}

export interface LocalAccountPurgeInput {
  enrollmentStatus: string | null;
  /** Relation counts (reports, points, walk-ins, claims, sessions, ...). */
  activityCounts: number[];
}

/**
 * A LOCAL account may be purged only when it owns no data AND is not a
 * deliberate offline walk-in demo account. OFFLINE_DEMO accounts are seeded so
 * the MRF station can be demonstrated without EnrollPro; purging them would
 * silently empty the walk-in roster on the next successful sync.
 */
export function isPurgeableLocalAccount(account: LocalAccountPurgeInput): boolean {
  if (account.enrollmentStatus === 'OFFLINE_DEMO') return false;
  return account.activityCounts.every((count) => count === 0);
}
