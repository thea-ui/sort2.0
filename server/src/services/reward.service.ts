import { PrismaClient, Prisma, RewardClaimStatus, RewardType } from '@prisma/client';

const prisma = new PrismaClient();

export class RewardError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export interface RewardActor {
  id: string;
  name: string;
  role: string;
}

const STATUS_PRIORITY: Record<RewardClaimStatus, number> = {
  REQUESTED: 0,
  UNLOCKED: 1,
  RELEASED: 2,
  CANCELLED: 3,
};

function serializeClaim(claim: any) {
  return {
    id: claim.id,
    status: claim.status,
    claimCode: claim.claimCode,
    gramsAtUnlock: claim.gramsAtUnlock,
    unlockedAt: claim.unlockedAt instanceof Date ? claim.unlockedAt.toISOString() : claim.unlockedAt,
    requestedAt: claim.requestedAt ? claim.requestedAt.toISOString() : null,
    releasedAt: claim.releasedAt ? claim.releasedAt.toISOString() : null,
    notes: claim.notes,
    reward: claim.reward
      ? {
          id: claim.reward.id,
          code: claim.reward.code,
          title: claim.reward.title,
          description: claim.reward.description,
          iconName: claim.reward.iconName,
          rewardType: claim.reward.rewardType,
          requiredGrams: claim.reward.requiredGrams,
          pointsValue: claim.reward.pointsValue,
          stock: claim.reward.stock,
        }
      : undefined,
    student: claim.student
      ? {
          id: claim.student.id,
          name: claim.student.name,
          gradeLevel: claim.student.gradeLevel,
          sectionName: claim.student.sectionName,
          points: claim.student.points,
        }
      : undefined,
  };
}

async function getActiveSchoolYear() {
  return prisma.schoolYear.findFirst({
    where: { isActive: true, isArchived: false },
    orderBy: { startDate: 'desc' },
    select: { id: true },
  });
}

// ─── Student-facing ───────────────────────────────────────────────────

export async function listRewardsForUser(userId: string) {
  const activeSy = await getActiveSchoolYear();
  if (!activeSy) return { schoolYearId: null, yearGrams: 0, rewards: [] as any[] };

  const [rewards, claims, agg] = await Promise.all([
    prisma.reward.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { requiredGrams: 'asc' }],
    }),
    prisma.rewardClaim.findMany({
      where: { userId, schoolYearId: activeSy.id },
      include: { reward: true },
    }),
    prisma.walkInTurnover.aggregate({
      where: { studentId: userId, schoolYearId: activeSy.id },
      _sum: { totalGrams: true },
    }),
  ]);

  const yearGrams = agg._sum.totalGrams ?? 0;
  const claimByReward = new Map(claims.map((c) => [c.rewardId, c]));

  return {
    schoolYearId: activeSy.id,
    yearGrams,
    rewards: rewards.map((reward) => {
      const claim = claimByReward.get(reward.id);
      return {
        id: reward.id,
        code: reward.code,
        title: reward.title,
        description: reward.description,
        iconName: reward.iconName,
        rewardType: reward.rewardType,
        requiredGrams: reward.requiredGrams,
        pointsValue: reward.pointsValue,
        stock: reward.stock,
        sortOrder: reward.sortOrder,
        progressGrams: yearGrams,
        unlocked: Boolean(claim),
        claim: claim ? serializeClaim({ ...claim, reward }) : null,
      };
    }),
  };
}

export async function requestRewardClaim(userId: string, claimId: string) {
  const claim = await prisma.rewardClaim.findUnique({ where: { id: claimId }, include: { reward: true } });
  if (!claim || claim.userId !== userId) {
    throw new RewardError(404, 'CLAIM_NOT_FOUND', 'Claim not found');
  }

  if (claim.status === RewardClaimStatus.UNLOCKED) {
    await prisma.rewardClaim.update({
      where: { id: claimId },
      data: { status: RewardClaimStatus.REQUESTED, requestedAt: new Date() },
    });
  } else if (claim.status !== RewardClaimStatus.REQUESTED) {
    throw new RewardError(409, 'INVALID_CLAIM_STATE', `Claim is already ${claim.status.toLowerCase()}`);
  }

  const updated = await prisma.rewardClaim.findUniqueOrThrow({ where: { id: claimId }, include: { reward: true } });
  return serializeClaim({ ...updated, reward: updated.reward });
}

// ─── Admin-facing ─────────────────────────────────────────────────────

export async function listRewardClaims(opts: { status?: string; schoolYearId?: string } = {}) {
  const where: Prisma.RewardClaimWhereInput = {};
  if (opts.status && (Object.values(RewardClaimStatus) as string[]).includes(opts.status)) {
    where.status = opts.status as RewardClaimStatus;
  }
  if (opts.schoolYearId) where.schoolYearId = opts.schoolYearId;

  const rows = await prisma.rewardClaim.findMany({
    where,
    include: {
      reward: true,
      user: { select: { id: true, name: true, gradeLevel: true, sectionName: true, points: true } },
    },
    take: 500,
  });

  return rows
    .sort((a, b) => {
      const byStatus = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
      if (byStatus !== 0) return byStatus;
      return b.unlockedAt.getTime() - a.unlockedAt.getTime();
    })
    .map((row) => serializeClaim({ ...row, student: row.user }));
}

