import { PrismaClient } from '@prisma/client';
import { syncAtlasMap } from './atlas-map.service.js';

const prisma = new PrismaClient();

export interface AtlasSyncSettings {
  atlasSyncMode: string;
  atlasSyncIntervalMinutes: number;
}

export const DEFAULT_ATLAS_SYNC_MODE = 'AUTO';
export const DEFAULT_ATLAS_SYNC_INTERVAL_MINUTES = 15;

let scheduledTask: any = null;

export async function getAtlasSyncSettings(): Promise<AtlasSyncSettings> {
  try {
    const settings = await prisma.systemSetting.findUnique({ where: { id: 'default_setting' } });
    return {
      atlasSyncMode: settings?.atlasSyncMode || DEFAULT_ATLAS_SYNC_MODE,
      atlasSyncIntervalMinutes:
        settings?.atlasSyncIntervalMinutes ?? DEFAULT_ATLAS_SYNC_INTERVAL_MINUTES,
    };
  } catch {
    return {
      atlasSyncMode: DEFAULT_ATLAS_SYNC_MODE,
      atlasSyncIntervalMinutes: DEFAULT_ATLAS_SYNC_INTERVAL_MINUTES,
    };
  }
}

/**
 * Minute-step cron intervals are only valid for N <= 59, so larger intervals
 * switch to an hourly or daily schedule (same convention as the EnrollPro
 * scheduler).
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

async function executeAtlasSync() {
  console.log(`[AtlasScheduler] Starting ATLAS sync at ${new Date().toISOString()}`);
  try {
    const result = await syncAtlasMap();
    console.log(
      `[AtlasScheduler] ${result.status}${result.unchanged ? ' (unchanged)' : ''}: ` +
        `${result.buildingsSeen} buildings / ${result.roomsSeen} rooms in ${result.durationMs}ms`
    );
  } catch (error: any) {
    // A failed ATLAS sync must never crash the server or touch the mirror.
    console.error('[AtlasScheduler] Sync failed:', error?.message || error);
  }
}

export function stopScheduledAtlasSync() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('[AtlasScheduler] Scheduled ATLAS sync stopped');
  }
}

export async function rescheduleAtlasSync(): Promise<void> {
  stopScheduledAtlasSync();

  const { atlasSyncMode, atlasSyncIntervalMinutes } = await getAtlasSyncSettings();

  if (atlasSyncMode === 'AUTO' && atlasSyncIntervalMinutes > 0) {
    try {
      const cron = await import('node-cron');
      const cronExpression = buildCronExpression(atlasSyncIntervalMinutes);
      scheduledTask = cron.default.schedule(cronExpression, executeAtlasSync);
      console.log(
        `[AtlasScheduler] Auto-sync scheduled every ${atlasSyncIntervalMinutes} minutes (cron: ${cronExpression})`
      );
    } catch (err) {
      console.error('[AtlasScheduler] Failed to schedule cron:', err);
    }
  } else {
    console.log('[AtlasScheduler] Manual mode — no ATLAS cron scheduled');
  }
}

export async function runScheduledAtlasSyncNow(): Promise<void> {
  return executeAtlasSync();
}
