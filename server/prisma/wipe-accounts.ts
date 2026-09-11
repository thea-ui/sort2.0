import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Wipe Accounts & User Data ===\n');
  console.log('This will DELETE: users, sessions, and all user-owned data.');
  console.log('This will KEEP: bins, categories, locations, settings, inventory.\n');

  const counts: Record<string, number> = {};

  await prisma.$transaction(async (tx) => {
    // Delete in FK-safe order (children before parents)

    // Notifications (if exists)
    try {
      const r = await tx.$executeRaw`DELETE FROM notifications`;
      counts['notifications'] = Number(r);
    } catch {}

    // User point snapshots
    const pointSnapshots = await tx.userPointSnapshot.deleteMany({});
    counts['user_point_snapshots'] = pointSnapshots.count;

    // Point histories
    const pointHistories = await tx.pointHistory.deleteMany({});
    counts['point_histories'] = pointHistories.count;

    // Offenses
    const offenses = await tx.offense.deleteMany({});
    counts['offenses'] = offenses.count;

    // Reports (cascades to reporter/assignedMrf)
    const reports = await tx.report.deleteMany({});
    counts['reports'] = reports.count;

    // Audit logs (user-related)
    const auditLogs = await tx.auditLog.deleteMany({});
    counts['audit_logs'] = auditLogs.count;

    // User sessions
    const sessions = await tx.userSession.deleteMany({});
    counts['user_sessions'] = sessions.count;

    // Users
    const users = await tx.user.deleteMany({});
    counts['users'] = users.count;
  });

  console.log('--- Wipe Results ---');
  let totalRows = 0;
  for (const [table, count] of Object.entries(counts)) {
    console.log(`  ${table}: ${count} rows deleted`);
    totalRows += count;
  }
  console.log(`\nTotal: ${totalRows} rows deleted.`);
  console.log('\nKept intact: waste_bins, asset_categories, item_presets, campus_locations,');
  console.log('room_locations, waste_types, urgency_levels, asset_conditions, point_rules,');
  console.log('academic_quarters, recycle_market_stocks, mrf_inventory_items, system_settings,');
  console.log('term_calendars, school_years, calendar_events, campus_news.\n');
  console.log('Run `npm run sync:enrollpro` to pull fresh accounts from EnrollPro.');
}

main()
  .catch((e) => {
    console.error('Wipe failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
