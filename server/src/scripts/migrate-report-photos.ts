/**
 * Phase 6 backfill: move legacy base64 report photos out of PostgreSQL and
 * into uploads/reports/, storing the relative path in reports.photo_path.
 *
 * Idempotent: only rows with a data: image_url and no photo_path are touched.
 * The photo endpoint keeps reading base64 until a row is migrated, so this can
 * run against a live deployment.
 *
 * Usage: npm --prefix server run db:migrate-photos
 */
import { prisma } from '../lib/prisma.js';
import { storeReportPhoto } from '../services/report-photo-storage.js';

const BATCH_SIZE = 50;

async function main(): Promise<void> {
  const total = await prisma.report.count({
    where: { imageUrl: { startsWith: 'data:' }, photoPath: null },
  });
  console.log(`[PhotoMigration] Legacy base64 photos to migrate: ${total}`);
  if (total === 0) return;

  let cursor: string | null = null;
  let migrated = 0;
  let failed = 0;

  while (true) {
    const rows: { id: string; imageUrl: string | null }[] = await prisma.report.findMany({
      where: { imageUrl: { startsWith: 'data:' }, photoPath: null },
      select: { id: true, imageUrl: true },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (rows.length === 0) break;

    for (const row of rows) {
      cursor = row.id;
      if (!row.imageUrl) continue;
      try {
        const { photoPath } = storeReportPhoto(row.id, row.imageUrl);
        await prisma.report.update({
          where: { id: row.id },
          data: { photoPath, imageUrl: null },
        });
        migrated += 1;
      } catch (error: any) {
        failed += 1;
        console.warn(`[PhotoMigration] ${row.id}: ${error.message}`);
      }
    }

    console.log(`[PhotoMigration] ${migrated}/${total} migrated, ${failed} failed`);
  }

  console.log(`[PhotoMigration] Done. migrated=${migrated}, failed=${failed}`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error('[PhotoMigration] Fatal:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
