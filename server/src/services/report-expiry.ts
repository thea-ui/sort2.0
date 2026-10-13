import type { Prisma } from '@prisma/client';

/**
 * Shared report-expiry predicate for the daily bin reset
 * (see bin-reset.service.ts).
 *
 * The teacher portal describes asset reports with a `[PILLAR: …]` marker, but
 * legacy rows may be mis-typed as WASTE. The marker exclusion is a defensive
 * second guard, so the reset can never expire an asset report even if its
 * `report_type` is wrong.
 *
 * This module is intentionally free of runtime Prisma imports so it can be
 * unit-tested and reused by read-only scripts without a database client.
 */
export const ASSET_DESCRIPTION_MARKERS = [
  '[PILLAR: FURNITURE]',
  '[PILLAR: ELECTRONICS]',
  '[PILLAR: FIXTURES]',
  '[PILLAR: EQUIPMENT]',
  '[PILLAR: OTHER]',
] as const;

/**
 * Where-clause for reports the daily reset may expire: WASTE only, excluding
 * rows whose description carries an asset pillar marker. Callers add the
 * status constraint — both PENDING and DISPATCHED waste expire with the day.
 */
export function buildExpirableWasteWhere(): Prisma.ReportWhereInput {
  return {
    reportType: 'WASTE',
    NOT: {
      OR: ASSET_DESCRIPTION_MARKERS.map((marker) => ({
        description: { contains: marker, mode: 'insensitive' as const },
      })),
    },
  };
}
