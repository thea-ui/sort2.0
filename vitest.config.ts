import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Frontend pure-logic unit tests only; the server suite runs under node:test
    // (`npm --prefix server run test:atlas`) and Playwright covers UI behaviour.
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'server', 'tests', 'test-results', 'playwright-report'],
    environment: 'node',
  },
});
