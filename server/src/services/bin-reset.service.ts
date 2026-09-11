import { PrismaClient, ReportStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ── Concurrency Guard ──────────────────────────────────────────────────────
let binResetInProgress = false;

const BIN_RESET_TZ = process.env.BIN_RESET_TZ || 'Asia/Manila';

let scheduledTask: any = null;

export interface BinResetResult {
  binsReset: number;
  reportsExpired: number;
  error?: string;
}

/**
 * Daily 6:00 PM cleanup:
 * 1. Reset every waste bin to empty (fillLevel 0, no active dispatch,
 *    lastEmptied stamped).
 * 2. Expire stale WASTE reports that were never collected (PENDING or
 *    DISPATCHED) — the school has physically cleared the trash, so these
 *    are moot. This is neutral: no points awarded or deducted, and it
 *    unblocks the duplicate-report guard so students can report again the
 *    next day. ASSET reports are never touched.
 * 3. Audit the whole operation.
 */
export async function executeDailyBinReset(): Promise<BinResetResult> {
  if (binResetInProgress) {
    console.warn('[BinReset] Attempted concurrent reset — rejected');
    return { binsReset: 0, reportsExpired: 0, error: 'A bin reset is already in progress.' };
  }

  binResetInProgress = true;
  try {
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const bins = await tx.wasteBin.updateMany({
        data: { fillLevel: 0, activeDispatch: false, lastEmptied: now },
      });

      const expired = await tx.report.updateMany({
        where: {
          status: { in: [ReportStatus.PENDING, ReportStatus.DISPATCHED] },
          reportType: 'WASTE',
        },
        data: { status: ReportStatus.EXPIRED, completedAt: now },
      });

      await tx.auditLog.create({
        data: {
          actorName: 'System',
          actorRole: 'SYSTEM',
          actionType: 'DAILY_BIN_RESET',
          details: `Daily bin reset: ${bins.count} bins cleared, ${expired.count} stale waste reports expired (cleared at 6 PM).`,
          schoolYearId: null,
        },
      });

      return { bins: bins.count, reports: expired.count };
    });

    console.log(`[BinReset] Cleared ${result.bins} bins, expired ${result.reports} waste reports`);
    return { binsReset: result.bins, reportsExpired: result.reports };
  } catch (error: any) {
    console.error('[BinReset] Failed:', error.message);
    return { binsReset: 0, reportsExpired: 0, error: error.message };
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

const TIME_REGEX = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/**
 * Schedule the daily reset from System Settings. Reads binResetEnabled and
 * binResetTime; re-schedules whenever settings change.
 */
export async function rescheduleBinReset() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  try {
    const settings = await prisma.systemSetting.findUnique({ where: { id: 'default_setting' } });
    const enabled = settings ? settings.binResetEnabled : true;
    const time = settings?.binResetTime || '18:00';

    if (!enabled) {
      console.log('[BinReset] Disabled in settings — no daily reset scheduled');
      return;
    }

    const match = TIME_REGEX.exec(time.trim());
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
}