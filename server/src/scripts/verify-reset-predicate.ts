import { prisma } from '../lib/prisma.js';
import dotenv from 'dotenv';

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildExpirableWasteWhere } from '../services/report-expiry.js';

/**
 * Read-only pre-flight check for the daily bin reset (plan §12 Phase 2).
 *
 * Lists every active report and classifies it with the exact same predicate
 * `executeDailyBinReset()` uses: WASTE pending/dispatched rows expire; ASSET
 * (and pillar-marked legacy) rows are spared. Never writes to the database.
 *
 * Usage: npm run db:verify-reset-predicate
 */

const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
dotenv.config({ path: path.join(SERVER_ROOT, '.env') });

const ACTIVE_STATUSES = ['PENDING', 'DISPATCHED'] as const;

const SELECT = {
  id: true,
  title: true,
  status: true,
  reportType: true,
  locationName: true,
} as const;

const toRow = (report: {
  status: string;
  reportType: string;
  locationName: string | null;
  title: string;
}) => ({
  status: report.status,
  type: report.reportType,
  location: report.locationName ?? '—',
  title: report.title,
});

async function main(): Promise<void> {
  const [expiring, spared] = await Promise.all([
    prisma.report.findMany({
      where: { ...buildExpirableWasteWhere(), status: { in: [...ACTIVE_STATUSES] } },
      select: SELECT,
      orderBy: { createdAt: 'asc' },
    }),
    prisma.report.findMany({
      where: { status: { in: [...ACTIVE_STATUSES] }, NOT: buildExpirableWasteWhere() },
      select: SELECT,
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  console.log('\nExpiring at the next daily reset (WASTE, PENDING/DISPATCHED):');
  console.table(expiring.map(toRow));

  console.log('\nSpared (ASSET type or pillar-marked description):');
  console.table(spared.map(toRow));

  console.log(`\nexpiring=${expiring.length} spared=${spared.length}`);
}

main()
  .catch((error) => {
    console.error('[verify-reset-predicate] Failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
