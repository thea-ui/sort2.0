import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type CertificateTierValue = 'MILESTONE' | 'CHAMPION' | 'LEADER' | 'ADVOCATE';
export type TermState = 'NO_TERM' | 'IN_TERM' | 'GRACE' | 'CLOSED';

export interface CertificateNames {
  milestone: string;
  champion: string;
  leader: string;
  advocate: string;
}

export interface TermStatus {
  quarterCode: string | null;
  quarterName: string | null;
  startDate: string | null;
  endDate: string | null;
  state: TermState;
  graceDays: number;
  graceEndsAt: string | null;
  daysRemaining: number;
  issuanceOpen: boolean;
  isPeriodOver: boolean;
  resultsReady: boolean;
  awardedCount: number;
}

export interface TermStanding {
  userId: string;
  name: string;
  gradeLevel: string | null;
  sectionName: string | null;
  termPoints: number;
  totalPoints: number;
}

export interface IssuedCertificate {
  id: string;
  userId: string;
  studentName: string;
  serial: string;
  tier: CertificateTierValue;
  name: string;
  rankAtIssue: number | null;
  pointsAtIssue: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(value: string | Date): Date {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(value: string | Date): Date {
  const d = new Date(value);
  d.setHours(23, 59, 59, 999);
  return d;
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * DAY_MS);
}

export async function getCertificateNames(): Promise<CertificateNames> {
  const s = await prisma.systemSetting.findUnique({ where: { id: 'default_setting' } });
  return {
    milestone: s?.certificateMilestoneName || 'Eco-Milestone Certificate',
    champion: s?.certificateChampionName || 'Eco-Champion Certificate',
    leader: s?.certificateLeaderName || 'Eco-Leader Certificate',
    advocate: s?.certificateAdvocateName || 'Eco-Advocate Certificate',
  };
}

export function tierMeta(tier: CertificateTierValue): { label: string; order: number } {
  switch (tier) {
    case 'CHAMPION':
      return { label: 'Rank 1 — Eco-Champion', order: 1 };
    case 'LEADER':
      return { label: 'Rank 2 — Eco-Leader', order: 2 };
    case 'ADVOCATE':
      return { label: 'Rank 3 — Eco-Advocate', order: 3 };
    default:
      return { label: 'Milestone', order: 4 };
  }
}

function nameForTier(tier: CertificateTierValue, names: CertificateNames): string {
  switch (tier) {
    case 'CHAMPION':
      return names.champion;
    case 'LEADER':
      return names.leader;
    case 'ADVOCATE':
      return names.advocate;
    default:
      return names.milestone;
  }
}

async function buildSerial(base: string): Promise<string> {
  let serial = base;
  let n = 2;
  // Guarantee uniqueness without relying on DB errors
  while (await prisma.certificate.findUnique({ where: { serial } })) {
    serial = `${base}-${n}`;
    n += 1;
  }
  return serial;
}

// ─── Term Status ──────────────────────────────────────────────────────

async function resolveGraceDays(): Promise<number> {
  const s = await prisma.systemSetting.findUnique({ where: { id: 'default_setting' } });
  return s?.certificateGraceDays ?? 3;
}

export async function getTermStatus(quarterCode?: string): Promise<TermStatus> {
  const graceDays = await resolveGraceDays();

  const quarter = quarterCode
    ? await prisma.academicQuarter.findUnique({ where: { quarterCode } })
    : await prisma.academicQuarter.findFirst({ where: { isActive: true } });

  const empty: TermStatus = {
    quarterCode: null,
    quarterName: null,
    startDate: null,
    endDate: null,
    state: 'NO_TERM',
    graceDays,
    graceEndsAt: null,
    daysRemaining: 0,
    issuanceOpen: false,
    isPeriodOver: false,
    resultsReady: false,
    awardedCount: 0,
  };

  if (!quarter) return empty;

  const now = new Date();
  const end = endOfDay(quarter.endDate);
  const graceEndsAt = addDays(end, graceDays);

  let state: TermState = 'IN_TERM';
  if (now > graceEndsAt) state = 'CLOSED';
  else if (now > end) state = 'GRACE';

  const daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / DAY_MS));
  const awardedCount = await prisma.certificate.count({
    where: { termCode: quarter.quarterCode, type: 'RANK' },
  });

  return {
    quarterCode: quarter.quarterCode,
    quarterName: quarter.quarterName,
    startDate: quarter.startDate,
    endDate: quarter.endDate,
    state,
    graceDays,
    graceEndsAt: graceEndsAt.toISOString(),
    daysRemaining,
    issuanceOpen: state === 'CLOSED',
    isPeriodOver: now > end,
    resultsReady: awardedCount > 0,
    awardedCount,
  };
}

