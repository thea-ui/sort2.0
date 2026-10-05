import dotenv from 'dotenv';
import { Prisma, PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

dotenv.config({ path: path.join(SERVER_ROOT, '.env') });

const prisma = new PrismaClient();

const CONFIRM_PHRASE = 'WIPE-EMEMS';

const BRANDING_RESET = {
  schoolName: null,
  schoolAcronym: null,
  schoolId: null,
  division: null,
  region: null,
  address: null,
  schoolHeadName: null,
  logoUrl: null,
  primaryColor: '#00271D',
  secondaryColor: '#00A77C',
  accentColor: '#00A77C',
  goldColor: '#C69B26',
  blueprintPreset: 'DEFAULT',
  blueprintUrl: null,
  enrollproBrandingSyncedAt: null,
};

const FILE_PURGE_DIRS = [
  path.join(SERVER_ROOT, 'uploads'),
  path.join(SERVER_ROOT, 'assets', 'atlas'),
];

interface Flags {
  confirm: string;
  dryRun: boolean;
  force: boolean;
  allowRemote: boolean;
  skipFiles: boolean;
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = {
    confirm: '',
    dryRun: false,
    force: false,
    allowRemote: false,
    skipFiles: false,
  };
  for (const arg of argv) {
    if (arg === '--dry-run') flags.dryRun = true;
    else if (arg === '--force') flags.force = true;
    else if (arg === '--allow-remote') flags.allowRemote = true;
    else if (arg === '--skip-files') flags.skipFiles = true;
    else if (arg.startsWith('--confirm=')) flags.confirm = arg.slice('--confirm='.length);
  }
  return flags;
}

function usage(): void {
  console.log('Usage: npm run db:wipe-tenant -- --confirm=WIPE-EMEMS [--dry-run] [--force] [--allow-remote] [--skip-files]');
  console.log('');
  console.log('  --confirm=WIPE-EMEMS  Required. Typed acknowledgement of a destructive, unrecoverable wipe.');
  console.log('  --dry-run            Count rows that would be deleted. Performs no writes.');
  console.log('  --force              Bypass the backend-running guard (server must still be stopped).');
  console.log('  --allow-remote       Allow wiping a DATABASE_URL that is not localhost. Off by default.');
  console.log('  --skip-files         Do not purge server/uploads and server/assets/atlas files.');
}

interface DbTarget {
  host: string;
  database: string;
  local: boolean;
  display: string;
}

function resolveDbTarget(): DbTarget {
  const raw = (process.env.DATABASE_URL || '').trim();
  if (!raw) {
    throw new Error('DATABASE_URL is not set. Add it to server/.env before running this script.');
  }
  const url = new URL(raw);
  const host = url.hostname;
  const local = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(host);
  const credentials = url.username ? `${url.username}@` : '';
  return {
    host,
    database: url.pathname.replace(/^\//, ''),
    local,
    display: `${url.protocol}//${credentials}${url.host}${url.pathname}`,
  };
}

async function backendResponds(): Promise<boolean> {
  const port = process.env.PORT || '5000';
  try {
    const res = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

type Tx = Prisma.TransactionClient;

interface TableOp {
  name: string;
  count: () => Promise<number>;
  del: (tx: Tx) => Promise<number>;
}

const tables: TableOp[] = [
  { name: 'challenge_contributions', count: () => prisma.challengeContribution.count(), del: async (tx) => (await tx.challengeContribution.deleteMany({})).count },
  { name: 'user_challenge_progress', count: () => prisma.userChallengeProgress.count(), del: async (tx) => (await tx.userChallengeProgress.deleteMany({})).count },
  { name: 'point_histories', count: () => prisma.pointHistory.count(), del: async (tx) => (await tx.pointHistory.deleteMany({})).count },
  { name: 'certificates', count: () => prisma.certificate.count(), del: async (tx) => (await tx.certificate.deleteMany({})).count },
  { name: 'reward_claims', count: () => prisma.rewardClaim.count(), del: async (tx) => (await tx.rewardClaim.deleteMany({})).count },
  { name: 'walk_in_turnover_items', count: () => prisma.walkInTurnoverItem.count(), del: async (tx) => (await tx.walkInTurnoverItem.deleteMany({})).count },
  { name: 'walk_in_turnovers', count: () => prisma.walkInTurnover.count(), del: async (tx) => (await tx.walkInTurnover.deleteMany({})).count },
  { name: 'mrf_asset_records', count: () => prisma.mrfAssetRecord.count(), del: async (tx) => (await tx.mrfAssetRecord.deleteMany({})).count },
  { name: 'asset_scrap_items', count: () => prisma.assetScrapItem.count(), del: async (tx) => (await tx.assetScrapItem.deleteMany({})).count },
  { name: 'recycle_sale_transactions', count: () => prisma.recycleSaleTransaction.count(), del: async (tx) => (await tx.recycleSaleTransaction.deleteMany({})).count },
  { name: 'asset_scrap_sale_transactions', count: () => prisma.assetScrapSaleTransaction.count(), del: async (tx) => (await tx.assetScrapSaleTransaction.deleteMany({})).count },
  { name: 'market_stock_snapshots', count: () => prisma.marketStockSnapshot.count(), del: async (tx) => (await tx.marketStockSnapshot.deleteMany({})).count },
  { name: 'asset_scrap_stock_snapshots', count: () => prisma.assetScrapStockSnapshot.count(), del: async (tx) => (await tx.assetScrapStockSnapshot.deleteMany({})).count },
  { name: 'user_point_snapshots', count: () => prisma.userPointSnapshot.count(), del: async (tx) => (await tx.userPointSnapshot.deleteMany({})).count },
  { name: 'reports', count: () => prisma.report.count(), del: async (tx) => (await tx.report.deleteMany({})).count },
  { name: 'offenses', count: () => prisma.offense.count(), del: async (tx) => (await tx.offense.deleteMany({})).count },
  { name: 'audit_logs', count: () => prisma.auditLog.count(), del: async (tx) => (await tx.auditLog.deleteMany({})).count },
  { name: 'enrollment_sync_logs', count: () => prisma.enrollmentSyncLog.count(), del: async (tx) => (await tx.enrollmentSyncLog.deleteMany({})).count },
  { name: 'sync_logs', count: () => prisma.syncLog.count(), del: async (tx) => (await tx.syncLog.deleteMany({})).count },
  { name: 'atlas_sync_logs', count: () => prisma.atlasSyncLog.count(), del: async (tx) => (await tx.atlasSyncLog.deleteMany({})).count },
  { name: 'atlas_rooms', count: () => prisma.atlasRoom.count(), del: async (tx) => (await tx.atlasRoom.deleteMany({})).count },
  { name: 'atlas_buildings', count: () => prisma.atlasBuilding.count(), del: async (tx) => (await tx.atlasBuilding.deleteMany({})).count },
  { name: 'atlas_map_snapshots', count: () => prisma.atlasMapSnapshot.count(), del: async (tx) => (await tx.atlasMapSnapshot.deleteMany({})).count },
  { name: 'campus_news', count: () => prisma.campusNews.count(), del: async (tx) => (await tx.campusNews.deleteMany({})).count },
  { name: 'calendar_events', count: () => prisma.calendarEvent.count(), del: async (tx) => (await tx.calendarEvent.deleteMany({})).count },
  { name: 'user_sessions', count: () => prisma.userSession.count(), del: async (tx) => (await tx.userSession.deleteMany({})).count },
  { name: 'users', count: () => prisma.user.count(), del: async (tx) => (await tx.user.deleteMany({})).count },
  { name: 'school_years', count: () => prisma.schoolYear.count(), del: async (tx) => (await tx.schoolYear.deleteMany({})).count },
  { name: 'term_calendars', count: () => prisma.termCalendar.count(), del: async (tx) => (await tx.termCalendar.deleteMany({})).count },
  { name: 'academic_quarters', count: () => prisma.academicQuarter.count(), del: async (tx) => (await tx.academicQuarter.deleteMany({})).count },
  { name: 'challenges', count: () => prisma.challenge.count(), del: async (tx) => (await tx.challenge.deleteMany({})).count },
  { name: 'rewards', count: () => prisma.reward.count(), del: async (tx) => (await tx.reward.deleteMany({})).count },
  { name: 'waste_bins', count: () => prisma.wasteBin.count(), del: async (tx) => (await tx.wasteBin.deleteMany({})).count },
  { name: 'campus_locations', count: () => prisma.campusLocation.count(), del: async (tx) => (await tx.campusLocation.deleteMany({})).count },
  { name: 'room_locations', count: () => prisma.roomLocation.count(), del: async (tx) => (await tx.roomLocation.deleteMany({})).count },
  { name: 'item_presets', count: () => prisma.itemPreset.count(), del: async (tx) => (await tx.itemPreset.deleteMany({})).count },
  { name: 'asset_categories', count: () => prisma.assetCategory.count(), del: async (tx) => (await tx.assetCategory.deleteMany({})).count },
  { name: 'waste_types', count: () => prisma.wasteType.count(), del: async (tx) => (await tx.wasteType.deleteMany({})).count },
  { name: 'urgency_levels', count: () => prisma.urgencyLevel.count(), del: async (tx) => (await tx.urgencyLevel.deleteMany({})).count },
  { name: 'asset_conditions', count: () => prisma.assetCondition.count(), del: async (tx) => (await tx.assetCondition.deleteMany({})).count },
  { name: 'point_rules', count: () => prisma.pointRule.count(), del: async (tx) => (await tx.pointRule.deleteMany({})).count },
  { name: 'recycle_market_stocks', count: () => prisma.recycleMarketStock.count(), del: async (tx) => (await tx.recycleMarketStock.deleteMany({})).count },
  { name: 'asset_scrap_stocks', count: () => prisma.assetScrapStock.count(), del: async (tx) => (await tx.assetScrapStock.deleteMany({})).count },
];

async function notificationsTableExists(): Promise<boolean> {
  try {
    const rows = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'notifications') AS exists`
    );
    return Boolean(rows[0]?.exists);
  } catch {
    return false;
  }
}

function purgeFiles(): { dir: string; removed: number }[] {
  const results: { dir: string; removed: number }[] = [];
  for (const dir of FILE_PURGE_DIRS) {
    if (!fs.existsSync(dir)) {
      results.push({ dir, removed: 0 });
      continue;
    }
    let removed = 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      fs.rmSync(path.join(dir, entry.name), { force: true });
      removed++;
    }
    results.push({ dir, removed });
  }
  return results;
}

function countFiles(): number {
  let total = 0;
  for (const dir of FILE_PURGE_DIRS) {
    if (!fs.existsSync(dir)) continue;
    total += fs.readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isFile()).length;
  }
  return total;
}

async function runDryRun(target: DbTarget): Promise<void> {
  console.log('--- DRY RUN: no data will be deleted ---\n');
  const counts = await Promise.all(tables.map(async (table) => ({ name: table.name, count: await table.count() })));
  let total = 0;
  for (const { name, count } of counts) {
    console.log(`  ${name}: ${count} rows`);
    total += count;
  }
  if (await notificationsTableExists()) {
    const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>('SELECT COUNT(*)::bigint AS count FROM notifications');
    const count = Number(rows[0]?.count ?? 0);
    console.log(`  notifications: ${count} rows`);
    total += count;
  }
  const settingsRow = await prisma.systemSetting.findUnique({ where: { id: 'default_setting' }, select: { schoolName: true, logoUrl: true } });
  console.log('');
  console.log(`Total rows that would be deleted: ${total}`);
  console.log(`Target database: ${target.display}`);
  console.log(`Branding reset: school_name="${settingsRow?.schoolName ?? ''}" → null, logo_url="${settingsRow?.logoUrl ?? ''}" → null`);
  console.log(`Files that would be purged: ${countFiles()}`);
  console.log('\nRe-run without --dry-run to execute the wipe.');
}

async function runWipe(target: DbTarget, flags: Flags): Promise<void> {
  const counts: Record<string, number> = {};
  const hasNotifications = await notificationsTableExists();

  await prisma.$transaction(
    async (tx) => {
      for (const table of tables) {
        counts[table.name] = await table.del(tx);
      }
      if (hasNotifications) {
        counts['notifications'] = Number(await tx.$executeRawUnsafe('DELETE FROM notifications'));
      }
      const settings = await tx.systemSetting.updateMany({ where: { id: 'default_setting' }, data: BRANDING_RESET });
      counts['system_settings_branding_reset'] = settings.count;
    },
    { maxWait: 10_000, timeout: 120_000 }
  );

  let purgedFiles = 0;
  const fileResults: { dir: string; removed: number }[] = [];
  if (!flags.skipFiles) {
    for (const result of purgeFiles()) {
      fileResults.push(result);
      purgedFiles += result.removed;
    }
  }

  console.log('--- Wipe Results ---');
  let total = 0;
  for (const table of tables) {
    console.log(`  ${table.name}: ${counts[table.name] ?? 0} rows deleted`);
    total += counts[table.name] ?? 0;
  }
  if (hasNotifications) {
    console.log(`  notifications: ${counts['notifications'] ?? 0} rows deleted`);
    total += counts['notifications'] ?? 0;
  }
  console.log(`  system_settings branding fields reset: ${counts['system_settings_branding_reset'] ?? 0}`);
  for (const result of fileResults) {
    console.log(`  files purged in ${result.dir}: ${result.removed}`);
  }
  console.log('');
  console.log(`Total rows deleted: ${total}`);
  console.log(`Files purged: ${flags.skipFiles ? 'skipped' : purgedFiles}`);
  console.log(`Target database: ${target.display}`);
  console.log('\nNext steps: npm run sync:enrollpro → npm run db:seed → npm run branding:sync');
  console.log('(or run the full sequence with: npm run db:reset-tenant -- --confirm=WIPE-EMEMS)');
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));

  if (flags.confirm !== CONFIRM_PHRASE) {
    console.error(`Refusing to run: pass --confirm=${CONFIRM_PHRASE} to acknowledge a destructive, unrecoverable wipe.\n`);
    usage();
    process.exit(1);
  }

  const target = resolveDbTarget();
  if (!target.local && !flags.allowRemote) {
    console.error(`Refusing to wipe non-local database host "${target.host}". Re-run with --allow-remote only if this is intentional.\n`);
    usage();
    process.exit(1);
  }

  console.log('=== SORT Tenant Wipe ===');
  console.log(`Target database: ${target.display}`);
  console.log(`Mode: ${flags.dryRun ? 'DRY RUN (read-only)' : 'LIVE WIPE'}\n`);

  const backendUp = await backendResponds();
  if (backendUp) {
    if (flags.dryRun) {
      console.warn('WARNING: backend at /health is responding. Stop it before a live wipe so schedulers do not write mid-run.\n');
    } else if (!flags.force) {
      console.error('Refusing to wipe while the backend is running (GET /health responded).');
      console.error('Stop the backend server, then re-run. Use --force only if you accept the race risk.\n');
      process.exit(1);
    } else {
      console.warn('WARNING: --force used while the backend is running. Schedulers may write during the wipe.\n');
    }
  }

  if (flags.dryRun) {
    await runDryRun(target);
    return;
  }

  await runWipe(target, flags);
}

main()
  .catch((error) => {
    console.error('Wipe failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
