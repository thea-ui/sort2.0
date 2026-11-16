import { expect, test } from '@playwright/test';

import { seedSession } from '../ui/helpers/session';
import { attachErrorCollector } from './helpers/errors';
import { activateServiceWorker, requireRoleSeeded } from './helpers/pwa';

test('service worker failure never blocks the app', async ({ page }) => {
  const collector = attachErrorCollector(page);
  const seeded = await seedSession(page, 'STUDENT');
  requireRoleSeeded(seeded, 'STUDENT');
  test.skip(!seeded, 'no usable STUDENT test identity');

  await page.route('**/sw.js', (route) => route.abort());
  await page.goto('/');

  await expect(page.getByRole('button', { name: 'Report' }).first()).toBeVisible({ timeout: 25_000 });
  await expect(page.getByText('Something went wrong on this screen')).toHaveCount(0);

  // Registration failures are warnings only; no console errors or page errors.
  expect(collector.errors.filter((entry) => !entry.includes('/sw.js'))).toEqual([]);
});

test('installed shell renders offline with an informational banner', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const seeded = await seedSession(page, 'STUDENT');
  test.skip(!seeded, 'no usable STUDENT test identity');

  await page.goto('/');
  await expect(page.getByRole('main')).toBeVisible();
  await activateServiceWorker(page);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId('offline-banner')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('offline-banner')).toContainText(/needs a connection/i);
  await expect(page.locator('body')).not.toContainText('This site can’t be reached');

  await context.setOffline(false);
  await expect(page.getByTestId('offline-banner')).toHaveCount(0);
  await context.close();
});

test('deep links load through the navigation fallback', async ({ page }) => {
  const collector = attachErrorCollector(page);

  for (const path of ['/admin', '/mrf', '/reports/print']) {
    const response = await page.goto(path);
    expect(response?.status(), `${path} status`).toBe(200);
    await expect(page.locator('#root')).not.toBeEmpty();
  }

  // Signed-out entry screens legitimately probe protected endpoints and log
  // the resulting 401 resource errors; anything else must stay clean.
  const unexpected = collector.errors.filter((entry) => !entry.includes('401 (Unauthorized)'));
  expect(unexpected, `deep links browser errors:\n${unexpected.join('\n')}`).toEqual([]);
});
