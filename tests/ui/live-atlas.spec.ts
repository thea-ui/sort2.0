import { test, expect } from '@playwright/test';
import { seedSession } from './helpers/session';

// Temporary end-to-end check against the real ATLAS mirror (no mocks).
test('live ATLAS mirror renders the base map and pins', async ({ page }) => {
  const seeded = await seedSession(page, 'TEACHER');
  test.skip(!seeded, 'no usable TEACHER identity');

  await page.goto('/');
  const token = await page.evaluate(() => sessionStorage.getItem('sortv2_token'));
  const res = await page.request.get('http://localhost:5000/api/atlas/map', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await res.json();
  test.skip(!payload.buildings?.length, 'no live ATLAS snapshot available');

  await page.getByRole('button', { name: 'Bin Map' }).first().click();
  await expect(page.getByTestId('atlas-base-map')).toBeVisible();
  await expect(page.getByTestId('campus-map-frame').getByTestId('station-pin').first()).toBeVisible();
});
