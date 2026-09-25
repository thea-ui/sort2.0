import { test, expect, type Page } from '@playwright/test';

/**
 * Session continuity during an identity-provider (EnrollPro) outage.
 *
 * SORT delegates login to EnrollPro, so a fresh login is impossible while it is
 * down. These specs pin the behaviour that keeps an ALREADY authenticated user
 * working: the session is resumed from the refresh token that survives a
 * browser restart, a transient SORT/network failure must NOT sign the user out,
 * and a definitively rejected token must never be resurrected from cache.
 */

const REFRESH_ROUTE = '**/api/auth/refresh';

const TEST_USER = {
  id: '00000000-0000-4000-8000-0000000000aa',
  name: 'Continuity Tester',
  email: 'continuity@sort.local',
  employeeId: 'CONT-0001',
  role: 'ADMIN',
  points: 0,
  warningsCount: 0,
  certificatesEarned: [],
  accountStatus: 'ACTIVE',
  syncSource: 'ENROLLPRO',
};

const REFRESH_KEY = `sortv2_refresh_${TEST_USER.id}`;
const ACCESS_TOKEN = 'playwright-access-token';

async function seedPersistedSession(
  page: Page,
  { includeRefreshToken = true }: { includeRefreshToken?: boolean } = {}
): Promise<void> {
  await page.addInitScript(
    ({ user, refreshKey, includeRefreshToken }) => {
      sessionStorage.clear();
      localStorage.setItem('sortv2_last_user_id', user.id);
      localStorage.setItem('sortv2_user_snapshot', JSON.stringify(user));
      if (includeRefreshToken) {
        localStorage.setItem(refreshKey, 'playwright-refresh-token');
      } else {
        localStorage.removeItem(refreshKey);
      }
    },
    { user: TEST_USER, refreshKey: REFRESH_KEY, includeRefreshToken }
  );
}

function mockRefresh(page: Page, status: number, body: unknown): () => number {
  let calls = 0;
  void page.route(REFRESH_ROUTE, async (route) => {
    calls += 1;
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
  return () => calls;
}

test('boot restore: a persisted refresh token survives a browser restart', async ({ page }) => {
  const refreshCalls = mockRefresh(page, 200, {
    accessToken: ACCESS_TOKEN,
    refreshToken: 'rotated-refresh-token',
    expiresIn: '900s',
    user: TEST_USER,
  });

  await seedPersistedSession(page);
  await page.goto('/');

  await expect(page.getByRole('button', { name: 'Overview' }).first()).toBeVisible({ timeout: 25_000 });
  await expect(page.locator('#login-card')).toHaveCount(0);
  expect(refreshCalls()).toBeGreaterThan(0);

  // The rotated token must be persisted so the next boot can resume again.
  const stored = await page.evaluate((key) => localStorage.getItem(key), REFRESH_KEY);
  expect(stored).toBe('rotated-refresh-token');
});

test('outage: an unreachable server keeps the cached session instead of signing out', async ({ page }) => {
  mockRefresh(page, 503, { error: 'Service Unavailable' });

  await seedPersistedSession(page);
  await page.goto('/');

  await expect(page.getByRole('button', { name: 'Overview' }).first()).toBeVisible({ timeout: 25_000 });
  await expect(page.locator('#login-card')).toHaveCount(0);

  // The credential must survive so the session heals once SORT is back.
  const stored = await page.evaluate((key) => localStorage.getItem(key), REFRESH_KEY);
  expect(stored).toBe('playwright-refresh-token');
});

test('security: a definitively rejected refresh token signs the user out', async ({ page }) => {
  mockRefresh(page, 401, { error: 'Invalid or expired refresh token' });

  await seedPersistedSession(page);
  await page.goto('/');

  await expect(page.locator('#login-card')).toBeVisible({ timeout: 25_000 });
  await expect(page.getByRole('button', { name: 'Overview' })).toHaveCount(0);

  const stored = await page.evaluate((key) => localStorage.getItem(key), REFRESH_KEY);
  expect(stored).toBeNull();
  const snapshot = await page.evaluate(() => localStorage.getItem('sortv2_user_snapshot'));
  expect(snapshot).toBeNull();
});

test('security: a cached profile alone cannot resurrect a session', async ({ page }) => {
  mockRefresh(page, 200, {
    accessToken: ACCESS_TOKEN,
    refreshToken: 'rotated-refresh-token',
    expiresIn: '900s',
    user: TEST_USER,
  });

  await seedPersistedSession(page, { includeRefreshToken: false });
  await page.goto('/');

  await expect(page.locator('#login-card')).toBeVisible({ timeout: 25_000 });
  await expect(page.getByRole('button', { name: 'Overview' })).toHaveCount(0);
});
