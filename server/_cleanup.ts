// One-off script: purge all LOCAL-synced accounts.
// Now handled automatically by the hourly EnrollPro sync and seed runs.
// Kept for manual emergency use only.
import { prisma } from './src/lib/prisma.js';

const deleted = await prisma.user.deleteMany({ where: { syncSource: 'LOCAL' } });
console.log(`Purged ${deleted.count} LOCAL accounts`);

await prisma.$disconnect();
