import { test, expect } from '@playwright/test';
import { seedSession } from './helpers/session';
import { EMPTY_MAP_FIXTURE, mockAtlasImage, mockAtlasMap } from './helpers/atlasRoutes';

test.describe('Teacher asset picker — ATLAS rooms', () => {
  test('ATLAS rooms feed the asset location list in "Room – Building" form', async ({ page }) => {
    const seeded = await seedSession(page, 'TEACHER');
    test.skip(!seeded, 'no usable TEACHER test identity');

    await mockAtlasMap(page);
    await mockAtlasImage(page, false);

    await page.goto('/');
    await page.getByRole('button', { name: 'Report' }).first().click();
    await page.getByRole('button', { name: /Furniture/ }).first().click();

    await expect(page.getByText('G7 Room 101 – Grade 7 Academic Wing')).toBeVisible();
    await expect(page.getByText('G7 Science Lab – Grade 7 Academic Wing')).toBeVisible();
    await expect(
      page.getByText('Learning Commons – Admin and Learning Commons')
    ).toBeVisible();
  });

  test('empty mirror falls back to the legacy stored room list', async ({ page }) => {
    const seeded = await seedSession(page, 'TEACHER');
    test.skip(!seeded, 'no usable TEACHER test identity');

    await mockAtlasMap(page, EMPTY_MAP_FIXTURE);
    await mockAtlasImage(page, false);

    await page.goto('/');
    await page.getByRole('button', { name: 'Report' }).first().click();
    await page.getByRole('button', { name: /Furniture/ }).first().click();

    await expect(page.getByText('Room 101 – Science Hall')).toBeVisible();
  });
});
