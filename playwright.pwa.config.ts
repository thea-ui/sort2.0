import { defineConfig, devices } from '@playwright/test';

/**
 * PWA suite: runs against the production build through `vite preview` because
 * service workers are intentionally disabled in the dev server.
 *
 * Requires `dist/` (npm run test:pwa builds first). The preview proxy forwards
 * /api and /uploads to the backend on localhost:5000.
 */
const baseURL = process.env.PWA_WEB_URL || 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: './tests/pwa',
  timeout: 75_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: 'pwa-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'pwa-mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
