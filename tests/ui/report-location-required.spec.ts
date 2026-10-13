import { test, expect } from '@playwright/test';
import { seedSession } from './helpers/session';
import { mockAtlasImage, mockAtlasMap } from './helpers/atlasRoutes';

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

test('student cannot submit without a bin location even with photo evidence', async ({ page }) => {
  const seeded = await seedSession(page, 'STUDENT');
  test.skip(!seeded, 'no usable STUDENT test identity');

  await page.goto('/');
  await page.getByRole('button', { name: 'Report' }).first().click();

  const submit = page.getByRole('button', { name: 'Submit Report' });
  await expect(submit).toBeDisabled();

  await page.locator('input[type="file"]').first().setInputFiles({
    name: 'proof.png',
    mimeType: 'image/png',
    buffer: TINY_PNG,
  });

  await expect(submit).toBeDisabled();
  await expect(page.getByText(/select a location to submit/i)).toBeVisible();
});

test('teacher cannot submit before choosing a location', async ({ page }) => {
  const seeded = await seedSession(page, 'TEACHER');
  test.skip(!seeded, 'no usable TEACHER test identity');

  await mockAtlasMap(page);
  await mockAtlasImage(page, false);

  await page.goto('/');
  await page.getByRole('button', { name: 'Report' }).first().click();
  await page.getByRole('button', { name: /Waste \/ Bin/ }).first().click();

  await expect(page.getByRole('button', { name: 'Submit Report' })).toBeDisabled();
  await expect(page.getByText(/select a bin location to enable submission/i)).toBeVisible();
});
