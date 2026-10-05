import { test, expect } from '@playwright/test';
import { seedSession } from './helpers/session';

/**
 * Prize Catalog edit flow (Admin → Rewards → Prize Catalog): the edit modal
 * opens on the shared AppModal shell, validates client-side, and round-trips
 * a save through PATCH /api/rewards/:id.
 */

async function openCatalog(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Rewards' }).first().click();
  await expect(page.getByText('Rewards & Prize Claims')).toBeVisible();
  await page.getByRole('button', { name: /^Prize Catalog/ }).click();
}

test('prize edit modal opens prefilled, validates, and closes on Escape', async ({ page }) => {
  const seeded = await seedSession(page, 'ADMIN');
  test.skip(!seeded, 'no usable ADMIN test identity');

  await openCatalog(page);

  const editButton = page.getByRole('button', { name: /^Edit / }).first();
  const hasCatalog = await editButton
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  test.skip(!hasCatalog, 'no reward catalog rows in the test database');

  await editButton.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect(dialog.getByText('Edit prize')).toBeVisible();

  const titleInput = dialog.getByLabel('Title');
  await expect(titleInput).not.toHaveValue('');

  // Client-side validation blocks an empty title.
  await titleInput.fill('');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog.getByText('Title is required.')).toBeVisible();

  // Escape discards the draft.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('admin saves an edited prize and the catalog updates', async ({ page }) => {
  const seeded = await seedSession(page, 'ADMIN');
  test.skip(!seeded, 'no usable ADMIN test identity');

  await openCatalog(page);

  const editButton = page.getByRole('button', { name: /^Edit / }).first();
  const hasCatalog = await editButton
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  test.skip(!hasCatalog, 'no reward catalog rows in the test database');

  await editButton.click();
  const dialog = page.getByRole('dialog');
  const titleInput = dialog.getByLabel('Title');
  const originalTitle = await titleInput.inputValue();
  const testTitle = `${originalTitle} (E2E)`;

  try {
    await titleInput.fill(testTitle);
    await dialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText(`${testTitle} updated.`)).toBeVisible();
    await expect(page.getByRole('button', { name: `Edit ${testTitle}` })).toBeVisible();
  } finally {
    // Best-effort restore so the shared dev catalog keeps its original title.
    try {
      const revertButton = page.getByRole('button', { name: `Edit ${testTitle}` });
      if (await revertButton.count()) {
        await revertButton.first().click();
        await dialog.getByLabel('Title').fill(originalTitle);
        await dialog.getByRole('button', { name: 'Save changes' }).click();
        await expect(page.getByText(`${originalTitle} updated.`)).toBeVisible();
      }
    } catch {
      // Restore is best-effort; the test result already reflects the assertions.
    }
  }
});