export async function releaseRewardClaim(actor: RewardActor, claimId: string) {
  const claim = await prisma.rewardClaim.findUnique({ where: { id: claimId }, include: { reward: true } });
  if (!claim) throw new RewardError(404, 'CLAIM_NOT_FOUND', 'Claim not found');

  return prisma.$transaction(async (tx) => {
    const transitioned = await tx.rewardClaim.updateMany({
      where: { id: claimId, status: { in: [RewardClaimStatus.UNLOCKED, RewardClaimStatus.REQUESTED] } },
      data: { status: RewardClaimStatus.RELEASED, releasedAt: new Date(), releasedById: actor.id },
    });
    if (transitioned.count === 0) {
      throw new RewardError(409, 'ALREADY_RELEASED', 'This claim was already released or cancelled');
    }

    let pointsAwarded = 0;

    if (claim.reward.rewardType === RewardType.PHYSICAL) {
      if (claim.reward.stock !== null) {
        const decremented = await tx.reward.updateMany({
          where: { id: claim.rewardId, stock: { gt: 0 } },
          data: { stock: { decrement: 1 } },
        });
        if (decremented.count === 0) {
          throw new RewardError(409, 'OUT_OF_STOCK', `${claim.reward.title} is out of stock`);
        }
      }
    } else {
      pointsAwarded = claim.reward.pointsValue;
      if (pointsAwarded > 0) {
        // Exactly-once guard: unique PointHistory.rewardClaimId.
        const existingLedger = await tx.pointHistory.findUnique({ where: { rewardClaimId: claim.id } });
        if (!existingLedger) {
          await tx.user.update({
            where: { id: claim.userId },
            data: { points: { increment: pointsAwarded } },
          });
          await tx.pointHistory.create({
            data: {
              userId: claim.userId,
              amount: pointsAwarded,
              reason: `Prize Claim: ${claim.reward.title} (+${pointsAwarded} pts)`,
              rewardClaimId: claim.id,
              schoolYearId: claim.schoolYearId,
            },
          });
        }
      }
    }

    await tx.auditLog.create({
      data: {
        actorName: actor.name,
        actorRole: actor.role,
        actionType: 'REWARD_RELEASED',
        details: `${claim.reward.title} (${claim.claimCode}) released${pointsAwarded > 0 ? ` · +${pointsAwarded} pts` : ''}`,
        schoolYearId: claim.schoolYearId,
      },
    });

    const updated = await tx.rewardClaim.findUniqueOrThrow({
      where: { id: claimId },
      include: {
        reward: true,
        user: { select: { id: true, name: true, gradeLevel: true, sectionName: true, points: true } },
      },
    });

    return { claim: serializeClaim({ ...updated, student: updated.user }), pointsAwarded };
  });
}

export async function cancelRewardClaim(actor: RewardActor, claimId: string, reason?: string) {
  const claim = await prisma.rewardClaim.findUnique({ where: { id: claimId }, include: { reward: true } });
  if (!claim) throw new RewardError(404, 'CLAIM_NOT_FOUND', 'Claim not found');

  const cancelled = await prisma.rewardClaim.updateMany({
    where: { id: claimId, status: { in: [RewardClaimStatus.UNLOCKED, RewardClaimStatus.REQUESTED] } },
    data: { status: RewardClaimStatus.CANCELLED, notes: reason ? String(reason).slice(0, 300) : claim.notes },
  });
  if (cancelled.count === 0) {
    throw new RewardError(409, 'INVALID_CLAIM_STATE', 'Only unlocked or requested claims can be cancelled');
  }

  await prisma.auditLog.create({
    data: {
      actorName: actor.name,
      actorRole: actor.role,
      actionType: 'REWARD_CLAIM_CANCELLED',
      details: `${claim.reward.title} (${claim.claimCode}) cancelled${reason ? ` · ${String(reason).slice(0, 200)}` : ''}`,
      schoolYearId: claim.schoolYearId,
    },
  });

  const updated = await prisma.rewardClaim.findUniqueOrThrow({
    where: { id: claimId },
    include: {
      reward: true,
      user: { select: { id: true, name: true, gradeLevel: true, sectionName: true, points: true } },
    },
  });
  return serializeClaim({ ...updated, student: updated.user });
}

// ─── Catalog administration ───────────────────────────────────────────

