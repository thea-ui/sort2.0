/**
 * Pure rank/points planner for a collected bin stream. Kept free of Prisma
 * runtime imports so the student-only + faculty-skip rules can be unit tested
 * without a database. The full rules live in report-points.service.ts.
 */
export interface StreamAwardCandidate {
  id: string;
  reporterId: string;
  isVerified: boolean;
  pointsAwardedAt: Date | null;
}

export interface StreamAwardPlanEntry<T> {
  report: T;
  rank: number | null;
  points: number;
}

export function buildStreamAwardPlan<T extends StreamAwardCandidate>(
  streamReports: T[],
  options: {
    facultyIds: ReadonlySet<string>;
    startRank: number;
    rankPointsMap: number[];
  },
): StreamAwardPlanEntry<T>[] {
  const plan: StreamAwardPlanEntry<T>[] = [];
  let studentRank = options.startRank;

  for (const report of streamReports) {
    // Idempotency: anything already credited (students and faculty alike) is
    // skipped, as is any report the admin never approved.
    if (report.pointsAwardedAt) continue;
    if (!report.isVerified) continue;

    // Faculty never earn points or ranks, and do not consume a student slot.
    if (options.facultyIds.has(report.reporterId)) {
      plan.push({ report, rank: null, points: 0 });
      continue;
    }

    studentRank++;
    const points =
      studentRank <= options.rankPointsMap.length ? options.rankPointsMap[studentRank - 1] : 0;
    plan.push({ report, rank: studentRank, points });
  }

  return plan;
}
