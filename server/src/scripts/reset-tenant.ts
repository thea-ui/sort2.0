import { prisma } from '../lib/prisma.js';
import dotenv from 'dotenv';

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

dotenv.config({ path: path.join(SERVER_ROOT, '.env') });

const CONFIRM_PHRASE = 'WIPE-EMEMS';
const DEFAULT_ENROLLPRO_BASE = 'https://dev-jegs.buru-degree.ts.net/api';

interface Flags {
  confirm: string;
  dryRun: boolean;
  force: boolean;
  allowRemote: boolean;
  withAtlas: boolean;
  skipBranding: boolean;
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = {
    confirm: '',
    dryRun: false,
    force: false,
    allowRemote: false,
    withAtlas: false,
    skipBranding: false,
  };
  for (const arg of argv) {
    if (arg === '--dry-run') flags.dryRun = true;
    else if (arg === '--force') flags.force = true;
    else if (arg === '--allow-remote') flags.allowRemote = true;
    else if (arg === '--with-atlas') flags.withAtlas = true;
    else if (arg === '--skip-branding') flags.skipBranding = true;
    else if (arg.startsWith('--confirm=')) flags.confirm = arg.slice('--confirm='.length);
  }
  return flags;
}

function usage(): void {
  console.log('Usage: npm run db:reset-tenant -- --confirm=WIPE-EMEMS [--dry-run] [--force] [--allow-remote] [--with-atlas] [--skip-branding]');
}

function runNpm(script: string, extraArgs: string[] = []): number {
  const args = ['run', script];
  if (extraArgs.length > 0) args.push('--', ...extraArgs);
  const result = spawnSync('npm', args, {
    cwd: SERVER_ROOT,
    stdio: 'inherit',
    env: process.env,
    shell: true,
  });
  return result.status ?? 1;
}

async function resolveEnrollProBase(): Promise<string> {
  const row = await prisma.systemSetting.findUnique({
    where: { id: 'default_setting' },
    select: { enrollproUrl: true },
  });
  const stored = row?.enrollproUrl?.trim();
  return (stored || process.env.ENROLLPRO_URL || process.env.ENROLLPRO_BASE_URL || DEFAULT_ENROLLPRO_BASE).replace(/\/+$/, '');
}

