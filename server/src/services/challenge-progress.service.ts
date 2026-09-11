import { Prisma, Role, ChallengeType } from '@prisma/client';

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

  const [updatedCount] = await Promise.all([
    tx.userChallengeProgress.updateMany({
      where: { userId, challengeId, completedAt: null },
      data: { completedAt: new Date() },
    }),
  ]);

  if (updatedCount.count === 0) return null;

  if (challengePoints > 0) {
    const alreadyRewarded = await tx.pointHistory.findFirst({
      where: { userId, challengeId },
      select: { id: true },
    });

    if (!alreadyRewarded) {
      try {
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

        await tx.userChallengeProgress.update({
          where: { userId_challengeId: { userId, challengeId } },
          data: { rewardedAt: new Date() },
        });
      } catch (err: any) {
        if (err?.code !== 'P2002') throw err;
      }
    }
  }

  return { userId, challengeId, title: challengeTitle, pointsAwarded: challengePoints };
}

async function findActiveChallenges(tx: Prisma.TransactionClient, challengeType: ChallengeType) {
  return tx.challenge.findMany({
    where: {
      isActive: true,
      challengeType,
      OR: [
        { startDate: null, endDate: null },
        { startDate: { lte: new Date() }, endDate: null },
        { startDate: null, endDate: { gte: new Date() } },
        { startDate: { lte: new Date() }, endDate: { gte: new Date() } },
      ],
    },
  });
}

export async function recordReportContribution(
  tx: Prisma.TransactionClient,
  report: ReportInfo,
  event: 'REPORT_COUNT' | 'HAZARDOUS_REPORT',
): Promise<ContributionResult> {
  const completions: ChallengeCompletion[] = [];

  const reporter = await tx.user.findUnique({
    where: { id: report.reporterId },
    select: { id: true, role: true },
  });
  if (!reporter || reporter.role !== Role.STUDENT) return { completions };

  const challengeType = event === 'HAZARDOUS_REPORT' ? ChallengeType.HAZARDOUS_REPORT : ChallengeType.REPORT_COUNT;
  const challenges = await findActiveChallenges(tx, challengeType);

  for (const challenge of challenges) {
    try {
      await tx.challengeContribution.create({
        data: {
          userId: report.reporterId,
          challengeId: challenge.id,
          reportId: report.id,
          value: 1,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') continue;
      throw err;
    }

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
    try {
      await tx.challengeContribution.create({
        data: {
          userId: report.reporterId,
          challengeId: challenge.id,
          reportId: report.id,
          value: kg,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') continue;
      throw err;
    }

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
