import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Concurrency Guard ──────────────────────────────────────────────────────
let rolloverInProgress = false;

/** Low-priority background jobs (e.g. branding sync) defer during a rollover. */
export function isRolloverInProgress(): boolean {
  return rolloverInProgress;
}

interface RolloverResult {
  success: boolean;
  previousSchoolYear: string;
  newSchoolYear: string;
  snapshotsCreated: number;
  usersReset: number;
  studentsArchived?: number;
  error?: string;
  errorCode?: string;
}

/**
 * Execute school year rollover atomically:
 * 1. Snapshot market stocks (closing balances)
 * 2. Snapshot user points (closing balances)
 * 3. Tag all null-school-year records to current year
 * 4. Archive old school year
 * 5. Create new school year
 * 6. Carry forward asset scrap stock snapshots as opening balances
 * 7. Reset recyclable market stock to zero (archive holds the closing balance)
 * 8. Reset user points to 0
 * 9. Archive all students (revoke sessions, keep history)
 * 10. Log in audit
 *
 * All steps execute in a single Prisma transaction for atomicity.
 * Idempotent: retries for the same EnrollPro ID will not duplicate work.
 */
export async function executeRollover(
  newEnrollproId: number,
  newLabel: string,
  newStartDate: Date,
  newEndDate: Date
): Promise<RolloverResult> {
  // Concurrency guard
  if (rolloverInProgress) {
    console.warn('[Rollover] Attempted concurrent rollover — rejected');
    return {
      success: false,
      previousSchoolYear: '',
      newSchoolYear: newLabel,
      snapshotsCreated: 0,
      usersReset: 0,
      error: 'A rollover is already in progress. Please try again later.',
      errorCode: 'ROLLOVER_CONCURRENT',
    };
  }

  // Idempotency check: only skip when the target year is ALREADY the active one.
  // The EnrollPro mirror pre-creates the upcoming year as an inactive row, so a
  // plain "row exists" check would wrongly skip the rollover — the outgoing year
  // would never close and its points/stock would silently carry over.
  const existingTarget = await prisma.schoolYear.findUnique({
    where: { enrollproId: newEnrollproId },
  });
  if (existingTarget?.isActive && !existingTarget.isArchived) {
    console.log(`[Rollover] School year "${existingTarget.label}" is already active — skipping`);
    return {
      success: true,
      previousSchoolYear: '',
      newSchoolYear: existingTarget.label,
      snapshotsCreated: 0,
      usersReset: 0,
    };
  }

  rolloverInProgress = true;
  console.log(`[Rollover] Starting school year rollover to "${newLabel}" (EnrollPro ID: ${newEnrollproId})`);

  let snapshotsCreated = 0;
  let usersReset = 0;
  let studentsArchived = 0;

  try {
    // Execute all state changes in one transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find current active school year (latest start date wins if legacy
      //    data has more than one active row).
      const currentSY = await tx.schoolYear.findFirst({
        where: { isActive: true, isArchived: false },
        orderBy: { startDate: 'desc' },
      });

      const previousLabel = currentSY?.label || 'Unknown';

      if (currentSY) {
        // 2. Snapshot market stocks (closing balances)
        const marketStocks = await tx.recycleMarketStock.findMany();
        for (const stock of marketStocks) {
          if (stock.accumulatedKg > 0) {
            await tx.marketStockSnapshot.upsert({
              where: {
                schoolYearId_categoryCode: {
                  schoolYearId: currentSY.id,
                  categoryCode: stock.categoryCode,
                },
              },
              update: { closingKg: stock.accumulatedKg },
              create: {
                schoolYearId: currentSY.id,
                categoryCode: stock.categoryCode,
                categoryName: stock.categoryName,
                closingKg: stock.accumulatedKg,
                openingKg: 0,
              },
            });
            snapshotsCreated++;
          }
        }

        // 2b. Snapshot asset scrap stock (closing balances)
        const scrapStocks = await tx.assetScrapStock.findMany();
        for (const scrap of scrapStocks) {
          if (scrap.accumulatedKg > 0) {
            await tx.assetScrapStockSnapshot.upsert({
              where: {
                schoolYearId_materialCode: {
                  schoolYearId: currentSY.id,
                  materialCode: scrap.materialCode,
                },
              },
              update: { closingKg: scrap.accumulatedKg },
              create: {
                schoolYearId: currentSY.id,
                materialCode: scrap.materialCode,
                materialName: scrap.materialName,
                closingKg: scrap.accumulatedKg,
                openingKg: 0,
              },
            });
            snapshotsCreated++;
          }
        }

        // 3. Snapshot user points (closing balances)
        const studentsWithPoints = await tx.user.findMany({
          where: { role: 'STUDENT', syncSource: 'ENROLLPRO', points: { gt: 0 } },
        });

        for (const student of studentsWithPoints) {
          await tx.userPointSnapshot.upsert({
            where: {
              schoolYearId_userId: {
                schoolYearId: currentSY.id,
                userId: student.id,
              },
            },
            update: { closingPoints: student.points },
            create: {
              schoolYearId: currentSY.id,
              userId: student.id,
              closingPoints: student.points,
            },
          });
          snapshotsCreated++;
        }

        // 3. Tag all untagged records with current school year
        await Promise.all([
          tx.report.updateMany({ where: { schoolYearId: null }, data: { schoolYearId: currentSY.id } }),
          tx.pointHistory.updateMany({ where: { schoolYearId: null }, data: { schoolYearId: currentSY.id } }),
          tx.offense.updateMany({ where: { schoolYearId: null }, data: { schoolYearId: currentSY.id } }),
          tx.recycleSaleTransaction.updateMany({ where: { schoolYearId: null }, data: { schoolYearId: currentSY.id } }),
          tx.assetScrapSaleTransaction.updateMany({ where: { schoolYearId: null }, data: { schoolYearId: currentSY.id } }),
          tx.assetScrapItem.updateMany({ where: { schoolYearId: null }, data: { schoolYearId: currentSY.id } }),
          tx.auditLog.updateMany({ where: { schoolYearId: null }, data: { schoolYearId: currentSY.id } }),
        ]);

        // 4. Archive old school year
        await tx.schoolYear.update({
          where: { id: currentSY.id },
          data: { isActive: false, isArchived: true, archivedAt: new Date() },
        });
      }

      // 5. Activate the target school year. The EnrollPro mirror may have already
      //    created it as an inactive row, so update it in place instead of
      //    inserting a duplicate (enrollproId is unique).
      const newSY = existingTarget
        ? await tx.schoolYear.update({
            where: { id: existingTarget.id },
            data: {
              label: newLabel,
              startDate: newStartDate,
              endDate: newEndDate,
              isActive: true,
              isArchived: false,
              archivedAt: null,
            },
          })
        : await tx.schoolYear.create({
            data: {
              enrollproId: newEnrollproId,
              label: newLabel,
              startDate: newStartDate,
              endDate: newEndDate,
              isActive: true,
              isArchived: false,
            },
          });

      // 6. Carry forward asset scrap stock snapshots as opening balances for new SY.
      //    (Recyclable market stock is NOT carried forward — it starts each school
      //    year empty; the closing balance lives in the old year's snapshot archive.)
      if (currentSY) {
        const prevScrapSnapshots = await tx.assetScrapStockSnapshot.findMany({
          where: { schoolYearId: currentSY.id },
        });
        for (const snap of prevScrapSnapshots) {
          if (snap.closingKg > 0) {
            await tx.assetScrapStockSnapshot.create({
              data: {
                schoolYearId: newSY.id,
                materialCode: snap.materialCode,
                materialName: snap.materialName,
                closingKg: 0,
                openingKg: snap.closingKg,
              },
            });
            snapshotsCreated++;
          }
        }
      }

      // 7. Reset recyclable market stock to zero for the new school year.
      //     The closing balance was snapshotted above (step 2) and is preserved in
      //     the archived year's ledger; the live stock starts the new year empty so
      //     admin dashboards never show last year's carried-over inventory.
      await tx.recycleMarketStock.updateMany({
        data: { accumulatedKg: 0, isApprovedForSale: false, approvedAt: null },
      });

      // 7b. Scrap stock is a standing MRF inventory carried across years; clear
      //     any pending approval so it must be re-approved in the new year.
      await tx.assetScrapStock.updateMany({
        data: { isApprovedForSale: false, approvedAt: null, approvalReference: null },
      });

      // 7b. Reset challenge progress for all students (per-term)
      const challengeContributionsDeleted = await tx.challengeContribution.deleteMany({});
      const challengeProgressDeleted = await tx.userChallengeProgress.deleteMany({});
      console.log(`[Rollover] Challenge progress reset: ${challengeProgressDeleted.count} progress records, ${challengeContributionsDeleted.count} contributions deleted`);

      // 8. Reset user points to 0 (certificates are historical and MUST survive
      //    rollover so past awards remain downloadable for the student).
      const resetResult = await tx.user.updateMany({
        where: { role: 'STUDENT', syncSource: 'ENROLLPRO' },
        data: { points: 0, warningsCount: 0 },
      });
      usersReset = resetResult.count;

      // 8b. Archive all students. They are no longer enrolled in the new
      //      school year. Returning students are re-activated by the next
      //      enrollment sync; graduates remain archived as alumni. Sessions are
      //      revoked so nobody stays logged in. Never delete accounts — their
      //      reports, points, offenses, and snapshots must survive.
      const archivedResult = await tx.user.updateMany({
        where: { role: 'STUDENT', syncSource: 'ENROLLPRO', archivedAt: null },
        data: { enrollmentStatus: 'NOT_ENROLLED', archivedAt: new Date() },
      });
      studentsArchived = archivedResult.count;
      await tx.userSession.deleteMany({
        where: { user: { role: 'STUDENT', syncSource: 'ENROLLPRO' } },
      });

      // 9. Create audit log for rollover
      await tx.auditLog.create({
        data: {
          actorName: 'System',
          actorRole: 'SYSTEM',
          actionType: 'SCHOOL_YEAR_ROLLOVER',
          details: `Automatic rollover from "${previousLabel}" to "${newLabel}". Snapshots: ${snapshotsCreated}, Users reset: ${usersReset}, Students archived: ${studentsArchived}, Challenge progress cleared: ${challengeProgressDeleted.count}.`,
          schoolYearId: newSY.id,
        },
      });

      return { previousLabel, newLabel };
    }, { timeout: 60000 }); // Extended timeout for large datasets

    console.log(`[Rollover] Completed: "${result.previousLabel}" -> "${result.newLabel}"`);

    return {
      success: true,
      previousSchoolYear: result.previousLabel,
      newSchoolYear: result.newLabel,
      snapshotsCreated,
      usersReset,
      studentsArchived,
    };
  } catch (error: any) {
    console.error('[Rollover] Failed:', error.message);
    return {
      success: false,
      previousSchoolYear: '',
      newSchoolYear: newLabel,
      snapshotsCreated,
      usersReset,
      studentsArchived,
      error: error.message,
      errorCode: 'ROLLOVER_FAILED',
    };
  } finally {
    rolloverInProgress = false;
  }
}

