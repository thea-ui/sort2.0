import { test, expect } from '@playwright/test';
import { seedSession, type UiRole } from './helpers/session';
import { mockAtlasImage, mockAtlasMap } from './helpers/atlasRoutes';

const ROLES: { role: UiRole; existingTab: string }[] = [
  { role: 'STUDENT', existingTab: 'Bin Map' },
  { role: 'TEACHER', existingTab: 'Bin Map' },
  { role: 'MRF', existingTab: 'Overview' },
  { role: 'ADMIN', existingTab: 'Overview' },
];

for (const { role, existingTab } of ROLES) {
  test(`${role}: shell renders without the Campus Map page, existing tabs keep working, no console errors`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));

    await mockAtlasMap(page);
    await mockAtlasImage(page, false);

    const seeded = await seedSession(page, role);
    test.skip(!seeded, `no usable ${role} test identity`);

    await page.goto('/');

    const existingNav = page.getByRole('button', { name: existingTab }).first();
    await expect(existingNav).toBeVisible({ timeout: 25_000 });

    // The standalone Campus Map page was removed for every role.
    await expect(page.getByRole('button', { name: 'Campus Map' })).toHaveCount(0);

    await existingNav.click();
    if (existingTab === 'Bin Map') {
      // Bin Map is still the ATLAS-backed live map.
      await expect(page.getByTestId('campus-map-frame')).toBeVisible();
    } else {
      await expect(page.getByRole('button', { name: existingTab }).first()).toBeVisible();
    }

    const filtered = consoleErrors.filter(
      (message) => !message.includes('favicon') && !message.includes('Download the React DevTools')
    );
    expect(filtered, `console errors:\n${filtered.join('\n')}`).toEqual([]);
  });
}

test('profile menu keeps the demo role switcher out and exposes Offline PIN + Sign Out only', async ({ page }) => {
  const seeded = await seedSession(page, 'STUDENT');
  test.skip(!seeded, 'no STUDENT test identity');

  await page.goto('/');
  await page.locator('header button').last().click();

  await expect(page.getByText('Switch Role (Demo)')).toHaveCount(0);
  await expect(page.getByText('Demo Role Switcher')).toHaveCount(0);
  // Passwords are managed by EnrollPro: no change-password entry point in SORT.
  await expect(page.getByRole('button', { name: 'Change Password' })).toHaveCount(0);
  // The only local credential is the optional break-glass offline PIN.
  await expect(page.getByRole('button', { name: 'Offline PIN' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();
});
