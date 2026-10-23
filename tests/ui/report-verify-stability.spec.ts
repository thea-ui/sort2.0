import { test, expect } from '@playwright/test';
import { seedSession } from './helpers/session';

/**
 * Regression: a lagging 2s reports poll must not clobber the optimistic
 * VERIFIED state while the verify-batch POST is still in flight. Before the
 * fix the row flipped Verified -> Unverified -> Verified.
 */

const REPORT_FIXTURE = {
  id: '22222222-2222-4222-8222-222222222222',
  title: 'Verify stability fixture',
  description: '[Location: Stability Hall] Overflowing bin fixture',
  category: 'WASTE',
  urgency: 'MEDIUM',
  status: 'PENDING',
  coordinates: { lat: 14.6, lng: 120.985 },
  locationName: 'Stability Hall',
  reporterId: 'stability-student',
  reporterName: 'Stability Student',
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
};

test('optimistic VERIFIED badge survives stale polls during a slow verify-batch', async ({ page }) => {
  const seeded = await seedSession(page, 'ADMIN');
  test.skip(!seeded, 'no usable ADMIN test identity');

  let serverVerified = false;

  await page.route('**/api/reports**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (request.method() === 'POST' && path.endsWith('/verify-batch')) {
      // Simulate a slow commit: every poll served inside this window is stale.
      await new Promise((resolve) => setTimeout(resolve, 4000));
      serverVerified = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          updatedReports: [],
          awards: [],
          challengeCompletions: [],
          summary: { totalProcessed: 1, totalAwarded: 0, totalPoints: 0 },
        }),
      });
      return;
    }

    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ ...REPORT_FIXTURE, isVerified: serverVerified }]),
      });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.addInitScript(() => {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
  });

  await page.goto('/');
  // The optimistic-verify queue lives under the "Verify Reports" nav (the
  // "Reports" nav is now the folder/records hub).
  const reportsNav = page.getByRole('button', { name: 'Verify Reports', exact: true }).first();
  await expect(reportsNav).toBeVisible({ timeout: 20_000 });
  await reportsNav.click();

  await expect(page.getByText('Verify stability fixture')).toBeVisible({ timeout: 10_000 });
  const verifyAll = page.getByRole('button', { name: /Verify All/ }).first();
  await expect(verifyAll).toBeVisible();
  await verifyAll.click();

  const row = page.locator('div[class*="p-3.5"]', { hasText: 'Verify stability fixture' }).first();
  const badge = row.locator('span.tracking-wider').first();

  // Sample across two 2s poll cycles while the POST is still pending. Raw
  // samples are used because toHaveText auto-retries and would hide a
  // transient flip. The bug signature is Verified -> Unverified, so only
  // samples AFTER the optimistic Verified must be checked.
  const samples: string[] = [];
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(160);
    samples.push(((await badge.textContent()) ?? '').trim());
  }
  const firstVerified = samples.indexOf('Verified');
  expect(firstVerified, `samples=${samples.join(',')}`).toBeGreaterThanOrEqual(0);
  expect(samples.slice(firstVerified), `samples=${samples.join(',')}`).not.toContain('Unverified');
});
