import { Prisma, Role, ChallengeType } from '@prisma/client';
import {
  resolveChallengeScope,
  challengeWindowWhere,
  challengeSchoolYearWhere,
} from './challenge-term.service.js';

export interface ChallengeCompletion {
  userId: string;
  challengeId: string;
  title: string;
  pointsAwarded: number;
}

interface ReportInfo {
  id: string;
  reporterId: string;
  category: string;
  locationKey: string;
  schoolYearId: string | null;
}

interface ContributionResult {
  completions: ChallengeCompletion[];
}

async function handleChallengeCompletion(
  tx: Prisma.TransactionClient,
  userId: string,
  challengeId: string,
  challengeTitle: string,
  challengeTarget: number,
  challengePoints: number,
  schoolYearId: string | null,
): Promise<ChallengeCompletion | null> {
  const updatedProgress = await tx.userChallengeProgress.findUnique({
    where: { userId_challengeId: { userId, challengeId } },
  });

  if (!updatedProgress || updatedProgress.currentCount < challengeTarget || updatedProgress.completedAt) {
    return null;
  }

  // Compare-and-swap: only one transaction can flip completedAt from null, so
  // concurrent completions (same user, different streams) can never double-pay
  // or hit the point_histories unique index inside an open transaction.
  const [updatedCount] = await Promise.all([
    tx.userChallengeProgress.updateMany({
      where: { userId, challengeId, completedAt: null },
      data: {
        completedAt: new Date(),
        ...(challengePoints > 0 ? { rewardedAt: new Date() } : {}),
      },
    }),
  ]);

  if (updatedCount.count === 0) return null;

  if (challengePoints > 0) {
    await tx.user.update({
      where: { id: userId },
      data: { points: { increment: challengePoints } },
    });

    await tx.pointHistory.create({
      data: {
        userId,
        amount: challengePoints,
        reason: `Challenge Completed: ${challengeTitle} (+${challengePoints} pts)`,
        challengeId,
        schoolYearId,
      },
    });
  }

  return { userId, challengeId, title: challengeTitle, pointsAwarded: challengePoints };
}

async function findActiveChallenges(tx: Prisma.TransactionClient, challengeType: ChallengeType) {
  const scope = await resolveChallengeScope();

  // The term is over (GRACE/CLOSED) or no scope is available — nothing accrues.
  if (!scope.canAccrue || scope.visibleQuarterCodes.length === 0) return [];

  return tx.challenge.findMany({
    where: {
      isActive: true,
      challengeType,
      // With no configured term, every challenge of the active year stays in
      // play (legacy GLOBAL behavior); otherwise scope to the active term.
      ...(scope.quarterCode ? { quarterCode: { in: scope.visibleQuarterCodes } } : {}),
      ...challengeSchoolYearWhere(scope),
      ...challengeWindowWhere(scope.effectiveNow),
    },
  });
}

export async function recordReportContribution(
  tx: Prisma.TransactionClient,
  report: ReportInfo,
): Promise<ContributionResult> {
  const completions: ChallengeCompletion[] = [];

  const reporter = await tx.user.findUnique({
    where: { id: report.reporterId },
    select: { id: true, role: true },
  });
  if (!reporter || reporter.role !== Role.STUDENT) return { completions };

  const challenges = await findActiveChallenges(tx, ChallengeType.REPORT_COUNT);

  for (const challenge of challenges) {
    // A contribution is one (user, challenge, report) row. Re-submitting the
    // same report must not attempt a duplicate insert: inside a Postgres
    // transaction a P2002 aborts the whole transaction, so a catch-and-continue
    // would corrupt every following statement (the original bug).
    const alreadyCounted = await tx.challengeContribution.findUnique({
      where: {
        userId_challengeId_reportId: {
          userId: report.reporterId,
          challengeId: challenge.id,
          reportId: report.id,
        },
      },
      select: { id: true },
    });
    if (alreadyCounted) continue;

    await tx.challengeContribution.create({
      data: {
        userId: report.reporterId,
        challengeId: challenge.id,
        reportId: report.id,
        value: 1,
      },
    });

    await tx.userChallengeProgress.upsert({
      where: { userId_challengeId: { userId: report.reporterId, challengeId: challenge.id } },
      create: {
        userId: report.reporterId,
        challengeId: challenge.id,
        currentCount: 1,
      },
      update: {
        currentCount: { increment: 1 },
      },
    });

    const completion = await handleChallengeCompletion(
      tx, report.reporterId, challenge.id,
      challenge.title, challenge.target, challenge.pointsAwarded,
      report.schoolYearId,
    );

    if (completion) completions.push(completion);
  }

  return { completions };
}

export async function recordWeightContribution(
  tx: Prisma.TransactionClient,
  report: ReportInfo,
  kg: number,
): Promise<ContributionResult> {
  const completions: ChallengeCompletion[] = [];
  if (kg <= 0) return { completions };

  const reporter = await tx.user.findUnique({
    where: { id: report.reporterId },
    select: { id: true, role: true },
  });
  if (!reporter || reporter.role !== Role.STUDENT) return { completions };

  const challenges = await findActiveChallenges(tx, ChallengeType.WEIGHT_COLLECTED);

  for (const challenge of challenges) {
    // Same duplicate guard as recordReportContribution: a re-saved weight edit
    // must not insert a second contribution (or abort the transaction).
    const alreadyCounted = await tx.challengeContribution.findUnique({
      where: {
        userId_challengeId_reportId: {
          userId: report.reporterId,
          challengeId: challenge.id,
          reportId: report.id,
        },
      },
      select: { id: true },
    });
    if (alreadyCounted) continue;

    await tx.challengeContribution.create({
      data: {
        userId: report.reporterId,
        challengeId: challenge.id,
        reportId: report.id,
        value: kg,
      },
    });

    const grams = Math.round(kg * 1000);
    await tx.userChallengeProgress.upsert({
      where: { userId_challengeId: { userId: report.reporterId, challengeId: challenge.id } },
      create: {
        userId: report.reporterId,
        challengeId: challenge.id,
        currentCount: grams,
      },
      update: {
        currentCount: { increment: grams },
      },
    });

    const completion = await handleChallengeCompletion(
      tx, report.reporterId, challenge.id,
      challenge.title, challenge.target, challenge.pointsAwarded,
      report.schoolYearId,
    );

    if (completion) completions.push(completion);
  }

  return { completions };
}
