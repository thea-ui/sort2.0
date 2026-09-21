#!/usr/bin/env node
/**
 * ATLAS campus-map pre-finish audit (plan §12.6) — automated portion.
 *
 * Runs after the smoke tests and verifies system-level invariants:
 *   1. Full role/status matrix (anon / student / teacher / MRF / admin).
 *   2. PII-free responses.
 *   3. Payload integrity: unique ids, finite geometry, room-parent linkage.
 *   4. Idempotency: two admin syncs in a row produce zero churn.
 *   5. Graceful empty state when no snapshot exists.
 *
 * Usage:  node scripts/atlas-audit.mjs
 * Exit code 1 on any failed assertion.
 */
import { loadE2EConfig } from './e2e/config.mjs';
import { resolveToken } from './e2e/token.mjs';

const cfg = loadE2EConfig();
const BASE = cfg.baseUrl;

const checks = [];
const warnings = [];
let failures = 0;

function assert(name, pass, detail) {
  if (!pass) failures++;
  checks.push({ name, pass, detail: String(detail) });
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
  return { status: res.status, text, contentType: res.headers.get('content-type') || '' };
}

async function tokenFor(role) {
  const account = cfg.accounts?.[role.toLowerCase()];
  const resolved = await resolveToken(BASE, role, account);
  if (!resolved.token) {
    warnings.push(`${role} token unavailable (login ${resolved.loginStatus ?? 'no account'})`);
  }
  return resolved.token;
}

const studentToken = await tokenFor('STUDENT');
const teacherToken = await tokenFor('TEACHER');
const mrfToken = await tokenFor('MRF');
const adminToken = await tokenFor('ADMIN');

// ── 1. Role/status matrix ──────────────────────────────────────────────
const matrix = [
  { role: 'anon', token: null, map: 401, image: 401, sync: 401 },
  { role: 'student', token: studentToken, map: 200, image: [200, 404], sync: 403 },
  { role: 'teacher', token: teacherToken, map: 200, image: [200, 404], sync: 403 },
  { role: 'mrf', token: mrfToken, map: 200, image: [200, 404], sync: 403 },
  { role: 'admin', token: adminToken, map: 200, image: [200, 404], sync: [200, 503] },
];

let adminMapText = null;

for (const row of matrix) {
  if (row.token === null && row.role !== 'anon') {
    warnings.push(`${row.role} matrix skipped (no token)`);
    continue;
  }
  const expect = (v) => (Array.isArray(v) ? v : [v]);

  const map = await call('GET', '/api/atlas/map', { token: row.token });
  assert(`${row.role} GET map`, expect(row.map).includes(map.status), `got ${map.status}`);
  if (row.role === 'admin' && map.status === 200) adminMapText = map.text;

  const image = await call('GET', '/api/atlas/campus-image', { token: row.token });
  assert(`${row.role} GET image`, expect(row.image).includes(image.status), `got ${image.status}`);

  const sync = await call('POST', '/api/atlas/sync', { token: row.token, body: {} });
  assert(`${row.role} POST sync`, expect(row.sync).includes(sync.status), `got ${sync.status}`);

  if (row.role !== 'anon' && map.status === 200) {
    const piiFree =
      !map.text.includes('"email"') &&
      !map.text.includes('"employeeId"') &&
      !map.text.includes('"enrollproLrn"');
    assert(`${row.role} map response PII-free`, piiFree, piiFree ? 'ok' : 'PII LEAK');
  }
}

