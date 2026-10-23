import { test, expect } from '@playwright/test';
import { API_URL } from './helpers/session';

// @ts-ignore - plain ESM helper without type declarations
import { resolveToken } from '../../scripts/e2e/token.mjs';

/**
 * Memory-heavy endpoint guard (PERFORMANCE_OPTIMIZATION_PLAN.md Phase 5).
 * PDF exports are row-capped and concurrency-limited, and settings refuse
 * inline/oversized blueprint payloads. Written before the fix: the row-cap and
 * blueprint tests fail against the previous unbounded behavior.
 */

const COLUMNS = Array.from({ length: 8 }, (_, index) => ({
  header: `Column ${index + 1}`,
  width: 10,
}));

function makePayload(rows: number) {
  return {
    title: 'Phase 5 memory guard',
    metaLines: ['Memory-heavy endpoint guard'],
    recordCount: rows,
    generatedLabel: '2026-10-19',
    columns: COLUMNS,
    rows: Array.from({ length: rows }, (_, rowIndex) =>
      COLUMNS.map((_, colIndex) => `R${rowIndex}C${colIndex} ${'x'.repeat(60)}`)
    ),
  };
}

test('PDF export enforces the row cap', async ({ request }) => {
  const admin = await resolveToken(API_URL, 'ADMIN');
  test.skip(!admin?.token, 'no usable ADMIN test identity');
  const headers = { Authorization: `Bearer ${admin.token}` };

  const response = await request.post(`${API_URL}/api/reports/export-pdf`, {
    headers,
    data: makePayload(1600),
    timeout: 60_000,
  });

  expect(response.status(), 'a 1600-row export must be rejected by the row cap').toBe(413);
});

test('PDF export caps concurrent renders', async ({ request }) => {
  const admin = await resolveToken(API_URL, 'ADMIN');
  test.skip(!admin?.token, 'no usable ADMIN test identity');
  const headers = { Authorization: `Bearer ${admin.token}` };

  const payload = makePayload(1400);
  const responses = await Promise.all(
    Array.from({ length: 3 }, () =>
      request.post(`${API_URL}/api/reports/export-pdf`, { headers, data: payload, timeout: 120_000 })
    )
  );
  const statuses = responses.map((response) => response.status());
  console.log(`[memory-guard] concurrent export statuses: ${statuses.join(', ')}`);

  expect(statuses.filter((status) => status === 200).length, 'at most two exports may render at once').toBeLessThanOrEqual(2);
  expect(statuses, 'the extra concurrent export is rejected with 429').toContain(429);
});

test('settings rejects oversized and inline blueprint payloads', async ({ request }) => {
  const admin = await resolveToken(API_URL, 'ADMIN');
  test.skip(!admin?.token, 'no usable ADMIN test identity');
  const headers = { Authorization: `Bearer ${admin.token}` };

  const restore = () =>
    request.patch(`${API_URL}/api/settings`, { headers, data: { blueprintUrl: null }, timeout: 30_000 }).catch(() => undefined);

  try {
    const oversized = await request.patch(`${API_URL}/api/settings`, {
      headers,
      data: { blueprintUrl: 'https://example.test/blueprint.png?x=' + 'a'.repeat(2500) },
      timeout: 30_000,
    });
    expect(oversized.status(), 'blueprintUrl over 2000 chars must be rejected').toBe(400);

    const inline = await request.patch(`${API_URL}/api/settings`, {
      headers,
      data: { blueprintUrl: 'data:image/png;base64,' + 'A'.repeat(2500) },
      timeout: 30_000,
    });
    expect(inline.status(), 'inline base64 blueprint payloads must be rejected').toBe(400);
  } finally {
    await restore();
  }
});
