import { test, expect, type Page } from '@playwright/test';

/**
 * Default-branding contract (DEFAULT_BRANDING_PLAN.md §6/G7).
 *
 * The public settings + SSE routes are stubbed so each state is deterministic
 * without touching the database; the rest of the public landing page may talk
 * to the real backend (or degrade gracefully when it is offline).
 */

const DEFAULT_PAYLOAD = {
  schoolName: null,
  schoolAcronym: null,
  schoolId: null,
  division: null,
  region: null,
  address: null,
  schoolHeadName: null,
  primaryColor: '#00271D',
  secondaryColor: '#00A77C',
  accentColor: '#00A77C',
  goldColor: '#C69B26',
  logoUrl: null,
  currentSchoolYear: null,
  enrollproPublicUrl: '',
  brandingSource: 'default',
};

const TENANT_PAYLOAD = {
  ...DEFAULT_PAYLOAD,
  schoolName: 'Bagong Silang National High School',
  schoolAcronym: 'BSNHS',
  logoUrl: '/favicon.svg',
  brandingSource: 'tenant',
};

async function stubBranding(page: Page, settings: Record<string, unknown>): Promise<void> {
  await page.route('**/api/settings/public/stream', (route) =>
    route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      body: ': connected\n\n',
    })
  );
  await page.route('**/api/settings/public', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ settings }),
    })
  );
}

function faviconHref(page: Page): Promise<string | null> {
  return page.evaluate(
    () => document.querySelector<HTMLLinkElement>("link[rel*='icon']")?.href ?? null
  );
}

test('fresh deployment: landing header, title and favicon use SORT defaults', async ({ page }) => {
  await stubBranding(page, DEFAULT_PAYLOAD);
  await page.goto('/');

  await expect(page).toHaveTitle('S.O.R.T. — Smart Operational Recovery & Tracking');

  const header = page.locator('header').first();
  await expect(header.getByText('S.O.R.T.', { exact: true })).toBeVisible();
  await expect(header.locator('img[alt="S.O.R.T. Logo"]')).toHaveAttribute('src', /SORT_LOGO/);

  await expect.poll(async () => faviconHref(page)).toMatch(/SORT_LOGO\.png$/);
  await expect(header.getByText('School Name', { exact: true })).toHaveCount(0);
});

test('tenant branding: name, logo, title and favicon follow the school', async ({ page }) => {
  await stubBranding(page, TENANT_PAYLOAD);
  await page.goto('/');

  await expect(page).toHaveTitle('Bagong Silang National High School | SORT');
  const header = page.locator('header').first();
  await expect(header.getByText('Bagong Silang National High School', { exact: true })).toBeVisible();
  await expect(header.locator('img[alt*="logo"]')).toHaveAttribute('src', /favicon\.svg$/);

  await expect.poll(async () => faviconHref(page)).toMatch(/favicon\.svg$/);
});

test('broken tenant logo: image and favicon fall back to the SORT mark', async ({ page }) => {
  await page.route('**/broken-logo.png', (route) => route.abort());
  await stubBranding(page, { ...TENANT_PAYLOAD, logoUrl: '/broken-logo.png' });
  await page.goto('/');

  const header = page.locator('header').first();
  await expect(header.locator('img[alt="S.O.R.T. Logo"]')).toHaveAttribute('src', /SORT_LOGO/);
  await expect(page).toHaveTitle('Bagong Silang National High School | SORT');
  await expect.poll(async () => faviconHref(page)).toMatch(/SORT_LOGO\.png$/);
});

test('legacy v1 cache with placeholder data is ignored', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'sortv2_theme_cache',
      JSON.stringify({ colors: { primary: '#00271D' }, schoolName: 'School Name', logoUrl: null })
    );
  });
  await stubBranding(page, DEFAULT_PAYLOAD);
  await page.goto('/');

  await expect(page).toHaveTitle('S.O.R.T. — Smart Operational Recovery & Tracking');
  await expect(
    page.locator('header').first().getByText('School Name', { exact: true })
  ).toHaveCount(0);
});
