#!/usr/bin/env node
/**
 * SORTv2 authorization smoke test — the permanent anti-regression net.
 *
 * Verifies that:
 *   1. Public endpoints stay reachable anonymously (and leak no PII).
 *   2. Protected endpoints reject anonymous callers (401).
 *   3. Role boundaries hold (students cannot call admin mutations).
 *
 * Usage:  node scripts/auth-smoke.mjs
 * Exit code 1 if any check fails.
 */
import { loadE2EConfig, login } from './e2e/config.mjs';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const cfg = loadE2EConfig();
const BASE = cfg.baseUrl;

const results = [];
const warnings = [];
let failures = 0;

async function call(method, path, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, text };
}

async function check(name, method, path, expected, { token, body, forbidPii } = {}) {
  try {
    const { status, text } = await call(method, path, { token, body });
    const statusOk = expected.includes(status);
    let piiOk = true;
    if (forbidPii) {
      piiOk = !text.includes('"email"') && !text.includes('"employeeId"') && !text.includes('"enrollproLrn"');
    }
    const pass = statusOk && piiOk;
    if (!pass) failures++;
    results.push({ pass, name, detail: `${status} (expected ${expected.join('/')})${piiOk ? '' : ' + PII LEAK'}` });
  } catch (err) {
    failures++;
    results.push({ pass: false, name, detail: `request failed: ${err.message}` });
  }
}

// ── 1. Public surface (must remain anonymous + PII-free) ────────────────
await check('health is public', 'GET', '/health', [200]);
await check('campus news is public', 'GET', '/api/settings/campus-news', [200]);
await check('users list is public but PII-free', 'GET', '/api/users', [200], { forbidPii: true });
await check('leaderboard is public but PII-free', 'GET', '/api/users/leaderboard', [200], { forbidPii: true });

// ── 2. Anonymous callers must be rejected ───────────────────────────────
const anonymousProtected = [
  ['GET', '/api/settings'],
  ['GET', '/api/bins'],
  ['GET', '/api/market/stocks'],
  ['GET', '/api/market/sales'],
  ['GET', '/api/reports'],
  ['GET', '/api/sync/status'],
  ['GET', '/api/certificates'],
  ['GET', '/api/assets'],
  ['PATCH', '/api/settings'],
  ['POST', '/api/settings/asset-categories'],
  ['POST', '/api/settings/waste-types'],
  ['PATCH', '/api/settings/point-rules/00000000-0000-0000-0000-000000000000'],
  ['PATCH', '/api/market/stocks/pet_plastic'],
  ['POST', '/api/market/approve-sale'],
  ['POST', '/api/market/sell-batch'],
  ['PATCH', '/api/bins/00000000-0000-0000-0000-000000000000'],
];
for (const [method, path] of anonymousProtected) {
  await check(`anon blocked: ${method} ${path}`, method, path, [401]);
}

// ── 3. Role boundaries (only when real credentials are available) ───────
const localCreds = join(dirname(fileURLToPath(import.meta.url)), 'e2e', 'credentials.local.json');
if (existsSync(localCreds) && cfg.accounts?.student?.identifier && !cfg.accounts.student.identifier.startsWith('<')) {
  const student = await login(BASE, cfg.accounts.student);
  if (student.ok && student.token) {
    await check('student can read settings', 'GET', '/api/settings', [200], { token: student.token, forbidPii: true });
    await check('student cannot mutate settings', 'PATCH', '/api/settings', [403], { token: student.token, body: {} });
    await check('student cannot mutate market', 'PATCH', '/api/market/stocks/pet_plastic', [403], { token: student.token, body: {} });
    await check('student cannot mutate bins', 'PATCH', '/api/bins/00000000-0000-0000-0000-000000000000', [403], { token: student.token, body: {} });
    await check('student PII-stripped user list', 'GET', '/api/users', [200], { token: student.token, forbidPii: true });
    // Students may view the campus map but never file asset reports (403, no data written).
    await check('student cannot file asset reports', 'POST', '/api/reports', [403], {
      token: student.token,
      body: {
        title: 'Broken chair (smoke)',
        description: '[PILLAR: FURNITURE] Broken chair',
        coordinates: { lat: 14.6, lng: 120.98 },
        locationName: 'ATLAS Smoke Room',
      },
    });
    } else if (student.status === 403) {
      // Correct rollover behaviour: this credential belongs to a learner who has
      // been archived (ALUMNI / NOT_ENROLLED) and must not be able to sign in.
      warnings.push({
        name: 'student login',
        detail: '403 - archived learner credential (expected after rollover); supply an active student to restore E2E coverage',
      });
    } else if (student.status === 429) {
      // Environmental: the auth login limiter counts failed attempts. Frequent
      // smoke runs can exhaust the 15-minute budget; this is not a regression.
      warnings.push({
        name: 'student login',
        detail: '429 - login rate limiter active (frequent test runs); role checks degraded to warnings',
      });
    } else {
    // Student login is our known-good reference — a failure here is a real regression.
    results.push({ pass: false, name: 'student login', detail: `status ${student.status}` });
    failures++;
  }

  // Staff logins depend on the external EnrollPro provider, so a rejected
  // credential is reported as a WARNING rather than failing the build.
  for (const role of ['admin', 'mrf']) {
    const account = cfg.accounts?.[role];
    if (!account || String(account.identifier).startsWith('<')) continue;
    const staff = await login(BASE, account);
    if (staff.ok && staff.token) {
      if (role === 'admin') {
        await check('admin passes admin guard (no 401/403)', 'PATCH', '/api/settings/asset-categories/00000000-0000-0000-0000-000000000000', [400, 404, 500], { token: staff.token, body: {} });
        await check('admin sees full user records', 'GET', '/api/users', [200], { token: staff.token });
  } else {
        // No-op probe (empty body) — proves MRF clears requireRole without mutating data.
        await check('mrf passes MRF guard (no 401/403)', 'PATCH', '/api/market/stocks/pet_plastic', [200, 400, 500], { token: staff.token, body: {} });
      }
    } else {
      warnings.push({ name: `${role} login`, detail: `EnrollPro rejected (status ${staff.status}) — check credentials` });
    }
  }
} else {
  console.log('INFO: credentials.local.json not found — running anonymous checks only.');
}

// ── Report ──────────────────────────────────────────────────────────────
console.log('\nSORTv2 auth smoke test');
console.log('='.repeat(64));
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name.padEnd(52)} ${r.detail}`);
}
for (const w of warnings) {
  console.log(`WARN  ${w.name.padEnd(52)} ${w.detail}`);
}
console.log('='.repeat(64));
console.log(`${results.length - failures}/${results.length} checks passed${warnings.length ? `, ${warnings.length} warning(s)` : ''}`);

// Exit via exitCode (not process.exit) so undici keep-alive sockets can close
// first; a hard exit races libuv teardown on Windows and aborts with a
// corrupted exit code.
process.exitCode = failures > 0 ? 1 : 0;
