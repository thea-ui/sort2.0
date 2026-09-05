// One-off script: purge all LOCAL-synced accounts.
// Now handled automatically by the hourly EnrollPro sync and seed runs.
// Kept for manual emergency use only.
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const deleted = await p.user.deleteMany({ where: { syncSource: 'LOCAL' } });
console.log(`Purged ${deleted.count} LOCAL accounts`);

await p.$disconnect();
