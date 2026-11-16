import { expect, test } from '@playwright/test';

import { seedSession } from '../ui/helpers/session';
import { attachErrorCollector } from './helpers/errors';
import {
  activateServiceWorker,
  PWA_ROLES,
  readCacheSnapshot,
  requireRoleSeeded,
} from './helpers/pwa';

function pngDimensions(buffer: Buffer): { width: number; height: number } {
  expect(buffer.subarray(1, 4).toString('ascii')).toBe('PNG');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test.describe('installable shell per role', () => {
  for (const role of PWA_ROLES) {
    test(`${role}: service worker, manifest, caches, and console are clean`, async ({ page }) => {
      const collector = attachErrorCollector(page);
      const seeded = await seedSession(page, role);
      requireRoleSeeded(seeded, role);
      test.skip(!seeded, `no usable ${role} test identity`);

      await page.goto('/');
      await expect(page.getByRole('main')).toBeVisible();

      const worker = await activateServiceWorker(page);
      expect(worker.scriptURL).toMatch(/\/sw\.js$/);

      // Navigation fallback must keep the role shell alive after the reload.
      await expect(page.getByRole('main')).toBeVisible();

      const scope = await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        return registration?.scope ?? '';
      });
      expect(new URL(scope).pathname).toBe('/');

      const caches = await readCacheSnapshot(page);
      expect(caches.keys.some((key) => key.includes('workbox-precache'))).toBe(true);
      expect(caches.apiUrls).toEqual([]);

      const manifestResponse = await page.request.get('/api/settings/public/manifest.webmanifest');
      expect(manifestResponse.status()).toBe(200);
      expect(manifestResponse.headers()['content-type']).toContain('application/manifest+json');
      const manifest = await manifestResponse.json();

      expect(manifest.id).toBe('/');
      expect(manifest.start_url).toBe('/');
      expect(manifest.scope).toBe('/');
      expect(manifest.display).toBe('standalone');
      expect(manifest.background_color).toBe('#F9F3F0');
      expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/);
      expect(Array.isArray(manifest.icons)).toBe(true);
      expect(manifest.icons.some((icon: any) => icon.sizes === '192x192' && icon.purpose === 'any')).toBe(true);
      expect(manifest.icons.some((icon: any) => icon.sizes === '512x512' && icon.purpose === 'any')).toBe(true);
      expect(manifest.icons.some((icon: any) => icon.purpose === 'maskable')).toBe(true);

      const mainIcon = manifest.icons.find((icon: any) => icon.sizes === '192x192' && icon.purpose === 'any');
      const iconResponse = await page.request.get(mainIcon.src);
      expect(iconResponse.status()).toBe(200);
      expect(iconResponse.headers()['content-type']).toContain('image/png');
      expect(pngDimensions(await iconResponse.body())).toEqual({ width: 192, height: 192 });

      // Theme metadata mirrors branding; the favicon updater must not clobber
      // the apple-touch icon.
      const metadata = await page.evaluate(() => ({
        theme: document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content ?? '',
        appleHref: document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']")?.href ?? '',
        faviconHref: document.querySelector<HTMLLinkElement>("link[rel='icon']")?.href ?? '',
      }));
      expect(metadata.theme).toMatch(/^#[0-9a-f]{6}$/);
      expect(metadata.appleHref).toContain('/api/settings/public/apple-touch-icon.png');
      // Tenant branding may swap the favicon, but the theme updater must never
      // overwrite the apple-touch icon (rel*='icon' selector regression).
      expect(metadata.faviconHref).not.toContain('apple-touch-icon');
      expect(metadata.faviconHref).not.toBe(metadata.appleHref);

      // No automatic reload or update prompt on a fresh install.
      expect(await page.getByTestId('pwa-update-prompt').count()).toBe(0);
      let reloads = 0;
      page.on('framenavigated', (frame) => {
        if (frame === page.mainFrame()) reloads += 1;
      });
      await page.waitForTimeout(2500);
      expect(reloads).toBe(0);

      collector.assertClean(`${role} installable shell`);
    });
  }
});