export async function listRewardCatalog() {
  const rewards = await prisma.reward.findMany({
    orderBy: [{ sortOrder: 'asc' }, { requiredGrams: 'asc' }],
    include: { _count: { select: { claims: true } } },
  });
  return rewards.map((reward) => ({
    id: reward.id,
    code: reward.code,
    title: reward.title,
    description: reward.description,
    iconName: reward.iconName,
    rewardType: reward.rewardType,
    requiredGrams: reward.requiredGrams,
    pointsValue: reward.pointsValue,
    stock: reward.stock,
    isActive: reward.isActive,
    sortOrder: reward.sortOrder,
    claimsCount: reward._count.claims,
  }));
}

interface RewardInput {
  title?: string;
  description?: string;
  iconName?: string;
  rewardType?: string;
  requiredGrams?: number;
  pointsValue?: number;
  stock?: number | null;
  isActive?: boolean;
  sortOrder?: number;
}

function validateRewardInput(input: RewardInput, isCreate: boolean) {
  const data: any = {};

  if (input.title !== undefined || isCreate) {
    const title = String(input.title ?? '').trim();
    if (!title || title.length > 120) throw new RewardError(400, 'VALIDATION_ERROR', 'title is required (max 120 chars)');
    data.title = title;
  }
  if (input.description !== undefined || isCreate) {
    const description = String(input.description ?? '').trim();
    if (!description || description.length > 500) throw new RewardError(400, 'VALIDATION_ERROR', 'description is required (max 500 chars)');
    data.description = description;
  }
  if (input.iconName !== undefined || isCreate) {
    const iconName = String(input.iconName ?? 'Gift').trim();
    if (iconName.length > 60) throw new RewardError(400, 'VALIDATION_ERROR', 'iconName is too long');
    data.iconName = iconName || 'Gift';
  }
  if (input.rewardType !== undefined || isCreate) {
    const rewardType = String(input.rewardType ?? 'PHYSICAL');
    if (!(Object.values(RewardType) as string[]).includes(rewardType)) {
      throw new RewardError(400, 'VALIDATION_ERROR', 'rewardType must be POINTS or PHYSICAL');
    }
    data.rewardType = rewardType as RewardType;
  }
  if (input.requiredGrams !== undefined || isCreate) {
    const grams = Number(input.requiredGrams);
    if (!Number.isInteger(grams) || grams < 1 || grams > 1_000_000) {
      throw new RewardError(400, 'VALIDATION_ERROR', 'requiredGrams must be an integer between 1 and 1000000');
    }
    data.requiredGrams = grams;
  }
  if (input.pointsValue !== undefined || isCreate) {
    const points = Number(input.pointsValue ?? 0);
    if (!Number.isInteger(points) || points < 0 || points > 100_000) {
      throw new RewardError(400, 'VALIDATION_ERROR', 'pointsValue must be an integer between 0 and 100000');
    }
    if ((input.rewardType ?? 'PHYSICAL') === 'POINTS' && points <= 0) {
      throw new RewardError(400, 'VALIDATION_ERROR', 'POINTS rewards must have pointsValue > 0');
    }
    data.pointsValue = points;
  }
  if (input.stock !== undefined) {
    if (input.stock === null) data.stock = null;
    else {
      const stock = Number(input.stock);
      if (!Number.isInteger(stock) || stock < 0 || stock > 1_000_000) {
        throw new RewardError(400, 'VALIDATION_ERROR', 'stock must be null or a non-negative integer');
      }
      data.stock = stock;
    }
  }
  if (input.isActive !== undefined) data.isActive = Boolean(input.isActive);
  if (input.sortOrder !== undefined) {
    const sortOrder = Number(input.sortOrder);
    if (!Number.isInteger(sortOrder)) throw new RewardError(400, 'VALIDATION_ERROR', 'sortOrder must be an integer');
    data.sortOrder = sortOrder;
  }

  return data;
}

export async function createReward(actor: RewardActor, input: RewardInput & { code?: string }) {
  const code = String(input.code ?? '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  if (!code || code.length > 60) throw new RewardError(400, 'VALIDATION_ERROR', 'code is required (max 60 chars)');

  const data = validateRewardInput(input, true);
  const reward = await prisma.reward.create({ data: { ...data, code } });

  await prisma.auditLog.create({
    data: {
      actorName: actor.name,
      actorRole: actor.role,
      actionType: 'REWARD_CREATED',
      details: `${reward.title} (${reward.code}) · ${reward.requiredGrams} g · ${reward.rewardType}`,
    },
  });

  return reward;
}

export async function updateReward(actor: RewardActor, rewardId: string, input: RewardInput) {
  const existing = await prisma.reward.findUnique({ where: { id: rewardId } });
  if (!existing) throw new RewardError(404, 'REWARD_NOT_FOUND', 'Reward not found');

  const data = validateRewardInput(input, false);
  const reward = await prisma.reward.update({ where: { id: rewardId }, data });

  await prisma.auditLog.create({
    data: {
      actorName: actor.name,
      actorRole: actor.role,
      actionType: 'REWARD_UPDATED',
      details: `${reward.title} (${reward.code}) updated`,
    },
  });

  return reward;
}
