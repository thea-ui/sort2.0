import { test, expect, Page } from '@playwright/test';
import { seedSession, type UiRole } from './helpers/session';
import { EMPTY_MAP_FIXTURE, FULL_MAP_FIXTURE, mockAtlasImage, mockAtlasMap } from './helpers/atlasRoutes';

const ONE_PX_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function openLocationsSettings(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Settings' }).first().click();
  await page.getByRole('button', { name: 'Locations' }).first().click();
  await expect(page.getByTestId('campus-map-frame')).toBeVisible();
}

async function mockMapWithCounter(page: Page): Promise<{ getMapCalls: () => number }> {
  let mapCalls = 0;
  await page.route('**/api/atlas/map', (route) => {
    mapCalls += 1;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(FULL_MAP_FIXTURE),
    });
  });
  return { getMapCalls: () => mapCalls };
}

test.describe('Settings → Locations (ATLAS base + sync)', () => {
  test('admin editor renders the ATLAS base with draggable pins', async ({ page }) => {
    const seeded = await seedSession(page, 'ADMIN');
    test.skip(!seeded, 'no usable ADMIN test identity');

    await mockMapWithCounter(page);
    await mockAtlasImage(page, false);
    await page.goto('/');
    await openLocationsSettings(page);

    await expect(page.getByTestId('atlas-base-map')).toBeVisible();
    const pins = page.getByTestId('campus-map-frame').getByTestId('editor-pin');
    await expect(pins.first()).toBeVisible();
    expect(await pins.count()).toBeGreaterThan(0);
    // Admin manual sync stays available in Settings after the Campus Map page removal.
    await expect(page.getByTestId('atlas-sync-button')).toBeVisible();

    // Layout guard: the action row must not crush the header title or overflow
    // the page (regression for the freshness-badge/button row).
    const titleBox = await page.getByRole('heading', { name: /Campus Bin Map/ }).boundingBox();
    expect(titleBox?.width ?? 0).toBeGreaterThan(180);
    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(horizontalOverflow).toBeLessThanOrEqual(1);
  });

  test('pin drag persists new x/y coordinates', async ({ page }) => {
    const seeded = await seedSession(page, 'ADMIN');
    test.skip(!seeded, 'no usable ADMIN test identity');

    await mockMapWithCounter(page);
    await mockAtlasImage(page, false);

    let savedBody: any = null;
    await page.route('**/api/settings/campus-locations', (route) => {
      if (route.request().method() === 'POST') {
        savedBody = route.request().postDataJSON();
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.goto('/');
    await openLocationsSettings(page);

    await page.getByRole('button', { name: /Edit Bins Mode/i }).click();
    const pin = page.getByTestId('campus-map-frame').getByTestId('editor-pin').first();
    await expect(pin).toBeVisible();
    // The admin page is taller than the test viewport; real users scroll too.
    await pin.scrollIntoViewIfNeeded();

    const box = (await pin.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 20, { steps: 6 });
    await page.mouse.up();

    await expect.poll(() => savedBody !== null, { timeout: 10_000 }).toBe(true);
    expect(Array.isArray(savedBody.locations)).toBe(true);
    expect(savedBody.locations.length).toBeGreaterThan(0);

    // Pin moves save silently (no success toast covering the map).
    await expect(page.getByText('Station pin position updated!')).toHaveCount(0);
  });

  test('sync button triggers one sync and refreshes the map', async ({ page }) => {
    const seeded = await seedSession(page, 'ADMIN');
    test.skip(!seeded, 'no usable ADMIN test identity');

    const mapCounter = await mockMapWithCounter(page);
    await mockAtlasImage(page, false);

    let syncCalls = 0;
    await page.route('**/api/atlas/sync', (route) => {
      syncCalls += 1;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'SUCCESS',
          unchanged: false,
          schoolId: 1,
          buildingsSeen: 9,
          roomsSeen: 103,
          inserted: 0,
          updated: 0,
          deactivated: 0,
          imageChanged: false,
          durationMs: 42,
        }),
      });
    });

    await page.goto('/');
    await openLocationsSettings(page);

    const callsBefore = mapCounter.getMapCalls();
    await page.getByTestId('atlas-sync-button').click();

    await expect(page.getByTestId('atlas-sync-message')).toContainText('Updated · 9 buildings / 103 rooms');
    expect(syncCalls).toBe(1);
    await expect.poll(() => mapCounter.getMapCalls()).toBeGreaterThan(callsBefore);
  });

  test('adjust mode shows the fallback background and zoom-out works', async ({ page }) => {
    const seeded = await seedSession(page, 'ADMIN');
    test.skip(!seeded, 'no usable ADMIN test identity');

    await page.addInitScript((png) => {
      localStorage.setItem('sort_blueprint_url', png);
    }, ONE_PX_PNG);

    await mockMapWithCounter(page);
    await mockAtlasImage(page, false);
    await page.goto('/');
    await openLocationsSettings(page);

    // ATLAS is the base until adjusting begins.
    await expect(page.getByTestId('atlas-base-map')).toBeVisible();

    await page.getByRole('button', { name: 'Adjust', exact: true }).click();

    // The layer being adjusted must be the visible one.
    await expect(page.getByTestId('campus-map-fallback').locator('img')).toHaveCount(1);
    await expect(page.getByTestId('atlas-base-map')).toHaveCount(0);

    // Button zoom-out is visible (was previously applied to a hidden layer).
    await expect(page.getByTestId('blueprint-zoom-level')).toHaveText('100%');
    await page.getByRole('button', { name: 'Zoom out' }).click();
    await expect(page.getByTestId('blueprint-zoom-level')).toHaveText('90%');

    // Wheel over the letterbox margin must still zoom (dead-zone regression).
    const outer = (await page.getByTestId('blueprint-canvas').boundingBox())!;
    await page.mouse.move(outer.x + outer.width / 2, outer.y + 6);
    await page.mouse.wheel(0, 400);
    await expect(page.getByTestId('blueprint-zoom-level')).not.toHaveText('90%');

    // Cancel returns to the ATLAS base.
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByTestId('atlas-base-map')).toBeVisible();
  });

  test('room list mirrors ATLAS rooms with fallback presets collapsed', async ({ page }) => {
    const seeded = await seedSession(page, 'ADMIN');
    test.skip(!seeded, 'no usable ADMIN test identity');

    await mockMapWithCounter(page);
    await mockAtlasImage(page, false);
    await page.goto('/');
    await openLocationsSettings(page);

    await expect(page.getByTestId('atlas-room-directory')).toBeVisible();
    await expect(page.getByTestId('atlas-room-item').first()).toBeVisible();
    await expect(page.getByText('G7 Room 101')).toBeVisible();
    await expect(page.getByText('Grade 7 Academic Wing').first()).toBeVisible();

    // Legacy presets stay available but collapsed (fallback only).
    const fallback = page.getByTestId('fallback-rooms');
    await expect(fallback).toBeVisible();
    await expect(page.getByText('Room 101 – Science Hall')).toBeHidden();
    await fallback.locator('summary').click();
    await expect(page.getByText('Room 101 – Science Hall')).toBeVisible();
  });

  test('empty mirror falls back to the editable preset list', async ({ page }) => {
    const seeded = await seedSession(page, 'ADMIN');
    test.skip(!seeded, 'no usable ADMIN test identity');

    await mockAtlasMap(page, EMPTY_MAP_FIXTURE);
    await mockAtlasImage(page, false);
    await page.goto('/');
    await openLocationsSettings(page);

    await expect(page.getByTestId('atlas-room-directory')).toHaveCount(0);
    await expect(page.getByText('Room 101 – Science Hall')).toBeVisible();
    await expect(page.getByRole('button', { name: /Add Room Location/ })).toBeVisible();
  });

  test('sync failure is graceful (no blank map)', async ({ page }) => {
    const seeded = await seedSession(page, 'ADMIN');
    test.skip(!seeded, 'no usable ADMIN test identity');

    await mockMapWithCounter(page);
    await mockAtlasImage(page, false);

    await page.route('**/api/atlas/sync', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'ATLAS unreachable', code: 'ATLAS_UNAVAILABLE' }),
      })
    );

    await page.goto('/');
    await openLocationsSettings(page);
    await page.getByTestId('atlas-sync-button').click();

    await expect(page.getByTestId('atlas-sync-message')).toContainText('unreachable');
    await expect(page.getByTestId('atlas-base-map')).toBeVisible();
  });
});

test.describe('Sync button role visibility', () => {
  const DENIED: { role: UiRole; mapTab: string }[] = [
    { role: 'STUDENT', mapTab: 'Bin Map' },
    { role: 'TEACHER', mapTab: 'Bin Map' },
    { role: 'MRF', mapTab: 'Direct Pickup' },
  ];

  for (const { role, mapTab } of DENIED) {
    test(`${role} never sees the ATLAS sync button`, async ({ page }) => {
      const seeded = await seedSession(page, role);
      test.skip(!seeded, `no usable ${role} test identity`);

      await mockMapWithCounter(page);
      await mockAtlasImage(page, false);
      await page.goto('/');
      await page.getByRole('button', { name: mapTab }).first().click();

      await expect(page.getByTestId('atlas-base-map')).toBeVisible();
      await expect(page.getByTestId('atlas-sync-button')).toHaveCount(0);
    });
  }
});
