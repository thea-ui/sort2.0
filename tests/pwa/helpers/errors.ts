import { expect, type Page } from '@playwright/test';

interface ErrorCollector {
  errors: string[];
  warnings: string[];
  assertClean: (context: string) => void;
}

const IGNORED_CONSOLE = [
  'favicon',
  'Download the React DevTools',
];

const IGNORED_REQUEST_FAILURES = [
  '/api/settings/public/stream',
];

/**
 * Per-test log gate: any console error, page error, failed request, or
 * same-origin 5xx is a failure unless it is on the narrow allowlist.
 */
export function attachErrorCollector(page: Page): ErrorCollector {
  const errors: string[] = [];
  const warnings: string[] = [];

  page.on('console', (message) => {
    const text = message.text();
    if (message.type() === 'error') {
      if (IGNORED_CONSOLE.some((needle) => text.includes(needle))) return;
      errors.push(`console.error: ${text}`);
    }
    if (message.type() === 'warning') warnings.push(text);
  });

  page.on('pageerror', (error) => {
    errors.push(`pageerror: ${error.message}`);
  });

  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText ?? 'unknown';
    if (failure.includes('ERR_ABORTED')) return;
    if (IGNORED_REQUEST_FAILURES.some((needle) => request.url().includes(needle))) return;
    errors.push(`requestfailed: ${request.method()} ${request.url()} (${failure})`);
  });

  page.on('response', (response) => {
    if (!response.url().includes('/api/')) return;
    if (response.url().includes('/settings/public/stream')) return;
    if (response.status() >= 500) {
      errors.push(`http ${response.status()}: ${response.request().method()} ${response.url()}`);
    }
  });

  return {
    errors,
    warnings,
    assertClean: (context: string) => {
      expect(errors, `${context} browser errors:\n${errors.join('\n')}`).toEqual([]);
    },
  };
}
