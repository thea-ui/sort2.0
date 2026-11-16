import { expect, test } from '@playwright/test';

/**
 * Dev/test isolation: the service worker is production-only. Accidentally
 * enabling it in the dev server would break existing Playwright isolation and
 * serve stale modules between tests.
 */
test('dev server does not register a service worker', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#root')).not.toBeEmpty();

  const registrations = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return [];
    const found = await navigator.serviceWorker.getRegistrations();
    return found.map((registration) => registration.scope);
  });

  expect(registrations).toEqual([]);
});