// ── 2. Payload integrity + empty-state coherence ───────────────────────
if (adminMapText) {
  try {
    const payload = JSON.parse(adminMapText);
    assert('payload has buildings[]', Array.isArray(payload.buildings), Array.isArray(payload.buildings));

    const buildingIds = new Set();
    let duplicateBuilding = null;
    let duplicateRoom = null;
    let geometryOk = true;
    let linkageOk = true;
    const roomIds = new Set();

    for (const b of payload.buildings) {
      if (buildingIds.has(b.atlasId)) duplicateBuilding = b.atlasId;
      buildingIds.add(b.atlasId);
      if (![b.x, b.y, b.width, b.height].every((n) => Number.isFinite(n))) geometryOk = false;
      for (const r of b.rooms || []) {
        if (roomIds.has(r.atlasId)) duplicateRoom = r.atlasId;
        roomIds.add(r.atlasId);
        if (!Number.isFinite(r.floor)) linkageOk = false;
      }
    }

    assert('building atlasIds unique', !duplicateBuilding, duplicateBuilding ?? `${buildingIds.size} buildings`);
    assert('room atlasIds unique', !duplicateRoom, duplicateRoom ?? `${roomIds.size} rooms`);
    assert('finite building geometry', geometryOk, geometryOk ? 'ok' : 'non-finite geometry');
    assert('room-parent linkage', linkageOk, linkageOk ? 'ok' : 'bad floor linkage');

    if (payload.syncedAt === null) {
      assert('empty state is graceful', payload.buildings.length === 0, `buildings=${payload.buildings.length}`);
    }
  } catch (err) {
    assert('payload parses', false, err.message);
  }
} else {
  warnings.push('integrity checks skipped (no admin map payload)');
}

// ── 3. Students cannot file asset reports (map view stays allowed) ─────
if (studentToken) {
  const assetProbe = await call('POST', '/api/reports', {
    token: studentToken,
    body: {
      title: 'Broken chair (audit probe)',
      description: '[PILLAR: FURNITURE] Broken chair',
      coordinates: { lat: 14.6, lng: 120.98 },
      locationName: 'ATLAS Audit Room',
    },
  });
  assert('student asset report blocked (403)', assetProbe.status === 403, `got ${assetProbe.status}`);

  // Waste path must remain open: without coordinates the request must reach
  // validation (400) instead of being caught by the asset guard (403).
  const wasteProbe = await call('POST', '/api/reports', {
    token: studentToken,
    body: { title: 'Waste (audit probe)', description: 'overflowing bin', locationName: 'ATLAS Audit Room' },
  });
  assert('student waste path not over-blocked (400)', wasteProbe.status === 400, `got ${wasteProbe.status}`);
} else {
  warnings.push('student asset-block probe skipped (no student token)');
}

// ── 4. Idempotency: back-to-back admin syncs ───────────────────────────
if (adminToken) {
  const first = await call('POST', '/api/atlas/sync', { token: adminToken, body: {} });
  if (first.status === 503) {
    warnings.push('idempotency skipped (ATLAS unreachable)');
  } else {
    assert('first audit sync returns 200', first.status === 200, `got ${first.status}`);
    const firstBody = JSON.parse(first.text);

    const second = await call('POST', '/api/atlas/sync', { token: adminToken, body: {} });
    assert('second audit sync returns 200', second.status === 200, `got ${second.status}`);
    const secondBody = JSON.parse(second.text);

    assert('second sync inserts nothing', secondBody.inserted === 0, `inserted=${secondBody.inserted}`);
    assert('second sync deactivates nothing', secondBody.deactivated === 0, `deactivated=${secondBody.deactivated}`);
    if (!secondBody.unchanged) {
      warnings.push(
        `second sync reported changes (inserted=${secondBody.inserted}, updated=${secondBody.updated}) — ATLAS may have been edited mid-audit`
      );
    }
    assert(
      'seen counts stable',
      firstBody.buildingsSeen === secondBody.buildingsSeen && firstBody.roomsSeen === secondBody.roomsSeen,
      `${firstBody.buildingsSeen}/${firstBody.roomsSeen} -> ${secondBody.buildingsSeen}/${secondBody.roomsSeen}`
    );
  }
} else {
  warnings.push('idempotency skipped (no admin token)');
}

// ── Report ─────────────────────────────────────────────────────────────
console.log('\nATLAS campus-map audit');
console.log('='.repeat(72));
for (const c of checks) {
  console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name.padEnd(56)} ${c.detail}`);
}
for (const w of warnings) {
  console.log(`WARN  ${w}`);
}
console.log('='.repeat(72));
console.log(`${checks.length - failures}/${checks.length} checks passed${warnings.length ? `, ${warnings.length} warning(s)` : ''}`);

// Exit via exitCode so undici keep-alive sockets close first (avoids a libuv
// teardown abort with a corrupted exit code on Windows).
process.exitCode = failures > 0 ? 1 : 0;
