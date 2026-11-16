import type { Page } from '@playwright/test';

export const PWA_ROLES = ['STUDENT', 'TEACHER', 'ADMIN', 'MRF'] as const;
export type PwaRole = (typeof PWA_ROLES)[number];

/** Release runs must not silently skip a role because credentials are absent. */
export function requireRoleSeeded(seeded: boolean, role: PwaRole): void {
  if (!seeded && process.env.PWA_REQUIRE_ROLES === '1') {
    throw new Error(`No usable ${role} test identity (PWA_REQUIRE_ROLES=1)`);
  }
}

export function installEntryTestId(role: PwaRole, viewport: 'desktop' | 'mobile'): string {
  if (viewport === 'desktop') return 'install-app-sidebar';
  return role === 'STUDENT' || role === 'TEACHER' ? 'install-app-menu-item' : 'install-app-menu-item';
}

export function isStudentShell(role: PwaRole): boolean {
  return role === 'STUDENT' || role === 'TEACHER';
}

/** Stub `beforeinstallprompt` after React has mounted. */
export async function dispatchInstallPrompt(
  page: Page,
  outcome: 'accepted' | 'dismissed' = 'accepted'
): Promise<void> {
  await page.evaluate(async (choice) => {
    const event = new Event('beforeinstallprompt');
    Object.defineProperty(event, 'prompt', {
      value: async () => {
        (window as unknown as { __pwaPromptCalled?: boolean }).__pwaPromptCalled = true;
      },
    });
    Object.defineProperty(event, 'userChoice', {
      value: Promise.resolve({ outcome: choice }),
    });
    window.dispatchEvent(event);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }, outcome);
}

export async function stubStandaloneMode(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query: string) => {
      const result = original(query);
      if (!query.includes('display-mode: standalone')) return result;
      return {
        ...result,
        matches: true,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
      } as MediaQueryList;
    };
  });
}

export async function stubIosSafari(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      get: () =>
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    });
    Object.defineProperty(navigator, 'platform', { configurable: true, get: () => 'iPhone' });
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => 5 });
    Object.defineProperty(navigator, 'standalone', { configurable: true, get: () => false });
  });
}

/** Wait for the worker to install, then reload so the shell is controlled. */
export async function activateServiceWorker(page: Page): Promise<{ scriptURL: string; scope: string }> {
  const ready = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return { timedOut: true };
    const timeout = new Promise<{ timedOut: true }>((resolve) =>
      setTimeout(() => resolve({ timedOut: true }), 30_000)
    );
    const settled = navigator.serviceWorker.ready.then(() => ({ timedOut: false as const }));
    return Promise.race([settled, timeout]);
  });
  if (ready.timedOut) throw new Error('service worker did not become ready');

  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), undefined, {
    timeout: 20_000,
  });

  return page.evaluate(() => {
    const registration = navigator.serviceWorker.controller;
    return {
      scriptURL: registration?.scriptURL ?? '',
      scope: registration ? new URL(registration.scriptURL).pathname : '',
    };
  });
}

export interface CacheSnapshot {
  keys: string[];
  apiUrls: string[];
}

export async function readCacheSnapshot(page: Page): Promise<CacheSnapshot> {
  return page.evaluate(async () => {
    const keys = await caches.keys();
    const apiUrls: string[] = [];
    for (const key of keys) {
      const cache = await caches.open(key);
      for (const request of await cache.keys()) {
        if (new URL(request.url).pathname.startsWith('/api/')) apiUrls.push(request.url);
      }
    }
    return { keys, apiUrls };
  });
}
