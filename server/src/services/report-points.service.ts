import { PrismaClient, ReportStatus, Role } from '@prisma/client';
import { getActiveSchoolYearId } from './rollover.service.js';

const prisma = new PrismaClient();

/**
 * Generate a deterministic advisory lock key from a stream identifier.
 * Uses a simple hash to produce a bigint suitable for pg_advisory_xact_lock.
 */
function streamLockKey(locationName: string, category: string, schoolYearId: string): number {
  const raw = `${locationName}::${category}::${schoolYearId}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  // Ensure positive and within safe integer range for pg advisory locks
  return Math.abs(hash);
}

interface VerifyResult {
  updatedReports: any[];
  awards: { reportId: string; userId: string; amount: number; rank: number }[];
}

/**
 * Core atomic, idempotent points-awarding service.
 * 
 * Uses a PostgreSQL advisory transaction lock per stream (locationName + category + schoolYearId)
 * to serialize concurrent verification requests. This prevents duplicate awards.
 * 
 * The complete active stream is ranked chronologically (createdAt ASC, id ASC as tie-breaker).
 * Already-awarded reports preserve their rank. New reports get the next available rank.
 * Faculty reports are marked processed but do not consume a student rank.
 * 
 * @param reportIds - IDs of reports to verify in this stream
 * @returns Updated reports and award details
 */
export async function verifyReports(reportIds: string[]): Promise<VerifyResult> {
  if (reportIds.length === 0) {
    return { updatedReports: [], awards: [] };
  }

  // Deduplicate
  const uniqueIds = [...new Set(reportIds)];

  // Load target reports to determine their streams
  const targetReports = await prisma.report.findMany({
    where: { id: { in: uniqueIds } },
    include: {
      reporter: { select: { id: true, role: true } },
    },
  });

  if (targetReports.length === 0) {
    return { updatedReports: [], awards: [] };
  }

  // Group by stream (locationName + category). Reports with null schoolYearId
  // belong to the same stream as reports with a specific schoolYearId.
  const streamMap = new Map<string, typeof targetReports>();
  for (const report of targetReports) {
    const key = `${report.locationName}::${report.category}`;
    if (!streamMap.has(key)) streamMap.set(key, []);
    streamMap.get(key)!.push(report);
  }

  const allUpdatedReports: any[] = [];
  const allAwards: VerifyResult['awards'] = [];

  // Process each stream in a transaction
  for (const [, reports] of streamMap) {
    const firstReport = reports[0];
    const locationName = firstReport.locationName;
    const category = firstReport.category;
    const schoolYearId = firstReport.schoolYearId || await getActiveSchoolYearId() || '';

    const result = await prisma.$transaction(async (tx) => {
      // Acquire advisory lock for this stream to serialize concurrent requests
      const lockKey = streamLockKey(locationName, category, schoolYearId);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

      // Load point rules (with fallback if table is empty)
      const pointRules = await tx.pointRule.findMany({
        orderBy: { rank: 'asc' },
      });
      const rankPointsMap = pointRules.length > 0
        ? pointRules.map(r => r.pointsAwarded)
        : [15, 10, 5];

      // Load the COMPLETE stream in chronological order (including already-awarded reports)
      // Include reports with matching schoolYearId OR null schoolYearId (legacy reports)
      const streamReports = await tx.report.findMany({
        where: {
          locationName,
          category,
          OR: [
            { schoolYearId },
            { schoolYearId: null },
          ],
          status: { notIn: [ReportStatus.DISMISSED] },
        },
        orderBy: [
          { createdAt: 'asc' },
          { id: 'asc' },
        ],
        include: {
          reporter: { select: { id: true, role: true, name: true } },
        },
      });

      // Determine which reporters are faculty (never earn points)
      const reporterIds = [...new Set(streamReports.map(r => r.reporterId))];
      const reporters = await tx.user.findMany({
        where: { id: { in: reporterIds } },
        select: { id: true, role: true },
      });
      const facultyIds = new Set(
        reporters
          .filter(r => r.role === Role.TEACHER || r.role === Role.ADMIN || r.role === Role.MRF)
          .map(r => r.id)
      );

      // Rank eligible student reports sequentially, skipping already-awarded
      let studentRank = 0;
      const streamUpdates: { report: typeof streamReports[0]; rank: number | null; points: number }[] = [];

      for (const report of streamReports) {
        const isFaculty = facultyIds.has(report.reporterId);

        if (isFaculty) {
          // Faculty: mark as processed (verified) but no rank, no points
          if (!report.pointsAwardedAt) {
            streamUpdates.push({ report, rank: null, points: 0 });
          }
          continue;
        }

        // Student report
        if (report.pointsAwardedAt) {
          // Already processed - preserve existing rank, skip
          continue;
        }

        // New unprocessed student report - assign next rank
        studentRank++;
        const pts = studentRank <= rankPointsMap.length ? rankPointsMap[studentRank - 1] : 0;
        streamUpdates.push({ report, rank: studentRank, points: pts });
      }

      // Apply updates within the transaction
      const updatedReports: any[] = [];
      const awards: VerifyResult['awards'] = [];

      for (const { report, rank, points } of streamUpdates) {
        // Conditional update: only process if not already processed (defense in depth)
        const updateResult = await tx.report.updateMany({
          where: {
            id: report.id,
            pointsAwardedAt: null,
          },
          data: {
            isVerified: true,
            reporterRank: rank,
            pointsAwarded: points,
            pointsAwardedAt: new Date(),
          },
        });

        if (updateResult.count === 0) {
          // Already processed by a concurrent request - skip
          continue;
        }

        // Fetch the updated report for the response
        const updatedReport = await tx.report.findUnique({
          where: { id: report.id },
          include: {
            reporter: { select: { id: true, name: true, role: true, email: true } },
            assignedMrf: { select: { id: true, name: true } },
          },
        });

        if (updatedReport) {
          updatedReports.push(updatedReport);
        }

        if (points > 0 && rank !== null) {
          // Increment user balance and create history entry
          await tx.user.update({
            where: { id: report.reporterId },
            data: { points: { increment: points } },
          });

          const ordinal = rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`;
          await tx.pointHistory.create({
            data: {
              userId: report.reporterId,
              amount: points,
              reason: `Verified Report: ${ordinal} Reporter Bonus (+${points} pts) for ${locationName}`,
              reportId: report.id,
              schoolYearId,
            },
          });

          awards.push({
            reportId: report.id,
            userId: report.reporterId,
            amount: points,
            rank,
          });
        }
      }

      return { updatedReports, awards };
    }, {
      maxWait: 10000,
      timeout: 30000,
    });

    allUpdatedReports.push(...result.updatedReports);
    allAwards.push(...result.awards);
  }

  return { updatedReports: allUpdatedReports, awards: allAwards };
}

/**
 * Format a report for API response (consistent across GET/POST/PATCH/batch)
 */
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
    imageUrl: report.imageUrl,
    weightCollected: report.weightCollected,
    isVerified: report.isVerified,
    assignedMrfId: report.assignedMrfId,
    assignedMrfName: report.assignedMrf?.name || report.assignedMrfName,
    reportType: report.reportType,
  };
}
