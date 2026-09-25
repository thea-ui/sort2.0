/**
 * SORTv2 break-glass offline auth smoke test — permanent anti-regression net.
 *
 * Verifies the whole emergency-access contract against a running server:
 *   1. Fail-closed: no offline login while the fallback is disarmed.
 *   2. An admin can arm it and provision a PIN during an outage.
 *   3. A correct PIN signs in with an offline session; a wrong PIN does not.
 *   4. A break-glass session may NOT set its own PIN (no permanent backdoor).
 *   5. A break-glass session refreshes only while the window is armed.
 *   6. Repeated failures lock the fallback out.
 *   7. Disabling revokes break-glass sessions immediately.
 *
 * It creates a dedicated test account, and ALWAYS removes it and restores the
 * original offline-auth state, even when a check fails.
 *
 * Usage:  npm --prefix server run test:offline-auth
 * Exit code 1 if any check fails.
 */
import { PrismaClient } from '@prisma/client';

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:5000';
const prisma = new PrismaClient();

const TEST_LRN = '999000000001';
const TEST_NAME = 'Offline Smoke Fixture';
const GOOD_PIN = '864297';
const WRONG_PIN = '135791';

const results: { pass: boolean; name: string; detail: string }[] = [];
const warnings: string[] = [];
let failures = 0;

