import dotenv from 'dotenv';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  computeMaterialPointsBreakdown,
  DEFAULT_MATERIAL_POINTS,
} from '../services/material-point-rules.js';

dotenv.config();
const prisma = new PrismaClient();

async function main() {
  const rules = await prisma.materialPointRule.findMany();
  const pointsByCode = new Map<string, number>(Object.entries(DEFAULT_MATERIAL_POINTS));
  for (const rule of rules) pointsByCode.set(rule.code, rule.points);

  const pointRules = await prisma.pointRule.findMany({ orderBy: { rank: 'asc' } });
  const rankPointsMap = pointRules.map((rule) => rule.pointsAwarded);

  const reports = await prisma.report.findMany({
    where: {
      pointsAwardedAt: { not: null },
      materials: { isEmpty: false },
      materialPointsBreakdown: { equals: Prisma.DbNull },
    },
    select: {
      id: true,
      title: true,
      reporterId: true,
      reporterRank: true,
      pointsAwarded: true,
      rankPointsAwarded: true,
      materialPointsAwarded: true,
      materials: true,
      locationName: true,
      schoolYearId: true,
      reporter: { select: { role: true } },
    },
  });

  let updated = 0;
  let totalDelta = 0;

  for (const report of reports) {
    if (report.reporter.role !== 'STUDENT') continue;

    const breakdown = computeMaterialPointsBreakdown(report.materials, pointsByCode);
    const materialPoints = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
    const rank = report.reporterRank ?? 0;
    const rankPoints =
      report.rankPointsAwarded > 0
        ? report.rankPointsAwarded
        : rank >= 1 && rank <= rankPointsMap.length
          ? rankPointsMap[rank - 1]
          : 0;
    const newTotal = rankPoints + materialPoints;
    const delta = newTotal - report.pointsAwarded;

    await prisma.$transaction(async (tx) => {
      await tx.report.update({
        where: { id: report.id },
        data: {
          pointsAwarded: newTotal,
          rankPointsAwarded: rankPoints,
          materialPointsAwarded: materialPoints,
          materialPointsBreakdown: breakdown,
        },
      });

      if (delta !== 0) {
        await tx.user.update({
          where: { id: report.reporterId },
          data: { points: { increment: delta } },
        });
      }

      const ledger = await tx.pointHistory.findFirst({
        where: { reportId: report.id },
        select: { id: true },
      });
      if (ledger) {
        const parts: string[] = [];
        if (rankPoints > 0) {
          const ordinal = rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`;
          parts.push(`${ordinal} Reporter Bonus (+${rankPoints} pts)`);
        }
        if (materialPoints > 0) parts.push(`Material Bonus (+${materialPoints} pts)`);
        await tx.pointHistory.update({
          where: { id: ledger.id },
          data: {
            amount: newTotal,
            reason: `Collected Report: ${parts.join(' + ')} for ${report.locationName}`,
          },
        });
      }
    });

    updated += 1;
    totalDelta += delta;
    console.log(
      `[Backfill] ${report.title}: ${report.pointsAwarded} -> ${newTotal} (${JSON.stringify(breakdown)})`,
    );
  }

  console.log(`[Backfill] Updated ${updated} report(s); total points delta ${totalDelta}.`);
}

main()
  .catch((error) => {
    console.error('[Backfill] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
