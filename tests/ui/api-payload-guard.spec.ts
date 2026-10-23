import { test, expect } from '@playwright/test';
import { API_URL } from './helpers/session';

// @ts-ignore - plain ESM helper without type declarations
import { resolveToken } from '../../scripts/e2e/token.mjs';

/**
 * API payload budget guard (PERFORMANCE_OPTIMIZATION_PLAN.md Phase 3).
 *
 * Unbounded list endpoints are the backend's RAM spike source. These checks use
 * explicit limit parameters (deterministic regardless of seed-data size) and
 * field/shape budgets so a regression to "load the whole table" fails the gate.
 */

test('list endpoints honour limits and payload budgets', async ({ request }) => {
  const admin = await resolveToken(API_URL, 'ADMIN');
  test.skip(!admin?.token, 'no usable ADMIN test identity');
  const headers = { Authorization: `Bearer ${admin.token}` };

  const get = async (path: string) => {
    const response = await request.get(`${API_URL}${path}`, { headers });
    expect(response.ok(), `GET ${path} → ${response.status()}`).toBeTruthy();
    const text = await response.text();
    return { text, json: JSON.parse(text) as any };
  };

  // 1. Users: explicit limit must be honoured, default capped, no secrets.
  const limitedUsers = await get('/api/users?limit=10');
  expect(Array.isArray(limitedUsers.json)).toBeTruthy();
  expect(limitedUsers.json.length, 'GET /users?limit=10 must return at most 10 rows').toBeLessThanOrEqual(10);

  const users = await get('/api/users');
  expect(users.json.length, 'GET /users default must be capped at 500 rows').toBeLessThanOrEqual(500);
  expect(users.text.length, 'GET /users payload budget').toBeLessThan(500_000);
  if (users.json.length > 0) {
    expect(users.json[0]).not.toHaveProperty('passwordHash');
    expect(users.json[0]).not.toHaveProperty('password');
  }

  // 2. Market + scrap sales ledgers: bounded and newest-first.
  const marketSales = await get('/api/market/sales?limit=5');
  expect(Array.isArray(marketSales.json)).toBeTruthy();
  expect(marketSales.json.length, 'GET /market/sales?limit=5 must return at most 5 rows').toBeLessThanOrEqual(5);

  const scrapSales = await get('/api/asset-scrap/sales?limit=5');
  expect(Array.isArray(scrapSales.json)).toBeTruthy();
  expect(scrapSales.json.length, 'GET /asset-scrap/sales?limit=5 must return at most 5 rows').toBeLessThanOrEqual(5);

  // 3. Walk-in history: the route's limit is clamped and respected.
  const walkIns = await get('/api/walk-ins?limit=5');
  expect(Array.isArray(walkIns.json?.turnovers)).toBeTruthy();
  expect(walkIns.json.turnovers.length, 'GET /walk-ins?limit=5 must return at most 5 rows').toBeLessThanOrEqual(5);

  // 4. Reports: bounded, photo bytes never embedded (regression from Phase 1).
  const reports = await get('/api/reports?limit=5');
  expect(Array.isArray(reports.json)).toBeTruthy();
  expect(reports.json.length, 'GET /reports?limit=5 must return at most 5 rows').toBeLessThanOrEqual(5);
  if (reports.json.length > 0) {
    expect(reports.json[0]).not.toHaveProperty('imageUrl');
    expect(reports.json[0]).toHaveProperty('photoUrl');
  }

  // 5. Challenges admin: aggregate stats shape, bounded payload (no relation
  //    arrays — the endpoint used to load every progress/contribution row).
  const challenges = await get('/api/challenges/admin');
  expect(Array.isArray(challenges.json)).toBeTruthy();
  expect(challenges.text.length, 'GET /challenges/admin payload budget').toBeLessThan(200_000);
  for (const challenge of challenges.json.slice(0, 10)) {
    expect(typeof challenge.stats?.usersInProgress).toBe('number');
    expect(typeof challenge.stats?.completedCount).toBe('number');
    expect(typeof challenge.stats?.totalContributions).toBe('number');
    expect(challenge).not.toHaveProperty('progressRecords');
    expect(challenge).not.toHaveProperty('contributions');
  }

  console.log(
    `[api-payload-guard] users=${users.json.length} (${users.text.length}B), ` +
      `marketSales=${marketSales.json.length}, reports=${reports.json.length}, ` +
      `walkIns=${walkIns.json.turnovers.length}, challenges=${challenges.json.length} (${challenges.text.length}B)`
  );
});
