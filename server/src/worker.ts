import { validateEnv } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { rescheduleSync, stopScheduledSync } from './services/sync-scheduler.service.js';
import { rescheduleBinReset, stopScheduledBinReset } from './services/bin-reset.service.js';
import { rescheduleAtlasSync, stopScheduledAtlasSync } from './services/atlas-sync-scheduler.service.js';
import { startBrandingSyncScheduler, stopBrandingSyncScheduler } from './services/branding-sync-scheduler.service.js';

/**
 * Dedicated scheduler process (Phase 6).
 *
 * Runs the EnrollPro sync, daily bin reset, ATLAS sync and branding refresh
 * outside the HTTP process. Start it with `RUN_SCHEDULERS=true` (the default in
 * this entry point) while the API runs with `RUN_SCHEDULERS=false`.
 */

validateEnv();

process.on('uncaughtException', (err) => {
  console.error('[Worker] Uncaught Exception:', err.stack || err.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('[Worker] Unhandled Rejection:', reason?.message || reason);
});

async function start(): Promise<void> {
  await prisma.$connect();

  rescheduleSync().catch((err) => {
    console.error('[Worker] Sync scheduler failed to start:', err.message);
  });
  rescheduleBinReset().catch((err) => {
    console.error('[Worker] Bin reset scheduler failed to start:', err.message);
  });
  rescheduleAtlasSync().catch((err) => {
    console.error('[Worker] ATLAS scheduler failed to start:', err.message);
  });
  startBrandingSyncScheduler();

  console.log(`[Worker] Scheduler process running (pid ${process.pid})`);
}

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[Worker] ${signal} received — stopping schedulers...`);

  const forceExit = setTimeout(() => {
    console.error('[Worker] Shutdown timed out — forcing exit.');
    process.exit(1);
  }, 15_000);
  forceExit.unref();

  stopScheduledSync();
  stopScheduledBinReset();
  stopScheduledAtlasSync();
  stopBrandingSyncScheduler();

  await prisma.$disconnect().catch(() => undefined);
  console.log('[Worker] Shutdown complete.');
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

start().catch((error: any) => {
  console.error('[Worker] Failed to start:', error?.message || error);
  process.exit(1);
});