async function preflightEnrollPro(force: boolean): Promise<void> {
  const base = await resolveEnrollProBase();
  console.log('--- Preflight: EnrollPro endpoint ---');
  console.log(`Resolved base URL: ${base} (same instance as before; branding + seeded data are switched to EMEMS)`);
  console.log('The school branding check below must show EMEMS. Abort now (Ctrl+C) if EnrollPro is not ready.\n');

  if (!(process.env.ENROLLPRO_SYNC_SECRET || '').trim()) {
    console.warn('WARNING: ENROLLPRO_SYNC_SECRET is empty. User sync will likely fail (integration key required).');
  }

  try {
    const res = await fetch(`${base}/integration/v1/health`, { signal: AbortSignal.timeout(8000) });
    console.log(`EnrollPro health: HTTP ${res.status}`);
    if (!res.ok && !force) {
      throw new Error(`EnrollPro health check returned HTTP ${res.status}. Re-run with --force to bypass if you accept the risk.`);
    }
  } catch (error) {
    if (force) {
      console.warn(`WARNING: EnrollPro preflight failed (${error instanceof Error ? error.message : error}) but --force was passed. Continuing.`);
      return;
    }
    throw new Error(`EnrollPro is not reachable at ${base}. Wait for the EnrollPro go signal. (${error instanceof Error ? error.message : error})`);
  }

  try {
    const brandingRes = await fetch(`${base}/settings/public`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (brandingRes.ok) {
      const branding = (await brandingRes.json()) as { schoolName?: string; depedSchoolId?: string; logoUrl?: string | null };
      console.log(`EnrollPro school branding: "${branding.schoolName ?? '(none)'}"${branding.depedSchoolId ? ` (DepEd ID: ${branding.depedSchoolId})` : ''}${branding.logoUrl ? ' + logo' : ''}`);
      console.log('CONFIRM this is EMEMS before the wipe proceeds.');
    } else {
      console.warn(`WARNING: EnrollPro settings/public returned HTTP ${brandingRes.status}; could not confirm the school branding.`);
    }
  } catch (brandingError) {
    console.warn(`WARNING: could not read EnrollPro branding (${brandingError instanceof Error ? brandingError.message : brandingError}).`);
  }
}

async function verify(): Promise<void> {
  const [byRole, totalUsers, reports, pointHistories, activeYear, terms, quarters, challenges, stocks] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    prisma.user.count(),
    prisma.report.count(),
    prisma.pointHistory.count(),
    prisma.schoolYear.findFirst({ where: { isActive: true }, select: { label: true } }),
    prisma.termCalendar.count(),
    prisma.academicQuarter.count(),
    prisma.challenge.count(),
    prisma.recycleMarketStock.aggregate({ _sum: { accumulatedKg: true } }),
  ]);
  const settings = await prisma.systemSetting.findUnique({
    where: { id: 'default_setting' },
    select: { schoolName: true, logoUrl: true, primaryColor: true, secondaryColor: true },
  });

  const roles = byRole.map((row) => `${row.role}=${row._count._all}`).join(', ') || 'none';
  console.log('--- Verification ---');
  console.log(`Users: ${totalUsers} (${roles})`);
  console.log(`Reports: ${reports} (expected 0)`);
  console.log(`Point histories: ${pointHistories} (expected 0)`);
  console.log(`Active school year: ${activeYear?.label ?? 'none'}`);
  console.log(`Terms: ${terms}, quarters: ${quarters}, challenges: ${challenges}`);
  console.log(`Recycle market stock: ${stocks._sum.accumulatedKg ?? 0} kg (expected 0)`);
  console.log(`Branding: school="${settings?.schoolName ?? ''}", logo="${settings?.logoUrl ?? ''}", colors=${settings?.primaryColor ?? ''}/${settings?.secondaryColor ?? ''}`);
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));

  if (flags.confirm !== CONFIRM_PHRASE) {
    console.error(`Refusing to run: pass --confirm=${CONFIRM_PHRASE} to acknowledge a destructive, unrecoverable tenant reset.\n`);
    usage();
    process.exit(1);
  }

  await preflightEnrollPro(flags.force);

  const wipeArgs = [`--confirm=${CONFIRM_PHRASE}`];
  if (flags.dryRun) wipeArgs.push('--dry-run');
  if (flags.force) wipeArgs.push('--force');
  if (flags.allowRemote) wipeArgs.push('--allow-remote');

  console.log('\n=== [1/5] Wipe tenant data ===');
  if (runNpm('db:wipe-tenant', wipeArgs) !== 0) {
    throw new Error('Wipe step failed. Nothing else was changed.');
  }

  if (flags.dryRun) {
    console.log('\nDRY RUN complete. No sync, seed, or branding changes were made.');
    return;
  }

  console.log('\n=== [2/5] Sync Emems identities from EnrollPro ===');
  const syncCode = runNpm('sync:enrollpro');
  if (syncCode === 1) {
    throw new Error('EnrollPro sync FAILED. Database is wiped and clean; fix EnrollPro and re-run sync:enrollpro.');
  }
  if (syncCode === 2) {
    console.warn('WARNING: EnrollPro sync PARTIAL. Some cohorts failed; re-run npm run sync:enrollpro after the reset if needed.');
  }

  console.log('\n=== [3/5] Seed platform catalogs ===');
  if (runNpm('db:seed') !== 0) {
    throw new Error('Seed step failed. Re-run npm run db:seed to finish.');
  }

  if (flags.skipBranding) {
    console.log('\n=== [4/5] Branding sync skipped (--skip-branding) ===');
  } else {
    console.log('\n=== [4/5] Sync Emems branding from EnrollPro ===');
    if (runNpm('branding:sync') !== 0) {
      console.warn('WARNING: Branding sync failed. SORT renders default branding. Retry with npm run branding:sync or Admin → Settings.');
    }
  }

  if (flags.withAtlas) {
    console.log('\n=== [5/5] Sync ATLAS campus map ===');
    if (runNpm('sync:atlas') !== 0) {
      console.warn('WARNING: ATLAS sync failed. Retry with npm run sync:atlas after checking ATLAS_SCHOOL_ID.');
    }
  } else {
    console.log('\n=== [5/5] ATLAS sync skipped (pass --with-atlas if Emems has an ATLAS map) ===');
  }

  console.log('');
  await verify();
  console.log('\nRESET COMPLETE. Start the backend and hard-refresh demo browsers (old sessions are invalidated).');
}

main()
  .catch((error) => {
    console.error(`\nReset aborted: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