// ─── Term Points & Standings ──────────────────────────────────────────

export async function computeTermStandings(
  quarter: { startDate: string; endDate: string },
  schoolYearId?: string | null
): Promise<TermStanding[]> {
  const start = startOfDay(quarter.startDate);
  const end = endOfDay(quarter.endDate);

  const students = await prisma.user.findMany({
    where: { role: 'STUDENT', syncSource: 'ENROLLPRO' },
    select: {
      id: true,
      name: true,
      points: true,
      gradeLevel: true,
      sectionName: true,
    },
  });

  const termTotals = await prisma.pointHistory.groupBy({
    by: ['userId'],
    where: {
      createdAt: { gte: start, lte: end },
      ...(schoolYearId ? { schoolYearId } : {}),
    },
    _sum: { amount: true },
  });

  const termByUser = new Map<string, number>();
  for (const row of termTotals) {
    termByUser.set(row.userId, row._sum.amount ?? 0);
  }

  return students
    .map((s) => ({
      userId: s.id,
      name: s.name,
      gradeLevel: s.gradeLevel,
      sectionName: s.sectionName,
      termPoints: termByUser.get(s.id) ?? 0,
      totalPoints: s.points,
    }))
    .sort((a, b) => {
      if (b.termPoints !== a.termPoints) return b.termPoints - a.termPoints;
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return a.name.localeCompare(b.name);
    });
}

// ─── Term-End Ranked Issuance ─────────────────────────────────────────

async function findLatestEndedQuarter() {
  const quarters = await prisma.academicQuarter.findMany();
  const now = new Date();
  return (
    quarters
      .filter((q) => endOfDay(q.endDate) < now)
      .sort((a, b) => endOfDay(b.endDate).getTime() - endOfDay(a.endDate).getTime())[0] || null
  );
}

export interface IssueTermResult {
  success: boolean;
  error?: string;
  quarterCode?: string;
  quarterName?: string;
  standings?: TermStanding[];
  awarded?: IssuedCertificate[];
  alreadyIssued?: number;
}

export async function issueTermCertificates(opts: {
  quarterCode?: string;
  force?: boolean;
  issuedBy?: string | null;
}): Promise<IssueTermResult> {
  const graceDays = await resolveGraceDays();

  const quarter = opts.quarterCode
    ? await prisma.academicQuarter.findUnique({ where: { quarterCode: opts.quarterCode } })
    : await findLatestEndedQuarter();

  if (!quarter) {
    return { success: false, error: 'No ended academic term found to issue awards for.' };
  }

  const graceEndsAt = addDays(endOfDay(quarter.endDate), graceDays);
  if (!opts.force && new Date() < graceEndsAt) {
    return {
      success: false,
      error: `The grace window for ${quarter.quarterName} is still open until ${graceEndsAt.toLocaleDateString()}.`,
    };
  }

  const activeSY = await prisma.schoolYear.findFirst({ where: { isActive: true } });
  const standings = await computeTermStandings(quarter, activeSY?.id ?? null);
  const names = await getCertificateNames();

  const tiers: CertificateTierValue[] = ['CHAMPION', 'LEADER', 'ADVOCATE'];
  const awarded: IssuedCertificate[] = [];
  let alreadyIssued = 0;
  const cleanYear = (activeSY?.label || String(new Date().getFullYear())).split('-')[0];

  for (let i = 0; i < tiers.length; i += 1) {
    const standing = standings[i];
    if (!standing || standing.termPoints <= 0) continue;

    const rank = i + 1;
    const tier = tiers[i];

    const existing = await prisma.certificate.findFirst({
      where: { userId: standing.userId, termCode: quarter.quarterCode, type: 'RANK' },
    });
    if (existing) {
      alreadyIssued += 1;
      continue;
    }

    const name = nameForTier(tier, names);
    const serial = await buildSerial(`SORT-HNHS-${cleanYear}-${quarter.quarterCode}-R${rank}-P${standing.termPoints}`);

    const cert = await prisma.certificate.create({
      data: {
        userId: standing.userId,
        serial,
        type: 'RANK',
        tier,
        name,
        rankAtIssue: rank,
        pointsAtIssue: standing.termPoints,
        termCode: quarter.quarterCode,
        termName: quarter.quarterName,
        schoolYearId: activeSY?.id ?? null,
        schoolYearLabel: activeSY?.label ?? null,
        issuedBy: opts.issuedBy ?? null,
      },
    });

    // Backward-compatible name list used by legacy UI
    await prisma.user.update({
      where: { id: standing.userId },
      data: { certificates: { push: name } },
    });

    awarded.push({
      id: cert.id,
      userId: standing.userId,
      studentName: standing.name,
      serial: cert.serial,
      tier,
      name,
      rankAtIssue: rank,
      pointsAtIssue: standing.termPoints,
    });
  }

  return {
    success: true,
    quarterCode: quarter.quarterCode,
    quarterName: quarter.quarterName,
    standings: standings.slice(0, 10),
    awarded,
    alreadyIssued,
  };
}