/**
 * Ensure the SchoolYear record for the given EnrollPro school year exists AND is
 * the single active year.
 *
 * - Same year already active → no-op.
 * - No active year and no existing row → first-time setup (create + activate).
 * - Otherwise → run the full rollover, which snapshots the outgoing year, resets
 *   points/stock, archives it, and activates the target (existing row or new).
 *
 * This matters because `mirrorEnrollProSchoolYears()` creates the upcoming year
 * as an inactive row before this runs. The target row therefore usually already
 * exists, and the rollover must still execute.
 */
export async function ensureSchoolYear(
  enrollproId: number,
  label: string,
  startDate?: Date,
  endDate?: Date
): Promise<{ schoolYearId: string; rolloverTriggered: boolean }> {
  const activeSY = await prisma.schoolYear.findFirst({
    where: { isActive: true, isArchived: false },
    orderBy: { startDate: 'desc' },
  });

  // Already the active year — nothing to close out.
  if (activeSY && activeSY.enrollproId === enrollproId) {
    return { schoolYearId: activeSY.id, rolloverTriggered: false };
  }

  const existingTarget = await prisma.schoolYear.findUnique({ where: { enrollproId } });

  // Different active year (or none) with a target row present → full rollover.
  if (activeSY || existingTarget) {
    console.log(
      `[SY] School year transition: "${activeSY?.label ?? '(none)'}" -> "${label}" (EnrollPro ID: ${enrollproId})`
    );
    const result = await executeRollover(
      enrollproId,
      label,
      startDate || new Date(),
      endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    );

    if (!result.success) {
      throw new Error(`Rollover failed: ${result.error}`);
    }

    const newSY = await prisma.schoolYear.findUnique({ where: { enrollproId } });
    return { schoolYearId: newSY!.id, rolloverTriggered: true };
  }

  // First-time setup: no active year and no existing row.
  const newSY = await prisma.schoolYear.create({
    data: {
      enrollproId,
      label,
      startDate: startDate || new Date(),
      endDate: endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isActive: true,
      isArchived: false,
    },
  });
  console.log(`[SY] Created initial school year "${label}" (${newSY.id})`);
  return { schoolYearId: newSY.id, rolloverTriggered: false };
}

/**
 * Get the currently active school year ID.
 * Returns null if no active school year exists.
 */
export async function getActiveSchoolYearId(): Promise<string | null> {
  const sy = await prisma.schoolYear.findFirst({
    where: { isActive: true, isArchived: false },
    orderBy: { startDate: 'desc' },
    select: { id: true },
  });
  return sy?.id || null;
}
