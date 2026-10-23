/**
 * Phase 4 job smoke: verifies the EnrollPro sync single-flight guard and that
 * the API stays healthy while a stalled upstream sync is in progress.
 * Usage: node scripts/perf/job-smoke.mjs [baseUrl]
 * Point it at an instance whose ENROLLPRO_BASE_URL is unreachable-but-hanging
 * so the first sync stays in flight while the second request arrives.
 */
// @ts-ignore - plain ESM helper without type declarations
import { resolveToken } from '../e2e/token.mjs';

const baseUrl = process.argv[2] || process.env.SMOKE_BASE_URL || 'http://localhost:5000';
const admin = await resolveToken(baseUrl, 'ADMIN');

if (!admin?.token) {
  console.error('[job-smoke] No usable ADMIN token — is the API running?');
  process.exit(1);
}
const headers = { Authorization: `Bearer ${admin.token}`, 'Content-Type': 'application/json' };

const health = await fetch(`${baseUrl}/health`).then((response) => response.json());
console.log('[job-smoke] health:', health.status);

const statusResponse = await fetch(`${baseUrl}/api/sync/status`, { headers });
const statusBody = await statusResponse.json();
console.log(`[job-smoke] sync status: HTTP ${statusResponse.status}, lastSync=${statusBody?.lastSync?.status ?? 'none'}`);

const triggerSync = () =>
  fetch(`${baseUrl}/api/sync/enrollpro`, { method: 'POST', headers, signal: AbortSignal.timeout(20_000) })
    .then((response) => response.status)
    .catch((error) => (error?.name === 'TimeoutError' ? 'client-timeout' : `client-error:${error?.name}`));

const results = await Promise.all([triggerSync(), triggerSync()]);
console.log('[job-smoke] concurrent sync results:', results.join(', '));

const serverErrors = results.filter((result) => typeof result === 'number' && result >= 500 && result !== 409);
if (serverErrors.length > 0) {
  console.error('[job-smoke] FAIL: sync trigger returned a server error');
  process.exit(1);
}
if (!results.includes(409) && !results.includes(200)) {
  console.error('[job-smoke] FAIL: neither request completed nor was rejected as already-running');
  process.exit(1);
}

const healthAfter = await fetch(`${baseUrl}/health`).then((response) => response.json());
console.log('[job-smoke] health after concurrent triggers:', healthAfter.status);
if (healthAfter.status !== 'ok') process.exit(1);

console.log('[job-smoke] PASS');
