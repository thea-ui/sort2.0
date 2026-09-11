import { PrismaClient, Prisma, ReportStatus, Role } from '@prisma/client';
import { recordReportContribution } from './challenge-progress.service.js';

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

export interface VerifyResult {
  updatedReports: any[];
  awards: VerifyAward[];
  challengeCompletions: { userId: string; challengeId: string; title: string; pointsAwarded: number }[];
  alreadyProcessed: boolean;
}

export async function verifyReports(reportIds: string[]): Promise<VerifyResult> {
  if (reportIds.length === 0) {
    return { updatedReports: [], awards: [], challengeCompletions: [], alreadyProcessed: false };
  }

  const uniqueIds = [...new Set(reportIds)];

  const targetReports = await prisma.report.findMany({
    where: { id: { in: uniqueIds } },
    include: {
      reporter: { select: { id: true, role: true } },
    },
  });

  if (targetReports.length === 0) {
    return { updatedReports: [], awards: [], challengeCompletions: [], alreadyProcessed: false };
  }

  const allProcessed = targetReports.every(r => r.pointsAwardedAt !== null);

  const streamMap = new Map<string, typeof targetReports>();
  for (const report of targetReports) {
    const key = `${report.locationKey}::${report.category}::${report.schoolYearId ?? 'null'}`;
    if (!streamMap.has(key)) streamMap.set(key, []);
    streamMap.get(key)!.push(report);
  }

  const allUpdatedReports: any[] = [];
  const allAwards: VerifyAward[] = [];
  const allChallengeCompletions: VerifyResult['challengeCompletions'] = [];

  for (const [, reports] of streamMap) {
    const firstReport = reports[0];
    const locationKey = firstReport.locationKey;
    const category = firstReport.category;
    const schoolYearId = firstReport.schoolYearId ?? '';

    const result = await prisma.$transaction(async (tx) => {
      const lockKey = streamLockKey(locationKey, category, schoolYearId);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

      const pointRules = await tx.pointRule.findMany({
        orderBy: { rank: 'asc' },
      });
      if (pointRules.length === 0) {
        throw new Error('PointRule table is empty — server misconfigured');
      }
      const rankPointsMap = pointRules.map(r => r.pointsAwarded);

      const streamWhere: any = {
        locationKey,
        category,
        status: { notIn: [ReportStatus.DISMISSED] },
      };
      if (schoolYearId) {
        streamWhere.schoolYearId = schoolYearId;
      } else {
        streamWhere.schoolYearId = null;
      }

      const streamReports = await tx.report.findMany({
        where: streamWhere,
        orderBy: [
          { createdAt: 'asc' },
          { id: 'asc' },
        ],
        include: {
          reporter: { select: { id: true, role: true, name: true } },
        },
      });

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

      const maxProcessedRank = streamReports
        .filter(r => r.pointsAwardedAt !== null && r.reporterRank !== null && !facultyIds.has(r.reporterId))
        .reduce((max, r) => Math.max(max, r.reporterRank!), 0);

      let studentRank = maxProcessedRank;

      const streamUpdates: { report: typeof streamReports[0]; rank: number | null; points: number }[] = [];

      for (const report of streamReports) {
        const isFaculty = facultyIds.has(report.reporterId);

        if (isFaculty) {
          if (!report.pointsAwardedAt) {
            streamUpdates.push({ report, rank: null, points: 0 });
          }
          continue;
        }

        if (report.pointsAwardedAt) {
          continue;
        }

        studentRank++;
        const pts = studentRank <= rankPointsMap.length ? rankPointsMap[studentRank - 1] : 0;
        streamUpdates.push({ report, rank: studentRank, points: pts });
      }

      const updatedReports: any[] = [];
      const awards: VerifyAward[] = [];

      for (const { report, rank, points } of streamUpdates) {
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

        if (updateResult.count === 0) continue;

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
          await tx.user.update({
            where: { id: report.reporterId },
            data: { points: { increment: points } },
          });

          const ordinal = rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`;
          await tx.pointHistory.create({
            data: {
              userId: report.reporterId,
              amount: points,
              reason: `Verified Report: ${ordinal} Reporter Bonus (+${points} pts) for ${report.locationName}`,
              reportId: report.id,
              schoolYearId: report.schoolYearId,
            },
          });

          awards.push({
            reportId: report.id,
            userId: report.reporterId,
            amount: points,
            rank,
          });
        }

        const challengeEvent = report.category === 'HAZARDOUS' ? 'HAZARDOUS_REPORT' : 'REPORT_COUNT';
        const { completions: reportCompletions } = await recordReportContribution(tx, {
          id: report.id,
          reporterId: report.reporterId,
          category: report.category,
          locationKey: report.locationKey,
          schoolYearId: report.schoolYearId,
        }, challengeEvent);
        allChallengeCompletions.push(...reportCompletions);
      }

      return { updatedReports, awards };
    }, {
      maxWait: 10000,
      timeout: 30000,
    });

    allUpdatedReports.push(...result.updatedReports);
    allAwards.push(...result.awards);
  }

  return {
    updatedReports: allUpdatedReports,
    awards: allAwards,
    challengeCompletions: allChallengeCompletions,
    alreadyProcessed: allProcessed,
  };
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
    imageUrl: report.imageUrl,
    weightCollected: report.weightCollected,
    isVerified: report.isVerified,
    assignedMrfId: report.assignedMrfId,
    assignedMrfName: report.assignedMrf?.name || report.assignedMrfName,
    reportType: report.reportType,
  };
}
