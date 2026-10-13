import { test, expect } from '@playwright/test';
import { seedSession } from './helpers/session';
import { mockAtlasImage, mockAtlasMap } from './helpers/atlasRoutes';

/**
 * Regression: the scattered-debris report detail modal used to render a
 * hardcoded placeholder map (invented "Sports Gym / Chemistry Lab" rooms) that
 * did not match the real campus map. It must render the shared CampusMapFrame
 * base layer with the pinned debris marker.
 */

const SCATTERED_FIXTURE = {
  id: '33333333-3333-4333-8333-333333333333',
  title: 'Scattered Debris Report (No Trash Cans)',
  description: '[Scattered Debris Pin] laptaaaa basura',
  category: 'NON_BIODEGRADABLE',
  urgency: 'MEDIUM',
  status: 'PENDING',
  coordinates: { lat: 14.6008, lng: 120.9847 },
  locationName: 'Scattered Debris Pin',
  reporterId: 'minimap-student',
  reporterName: 'Minimap Student',
  reporterRole: 'student',
  pointsAwarded: 0,
  reporterRank: null,
  pointsAwardedAt: null,
  timestamp: new Date().toISOString(),
  completedAt: null,
  imageUrl:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  weightCollected: 0,
  isVerified: false,
  isScatteredDebris: true,
  assignedMrfId: null,
  assignedMrfName: null,
  reportType: 'WASTE',
};

test('scattered debris modal renders the real campus map, not placeholder rooms', async ({ page }) => {
  const seeded = await seedSession(page, 'ADMIN');
  test.skip(!seeded, 'no usable ADMIN test identity');

  await mockAtlasMap(page);
  await mockAtlasImage(page, false);

  await page.route('**/api/reports**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([SCATTERED_FIXTURE]),
      });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
  });

  await page.goto('/');
  const reportsNav = page.getByRole('button', { name: 'Reports', exact: true }).first();
  await expect(reportsNav).toBeVisible({ timeout: 20_000 });
  await reportsNav.click();

  await page.getByTitle('Inspect details & verify').first().click();

  const modal = page.getByTestId('modal-panel');
  await expect(modal).toBeVisible();

  // Real base map layer (ATLAS mirror / blueprint / grid fallback).
  await expect(modal.getByTestId('campus-map-frame')).toBeVisible();
  await expect(modal.getByTestId('campus-map-content')).toBeVisible();

  // Pinned debris marker is present.
  await expect(modal.getByText('Pinned Debris Location')).toBeVisible();

  // The old hardcoded placeholder rooms must be gone.
  await expect(modal.getByText('Chemistry Lab')).toHaveCount(0);
  await expect(modal.getByText('Sports Gym')).toHaveCount(0);
  await expect(modal.getByText('Main Library')).toHaveCount(0);
});
