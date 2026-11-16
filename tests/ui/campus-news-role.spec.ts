import { expect, test } from '@playwright/test';

import { seedSession } from './helpers/session';

/**
 * Campus News is an MRF responsibility. The admin console must not expose the
 * management tab anymore, and MRF must keep both desktop and mobile entry
 * points.
 */

test('MRF opens Campus News management from the sidebar', async ({ page }) => {
  const seeded = await seedSession(page, 'MRF');
  test.skip(!seeded, 'no usable MRF test identity');

  await page.goto('/');
  await page.locator('aside').getByRole('button', { name: 'Campus News' }).click();

  await expect(page.getByRole('button', { name: 'New Article' })).toBeVisible({ timeout: 15_000 });
});

test.describe('MRF mobile Campus News entry', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('More sheet reaches Campus News', async ({ page }) => {
    const seeded = await seedSession(page, 'MRF');
    test.skip(!seeded, 'no usable MRF test identity');

    await page.goto('/');
    await page.getByTestId('mobile-bottom-nav').getByRole('button', { name: 'More navigation' }).click();

    const sheet = page.getByTestId('mobile-nav-sheet');
    await expect(sheet.getByRole('button', { name: 'Campus News' })).toBeVisible();
    await sheet.getByRole('button', { name: 'Campus News' }).click();

    await expect(page.getByRole('button', { name: 'New Article' })).toBeVisible({ timeout: 15_000 });
  });
});

test('Admin no longer exposes Campus News on desktop or mobile', async ({ page }) => {
  const seeded = await seedSession(page, 'ADMIN');
  test.skip(!seeded, 'no usable ADMIN test identity');

  await page.goto('/');
  await expect(page.locator('aside')).toBeVisible();
  await expect(page.locator('aside').getByRole('button', { name: 'Campus News' })).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId('mobile-bottom-nav').getByRole('button', { name: 'More navigation' }).click();
  await expect(
    page.getByTestId('mobile-nav-sheet').getByRole('button', { name: 'Campus News' })
  ).toHaveCount(0);
});
