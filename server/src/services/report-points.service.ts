import { PrismaClient, Prisma, ReportStatus, Role } from '@prisma/client';
import { recordReportContribution } from './challenge-progress.service.js';
import { BIN_RESET_TZ, computeResetCycleStart, DEFAULT_RESET_TIME } from './reset-cycle.service.js';
import { buildStreamAwardPlan } from './report-award-plan.js';

const prisma = new PrismaClient();

function streamLockKey(locationKey: string, category: string, schoolYearId: string): number {
  const raw = `${locationKey}::${category}::${schoolYearId}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return Math.abs(hash);
}

export interface VerifyAward {
  reportId: string;
  userId: string;
  amount: number;
  rank: number;
}

export interface AwardResult {
  updatedReports: any[];
  awards: VerifyAward[];
  challengeCompletions: { userId: string; challengeId: string; title: string; pointsAwarded: number }[];
}

export interface ApproveResult {
  updatedReports: any[];
  alreadyProcessed: boolean;
}

/**
 * Admin approval step. Marks reports as verified ONLY — it never grants points,
 * ranks, or challenge progress. Points are awarded later, when the report is
 * collected by the MRF (see awardCollectedReportsWithinTransaction).
 */
export async function approveReports(reportIds: string[]): Promise<ApproveResult> {
  if (reportIds.length === 0) return { updatedReports: [], alreadyProcessed: false };
  const uniqueIds = [...new Set(reportIds)];

  const targets = await prisma.report.findMany({
    where: { id: { in: uniqueIds } },
    select: { locationKey: true, category: true, schoolYearId: true },
  });

  // Approving a report approves its whole stream (same behaviour as before).
  // The whole stream is also re-checked for reports that were collected while
  // still unverified: verification must not strand their points forever.
  const seenStreams = new Set<string>();
  for (const target of targets) {
    const key = `${target.locationKey}::${target.category}::${target.schoolYearId ?? 'null'}`;
    if (seenStreams.has(key)) continue;
    seenStreams.add(key);

    await prisma.$transaction(async (tx) => {
      await tx.report.updateMany({
        where: {
          locationKey: target.locationKey,
          category: target.category,
          schoolYearId: target.schoolYearId,
          status: { not: ReportStatus.DISMISSED },
        },
        data: { isVerified: true },
      });

      const collectedUncredited = await tx.report.count({
        where: {
          locationKey: target.locationKey,
          category: target.category,
          schoolYearId: target.schoolYearId,
          status: { in: [ReportStatus.COLLECTED, ReportStatus.RESOLVED] },
          pointsAwardedAt: null,
        },
      });
      if (collectedUncredited > 0) {
        await awardCollectedReportsWithinTransaction(tx, {
          locationKey: target.locationKey,
          category: target.category,
          schoolYearId: target.schoolYearId,
        });
      }
    });
  }

  const updated = await prisma.report.findMany({
    where: { id: { in: uniqueIds } },
    include: {
      reporter: { select: { id: true, name: true, role: true, email: true } },
      assignedMrf: { select: { id: true, name: true } },
    },
  });

  return { updatedReports: updated, alreadyProcessed: false };
}

export interface StreamParams {
  locationKey: string;
  category: string;
  schoolYearId: string | null;
}

/**
 * Award points and ranks for all COLLECTED/RESOLVED, admin-approved reports in a
 * stream. Runs inside the caller's transaction so stream resolution and credit
 * are atomic.
 *
 * Rules:
 * - Only students receive points; faculty are marked credited with 0.
 * - Rank is assigned in submission order (createdAt) among the stream's
 *   collected reports, continuing from the highest rank credited within the
 *   current daily-reset cycle. Ranks restart at every reset boundary, so the
 *   first report collected after the reset is 1st Reporter again.
 * - Reports that were never approved (isVerified = false) or that are not yet
 *   collected are skipped, so EXPIRED/DISMISSED reports never earn points.
 * - Idempotent: guarded by `pointsAwardedAt: null`.
 */
export async function awardCollectedReportsWithinTransaction(
  tx: Prisma.TransactionClient,
  stream: StreamParams
): Promise<AwardResult> {
  const { locationKey, category } = stream;
  const schoolYearId = stream.schoolYearId ?? '';

  const lockKey = streamLockKey(locationKey, category, schoolYearId);
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

  const pointRules = await tx.pointRule.findMany({ orderBy: { rank: 'asc' } });
  if (pointRules.length === 0) {
    throw new Error('PointRule table is empty — server misconfigured');
  }
  const rankPointsMap = pointRules.map((r) => r.pointsAwarded);

  // Ranks restart at each daily reset boundary: only credits from the current
  // cycle continue the rank sequence (see reset-cycle.service.ts).
  const settings = await tx.systemSetting.findUnique({ where: { id: 'default_setting' } });
  const cycleStart = computeResetCycleStart(
    new Date(),
    settings?.binResetTime || DEFAULT_RESET_TIME,
    BIN_RESET_TZ
  );

  const streamWhere: any = {
    locationKey,
    category,
    status: { in: [ReportStatus.COLLECTED, ReportStatus.RESOLVED] },
  };
  if (schoolYearId) {
    streamWhere.schoolYearId = schoolYearId;
  } else {
    streamWhere.schoolYearId = null;
  }

  const streamReports = await tx.report.findMany({
    where: streamWhere,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    include: { reporter: { select: { id: true, role: true, name: true } } },
  });

  const reporterIds = [...new Set(streamReports.map((r) => r.reporterId))];
  const reporters = await tx.user.findMany({
    where: { id: { in: reporterIds } },
    select: { id: true, role: true },
  });
  const facultyIds = new Set(
    reporters
      .filter((r) => r.role === Role.TEACHER || r.role === Role.ADMIN || r.role === Role.MRF)
      .map((r) => r.id)
  );

  const maxProcessedRank = streamReports
    .filter(
      (r) =>
        r.pointsAwardedAt !== null &&
        r.pointsAwardedAt >= cycleStart &&
        r.reporterRank !== null &&
        !facultyIds.has(r.reporterId)
    )
    .reduce((max, r) => Math.max(max, r.reporterRank!), 0);

  const streamUpdates = buildStreamAwardPlan(streamReports, {
    facultyIds,
    startRank: maxProcessedRank,
    rankPointsMap,
  });

  const updatedReports: any[] = [];
  const awards: VerifyAward[] = [];
  const challengeCompletions: AwardResult['challengeCompletions'] = [];

  for (const { report, rank, points } of streamUpdates) {
    const updateResult = await tx.report.updateMany({
      where: { id: report.id, pointsAwardedAt: null },
      data: {
        isVerified: true,
        reporterRank: rank,
        pointsAwarded: points,
        pointsAwardedAt: new Date(),
      },
    });

    if (updateResult.count === 0) continue;

    const updatedReport = await tx.report.findUnique({
      where: { id: report.id },
      include: {
        reporter: { select: { id: true, name: true, role: true, email: true } },
        assignedMrf: { select: { id: true, name: true } },
      },
    });

    if (updatedReport) updatedReports.push(updatedReport);

    if (points > 0 && rank !== null) {
      await tx.user.update({
        where: { id: report.reporterId },
        data: { points: { increment: points } },
      });

      const ordinal = rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`;
      await tx.pointHistory.create({
        data: {
          userId: report.reporterId,
          amount: points,
          reason: `Collected Report: ${ordinal} Reporter Bonus (+${points} pts) for ${report.locationName}`,
          reportId: report.id,
          schoolYearId: report.schoolYearId,
        },
      });

      awards.push({ reportId: report.id, userId: report.reporterId, amount: points, rank });
    }

    const challengeEvent = report.category === 'HAZARDOUS' ? 'HAZARDOUS_REPORT' : 'REPORT_COUNT';
    const { completions } = await recordReportContribution(tx, {
      id: report.id,
      reporterId: report.reporterId,
      category: report.category,
      locationKey: report.locationKey,
      schoolYearId: report.schoolYearId,
    }, challengeEvent);
    challengeCompletions.push(...completions);
  }

  return { updatedReports, awards, challengeCompletions };
}

export function formatReportResponse(report: any) {
  return {
    id: report.id,
    title: report.title,
    description: report.description,
    status: report.status,
    urgency: report.urgency,
    category: report.category,
    coordinates: { lat: report.lat, lng: report.lng },
    locationName: report.locationName,
    reporterId: report.reporterId,
    reporterName: report.reporter?.name || report.reporterName,
    reporterRole: (report.reporter?.role || report.reporterRole || 'STUDENT').toLowerCase(),
    pointsAwarded: report.pointsAwarded,
    reporterRank: report.reporterRank,
    pointsAwardedAt: report.pointsAwardedAt?.toISOString() || null,
    timestamp: report.createdAt?.toISOString() || report.timestamp,
    completedAt: report.completedAt?.toISOString() || null,
    imageUrl: report.imageUrl,
    weightCollected: report.weightCollected,
    isVerified: report.isVerified,
    assignedMrfId: report.assignedMrfId,
    assignedMrfName: report.assignedMrf?.name || report.assignedMrfName,
    reportType: report.reportType,
  };
}
