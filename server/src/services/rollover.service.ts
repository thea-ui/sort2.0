import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RolloverResult {
  success: boolean;
  previousSchoolYear: string;
  newSchoolYear: string;
  snapshotsCreated: number;
  inventoryTransactions: number;
  usersReset: number;
  error?: string;
}

/**
 * Execute school year rollover:
 * 1. Snapshot market stocks (closing balances)
 * 2. Snapshot user points (closing balances)
 * 3. Create inventory closing transactions
 * 4. Archive old school year
 * 5. Create new school year
 * 6. Carry forward persistent inventory as opening transactions
 * 7. Reset user points to 0
 * 8. Reset market stocks to 0
 * 9. Log in audit
 */
export async function executeRollover(
  newEnrollproId: number,
  newLabel: string,
  newStartDate: Date,
  newEndDate: Date
): Promise<RolloverResult> {
  console.log(`[Rollover] Starting school year rollover to "${newLabel}" (EnrollPro ID: ${newEnrollproId})`);

  let snapshotsCreated = 0;
  let inventoryTransactions = 0;
  let usersReset = 0;

  try {
    // 1. Find current active school year
    const currentSY = await prisma.schoolYear.findFirst({
      where: { isActive: true, isArchived: false },
    });

    const previousLabel = currentSY?.label || 'Unknown';

    if (currentSY) {
      // 2. Snapshot market stocks (closing balances)
      const marketStocks = await prisma.recycleMarketStock.findMany();
      for (const stock of marketStocks) {
        if (stock.accumulatedKg > 0) {
          await prisma.marketStockSnapshot.upsert({
            where: {
              schoolYearId_categoryCode: {
                schoolYearId: currentSY.id,
                categoryCode: stock.categoryCode,
              },
            },
            update: {
              closingKg: stock.accumulatedKg,
            },
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
      console.log(`[Rollover] Snapshotted ${snapshotsCreated} market stock categories`);

      // 3. Snapshot user points (closing balances)
      const studentsWithPoints = await prisma.user.findMany({
        where: {
          role: 'STUDENT',
          syncSource: 'ENROLLPRO',
          points: { gt: 0 },
        },
      });

      for (const student of studentsWithPoints) {
        await prisma.userPointSnapshot.upsert({
          where: {
            schoolYearId_userId: {
              schoolYearId: currentSY.id,
              userId: student.id,
            },
          },
          update: {
            closingPoints: student.points,
          },
          create: {
            schoolYearId: currentSY.id,
            userId: student.id,
            closingPoints: student.points,
          },
        });
        snapshotsCreated++;
      }
      console.log(`[Rollover] Snapshotted ${studentsWithPoints.length} user point balances`);

      // 4. Create inventory ROLLOVER_CLOSING transactions for all items with stock
      const inventoryItems = await prisma.mrfInventoryItem.findMany({
        where: { quantity: { gt: 0 } },
      });

      for (const item of inventoryItems) {
        await prisma.mrfInventoryTransaction.create({
          data: {
            itemId: item.id,
            schoolYearId: currentSY.id,
            type: 'ROLLOVER_CLOSING',
            quantity: -item.quantity,
            notes: `School year closing balance for ${item.name}`,
          },
        });
        inventoryTransactions++;
      }
      console.log(`[Rollover] Created ${inventoryTransactions} inventory closing transactions`);

      // 5. Tag all untagged records with current school year before archiving
      const [untaggedReports, untaggedPoints, untaggedOffenses, untaggedSales, untaggedAudit] = await Promise.all([
        prisma.report.updateMany({
          where: { schoolYearId: null },
          data: { schoolYearId: currentSY.id },
        }),
        prisma.pointHistory.updateMany({
          where: { schoolYearId: null },
          data: { schoolYearId: currentSY.id },
        }),
        prisma.offense.updateMany({
          where: { schoolYearId: null },
          data: { schoolYearId: currentSY.id },
        }),
        prisma.recycleSaleTransaction.updateMany({
          where: { schoolYearId: null },
          data: { schoolYearId: currentSY.id },
        }),
        prisma.auditLog.updateMany({
          where: { schoolYearId: null },
          data: { schoolYearId: currentSY.id },
        }),
      ]);
      console.log(`[Rollover] Tagged untagged records: ${untaggedReports.count} reports, ${untaggedPoints.count} points, ${untaggedOffenses.count} offenses, ${untaggedSales.count} sales, ${untaggedAudit.count} audit`);

      // 6. Archive old school year
      await prisma.schoolYear.update({
        where: { id: currentSY.id },
        data: {
          isActive: false,
          isArchived: true,
          archivedAt: new Date(),
        },
      });
      console.log(`[Rollover] Archived school year "${previousLabel}"`);
    }

    // 7. Create new school year
    const newSY = await prisma.schoolYear.create({
      data: {
        enrollproId: newEnrollproId,
        label: newLabel,
        startDate: newStartDate,
        endDate: newEndDate,
        isActive: true,
        isArchived: false,
      },
    });
    console.log(`[Rollover] Created new school year "${newLabel}" (${newSY.id})`);

    // 8. Carry forward persistent inventory items as opening transactions
    const persistentItems = await prisma.mrfInventoryItem.findMany({
      where: { isPersistent: true },
    });

    let carryForwardCount = 0;
    for (const item of persistentItems) {
      if (item.quantity > 0) {
        await prisma.mrfInventoryTransaction.create({
          data: {
            itemId: item.id,
            schoolYearId: newSY.id,
            type: 'ROLLOVER_OPENING',
            quantity: item.quantity,
            notes: `Opening balance carried from ${previousLabel}`,
          },
        });
        carryForwardCount++;
      }
    }
    inventoryTransactions += carryForwardCount;
    console.log(`[Rollover] Carried forward ${carryForwardCount} persistent inventory items`);

    // 9. Carry forward market stock snapshots as opening balances for new SY
    if (currentSY) {
      const prevSnapshots = await prisma.marketStockSnapshot.findMany({
        where: { schoolYearId: currentSY.id },
      });
      for (const snap of prevSnapshots) {
        if (snap.closingKg > 0) {
          await prisma.marketStockSnapshot.create({
            data: {
              schoolYearId: newSY.id,
              categoryCode: snap.categoryCode,
              categoryName: snap.categoryName,
              closingKg: 0,
              openingKg: snap.closingKg,
            },
          });
          snapshotsCreated++;
        }
      }
    }

    // 10. Reset market stocks to 0
    await prisma.recycleMarketStock.updateMany({
      data: {
        accumulatedKg: 0,
        isApprovedForSale: false,
        approvedAt: null,
      },
    });
    console.log(`[Rollover] Reset all market stocks to 0 kg`);

    // 11. Reset user points to 0
    const resetResult = await prisma.user.updateMany({
      where: {
        role: 'STUDENT',
        syncSource: 'ENROLLPRO',
      },
      data: {
        points: 0,
        warningsCount: 0,
        certificates: [],
      },
    });
    usersReset = resetResult.count;
    console.log(`[Rollover] Reset points for ${usersReset} students`);

    // 12. Create audit log for rollover
    await prisma.auditLog.create({
      data: {
        actorName: 'System',
        actorRole: 'SYSTEM',
        actionType: 'SCHOOL_YEAR_ROLLOVER',
        details: `Automatic rollover from "${previousLabel}" to "${newLabel}". Snapshots: ${snapshotsCreated}, Inventory txns: ${inventoryTransactions}, Users reset: ${usersReset}.`,
        schoolYearId: newSY.id,
      },
    });

    console.log(`[Rollover] Rollover completed successfully: "${previousLabel}" -> "${newLabel}"`);

    return {
      success: true,
      previousSchoolYear: previousLabel,
      newSchoolYear: newLabel,
      snapshotsCreated,
      inventoryTransactions,
      usersReset,
    };
  } catch (error: any) {
    console.error('[Rollover] Failed:', error.message);
    return {
      success: false,
      previousSchoolYear: '',
      newSchoolYear: newLabel,
      snapshotsCreated,
      inventoryTransactions,
      usersReset,
      error: error.message,
    };
  }
}

/**
 * Ensure a SchoolYear record exists for the given EnrollPro school year.
 * If it doesn't exist and there's no active SY, create one without rollover.
 * If it doesn't exist but there IS an active SY with a different ID, trigger rollover.
 */
export async function ensureSchoolYear(
  enrollproId: number,
  label: string,
  startDate?: Date,
  endDate?: Date
): Promise<{ schoolYearId: string; rolloverTriggered: boolean }> {
  // Check if this school year already exists
  const existing = await prisma.schoolYear.findUnique({
    where: { enrollproId },
  });

  if (existing) {
    if (!existing.isActive) {
      // Reactivate if somehow deactivated but not archived
      if (!existing.isArchived) {
        await prisma.schoolYear.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
      }
    }
    return { schoolYearId: existing.id, rolloverTriggered: false };
  }

  // New school year from EnrollPro that doesn't exist in our DB
  const activeSY = await prisma.schoolYear.findFirst({
    where: { isActive: true, isArchived: false },
  });

  if (!activeSY) {
    // No active SY exists — just create the new one (first-time setup)
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

  // Active SY exists but EnrollPro returned a different ID — trigger rollover
  if (activeSY.enrollproId !== enrollproId) {
    console.log(`[SY] New school year detected: "${activeSY.label}" (ID: ${activeSY.enrollproId}) -> "${label}" (ID: ${enrollproId})`);
    const result = await executeRollover(
      enrollproId,
      label,
      startDate || new Date(),
      endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    );

    if (!result.success) {
      throw new Error(`Rollover failed: ${result.error}`);
    }

    const newSY = await prisma.schoolYear.findUnique({
      where: { enrollproId },
    });

    return { schoolYearId: newSY!.id, rolloverTriggered: true };
  }

  // Same ID, just return it
  return { schoolYearId: activeSY.id, rolloverTriggered: false };
}

/**
 * Get the currently active school year ID.
 * Returns null if no active school year exists.
 */
export async function getActiveSchoolYearId(): Promise<string | null> {
  const sy = await prisma.schoolYear.findFirst({
    where: { isActive: true, isArchived: false },
    select: { id: true },
  });
  return sy?.id || null;
}
