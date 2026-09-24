import { test, expect } from '@playwright/test';
import { seedSession } from './helpers/session';

/**
 * Mobile navigation contract for the MRF/Admin shell: a fixed bottom tab bar
 * with four role-aware destinations plus a "More" sheet that carries every
 * remaining destination (grouped, with the Settings accordion inline).
 */
test.use({ viewport: { width: 390, height: 844 } });

test('MRF mobile: bottom bar navigates and the More sheet reaches every tab', async ({ page }) => {
  const seeded = await seedSession(page, 'MRF');
  test.skip(!seeded, 'no usable MRF test identity');

  await page.goto('/');

  const bar = page.getByTestId('mobile-bottom-nav');
  await expect(bar).toBeVisible();
  await expect(page.locator('aside')).toBeHidden();
  await expect(page.getByRole('button', { name: /open navigation menu/i })).toHaveCount(0);

  // Primary tab navigation
  await bar.getByRole('button', { name: 'Dispatches' }).click();
  await expect(bar.getByRole('button', { name: 'Dispatches' })).toHaveAttribute('aria-current', 'page');

  // More opens the grouped bottom sheet with the secondary destinations
  await bar.getByRole('button', { name: 'More navigation' }).click();
  const sheet = page.getByTestId('mobile-nav-sheet');
  await expect(sheet).toBeVisible();

  // Native pattern: the sheet is anchored to the bottom edge of the viewport.
  const box = (await sheet.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.y + box.height).toBeGreaterThan(viewport.height * 0.9);
  expect(box.width).toBeGreaterThan(viewport.width * 0.9);

  await expect(sheet.getByRole('button', { name: 'Asset Ledger' })).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Recycle Market' })).toBeVisible();

  // Selecting a destination closes the sheet and activates the More tab
  await sheet.getByRole('button', { name: 'Asset Ledger' }).click();
  await expect(sheet).toHaveCount(0);
  await expect(bar.getByRole('button', { name: 'More navigation' })).toHaveAttribute('aria-current', 'page');
});

test('Admin mobile: Settings expands inline inside the More sheet', async ({ page }) => {
  const seeded = await seedSession(page, 'ADMIN');
  test.skip(!seeded, 'no usable ADMIN test identity');

  await page.goto('/');

  const bar = page.getByTestId('mobile-bottom-nav');
  await expect(bar).toBeVisible();
  await bar.getByRole('button', { name: 'More navigation' }).click();

  const sheet = page.getByTestId('mobile-nav-sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Branding' })).toHaveCount(0);

  // Settings expands in place instead of navigating away
  await sheet.getByRole('button', { name: 'Settings' }).click();
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Branding' })).toBeVisible();

  // A sub-item navigates and closes the sheet
  await sheet.getByRole('button', { name: 'Branding' }).click();
  await expect(sheet).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /school branding/i })).toBeVisible({ timeout: 10_000 });
});
