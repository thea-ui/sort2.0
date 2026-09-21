/**
 * Idempotent, non-destructive seeder for the walk-in milestone prize catalog.
 *
 * Unlike `prisma/seed.ts` (which resets reports/points for a clean slate), this
 * script only upserts placeholder Reward rows by stable `code`, so it is safe to
 * run on an existing database that already has student data.
 *
 * Usage: npx tsx src/scripts/seed-walk-in-rewards.ts
 */
import { PrismaClient } from '@prisma/client';
import { seedWalkInRewards, PLACEHOLDER_WALK_IN_REWARDS } from '../services/walk-in-rewards.seed.js';

const prisma = new PrismaClient();

async function main() {
  const count = await seedWalkInRewards(prisma);
  console.log(`Seeded ${count} walk-in rewards (${PLACEHOLDER_WALK_IN_REWARDS.map(r => r.code).join(', ')})`);
}

main()
  .catch((e) => {
    console.error('Failed to seed walk-in rewards:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
