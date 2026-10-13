import { test, expect } from '@playwright/test';
import { seedSession } from './helpers/session';
import { mockAtlasImage, mockAtlasMap } from './helpers/atlasRoutes';

/**
 * Regression specs for bugs fixed during the full-codebase audit:
 *  - Teacher category cards rendered a blank icon (meta.emoji never set).
 *  - Clicking a report thumbnail bubbled to the report card, opening the
 *    detail modal behind the photo lightbox.
 *  - The inline report detail modal had no Escape handling.
 *  - "Most reported material" / Today's reports / Rank on the student Overview
 *    showed fabricated values.
 */

const REPORT_FIXTURE = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Audit Fixture Overflow',
    description: '[Location: Audit Hall] Overflowing bin fixture',
    category: 'HAZARDOUS',
    urgency: 'MEDIUM',
    status: 'PENDING',
    coordinates: { lat: 14.6, lng: 120.985 },
    locationName: 'Audit Hall',
    reporterId: 'audit-student',
    reporterName: 'Audit Student',
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
    assignedMrfId: null,
    assignedMrfName: null,
    reportType: 'WASTE',
  },
];

test('teacher category cards render icons (not blank emoji spans)', async ({ page }) => {
  const seeded = await seedSession(page, 'TEACHER');
  test.skip(!seeded, 'no usable TEACHER test identity');

  await mockAtlasMap(page);
  await mockAtlasImage(page, false);

  await page.goto('/');
  await page.getByRole('button', { name: 'Report' }).first().click();

  const furniture = page.getByRole('button', { name: /Furniture/ }).first();
  await expect(furniture).toBeVisible();
  await expect(furniture.locator('svg')).toHaveCount(1);
});

test('student: thumbnail opens only the lightbox; Escape closes the detail modal', async ({ page }) => {
  const seeded = await seedSession(page, 'STUDENT');
  test.skip(!seeded, 'no usable STUDENT test identity');

  await page.route('**/api/reports**', async (route) => {
    if (route.request().method() === 'GET') {
      // The Activity feed only shows the signed-in student's reports: bind the
      // fixture to whichever identity seedSession minted.
      const userId = await page
        .evaluate(() => sessionStorage.getItem('sortv2_user_id'))
        .catch(() => null);
      const body = REPORT_FIXTURE.map((report) => ({
        ...report,
        reporterId: userId || report.reporterId,
      }));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Activity' }).first().click();

  const card = page.getByText('Audit Fixture Overflow').first();
  await expect(card).toBeVisible({ timeout: 25_000 });

  // Thumbnail click must not bubble to the card: the detail modal stays closed.
  await page.locator('[aria-label="View evidence photo full screen"]').first().click();
  await expect(page.getByRole('dialog', { name: 'Full screen photo viewer' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Report details' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Full screen photo viewer' })).toHaveCount(0);

  // Opening the card then pressing Escape must close the detail modal.
  await card.click();
  await expect(page.getByRole('dialog', { name: 'Report details' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Report details' })).toHaveCount(0);
});

test('student overview does not fabricate rank or today counts without data', async ({ page }) => {
  const seeded = await seedSession(page, 'STUDENT');
  test.skip(!seeded, 'no usable STUDENT test identity');

  await page.route('**/api/reports**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
  });

  await page.goto('/');
  await expect(page.getByText("Today's Campus Reports")).toBeVisible({ timeout: 25_000 });
  // No reports today -> 0, not the lifetime count.
  await expect(page.getByText("Today's Campus Reports").locator('xpath=ancestor::button').getByText('0', { exact: true })).toBeVisible();
  // No fabricated #1 rank while unranked.
  await expect(page.getByText('Rank #1', { exact: true })).toHaveCount(0);
});
