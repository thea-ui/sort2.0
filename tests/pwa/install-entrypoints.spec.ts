import { expect, test } from '@playwright/test';

import { seedSession } from '../ui/helpers/session';
import { attachErrorCollector } from './helpers/errors';
import {
  dispatchInstallPrompt,
  PWA_ROLES,
  requireRoleSeeded,
  stubIosSafari,
  stubStandaloneMode,
  type PwaRole,
} from './helpers/pwa';

function viewportFor(projectName: string): 'desktop' | 'mobile' {
  return projectName === 'pwa-mobile' ? 'mobile' : 'desktop';
}

function isStudentShell(role: PwaRole): boolean {
  return role === 'STUDENT' || role === 'TEACHER';
}

async function openMobileEntryPoint(page: import('@playwright/test').Page, role: PwaRole): Promise<void> {
  if (isStudentShell(role)) {
    await page.getByRole('button', { name: 'Open profile menu' }).click();
    return;
  }
  await page.getByTestId('mobile-bottom-nav').getByRole('button', { name: 'More navigation' }).click();
}

test.describe('install entry points', () => {
  for (const role of PWA_ROLES) {
    test(`${role}: exactly one install entry point is visible and prompts`, async ({ page }, testInfo) => {
      const viewport = viewportFor(testInfo.project.name);
      const collector = attachErrorCollector(page);

      const seeded = await seedSession(page, role);
      requireRoleSeeded(seeded, role);
      test.skip(!seeded, `no usable ${role} test identity`);

      await page.goto('/');
      await expect(page.getByRole('main')).toBeVisible();
      await dispatchInstallPrompt(page, 'accepted');

      if (viewport === 'desktop') {
        const cta = page.getByTestId('install-app-sidebar');
        await expect(cta).toBeVisible();

        // Collapsed rail keeps the same labelled control.
        await page
          .getByRole('button', { name: /(collapse|expand|toggle) sidebar/i })
          .first()
          .click();
        await expect(cta).toBeVisible();
        await expect(cta).toHaveAttribute('aria-label', 'Install SORT app');

        const visibleInstallControls = page.locator(
          '[data-testid="install-app-sidebar"]:visible, [data-testid="install-app-menu-item"]:visible, [data-testid="install-app-card"]:visible'
        );
        expect(await visibleInstallControls.count()).toBeLessThanOrEqual(1);

        await cta.click();
        expect(await page.evaluate(() => (window as any).__pwaPromptCalled === true)).toBe(true);
        await expect(cta).toHaveCount(0);
      } else if (isStudentShell(role)) {
        const card = page.getByTestId('install-app-card');
        await expect(card).toBeVisible();

        // The profile-menu row appears only after the card is dismissed, so
        // there is never more than one visible install control.
        await page.getByRole('button', { name: 'Open profile menu' }).click();
        await expect(page.getByTestId('install-app-menu-item')).toHaveCount(0);
        await page.getByRole('button', { name: 'Open profile menu' }).click();

        await card.getByRole('button', { name: 'Dismiss install suggestion' }).click();
        await expect(card).toHaveCount(0);

        await openMobileEntryPoint(page, role);
        const menuItem = page.getByTestId('install-app-menu-item');
        await expect(menuItem).toBeVisible();

        const visibleInstallControls = page.locator(
          '[data-testid="install-app-sidebar"]:visible, [data-testid="install-app-menu-item"]:visible, [data-testid="install-app-card"]:visible'
        );
        expect(await visibleInstallControls.count()).toBeLessThanOrEqual(1);

        await menuItem.click();
        expect(await page.evaluate(() => (window as any).__pwaPromptCalled === true)).toBe(true);
        await expect(menuItem).toHaveCount(0);
      } else {
        await expect(page.getByTestId('install-app-card')).toHaveCount(0);
        await openMobileEntryPoint(page, role);
        const menuItem = page.getByTestId('mobile-nav-sheet').getByTestId('install-app-menu-item');
        await expect(menuItem).toBeVisible();

        await menuItem.click();
        expect(await page.evaluate(() => (window as any).__pwaPromptCalled === true)).toBe(true);
        await expect(menuItem).toHaveCount(0);
      }

      // Existing bottom-navigation contract is untouched.
      if (viewport === 'mobile') {
        const bottomNav = isStudentShell(role)
          ? page.getByTestId('student-bottom-nav')
          : page.getByTestId('mobile-bottom-nav');
        await expect(bottomNav).toBeVisible();
        expect(await bottomNav.getByTestId('install-app-menu-item').count()).toBe(0);
        expect(await bottomNav.locator('button').count()).toBeGreaterThanOrEqual(4);
      }

      collector.assertClean(`${role} ${viewport} install entry point`);
    });

    test(`${role}: standalone install mode hides every install control`, async ({ page }) => {
      const collector = attachErrorCollector(page);
      await stubStandaloneMode(page);

      const seeded = await seedSession(page, role);
      requireRoleSeeded(seeded, role);
      test.skip(!seeded, `no usable ${role} test identity`);

      await page.goto('/');
      await expect(page.getByRole('main')).toBeVisible();
      await dispatchInstallPrompt(page, 'accepted');

      await expect(page.getByTestId('install-app-sidebar')).toHaveCount(0);
      await expect(page.getByTestId('install-app-menu-item')).toHaveCount(0);
      await expect(page.getByTestId('install-app-card')).toHaveCount(0);

      collector.assertClean(`${role} standalone mode`);
    });

    test(`${role}: iOS Safari shows Add to Home Screen instructions`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'pwa-mobile', 'iOS instructions are checked on the mobile project');
      const collector = attachErrorCollector(page);
      await stubIosSafari(page);

      const seeded = await seedSession(page, role);
      requireRoleSeeded(seeded, role);
      test.skip(!seeded, `no usable ${role} test identity`);

      await page.goto('/');
      await expect(page.getByRole('main')).toBeVisible();

      if (isStudentShell(role)) {
        const card = page.getByTestId('install-app-card');
        await expect(card).toBeVisible();
        await card.getByRole('button', { name: 'Install app' }).click();
      } else {
        await openMobileEntryPoint(page, role);
        await page.getByTestId('mobile-nav-sheet').getByTestId('install-app-menu-item').click();
      }

      const dialog = page.getByTestId('install-instructions');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText('Add SORT to your Home Screen')).toBeVisible();
      await expect(dialog.getByText(/Add to Home Screen/)).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);

      collector.assertClean(`${role} iOS instructions`);
    });
  }
});
