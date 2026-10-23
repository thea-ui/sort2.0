import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Frontend pure-logic unit tests only; the server suite runs under node:test
    // (`npm --prefix server run test:services`) and Playwright covers UI behaviour.
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'server', 'tests', 'test-results', 'playwright-report'],
    environment: 'node',
    // This suite is a handful of pure-logic files: a capped fork pool keeps the
    // default (availableParallelism - 1 workers) from spiking RAM on dev boxes.
    pool: 'forks',
    maxWorkers: 2,
    minWorkers: 1,
  },
});
