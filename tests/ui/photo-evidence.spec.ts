import { test, expect } from '@playwright/test';
import { seedSession } from './helpers/session';

// Fullscreen live camera capture and fullscreen photo evidence viewer.
// Camera is exercised with Chromium's synthetic media device; the evidence
// lightbox is verified for both the reporter (student) and the admin console.
test.use({
  viewport: { width: 390, height: 844 },
  permissions: ['camera'],
  launchOptions: {
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  },
});

test('student: fullscreen camera capture opens fullscreen photo viewer @mobile', async ({ page }) => {
  const seeded = await seedSession(page, 'STUDENT');
  test.skip(!seeded, 'no student identity');

  await page.goto('/');
  await page.locator('nav').getByRole('button', { name: 'Report', exact: true }).first().click();
  await expect(page.getByText('1. Photo Evidence')).toBeVisible({ timeout: 15_000 });

  await page.getByRole('button', { name: 'Live Camera' }).click();
  await expect(page.getByRole('dialog', { name: 'Capture Photo Evidence' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Snap photo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Flip camera' })).toBeVisible();

  await page.getByRole('button', { name: 'Snap photo' }).click();
  await expect(page.getByRole('button', { name: 'Retake' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove photo' })).toBeVisible();

  await page.getByRole('button', { name: 'View photo full screen' }).click();
  await expect(page.getByRole('dialog', { name: 'Full screen photo viewer' })).toBeVisible();
  await page.getByRole('button', { name: 'Close full screen photo' }).click();
  await expect(page.getByRole('dialog', { name: 'Full screen photo viewer' })).toHaveCount(0);
});

test('admin: report evidence opens fullscreen photo viewer @mobile', async ({ page }) => {
  const seeded = await seedSession(page, 'ADMIN');
  test.skip(!seeded, 'no admin identity');

  await page.goto('/');
  // The admin mobile bottom nav exposes the folder hub; the verify queue (with
  // the per-report inspect modal) lives behind More → Verify Reports.
  await page.getByTestId('mobile-bottom-nav').getByRole('button', { name: 'More navigation' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Verify Reports' }).click();

  const inspectButtons = page.locator('button[title^="Inspect details"]');
  await expect(inspectButtons.first()).toBeVisible({ timeout: 25_000 });

  // Seeded reports may not carry evidence; walk the visible queue (bounded)
  // until a report with a photo is found.
  const maxToTry = Math.min(await inspectButtons.count(), 8);
  let openedEvidence = false;

  for (let index = 0; index < maxToTry; index += 1) {
    await inspectButtons.nth(index).click();

    const photoButton = page.getByRole('button', { name: /view full screen/i }).first();
    const hasPhoto = await photoButton
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false);

    if (hasPhoto) {
      await photoButton.click();
      await expect(page.getByRole('dialog', { name: 'Full screen photo viewer' })).toBeVisible();
      openedEvidence = true;
      break;
    }

    await page.getByRole('button', { name: 'Close report details' }).click();
  }

  test.skip(!openedEvidence, 'no evidence-bearing report in the current verify queue');
});
