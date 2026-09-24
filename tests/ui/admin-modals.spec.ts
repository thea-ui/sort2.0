import { test, expect } from '@playwright/test';
import { seedSession } from './helpers/session';

/**
 * Phase 5 guard: admin modals run on the shared `AppModal` shell
 * (role=dialog, aria-modal, Escape closes).
 */

test.describe('Admin modals (AppModal adoption)', () => {
  test('user profile inspector is an AppModal and closes on Escape', async ({ page }) => {
    const seeded = await seedSession(page, 'ADMIN');
    test.skip(!seeded, 'no usable ADMIN test identity');

    await page.goto('/');
    await page.getByRole('button', { name: 'Users' }).first().click();

    const eyeButton = page.getByTitle('Inspect User Profile').first();
    const hasUsers = await eyeButton
      .waitFor({ state: 'visible', timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!hasUsers, 'no EnrollPro users available in the test database');

    await eyeButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(page.getByRole('button', { name: 'Close Profile' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('item preset modal opens on the AppModal shell and closes on Escape', async ({ page }) => {
    const seeded = await seedSession(page, 'ADMIN');
    test.skip(!seeded, 'no usable ADMIN test identity');

    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).first().click();
    // Item Presets lives inside the merged Report Setup page as a section tab.
    await page.getByRole('button', { name: 'Report Setup' }).first().click();
    await page.getByRole('tab', { name: 'Item Presets' }).click();

    await page.getByRole('button', { name: 'Add Preset Item' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});
