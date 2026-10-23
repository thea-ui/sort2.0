import { Router, Request, Response } from 'express';
import { ChallengeType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import {
  resolveChallengeScope,
  challengeWindowWhere,
  challengeSchoolYearWhere,
  isChallengeWindowOpen,
  GLOBAL_QUARTER_CODE,
} from '../services/challenge-term.service.js';

const router = Router();

// GET /api/challenges — any authenticated user (definitions + caller's progress)
router.get('/', authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as AuthenticatedRequest).userId;

    // Only surface challenges that belong to the current academic term. Once a
    // term ends (GRACE/CLOSED) nothing is "active", so ended-term progress no
    // longer lingers on the student dashboard.
    const scope = await resolveChallengeScope();
    if (scope.visibleQuarterCodes.length === 0) {
      return res.json([]);
    }

    const challenges = await prisma.challenge.findMany({
      where: {
        isActive: true,
        // No configured term → show every challenge of the active year.
        ...(scope.quarterCode ? { quarterCode: { in: scope.visibleQuarterCodes } } : {}),
        ...challengeSchoolYearWhere(scope),
        ...challengeWindowWhere(scope.effectiveNow),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        progressRecords: {
          where: { userId },
          select: { currentCount: true, completedAt: true, rewardedAt: true },
        },
      },
    });

    const result = challenges.map(c => {
      const progress = c.progressRecords[0];
      return {
        id: c.id,
        code: c.code,
        title: c.title,
        description: c.description,
        challengeType: c.challengeType,
        pointsAwarded: c.pointsAwarded,
        target: c.target,
        isActive: c.isActive,
        iconName: c.iconName,
        quarterCode: c.quarterCode,
        schoolYearId: c.schoolYearId,
        startDate: c.startDate?.toISOString() || null,
        endDate: c.endDate?.toISOString() || null,
        createdAt: c.createdAt.toISOString(),
        currentCount: progress?.currentCount || 0,
        completed: !!progress?.completedAt,
        completedAt: progress?.completedAt?.toISOString() || null,
      };
    });

    return res.json(result);
  } catch (error) {
    console.error('Fetch challenges error:', error);
    return res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

// GET /api/challenges/admin — ADMIN only (definitions + stats; ?schoolYearId= for history)
router.get('/admin', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const scope = await resolveChallengeScope();
    const querySchoolYearId =
      typeof req.query.schoolYearId === 'string' ? req.query.schoolYearId.trim() : '';
    const now = scope.effectiveNow;

    const challenges = await prisma.challenge.findMany({
      where: querySchoolYearId
        ? { schoolYearId: querySchoolYearId }
        : challengeSchoolYearWhere(scope),
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      include: {
        schoolYear: { select: { label: true } },
      },
    });

    // Aggregate stats server-side. The previous version loaded every progress
    // row and every contribution row per challenge (100k+ nested rows on a
    // populated year). Progress has @@unique([userId, challengeId]), so the
    // row count equals the distinct participant count.
    const challengeIds = challenges.map((challenge) => challenge.id);
    const [progressTotals, completedTotals, contributionTotals] = await Promise.all([
      prisma.userChallengeProgress.groupBy({
        by: ['challengeId'],
        where: { challengeId: { in: challengeIds } },
        _count: { _all: true },
      }),
      prisma.userChallengeProgress.groupBy({
        by: ['challengeId'],
        where: { challengeId: { in: challengeIds }, completedAt: { not: null } },
        _count: { _all: true },
      }),
      prisma.challengeContribution.groupBy({
        by: ['challengeId'],
        where: { challengeId: { in: challengeIds } },
        _count: { _all: true },
      }),
    ]);

    const progressByChallenge = new Map(progressTotals.map((row) => [row.challengeId, row._count._all]));
    const completedByChallenge = new Map(completedTotals.map((row) => [row.challengeId, row._count._all]));
    const contributionsByChallenge = new Map(contributionTotals.map((row) => [row.challengeId, row._count._all]));

    const result = challenges.map(c => {
      const totalProgressUsers = progressByChallenge.get(c.id) ?? 0;
      const completedCount = completedByChallenge.get(c.id) ?? 0;
      const inProgressCount = totalProgressUsers - completedCount;
      const totalContributions = contributionsByChallenge.get(c.id) ?? 0;

      // Ended = its term is no longer in play, or its own window has passed.
      const offTerm = scope.quarterCode ? !scope.visibleQuarterCodes.includes(c.quarterCode) : false;
      const windowPassed = !isChallengeWindowOpen(c, now);
      const isEnded = offTerm || windowPassed;

      return {
        id: c.id,
        code: c.code,
        title: c.title,
        description: c.description,
        challengeType: c.challengeType,
        pointsAwarded: c.pointsAwarded,
        target: c.target,
        isActive: c.isActive,
        iconName: c.iconName,
        quarterCode: c.quarterCode,
        schoolYearId: c.schoolYearId,
        schoolYearLabel: c.schoolYear?.label ?? null,
        isEnded,
        startDate: c.startDate?.toISOString() || null,
        endDate: c.endDate?.toISOString() || null,
        createdAt: c.createdAt.toISOString(),
        stats: {
          usersInProgress: inProgressCount,
          completedCount,
          totalContributions,
        },
        hasProgress: totalProgressUsers > 0,
      };
    });

    return res.json(result);
  } catch (error) {
    console.error('Fetch admin challenges error:', error);
    return res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

// POST /api/challenges — ADMIN only (create)
router.post('/', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const { title, code, challengeType, target, pointsAwarded, iconName, startDate, endDate, description, quarterCode } = req.body;

    if (!title || !code || !challengeType || !target) {
      return res.status(400).json({ error: 'title, code, challengeType, and target are required' });
    }

    if (!/^[A-Z0-9_]+$/.test(code)) {
      return res.status(400).json({ error: 'code must match /^[A-Z0-9_]+$/' });
    }

    if (target <= 0) {
      return res.status(400).json({ error: 'target must be positive' });
    }

    if (pointsAwarded !== undefined && pointsAwarded < 0) {
      return res.status(400).json({ error: 'pointsAwarded must be non-negative' });
    }

    if (!Object.values(ChallengeType).includes(challengeType)) {
      return res.status(400).json({ error: `challengeType must be one of: ${Object.values(ChallengeType).join(', ')}` });
    }

    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ error: 'startDate must be before endDate' });
    }

    // New challenges belong to the current academic term and school year by
    // default; falls back to GLOBAL only when no term is configured.
    const scope = await resolveChallengeScope();
    const resolvedQuarterCode =
      typeof quarterCode === 'string' && quarterCode.trim()
        ? quarterCode.trim()
        : scope.quarterCode || GLOBAL_QUARTER_CODE;
    const schoolYearId = scope.schoolYearId;

    const existing = await prisma.challenge.findFirst({
      where: { code, quarterCode: resolvedQuarterCode, schoolYearId },
    });
    if (existing) {
      return res.status(409).json({ error: `Challenge with code "${code}" already exists for term ${resolvedQuarterCode}` });
    }

    const challenge = await prisma.challenge.create({
      data: {
        title,
        code,
        challengeType,
        target,
        pointsAwarded: pointsAwarded ?? 0,
        iconName: iconName || 'Target',
        description: description || '',
        quarterCode: resolvedQuarterCode,
        schoolYearId,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    return res.status(201).json(challenge);
  } catch (error) {
    console.error('Create challenge error:', error);
    return res.status(500).json({ error: 'Failed to create challenge' });
  }
});

