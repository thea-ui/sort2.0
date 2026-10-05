import { Prisma, ReportStatus, WasteCategory } from '@prisma/client';

/**
 * A bin stream is the set of reports sharing a location + category + school
 * year. Dispatch and collection both act on the whole stream, never a single
 * report in isolation.
 */
export interface ReportStream {
  locationKey: string;
  category: WasteCategory;
  schoolYearId: string | null;
}

type ReportClient = Pick<Prisma.TransactionClient, 'report'>;

const ACTIVE_STATUSES = [ReportStatus.PENDING, ReportStatus.DISPATCHED];

/**
 * Count active (PENDING/DISPATCHED) stream reports that an admin has not
 * approved yet. Dispatch is stream-wide, so any unverified active report blocks
 * the whole stream: otherwise dispatching one report would silently dispatch
 * its unverified siblings.
 */
export async function countUnverifiedActiveStreamReports(
  client: ReportClient,
  stream: ReportStream,
): Promise<number> {
  return client.report.count({
    where: {
      locationKey: stream.locationKey,
      category: stream.category,
      schoolYearId: stream.schoolYearId,
      status: { in: ACTIVE_STATUSES },
      isVerified: false,
    },
  });
}

/**
 * Assign one collector to every active report in the stream. Mirrors the
 * stream-wide resolution performed on collection so a single dispatch covers
 * all sibling reports at the location. Terminal reports are never touched, and
 * a missing assignee only advances the status without clearing prior ones.
 */
export async function dispatchStreamWithinTransaction(
  tx: ReportClient,
  stream: ReportStream,
  assignedMrfId?: string | null,
): Promise<number> {
  const data: Prisma.ReportUncheckedUpdateManyInput = { status: ReportStatus.DISPATCHED };
  if (assignedMrfId) {
    data.assignedMrfId = assignedMrfId;
  }

  const result = await tx.report.updateMany({
    where: {
      locationKey: stream.locationKey,
      category: stream.category,
      schoolYearId: stream.schoolYearId,
      status: { in: ACTIVE_STATUSES },
    },
    data,
  });

  return result.count;
}
