import { test, expect } from '@playwright/test';

test('failed login shows the generic credentials error and no password-change prompt', async ({ page }) => {
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }),
    });
  });

  await page.goto('/admin');
  await page.locator('#portal-identifier').fill('test-admin');
  await page.locator('#portal-password').fill('wrong-password');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(
    page.getByText('Incorrect LRN/Employee ID or password. Passwords are managed by EnrollPro — use your EnrollPro portal password.')
  ).toBeVisible();
  await expect(page.getByText(/change your password/i)).toHaveCount(0);
  await expect(page.getByTestId('password-change-link')).toHaveCount(0);

  const token = await page.evaluate(() => sessionStorage.getItem('sortv2_token'));
  expect(token).toBeNull();
});

test('successful login stores the SORT access token', async ({ page }) => {
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'test-access-token',
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresIn: '900s',
        user: {
          id: 'test-admin-id',
          name: 'Test Admin',
          email: 'test-admin@sort.local',
          employeeId: 'test-admin',
          role: 'ADMIN',
          points: 0,
          warningsCount: 0,
          certificates: [],
          certificatesEarned: [],
        },
      }),
    });
  });

  await page.goto('/admin');
  await page.locator('#portal-identifier').fill('test-admin');
  await page.locator('#portal-password').fill('test-password');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem('sortv2_token')))
    .toBe('test-access-token');
});
