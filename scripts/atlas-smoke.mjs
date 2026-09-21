#!/usr/bin/env node
/**
 * ATLAS campus-map API smoke test — permanent anti-regression net for G3.
 *
 * Verifies:
 *   1. Anonymous callers are rejected (401) on map/image/sync.
 *   2. Every authenticated role can READ the map + image (owner policy).
 *   3. Only admins can trigger a sync; a failed ATLAS sync returns 503, not 500.
 *   4. Payload shape + data integrity + PII-free responses.
 *   5. Graceful empty state (never 500 when no snapshot exists).
 *
 * Token policy: real login first; if EnrollPro is down (503) or the local
 * account is archived (403), fall back to a locally minted HS256 test token
 * (see scripts/e2e/token.mjs and plan §12.10). Minted tokens are validated by
 * the real middleware, so role boundaries remain genuinely tested.
 *
 * Usage:  node scripts/atlas-smoke.mjs
 * Exit code 1 if any check fails.
 */
import { loadE2EConfig } from './e2e/config.mjs';
import { resolveToken } from './e2e/token.mjs';

const cfg = loadE2EConfig();
const BASE = cfg.baseUrl;

const results = [];
const warnings = [];
let failures = 0;

function record(pass, name, detail) {
  if (!pass) failures++;
  results.push({ pass, name, detail });
}

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
  return {
    status: res.status,
    text,
    contentType: res.headers.get('content-type') || '',
  };
}

async function check(name, method, path, expected, { token, body, forbidPii } = {}) {
  try {
    const { status, text } = await call(method, path, { token, body });
    const statusOk = expected.includes(status);
    let piiOk = true;
    if (forbidPii) {
      piiOk = !text.includes('"email"') && !text.includes('"employeeId"') && !text.includes('"enrollproLrn"');
    }
    record(statusOk && piiOk, name, `${status} (expected ${expected.join('/')})${piiOk ? '' : ' + PII LEAK'}`);
    return { status, text };
  } catch (err) {
    record(false, name, `request failed: ${err.message}`);
    return { status: 0, text: '' };
  }
}

function integrityCheck(label, payloadText) {
  try {
    const payload = JSON.parse(payloadText);
    if (!Array.isArray(payload.buildings)) {
      record(false, `${label}: buildings[] present`, 'missing buildings array');
      return;
    }
    if (payload.syncedAt === null && payload.buildings.length > 0) {
      record(false, `${label}: empty-state coherence`, 'syncedAt=null but buildings present');
      return;
    }
    const ids = new Set();
    let geometryOk = true;
    let duplicateId = null;
    for (const b of payload.buildings) {
      if (ids.has(b.atlasId)) duplicateId = b.atlasId;
      ids.add(b.atlasId);
      if (![b.x, b.y, b.width, b.height].every((n) => Number.isFinite(n))) geometryOk = false;
    }
    record(!duplicateId, `${label}: atlasIds unique`, duplicateId ? `duplicate ${duplicateId}` : `${ids.size} buildings`);
    record(geometryOk, `${label}: finite geometry`, geometryOk ? 'ok' : 'non-finite x/y/width/height');
  } catch (err) {
    record(false, `${label}: payload parses`, err.message);
  }
}

// ── 1. Anonymous surface ───────────────────────────────────────────────
await check('anon blocked: GET /api/atlas/map', 'GET', '/api/atlas/map', [401]);
await check('anon blocked: GET /api/atlas/campus-image', 'GET', '/api/atlas/campus-image', [401]);
await check('anon blocked: POST /api/atlas/sync', 'POST', '/api/atlas/sync', [401]);

// ── 2. Resolve tokens per role ─────────────────────────────────────────
const roles = ['student', 'teacher', 'mrf', 'admin'];
const tokens = {};
for (const role of roles) {
  const account = cfg.accounts?.[role];
  const resolved = await resolveToken(BASE, role.toUpperCase(), account);
  tokens[role] = resolved;
  if (!resolved.token) {
    warnings.push({
      name: `${role} token`,
      detail: `unavailable (login status ${resolved.loginStatus ?? 'no account'}); role checks downgraded to WARNING`,
    });
  } else if (resolved.source === 'minted') {
    warnings.push({
      name: `${role} token`,
      detail: `minted test token (login status ${resolved.loginStatus}; EnrollPro outage contingency §12.10)`,
    });
  }
}

// ── 3. Read access for every authenticated role ────────────────────────
for (const role of roles) {
  const token = tokens[role].token;
  if (!token) {
    warnings.push({ name: `${role} GET /api/atlas/map`, detail: 'skipped (no token)' });
    continue;
  }
  const { status, text } = await check(
    `${role} can read map`,
    'GET',
    '/api/atlas/map',
    [200],
    { token, forbidPii: true }
  );
  if (status === 200) integrityCheck(role, text);
}

// ── 4. Sync boundaries ─────────────────────────────────────────────────
for (const role of ['student', 'teacher', 'mrf']) {
  const token = tokens[role].token;
  if (!token) {
    warnings.push({ name: `${role} blocked from sync`, detail: 'skipped (no token)' });
    continue;
  }
  await check(`${role} cannot POST sync`, 'POST', '/api/atlas/sync', [403], { token, body: {} });
}

if (tokens.admin.token) {
  const { status } = await check('admin can POST sync (200|503)', 'POST', '/api/atlas/sync', [200, 503], {
    token: tokens.admin.token,
    body: {},
  });
  if (status === 503) {
    warnings.push({ name: 'admin POST sync', detail: '503: ATLAS unreachable — graceful failure confirmed' });
  }
  await check('admin can read status', 'GET', '/api/atlas/status', [200], { token: tokens.admin.token });
  const image = await check('admin can request campus image (200|404)', 'GET', '/api/atlas/campus-image', [200, 404], {
    token: tokens.admin.token,
  });
  if (image.status === 200 && !image.contentType.startsWith('image/')) {
    record(false, 'campus image content-type is image/*', image.contentType || 'missing');
  }
} else {
  warnings.push({ name: 'admin checks', detail: 'skipped (no admin token)' });
}

// ── Report ─────────────────────────────────────────────────────────────
console.log('\nATLAS map smoke test');
console.log('='.repeat(72));
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name.padEnd(56)} ${r.detail}`);
}
for (const w of warnings) {
  console.log(`WARN  ${w.name.padEnd(56)} ${w.detail}`);
}
console.log('='.repeat(72));
console.log(`${results.length - failures}/${results.length} checks passed${warnings.length ? `, ${warnings.length} warning(s)` : ''}`);

// Exit via exitCode so undici keep-alive sockets close first (avoids a libuv
// teardown abort with a corrupted exit code on Windows).
process.exitCode = failures > 0 ? 1 : 0;
