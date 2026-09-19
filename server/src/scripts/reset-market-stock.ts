import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

/**
 * One-time remediation for a school-year transition that activated the new year
 * without running the full rollover (see rollover.service.ts).
 *
 * It archives the live recyclable market stock balance into the unclosed
 * predecessor year (MarketStockSnapshot) and then zeroes the live stock so the
 * admin dashboard no longer shows last year's carried-over values.
 *
 * Idempotent: running it again when stock is already zero is a no-op.
 * Pass `--dry-run` to preview without writing.
 */
async function main() {
  const active = await prisma.schoolYear.findFirst({
    where: { isActive: true, isArchived: false },
    orderBy: { startDate: 'desc' },
  });

  if (!active) {
    console.log('No active school year found. Nothing to do.');
    return;
  }

  // Prefer the most recent earlier year that is still open. Dates on mirrored
  // years can be unreliable, so exclude the active year and order by endDate.
  const predecessor = await prisma.schoolYear.findFirst({
    where: { isArchived: false, id: { not: active.id } },
    orderBy: { endDate: 'desc' },
  });

  const stocks = await prisma.recycleMarketStock.findMany({ orderBy: { categoryCode: 'asc' } });
  const pending = stocks.filter((s) => s.accumulatedKg > 0);

  console.log(`Active school year:      ${active.label}`);
  console.log(`Unclosed predecessor:    ${predecessor ? predecessor.label : '(none found)'}`);
  console.log('Live market stock:');
  for (const s of stocks) console.log(`  ${s.categoryCode}: ${s.accumulatedKg} kg`);

  if (pending.length === 0) {
    console.log('\nLive market stock is already zero — nothing to reset (idempotent).');
    return;
  }

  if (!predecessor) {
    console.warn('\nWARNING: no unclosed predecessor year found; the balance will be zeroed WITHOUT being archived.');
  }

  if (dryRun) {
    console.log('\n[DRY RUN] Would archive the balances above into the predecessor year and zero live stock.');
    return;
  }

  const archivedInto = predecessor?.label ?? null;

  await prisma.$transaction(async (tx) => {
    if (predecessor) {
      for (const stock of pending) {
        await tx.marketStockSnapshot.upsert({
          where: {
            schoolYearId_categoryCode: {
              schoolYearId: predecessor.id,
              categoryCode: stock.categoryCode,
            },
          },
          update: { closingKg: stock.accumulatedKg },
          create: {
            schoolYearId: predecessor.id,
            categoryCode: stock.categoryCode,
            categoryName: stock.categoryName,
            closingKg: stock.accumulatedKg,
            openingKg: 0,
          },
        });
      }
    }

    await tx.recycleMarketStock.updateMany({
      data: { accumulatedKg: 0, isApprovedForSale: false, approvedAt: null },
    });

    await tx.auditLog.create({
      data: {
        actorName: 'System',
        actorRole: 'SYSTEM',
        actionType: 'MARKET_STOCK_ROLLOVER_RESET',
        details: `One-time recyclable stock cleanup for "${active.label}". Archived closing balances into "${archivedInto ?? 'none'}" and reset live stock to 0.`,
        schoolYearId: active.id,
      },
    });
  });

  console.log(`\nDone. Archived balances into "${archivedInto ?? 'none'}" and reset live market stock to 0.`);
}

main()
  .catch((err) => {
    console.error('Market stock reset failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