// ─── Milestone Issuance ───────────────────────────────────────────────

export interface ClaimMilestoneResult {
  success: boolean;
  error?: string;
  alreadyClaimed?: boolean;
  certificate?: IssuedCertificate;
}

export async function claimMilestoneCertificate(
  userId: string,
  issuedBy?: string | null
): Promise<ClaimMilestoneResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, error: 'User not found' };
  if (user.role !== 'STUDENT') return { success: false, error: 'Only students can claim certificates' };

  const settings = await prisma.systemSetting.findUnique({ where: { id: 'default_setting' } });
  const threshold = settings?.certificatePointThreshold ?? 500;

  if (user.points < threshold) {
    return {
      success: false,
      error: `Insufficient points. Need ${threshold}, have ${user.points}.`,
    };
  }

  const existing = await prisma.certificate.findFirst({
    where: { userId, type: 'MILESTONE' },
  });
  if (existing) {
    return {
      success: true,
      alreadyClaimed: true,
      certificate: {
        id: existing.id,
        userId,
        studentName: user.name,
        serial: existing.serial,
        tier: 'MILESTONE',
        name: existing.name,
        rankAtIssue: null,
        pointsAtIssue: existing.pointsAtIssue,
      },
    };
  }

  const names = await getCertificateNames();
  const activeSY = await prisma.schoolYear.findFirst({ where: { isActive: true } });
  const cleanYear = (activeSY?.label || String(new Date().getFullYear())).split('-')[0];
  const serial = await buildSerial(`SORT-HNHS-${cleanYear}-MILESTONE-P${user.points}`);

  const cert = await prisma.certificate.create({
    data: {
      userId,
      serial,
      type: 'MILESTONE',
      tier: 'MILESTONE',
      name: names.milestone,
      rankAtIssue: null,
      pointsAtIssue: user.points,
      schoolYearId: activeSY?.id ?? null,
      schoolYearLabel: activeSY?.label ?? null,
      issuedBy: issuedBy ?? userId,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { certificates: { push: names.milestone } },
  });

  return {
    success: true,
    certificate: {
      id: cert.id,
      userId,
      studentName: user.name,
      serial: cert.serial,
      tier: 'MILESTONE',
      name: cert.name,
      rankAtIssue: null,
      pointsAtIssue: cert.pointsAtIssue,
    },
  };
}

// ─── Read Helpers ─────────────────────────────────────────────────────

export async function listCertificates(userId: string) {
  return prisma.certificate.findMany({
    where: { userId },
    orderBy: { issuedAt: 'desc' },
  });
}

export async function getCertificateById(id: string) {
  return prisma.certificate.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, gradeLevel: true, sectionName: true, enrollproLrn: true } },
    },
  });
}

export async function listRecentCertificates(limit = 50) {
  return prisma.certificate.findMany({
    orderBy: { issuedAt: 'desc' },
    take: limit,
    include: {
      user: { select: { name: true, gradeLevel: true, sectionName: true } },
    },
  });
}