// PATCH /api/challenges/:id — ADMIN only (edit; immutable fields enforced)
router.patch('/:id', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const id = String(req.params.id);
    const { title, description, iconName, startDate, endDate, isActive, code, challengeType, target, pointsAwarded } = req.body;

    const existing = await prisma.challenge.findUnique({
      where: { id },
      include: { progressRecords: { select: { id: true }, take: 1 } },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const hasProgress = (existing as any).progressRecords?.length > 0;

    const immutableFields = ['code', 'challengeType', 'target', 'pointsAwarded', 'quarterCode'];
    if (hasProgress) {
      for (const field of immutableFields) {
        if (req.body[field] !== undefined && req.body[field] !== (existing as any)[field]) {
          return res.status(409).json({
            error: `Cannot modify ${field} — users have progress on this challenge`,
            code: 'IMMUTABLE_FIELD',
          });
        }
      }
    }

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (iconName !== undefined) data.iconName = iconName;
    if (isActive !== undefined) data.isActive = isActive;
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;

    if (!hasProgress) {
      if (code !== undefined) {
        if (!/^[A-Z0-9_]+$/.test(code)) {
          return res.status(400).json({ error: 'code must match /^[A-Z0-9_]+$/' });
        }
        const codeConflict = await prisma.challenge.findFirst({
          where: {
            code,
            quarterCode: existing.quarterCode,
            schoolYearId: existing.schoolYearId,
            id: { not: id },
          },
        });
        if (codeConflict) {
          return res.status(409).json({ error: `Code "${code}" is already in use` });
        }
        data.code = code;
      }
      if (challengeType !== undefined) data.challengeType = challengeType;
      if (target !== undefined) {
        if (target <= 0) return res.status(400).json({ error: 'target must be positive' });
        data.target = target;
      }
      if (pointsAwarded !== undefined) {
        if (pointsAwarded < 0) return res.status(400).json({ error: 'pointsAwarded must be non-negative' });
        data.pointsAwarded = pointsAwarded;
      }
    }

    if (startDate && endDate && data.startDate && data.endDate && data.startDate >= data.endDate) {
      return res.status(400).json({ error: 'startDate must be before endDate' });
    }

    const updated = await prisma.challenge.update({ where: { id }, data });
    return res.json(updated);
  } catch (error) {
    console.error('Update challenge error:', error);
    return res.status(500).json({ error: 'Failed to update challenge' });
  }
});

// DELETE /api/challenges/:id — ADMIN only (409 if progress/contributions exist)
router.delete('/:id', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const id = String(req.params.id);

    const existing = await prisma.challenge.findUnique({
      where: { id },
      include: {
        progressRecords: { select: { id: true }, take: 1 },
        contributions: { select: { id: true }, take: 1 },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const hasAnyProgress = (existing as any).progressRecords?.length > 0 || (existing as any).contributions?.length > 0;
    if (hasAnyProgress) {
      return res.status(409).json({
        error: 'Cannot delete challenge with existing progress or contributions. Deactivate it instead via PATCH isActive: false.',
        code: 'HAS_PROGRESS',
      });
    }

    await prisma.challenge.delete({ where: { id } });
    return res.json({ message: 'Challenge deleted' });
  } catch (error) {
    console.error('Delete challenge error:', error);
    return res.status(500).json({ error: 'Failed to delete challenge' });
  }
});

export default router;
