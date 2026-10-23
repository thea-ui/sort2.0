import { test, expect } from '@playwright/test';
import { seedSession } from './helpers/session';

/**
 * Polling budget guard (PERFORMANCE_OPTIMIZATION_PLAN.md Phase 2).
 *
 * A signed-in admin overview must not hammer the API: after the initial load
 * settles, a 10s idle window may issue only a handful of GETs, report polls are
 * capped, and localStorage must not be rewritten on a timer. A hidden tab must
 * back its polling off further. Before the Phase 2 rework these budgets were
 * blown by the 2s/2.5s poll storm.
 */

const IDLE_WINDOW_MS = 10_000;

function isCountedRequest(url: URL, method: string): boolean {
  if (method !== 'GET') return false;
  if (!url.pathname.startsWith('/api/')) return false;
  if (url.pathname.includes('stream')) return false; // long-lived SSE connection
  if (url.pathname.includes('/photo')) return false;
  if (url.pathname.endsWith('/campus-image')) return false;
  return true;
}

async function installHarness(page: import('@playwright/test').Page, counted: string[]): Promise<void> {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    (window as any).__setItemCount = 0;
    Storage.prototype.setItem = function (...args: unknown[]) {
      (window as any).__setItemCount += 1;
      return original.apply(this, args as [string, string]);
    };
  });

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (isCountedRequest(url, request.method())) counted.push(url.pathname);
    if (url.pathname === '/api/reports' && request.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return;
    }
    await route.continue();
  });
}

test('idle admin overview stays within the polling budget', async ({ page }) => {
  const seeded = await seedSession(page, 'ADMIN');
  test.skip(!seeded, 'no usable ADMIN test identity');

  const counted: string[] = [];
  await installHarness(page, counted);

  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Overview' }).first()).toBeVisible({ timeout: 20_000 });

  // Let initial hydration and first poll settle before sampling.
  await page.waitForTimeout(4_000);
  counted.length = 0;
  await page.evaluate(() => {
    (window as any).__setItemCount = 0;
  });

  await page.waitForTimeout(IDLE_WINDOW_MS);

  const reports = counted.filter((p) => p === '/api/reports').length;
  const writes = await page.evaluate(() => (window as any).__setItemCount as number);
  const summary = counted.join(', ');

  expect(reports, `report polls in ${IDLE_WINDOW_MS}ms (${reports}) — requests: ${summary}`).toBeLessThanOrEqual(2);
  expect(counted.length, `total API GETs in ${IDLE_WINDOW_MS}ms (${summary})`).toBeLessThanOrEqual(10);
  expect(writes, 'localStorage writes while idle (timer-driven writes must be gone)').toBeLessThanOrEqual(5);
  console.log(`[resource-guard] idle ${IDLE_WINDOW_MS}ms → report polls: ${reports}, total GETs: ${counted.length}, localStorage writes: ${writes}`);
});

test('hidden tab backs report polling off', async ({ page }) => {
  const seeded = await seedSession(page, 'ADMIN');
  test.skip(!seeded, 'no usable ADMIN test identity');

  const counted: string[] = [];
  await installHarness(page, counted);

  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Overview' }).first()).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(3_000);

  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });

  counted.length = 0;
  await page.waitForTimeout(IDLE_WINDOW_MS);

  const reports = counted.filter((p) => p === '/api/reports').length;
  expect(reports, `report polls while hidden (${reports})`).toBeLessThanOrEqual(1);
  console.log(`[resource-guard] hidden ${IDLE_WINDOW_MS}ms → report polls: ${reports}, total GETs: ${counted.length}`);
});
