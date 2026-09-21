import { defineConfig, devices } from '@playwright/test';

/**
 * Minimal chromium-only UI smoke suite (plan §7.16).
 * Backend (localhost:5000) is assumed to be running — same assumption as the
 * auth/atlas smoke scripts. The Vite dev server is started/reused automatically.
 */
export default defineConfig({
  testDir: './tests/ui',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.SMOKE_WEB_URL || 'http://127.0.0.1:5174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: process.env.SMOKE_WEB_URL || 'http://127.0.0.1:5174',
    reuseExistingServer: true,
    timeout: 90_000,
  },
});
