import { test, expect } from '@playwright/test';
import { seedSession } from './helpers/session';
import { mockAtlasImage, mockAtlasMap } from './helpers/atlasRoutes';

/**
 * Regression: fixed overlays rendered inside the dashboard content area used to
 * be trapped in its `relative z-10` stacking context, so the header/sidebar
 * painted over the modal and the backdrop failed to dim the chrome.
 */
test('admin report modal paints above the app chrome and stays fully on screen', async ({ page }) => {
  const seeded = await seedSession(page, 'ADMIN');
  test.skip(!seeded, 'no usable ADMIN test identity');

  await mockAtlasMap(page);
  await mockAtlasImage(page, false);

  await page.goto('/');
  await page.getByRole('button', { name: 'Reports' }).first().click();

  // The queue only lists today's / still-active reports, so the test database
  // may legitimately have nothing to inspect — skip rather than fail red.
  const eyeButton = page.getByTitle('Inspect details').first();
  const hasInspectable = await eyeButton
    .waitFor({ state: 'visible', timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  test.skip(!hasInspectable, 'no inspectable report in the queue for the test database');

  await eyeButton.click();

  const panel = page.getByTestId('modal-panel');
  await expect(panel).toBeVisible();

  // 1. The overlay is the topmost element in the header strip (portaled above
  //    the app chrome, not hidden behind it).
  const overlayCoversHeader = await page.evaluate(() => {
    const el = document.elementFromPoint(window.innerWidth / 2, 18);
    return Boolean(el?.closest('[data-testid="modal-overlay"]'));
  });
  expect(overlayCoversHeader).toBe(true);

  // 2. The panel is fully within the viewport (not slid under the header).
  const box = (await panel.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  expect(box.height).toBeLessThanOrEqual(Math.round(viewport.height * 0.92) + 1);

  // 3. Closing still works.
  await page.getByRole('button', { name: 'Close report details' }).click();
  await expect(page.getByTestId('modal-panel')).toHaveCount(0);
});
