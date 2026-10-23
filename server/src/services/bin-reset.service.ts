import { ReportStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { BIN_RESET_TZ, RESET_TIME_REGEX } from './reset-cycle.service.js';
import { buildExpirableWasteWhere } from './report-expiry.js';

// ── Concurrency Guard ──────────────────────────────────────────────────────
let binResetInProgress = false;

let scheduledTask: any = null;
let rescheduleInFlight: Promise<void> | null = null;

export interface BinResetResult {
  binsReset: number;
  reportsExpired: number;
  dispatchesExpired: number;
  error?: string;
}

/**
 * Daily 6:00 PM cleanup:
 * 1. Reset every waste bin to empty (fillLevel 0, no active dispatch,
 *    lastEmptied stamped).
 * 2. Expire stale WASTE reports still PENDING (verified or not) — the school
 *    has physically cleared the trash, so these are moot. This is neutral: no
 *    points are removed. WASTE reports that were DISPATCHED but never
 *    completed during the day are expired too — an unfinished MRF task does
 *    not carry over to the next day. ASSET reports are NEVER touched. This
 *    also unblocks the duplicate-report guard so students can report again.
 * 3. Audit the whole operation.
 */
export async function executeDailyBinReset(): Promise<BinResetResult> {
  if (binResetInProgress) {
    console.warn('[BinReset] Attempted concurrent reset — rejected');
    return { binsReset: 0, reportsExpired: 0, dispatchesExpired: 0, error: 'A bin reset is already in progress.' };
  }

  binResetInProgress = true;
  try {
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const bins = await tx.wasteBin.updateMany({
        data: { fillLevel: 0, activeDispatch: false, lastEmptied: now },
      });

      // Waste-only, with a defensive exclusion of asset reports that legacy
      // rows may have mis-typed as WASTE. Applied to both PENDING and
      // DISPATCHED reports so unfinished dispatches expire with the day.
      const expirableWaste = buildExpirableWasteWhere();

      const expiredPending = await tx.report.updateMany({
        where: { ...expirableWaste, status: ReportStatus.PENDING },
        data: { status: ReportStatus.EXPIRED, completedAt: now },
      });

      const expiredDispatches = await tx.report.updateMany({
        where: { ...expirableWaste, status: ReportStatus.DISPATCHED },
        data: { status: ReportStatus.EXPIRED, completedAt: now },
      });

      const expiredCount = expiredPending.count + expiredDispatches.count;

      const activeSY = await tx.schoolYear.findFirst({
        where: { isActive: true, isArchived: false },
        select: { id: true },
      });

      await tx.auditLog.create({
        data: {
          actorName: 'System',
          actorRole: 'SYSTEM',
          actionType: 'DAILY_BIN_RESET',
          details: `Daily bin reset: ${bins.count} bins cleared, ${expiredPending.count} pending + ${expiredDispatches.count} dispatched waste reports expired (asset reports untouched).`,
          schoolYearId: activeSY?.id || null,
        },
      });

      return { bins: bins.count, reports: expiredCount, dispatches: expiredDispatches.count };
    });

    console.log(`[BinReset] Cleared ${result.bins} bins, expired ${result.reports} waste reports (${result.dispatches} dispatched)`);
    return { binsReset: result.bins, reportsExpired: result.reports, dispatchesExpired: result.dispatches };
  } catch (error: any) {
    console.error('[BinReset] Failed:', error.message);
    return { binsReset: 0, reportsExpired: 0, dispatchesExpired: 0, error: error.message };
  } finally {
    binResetInProgress = false;
  }
}

async function runConfiguredReset() {
  try {
    const settings = await prisma.systemSetting.findUnique({ where: { id: 'default_setting' } });
    if (settings && settings.binResetEnabled === false) {
      return;
    }
    await executeDailyBinReset();
  } catch (error: any) {
    console.error('[BinReset] Scheduled run error:', error.message);
  }
}

export function stopScheduledBinReset() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('[BinReset] Scheduled daily reset stopped');
  }
}

/**
 * Schedule the daily reset from System Settings. Reads binResetEnabled and
 * binResetTime; re-schedules whenever settings change.
 */
export function rescheduleBinReset(): Promise<void> {
  // Serialize concurrent reschedules so the latest settings win without
  // orphaning a previously scheduled cron task.
  if (rescheduleInFlight) return rescheduleInFlight;

  rescheduleInFlight = (async () => {
    stopScheduledBinReset();

    try {
      const settings = await prisma.systemSetting.findUnique({ where: { id: 'default_setting' } });
      const enabled = settings ? settings.binResetEnabled : true;
      const time = settings?.binResetTime || '18:00';

      if (!enabled) {
        console.log('[BinReset] Disabled in settings — no daily reset scheduled');
        return;
      }

      const match = RESET_TIME_REGEX.exec(time.trim());
      if (!match) {
        console.warn(`[BinReset] Invalid binResetTime "${time}" — expected HH:MM (24h). No reset scheduled.`);
        return;
      }

      const cronExpression = `${parseInt(match[2], 10)} ${parseInt(match[1], 10)} * * *`;
      const cron = await import('node-cron');
      scheduledTask = cron.default.schedule(cronExpression, runConfiguredReset, { timezone: BIN_RESET_TZ });
      console.log(`[BinReset] Scheduled daily reset at ${time.trim()} (${BIN_RESET_TZ})`);
    } catch (error: any) {
      console.error('[BinReset] Failed to schedule:', error.message);
    }
  })().finally(() => {
    rescheduleInFlight = null;
  });

  return rescheduleInFlight;
}