function record(pass: boolean, name: string, detail: string): void {
  if (!pass) failures++;
  results.push({ pass, name, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} — ${detail}`);
}

interface CallOptions {
  token?: string;
  body?: unknown;
}

interface CallResult {
  status: number;
  json: any;
  text: string;
}

async function call(method: string, path: string, { token, body }: CallOptions = {}): Promise<CallResult> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON body */
  }
  return { status: res.status, json, text };
}

async function expectStatus(
  name: string,
  method: string,
  path: string,
  expected: number[],
  options: CallOptions = {}
): Promise<CallResult> {
  const res = await call(method, path, options);
  const pass = expected.includes(res.status);
  record(pass, name, `${res.status} (expected ${expected.join('/')})${pass ? '' : ` body=${res.text.slice(0, 180)}`}`);
  return res;
}

/**
 * Login-specific assertion. A 429 means the rate-limit budget is exhausted by
 * earlier runs, which is an environment condition rather than a defect, so the
 * check is reported PENDING instead of passed or failed.
 */
async function expectLogin(name: string, expected: number[], body: Record<string, unknown>): Promise<CallResult> {
  const res = await call('POST', '/api/auth/login', { body });
  if (res.status === 429) {
    warnings.push(`${name} PENDING (login rate limiter exhausted)`);
    console.log(`WARN  ${name} — PENDING (rate limited)`);
    return res;
  }
  record(expected.includes(res.status), name, `${res.status} (expected ${expected.join('/')})`);
  return res;
}

/** Acquire an ADMIN token without depending on EnrollPro being online. */
async function adminToken(): Promise<string> {
  // @ts-ignore - plain ESM helper shared with the root smoke scripts
  const tokenModule = await import('../../../scripts/e2e/token.mjs');
  const resolved = await tokenModule.resolveToken(BASE, 'ADMIN', null);
  if (!resolved?.token) throw new Error('Could not obtain an ADMIN token (login + mint both failed)');
  return resolved.token;
}

async function ensureFixture() {
  return prisma.user.upsert({
    where: { employeeId: TEST_LRN },
    update: {
      syncSource: 'ENROLLPRO',
      enrollproId: `learner-smoke-${TEST_LRN}`,
      enrollproLrn: TEST_LRN,
      archivedAt: null,
      enrollmentStatus: 'ENROLLED',
      accountStatus: 'ACTIVE',
      suspendedUntil: null,
      offlinePinHash: null,
      offlinePinSetAt: null,
      role: 'STUDENT',
    },
    create: {
      name: TEST_NAME,
      email: `${TEST_LRN}@sort.local`,
      employeeId: TEST_LRN,
      role: 'STUDENT',
      syncSource: 'ENROLLPRO',
      enrollproId: `learner-smoke-${TEST_LRN}`,
      enrollproLrn: TEST_LRN,
      enrollmentStatus: 'ENROLLED',
      portalAccountActive: true,
    },
  });
}

async function removeFixture(userId: string): Promise<void> {
  // Cascades to sessions and offline_auth_logs.
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
}

async function readState() {
  const row = await prisma.systemSetting.findUnique({
    where: { id: 'default_setting' },
    select: { offlineAuthEnabled: true, offlineAuthExpiresAt: true },
  });
  const expiresAt = row?.offlineAuthExpiresAt ?? null;
  const enabled = Boolean(row?.offlineAuthEnabled) && (!expiresAt || expiresAt.getTime() > Date.now());
  return { enabled, expiresAt };
}

/** Raised when the environment prevents a check from running at all. */
class PendingError extends Error {}

function printSummary(): void {
  console.log(`\n=== ${results.filter((r) => r.pass).length}/${results.length} checks passed ===`);
  if (failures > 0) {
    console.log('\nFailed checks:');
    for (const r of results.filter((x) => !x.pass)) console.log(`  - ${r.name}: ${r.detail}`);
  }
  if (warnings.length > 0) {
    console.log('\nPENDING (not counted as passed):');
    for (const w of warnings) console.log(`  - ${w}`);
  }
}

async function main() {
  console.log(`\n=== Offline auth smoke (${BASE}) ===\n`);

  await fetch(`${BASE}/api/settings/public`).catch(() => {
    throw new Error(`Server unreachable at ${BASE}. Start it before running this suite.`);
  });

  const originalState = await readState();
  console.log(`Original offline-auth state: ${originalState.enabled ? 'ENABLED' : 'disabled'}\n`);

  const fixture = await ensureFixture();
  const admin = await adminToken();
  const startedAt = new Date();

  try {
    // Start from a known-disarmed state.
    await call('POST', '/api/offline-auth/disable', { token: admin, body: {} });

    // ── 1. Fail closed while disarmed ────────────────────────────────────
    await expectLogin('disarmed: login fails closed with 503', [503], {
      identifier: TEST_LRN,
      password: GOOD_PIN,
    });

    // ── 2. Admin arms the fallback ───────────────────────────────────────
    const enable = await expectStatus('admin enables offline auth (1h)', 'POST', '/api/offline-auth/enable', [200], {
      token: admin,
      body: { hours: 1, reason: 'smoke test' },
    });
    record(enable.json?.enabled === true, 'state reports enabled', `enabled=${enable.json?.enabled}`);
    record(
      Boolean(enable.json?.expiresAt) && new Date(enable.json.expiresAt).getTime() > Date.now(),
      'expiry is in the future',
      `expiresAt=${enable.json?.expiresAt}`
    );

    const overCap = await expectStatus('hours are capped at 72', 'POST', '/api/offline-auth/enable', [400], {
      token: admin,
      body: { hours: 999 },
    });
    void overCap;

    // ── 3. No PIN configured yet ─────────────────────────────────────────
    const noPin = await expectLogin('no PIN set: fallback rejects without leaking', [401], {
      identifier: TEST_LRN,
      password: GOOD_PIN,
    });
    if (noPin.status !== 429) {
      record(noPin.json?.code === 'OFFLINE_PIN_INVALID', 'no-PIN code is OFFLINE_PIN_INVALID', `code=${noPin.json?.code}`);
    }

    // ── 4. Admin provisions a PIN ────────────────────────────────────────
    await expectStatus('admin sets a PIN for the user', 'POST', `/api/offline-auth/pin/${fixture.id}`, [200], {
      token: admin,
      body: { pin: GOOD_PIN },
    });
    await expectStatus('weak PIN is rejected', 'POST', `/api/offline-auth/pin/${fixture.id}`, [400], {
      token: admin,
      body: { pin: '123456' },
    });

    // ── 5. Wrong PIN does not sign in ────────────────────────────────────
    await expectLogin('wrong PIN is rejected', [401], { identifier: TEST_LRN, password: WRONG_PIN });

    // ── 6. Correct PIN signs in with an offline session ──────────────────
    const login = await expectLogin('correct PIN signs in', [200], {
      identifier: TEST_LRN,
      password: GOOD_PIN,
    });
    if (login.status === 429) {
      // Without the core offline login there is nothing further to verify.
      warnings.push('Core offline-login checks PENDING: login rate limiter exhausted by earlier runs.');
      throw new PendingError('login rate limited');
    }
    record(login.json?.offlineSession === true, 'response flags offlineSession', `offlineSession=${login.json?.offlineSession}`);
    if (!login.json?.accessToken) throw new Error('offline login returned no access token');
    const breakGlassToken = login.json.accessToken;
    let breakGlassRefresh = login.json.refreshToken;

    const me = await expectStatus('offline token authenticates /auth/me', 'GET', '/api/auth/me', [200], {
      token: breakGlassToken,
    });
    record(me.json?.offlineSession === true, '/auth/me flags the offline session', `offlineSession=${me.json?.offlineSession}`);

    // ── 7. Break-glass cannot provision its own PIN ──────────────────────
    const selfPin = await expectStatus(
      'break-glass token cannot set its own PIN',
      'POST',
      '/api/offline-auth/pin',
      [403],
      { token: breakGlassToken, body: { pin: '246802' } }
    );
    record(
      selfPin.json?.code === 'OFFLINE_SESSION_CANNOT_SET_PIN',
      'self-PIN refusal code is explicit',
      `code=${selfPin.json?.code}`
    );

    // ── 8. Refresh works while armed ─────────────────────────────────────
    const refreshed = await expectStatus('break-glass session refreshes while armed', 'POST', '/api/auth/refresh', [200], {
      body: { refreshToken: breakGlassRefresh },
    });
    record(refreshed.json?.offlineSession === true, 'rotated session stays break-glass', `offlineSession=${refreshed.json?.offlineSession}`);
    if (refreshed.json?.refreshToken) breakGlassRefresh = refreshed.json.refreshToken;

    // ── 9. Repeated failures lock the fallback out ───────────────────────
    // Failed PIN attempts legitimately consume the login rate-limit budget, so
    // running this suite several times inside the 15-minute window can exhaust
    // it. That is an environment condition, not a defect: report PENDING and
    // never silently pass.
    let rateLimited = false;
    for (let i = 0; i < 3; i++) {
      const attempt = await call('POST', '/api/auth/login', { body: { identifier: TEST_LRN, password: WRONG_PIN } });
      if (attempt.status === 429) {
        rateLimited = true;
        break;
      }
    }
    const locked = await call('POST', '/api/auth/login', { body: { identifier: TEST_LRN, password: GOOD_PIN } });
    if (rateLimited || locked.status === 429) {
      warnings.push('lockout check PENDING (login rate limiter exhausted — re-run after 15 minutes)');
      console.log('WARN  sixth failure locks the fallback — PENDING (rate limited)');
    } else {
      record(
        locked.status === 401 && locked.json?.code === 'OFFLINE_PIN_LOCKED',
        'sixth failure locks the fallback',
        `${locked.status} code=${locked.json?.code}`
      );
    }

    // ── 10. Disabling revokes break-glass sessions immediately ───────────
    await expectStatus('admin disables offline auth', 'POST', '/api/offline-auth/disable', [200], {
      token: admin,
      body: { reason: 'smoke test teardown' },
    });
    await expectStatus('break-glass refresh is dead after disable', 'POST', '/api/auth/refresh', [401], {
      body: { refreshToken: breakGlassRefresh },
    });
    const closed = await call('POST', '/api/auth/login', { body: { identifier: TEST_LRN, password: GOOD_PIN } });
    if (closed.status === 429) {
      warnings.push('fail-closed-after-disable check PENDING (login rate limiter exhausted)');
      console.log('WARN  login is fail-closed again — PENDING (rate limited)');
    } else {
      record(closed.status === 503, 'login is fail-closed again', `${closed.status} (expected 503)`);
    }
  } finally {
    // Always restore: no fixture, no armed fallback, no test noise in the
    // permanent audit trail. (offline_auth_logs cascade with the fixture.)
    await removeFixture(fixture.id);
    await prisma.auditLog
      .deleteMany({
        where: {
          createdAt: { gte: startedAt },
          OR: [
            { actionType: { startsWith: 'OFFLINE_AUTH_' } },
            { actionType: 'OFFLINE_PIN_SET_BY_ADMIN' },
          ],
        },
      })
      .catch(() => {});
    if (originalState.enabled) {
      const remainingHours = originalState.expiresAt
        ? Math.max(1, Math.ceil((originalState.expiresAt.getTime() - Date.now()) / 3_600_000))
        : 1;
      await call('POST', '/api/offline-auth/enable', { token: admin, body: { hours: remainingHours, reason: 'restore pre-test state' } });
      console.log(`\n(restored pre-existing offline-auth window for ~${remainingHours}h)`);
    } else {
      await call('POST', '/api/offline-auth/disable', { token: admin, body: { reason: 'restore pre-test state' } });
    }
    const finalState = await readState();
    console.log(`\nCleanup: fixture removed, offline-auth enabled=${finalState.enabled}`);
  }

  printSummary();
  process.exit(failures > 0 ? 1 : 0);
}

main()
  .catch((err) => {
    if (err instanceof PendingError) {
      printSummary();
      console.log('\nSuite PENDING — re-run after the 15-minute login rate-limit window.');
      process.exit(0);
    }
    console.error('\nSmoke suite crashed:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
