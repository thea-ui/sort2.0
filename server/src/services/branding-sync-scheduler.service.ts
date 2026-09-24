import { syncEnrollProBranding } from './enrollpro-branding.service.js';
import { isRolloverInProgress } from './rollover.service.js';

/**
 * EnrollPro branding refresh cadence: once on boot (shortly after the server
 * starts) and then hourly. Branding is low-priority: a rollover defers the run,
 * and failures keep the last-known values (see enrollpro-branding.service.ts).
 */
export const BRANDING_SYNC_INTERVAL_MS = 60 * 60 * 1000;
const BOOT_DELAY_MS = 5_000;

let intervalTimer: ReturnType<typeof setInterval> | null = null;
let bootTimer: ReturnType<typeof setTimeout> | null = null;

async function runBrandingSync(trigger: 'boot' | 'interval'): Promise<void> {
  if (isRolloverInProgress()) {
    console.log('[Branding] School-year rollover in progress — skipping EnrollPro branding sync');
    return;
  }
  const result = await syncEnrollProBranding();
  if (result.status === 'synced') {
    console.log(`[Branding] ${trigger} sync complete`);
  } else {
    console.warn(`[Branding] ${trigger} sync skipped: ${result.error}`);
  }
}

export function startBrandingSyncScheduler(): void {
  if (intervalTimer) return;
  bootTimer = setTimeout(() => {
    void runBrandingSync('boot');
  }, BOOT_DELAY_MS);
  intervalTimer = setInterval(() => {
    void runBrandingSync('interval');
  }, BRANDING_SYNC_INTERVAL_MS);
  console.log('[Branding] EnrollPro branding sync scheduled (boot + every 60 minutes)');
}

export function stopBrandingSyncScheduler(): void {
  if (bootTimer) {
    clearTimeout(bootTimer);
    bootTimer = null;
  }
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
    console.log('[Branding] EnrollPro branding sync stopped');
  }
}
