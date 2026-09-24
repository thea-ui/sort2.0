import { test, expect } from '@playwright/test';
import { seedSession } from './helpers/session';

/**
 * Phase 5 guard: the admin console's list views all render through the shared
 * `DataTable` (one table implementation, toolbar, sorting, states).
 */

test.describe('Admin tables (DataTable adoption)', () => {
  test('users table sorts from column headers via aria-sort', async ({ page }) => {
    const seeded = await seedSession(page, 'ADMIN');
    test.skip(!seeded, 'no usable ADMIN test identity');

    await page.goto('/');
    await page.getByRole('button', { name: 'Users' }).first().click();

    await expect(page.getByRole('heading', { name: 'User & Role Management' })).toBeVisible();
    await expect(page.locator('table').first()).toBeVisible();

    const nameHeader = page.getByRole('columnheader', { name: /User Name/ });
    await nameHeader.click();
    await expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
    await nameHeader.click();
    await expect(nameHeader).toHaveAttribute('aria-sort', 'descending');
    await nameHeader.click();
    await expect(nameHeader).not.toHaveAttribute('aria-sort', 'ascending');
  });

  test('audit logs render the shared table toolbar (search + action filter)', async ({ page }) => {
    const seeded = await seedSession(page, 'ADMIN');
    test.skip(!seeded, 'no usable ADMIN test identity');

    await page.goto('/');
    await page.getByRole('button', { name: 'Audit Logs' }).first().click();

    await expect(page.getByRole('heading', { name: 'Audit Logs' })).toBeVisible();
    await expect(page.getByPlaceholder('Search by actor name or details...')).toBeVisible();
    await expect(page.getByLabel('Action')).toBeVisible();
    await expect(page.locator('table').first()).toBeVisible();
  });

  test('ledger sheet pills switch between DataTable sheets', async ({ page }) => {
    const seeded = await seedSession(page, 'ADMIN');
    test.skip(!seeded, 'no usable ADMIN test identity');

    await page.goto('/');
    await page.getByRole('button', { name: 'School Years' }).first().click();

    const reportsPill = page.getByRole('button', { name: /^Reports \d+$/ });
    const hasLedger = await reportsPill
      .waitFor({ state: 'visible', timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!hasLedger, 'no school-year ledger available in the test database');

    await page.getByRole('button', { name: 'Points Ledger' }).click();
    await expect(page.locator('h3', { hasText: 'Points Ledger' })).toBeVisible();
    await expect(page.locator('table').first()).toBeVisible();
  });
});
