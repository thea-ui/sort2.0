import { reconcileOfflineAuthWithProvider } from './offline-auth.service.js';

/**
 * Auto-revert for break-glass offline auth.
 *
 * The fallback must never stay armed after the outage that justified it. This
 * polls the (cached) provider probe and disables offline auth once EnrollPro has
 * answered successfully twice in a row, revoking outstanding break-glass
 * sessions in the process.
 */
const INTERVAL_MS = 5 * 60 * 1000;

let timer: NodeJS.Timeout | null = null;

export function startOfflineAuthScheduler(): void {
  if (timer) return;
  timer = setInterval(() => {
    reconcileOfflineAuthWithProvider().catch((err) => {
      console.warn('[OfflineAuth] Auto-revert check failed:', err?.message || err);
    });
  }, INTERVAL_MS);
  // Never keep the process alive just for this timer.
  timer.unref?.();
  console.log('[OfflineAuth] Auto-revert scheduler started (every 5 minutes)');
}

export function stopOfflineAuthScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
