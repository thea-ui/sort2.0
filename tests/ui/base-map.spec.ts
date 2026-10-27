import { test, expect } from '@playwright/test';
import { seedSession } from './helpers/session';
import {
  EMPTY_MAP_FIXTURE,
  FULL_MAP_FIXTURE,
  ROTATED_MAP_FIXTURE,
  mockAtlasImage,
  mockAtlasMap,
} from './helpers/atlasRoutes';

const ONE_PX_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

test.describe('Bin Map base layer — ATLAS first', () => {
  test('student bin map renders the ATLAS base and pins stay interactive', async ({ page }) => {
    const seeded = await seedSession(page, 'STUDENT');
    test.skip(!seeded, 'no usable STUDENT test identity');

    await mockAtlasMap(page);
    await mockAtlasImage(page, false);
    await page.goto('/');
    await page.getByRole('button', { name: 'Bin Map' }).first().click();

    await expect(page.getByTestId('atlas-base-map')).toBeVisible();
    await expect(page.getByTestId('campus-map-fallback')).toHaveCount(0);

    // Pins live inside the same box as the base map.
    const pins = page.getByTestId('campus-map-frame').getByTestId('station-pin');
    await expect(pins.first()).toBeVisible();
    const pinCount = await pins.count();
    expect(pinCount).toBeGreaterThan(0);

    // Clicking a pin still opens its status popover.
    await pins.first().click();
    await expect(page.getByText('Available', { exact: false }).first()).toBeVisible();

    // The container must not clip popovers (base layer is clipped by the frame).
    const containerOverflow = await page
      .getByTestId('bin-map-container')
      .evaluate((el) => getComputedStyle(el).overflow);
    expect(containerOverflow).not.toBe('hidden');
  });

  test('teacher bin map renders the ATLAS base', async ({ page }) => {
    const seeded = await seedSession(page, 'TEACHER');
    test.skip(!seeded, 'no usable TEACHER test identity');

    await mockAtlasMap(page);
    await mockAtlasImage(page, false);
    await page.goto('/');
    await page.getByRole('button', { name: 'Bin Map' }).first().click();

    await expect(page.getByTestId('atlas-base-map')).toBeVisible();
    await expect(page.getByTestId('campus-map-frame').getByTestId('station-pin').first()).toBeVisible();
  });

  test('rotated ATLAS wings render fully inside the base map (no clipping)', async ({ page }) => {
    const seeded = await seedSession(page, 'STUDENT');
    test.skip(!seeded, 'no usable STUDENT test identity');

    await mockAtlasMap(page, ROTATED_MAP_FIXTURE);
    await mockAtlasImage(page, false);
    await page.goto('/');
    await page.getByRole('button', { name: 'Bin Map' }).first().click();

    const svg = page.getByTestId('atlas-base-map');
    await expect(svg).toBeVisible();

    // The rotation-aware viewBox must keep the 90°-rotated G8AW rect inside the
    // SVG viewport with the padding margin on every side.
    const margins = await svg.locator('g[data-building-id="2"] rect').evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const view = el.ownerSVGElement!.getBoundingClientRect();
      return {
        top: rect.top - view.top,
        bottom: view.bottom - rect.bottom,
        left: rect.left - view.left,
        right: view.right - rect.right,
      };
    });
    expect(margins.top).toBeGreaterThan(0);
    expect(margins.bottom).toBeGreaterThan(0);
    expect(margins.left).toBeGreaterThan(0);
    expect(margins.right).toBeGreaterThan(0);
  });

  test('falls back to the uploaded blueprint when ATLAS is empty', async ({ page }) => {
    const seeded = await seedSession(page, 'STUDENT');
    test.skip(!seeded, 'no usable STUDENT test identity');

    await page.addInitScript((png) => {
      localStorage.setItem('sort_blueprint_url', png);
    }, ONE_PX_PNG);

    await mockAtlasMap(page, EMPTY_MAP_FIXTURE);
    await mockAtlasImage(page, false);
    await page.goto('/');
    await page.getByRole('button', { name: 'Bin Map' }).first().click();

    await expect(page.getByTestId('atlas-base-map')).toHaveCount(0);
    await expect(page.getByTestId('campus-map-fallback').locator('img')).toHaveCount(1);
    await expect(page.getByTestId('station-pin').first()).toBeVisible();
  });

  test('falls back to the vector grid when ATLAS and blueprint are absent', async ({ page }) => {
    const seeded = await seedSession(page, 'STUDENT');
    test.skip(!seeded, 'no usable STUDENT test identity');

    await mockAtlasMap(page, EMPTY_MAP_FIXTURE);
    await mockAtlasImage(page, false);
    await page.goto('/');
    await page.getByRole('button', { name: 'Bin Map' }).first().click();

    await expect(page.getByTestId('atlas-base-map')).toHaveCount(0);
    await expect(page.getByTestId('campus-map-fallback').getByText('Quad')).toBeVisible();
  });

  test('no fallback flash while ATLAS loads (delayed mirror)', async ({ page }) => {
    const seeded = await seedSession(page, 'STUDENT');
    test.skip(!seeded, 'no usable STUDENT test identity');

    await page.addInitScript((png) => {
      localStorage.setItem('sort_blueprint_url', png);
    }, ONE_PX_PNG);

    // Hold the ATLAS response open until the pending state has been asserted.
    // A fixed delay makes this test race the app's sign-in prefetch on slower
    // machines; a gate makes the loading window deterministic.
    let releaseMap!: () => void;
    const mapGate = new Promise<void>((resolve) => {
      releaseMap = resolve;
    });
    await page.route('**/api/atlas/map', async (route) => {
      await mapGate;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(FULL_MAP_FIXTURE),
      });
    });
    await mockAtlasImage(page, false);
    await page.goto('/');
    await page.getByRole('button', { name: 'Bin Map' }).first().click();

    // While ATLAS is in flight: neutral surface only — never the old blueprint.
    await expect(page.getByTestId('campus-map-pending')).toBeVisible();
    await expect(page.getByTestId('campus-map-fallback')).toHaveCount(0);
    await expect(page.getByTestId('atlas-base-map')).toHaveCount(0);

    releaseMap();
    await expect(page.getByTestId('atlas-base-map')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('campus-map-fallback')).toHaveCount(0);
    await expect(page.getByTestId('campus-map-pending')).toHaveCount(0);
  });

  test('returning to the Bin Map renders ATLAS instantly from cache', async ({ page }) => {
    const seeded = await seedSession(page, 'STUDENT');
    test.skip(!seeded, 'no usable STUDENT test identity');

    await page.addInitScript((png) => {
      localStorage.setItem('sort_blueprint_url', png);
    }, ONE_PX_PNG);

    await mockAtlasMap(page);
    await mockAtlasImage(page, false);
    await page.goto('/');
    await page.getByRole('button', { name: 'Bin Map' }).first().click();
    await expect(page.getByTestId('atlas-base-map')).toBeVisible();

    await page.getByRole('button', { name: 'Home' }).first().click();
    await page.getByRole('button', { name: 'Bin Map' }).first().click();

    await expect(page.getByTestId('atlas-base-map')).toBeVisible();
    await expect(page.getByTestId('campus-map-pending')).toHaveCount(0);
    await expect(page.getByTestId('campus-map-fallback')).toHaveCount(0);
  });

  test('sort_base_map_mode=blueprint reverts to the legacy base even with ATLAS data', async ({ page }) => {
    const seeded = await seedSession(page, 'STUDENT');
    test.skip(!seeded, 'no usable STUDENT test identity');

    await page.addInitScript((png) => {
      localStorage.setItem('sort_base_map_mode', 'blueprint');
      localStorage.setItem('sort_blueprint_url', png);
    }, ONE_PX_PNG);

    await mockAtlasMap(page);
    await mockAtlasImage(page, false);
    await page.goto('/');
    await page.getByRole('button', { name: 'Bin Map' }).first().click();

    await expect(page.getByTestId('atlas-base-map')).toHaveCount(0);
    await expect(page.getByTestId('campus-map-fallback').locator('img')).toHaveCount(1);
  });

  test('admin bin map renders the ATLAS base and station popovers', async ({ page }) => {
    const seeded = await seedSession(page, 'ADMIN');
    test.skip(!seeded, 'no usable ADMIN test identity');

    await mockAtlasMap(page);
    await mockAtlasImage(page, false);
    await page.goto('/');
    await page.getByRole('button', { name: 'Bin Map' }).first().click();

    await expect(page.getByTestId('atlas-base-map')).toBeVisible();
    const pins = page.getByTestId('campus-map-frame').getByTestId('station-pin');
    await expect(pins.first()).toBeVisible();
    await pins.first().click();
    await expect(page.getByText('Campus Stations', { exact: false })).toBeVisible();
  });

  test('MRF direct pickup map renders the ATLAS base and pin popovers', async ({ page }) => {
    const seeded = await seedSession(page, 'MRF');
    test.skip(!seeded, 'no usable MRF test identity');

    await mockAtlasMap(page);
    await mockAtlasImage(page, false);
    await page.goto('/');
    await page.getByRole('button', { name: 'Direct Pickup' }).first().click();

    await expect(page.getByTestId('atlas-base-map')).toBeVisible();
    const pins = page.getByTestId('campus-map-frame').getByTestId('station-pin');
    await expect(pins.first()).toBeVisible();
    await pins.first().click();
    await expect(pins.first()).toHaveAttribute('title', /\(/);
  });

  test('student report map renders the ATLAS base and click-to-pin still works', async ({ page }) => {
    const seeded = await seedSession(page, 'STUDENT');
    test.skip(!seeded, 'no usable STUDENT test identity');

    await mockAtlasMap(page);
    await mockAtlasImage(page, false);
    await page.goto('/');
    await page.getByRole('button', { name: 'Report' }).first().click();

    await expect(page.getByTestId('atlas-base-map')).toBeVisible();

    await page.getByRole('button', { name: /Pin Scattered Waste/i }).first().click();
    await page.getByTestId('campus-map-content').click({ position: { x: 15, y: 15 } });
    await expect(page.getByTestId('scattered-pin')).toBeVisible();
  });

  test('teacher report map renders the ATLAS base and click-to-pin still works', async ({ page }) => {
    const seeded = await seedSession(page, 'TEACHER');
    test.skip(!seeded, 'no usable TEACHER test identity');

    await mockAtlasMap(page);
    await mockAtlasImage(page, false);
    await page.goto('/');
    await page.getByRole('button', { name: 'Report' }).first().click();
    // Teacher wizard: pick a category first, which reveals the map step.
    await page.getByRole('button', { name: /Waste \/ Bin/ }).first().click();

    await expect(page.getByTestId('atlas-base-map')).toBeVisible();

    await page.getByRole('button', { name: /Pin Scattered Trash/i }).first().click();
    await page.getByTestId('campus-map-content').click({ position: { x: 15, y: 15 } });
    await expect(page.getByTestId('scattered-pin')).toBeVisible();
  });
});
