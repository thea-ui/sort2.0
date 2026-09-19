import { PrismaClient } from '@prisma/client';
import { runEnrollProSync, syncTermCalendar } from './enrollpro-sync.service.js';

const prisma = new PrismaClient();

let scheduledTask: any = null;
let isSyncRunning = false;

export async function getSyncSettings(): Promise<{ syncMode: string; syncIntervalMinutes: number }> {
  try {
    const settings = await prisma.systemSetting.findUnique({ where: { id: 'default_setting' } });
    return {
      syncMode: settings?.syncMode || 'MANUAL',
      syncIntervalMinutes: settings?.syncIntervalMinutes || 60,
    };
  } catch {
    return { syncMode: 'MANUAL', syncIntervalMinutes: 60 };
  }
}

async function executeSync() {
  if (isSyncRunning) {
    console.log('[Scheduler] Sync already in progress, skipping...');
    return;
  }

  isSyncRunning = true;
  console.log(`[Scheduler] Starting sync at ${new Date().toISOString()}`);

  try {
    const [userResult, termResult] = await Promise.all([
      runEnrollProSync(),
      syncTermCalendar(),
    ]);

    console.log(`[Scheduler] Sync finished: ${userResult.status} - ${userResult.recordsCreated} created, ${userResult.recordsUpdated} updated, ${userResult.recordsDeleted} deleted (${userResult.durationMs}ms)`);
    if (termResult.error) {
      console.log(`[Scheduler] Term sync warning: ${termResult.error}`);
    }
  } catch (error: any) {
    console.error('[Scheduler] Sync failed:', error.message);
  } finally {
    isSyncRunning = false;
  }
}

export function stopScheduledSync() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('[Scheduler] Scheduled sync stopped');
  }
}

/**
 * Builds a valid cron expression for the configured interval.
 * `*​/N * * * *` is only valid for N <= 59, so larger intervals switch to an
 * hourly or daily schedule instead of crashing the scheduler.
 */
function buildCronExpression(intervalMinutes: number): string {
  if (intervalMinutes < 60) {
    return `*/${Math.max(1, Math.round(intervalMinutes))} * * * *`;
  }
  const hours = Math.round(intervalMinutes / 60);
  if (hours >= 24) {
    return '0 0 * * *';
  }
  return `0 */${Math.max(1, hours)} * * *`;
}

export async function rescheduleSync() {
  stopScheduledSync();

  const { syncMode, syncIntervalMinutes } = await getSyncSettings();

  if (syncMode === 'AUTO' && syncIntervalMinutes > 0) {
    try {
      const cron = await import('node-cron');
      const cronExpression = buildCronExpression(syncIntervalMinutes);
      scheduledTask = cron.default.schedule(cronExpression, executeSync);
      console.log(`[Scheduler] Auto-sync scheduled every ${syncIntervalMinutes} minutes (cron: ${cronExpression})`);
    } catch (err) {
      console.error('[Scheduler] Failed to schedule cron:', err);
    }
  } else {
    console.log('[Scheduler] Manual mode — no cron scheduled');
  }
}

export async function runManualSync() {
  return executeSync();
}
