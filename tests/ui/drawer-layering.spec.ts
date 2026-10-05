import { test, expect } from '@playwright/test';
import { seedSession } from './helpers/session';

/**
 * Regression: RightDrawer used to render in place inside the page's
 * `animate-fade-in` transform stacking context, so the sticky shell header
 * painted over the drawer (its title/close button were clipped) and the
 * backdrop failed to dim the chrome. The drawer must portal above it.
 */
test('ledger record drawer paints above the app chrome and stays fully on screen', async ({ page }) => {
  const seeded = await seedSession(page, 'ADMIN');
  test.skip(!seeded, 'no usable ADMIN test identity');

  await page.goto('/');
  await page.getByRole('button', { name: 'School Years' }).first().click();

  // The ledger may be empty for the test database — skip rather than fail red.
  const row = page.locator('table tbody tr').first();
  const hasRow = await row
    .waitFor({ state: 'visible', timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  test.skip(!hasRow, 'no ledger rows in the test database');

  await row.click();

  const panel = page.getByRole('dialog');
  await expect(panel).toBeVisible();

  // 1. The overlay is the topmost element in the header strip (portaled above
  //    the app chrome, not trapped below the sticky header).
  const overlayCoversHeader = await page.evaluate(() => {
    const el = document.elementFromPoint(window.innerWidth / 2, 18);
    return !el?.closest('header') && !el?.closest('aside');
  });
  expect(overlayCoversHeader).toBe(true);

  // 2. The panel spans the full viewport height (not clipped under the header).
  const box = (await panel.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(Math.abs(box.y + box.height - viewport.height)).toBeLessThanOrEqual(1);

  // 3. Closing still works.
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(panel).toBeHidden();
});
