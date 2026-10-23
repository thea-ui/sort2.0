/**
 * Dependency-free load test for the SORTv2 read paths (Phase 6).
 *
 * Usage: node scripts/perf/load-test.mjs [baseUrl]
 * Env:   LOAD_REQUESTS=40   requests per path
 *        LOAD_CONCURRENCY=8 concurrent workers
 *        LOAD_P95_BUDGET_MS=1500
 *
 * Exits non-zero when any request fails or a p95 exceeds the budget.
 */
// @ts-ignore - plain ESM helper without type declarations
import { resolveToken } from '../e2e/token.mjs';

const baseUrl = process.argv[2] || process.env.SMOKE_BASE_URL || 'http://localhost:5000';
const requestsPerPath = Math.max(1, Number(process.env.LOAD_REQUESTS) || 40);
const concurrency = Math.max(1, Math.min(32, Number(process.env.LOAD_CONCURRENCY) || 8));
const p95BudgetMs = Math.max(100, Number(process.env.LOAD_P95_BUDGET_MS) || 1500);

const admin = await resolveToken(baseUrl, 'ADMIN');
if (!admin?.token) {
  console.error('[load-test] No usable ADMIN token — is the API running?');
  process.exit(1);
}
const headers = { Authorization: `Bearer ${admin.token}` };

// Include one photo sample when a report with evidence exists.
const firstReports = await fetch(`${baseUrl}/api/reports?limit=5`, { headers })
  .then((response) => (response.ok ? response.json() : []))
  .catch(() => []);
const photoPath = Array.isArray(firstReports)
  ? firstReports.find((report) => typeof report.photoUrl === 'string')?.photoUrl
  : null;

const paths = [
  '/health',
  '/api/reports?limit=50',
  '/api/market/sales?limit=50',
  '/api/users?limit=50',
  ...(photoPath ? [photoPath] : []),
];

async function sample(pathname) {
  const startedAt = performance.now();
  try {
    const response = await fetch(`${baseUrl}${pathname}`, { headers, signal: AbortSignal.timeout(30_000) });
    const body = await response.arrayBuffer();
    return {
      ok: response.ok,
      status: response.status,
      ms: performance.now() - startedAt,
      bytes: body.byteLength,
    };
  } catch (error) {
    return { ok: false, status: 0, ms: performance.now() - startedAt, bytes: 0, error: error.name };
  }
}

function percentile(sorted, fraction) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1));
  return sorted[index];
}

async function runPath(pathname) {
  const results = [];
  let issued = 0;

  const worker = async () => {
    while (issued < requestsPerPath) {
      issued += 1;
      results.push(await sample(pathname));
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, requestsPerPath) }, worker));

  const durations = results.map((result) => result.ms).sort((a, b) => a - b);
  const errors = results.filter((result) => !result.ok);
  return {
    pathname,
    count: results.length,
    errors: errors.length,
    errorStatuses: [...new Set(errors.map((result) => result.status || result.error))],
    p50: percentile(durations, 0.5),
    p95: percentile(durations, 0.95),
    max: durations[durations.length - 1] ?? 0,
    avgKb: results.reduce((sum, result) => sum + result.bytes, 0) / results.length / 1024,
  };
}

// Warm up (JIT, connection pool) before measuring.
await Promise.all(paths.map((pathname) => sample(pathname)));

const reports = [];
for (const pathname of paths) {
  reports.push(await runPath(pathname));
}

console.log(`\n[load-test] ${baseUrl} — ${requestsPerPath} req/path, concurrency ${concurrency}\n`);
console.log('path'.padEnd(42), 'req'.padStart(4), 'err'.padStart(4), 'p50ms'.padStart(7), 'p95ms'.padStart(7), 'maxms'.padStart(7), 'avgKB'.padStart(7));
for (const report of reports) {
  console.log(
    report.pathname.padEnd(42),
    String(report.count).padStart(4),
    String(report.errors).padStart(4),
    report.p50.toFixed(0).padStart(7),
    report.p95.toFixed(0).padStart(7),
    report.max.toFixed(0).padStart(7),
    report.avgKb.toFixed(1).padStart(7)
  );
}

const failures = reports.filter((report) => report.errors > 0 || report.p95 > p95BudgetMs);
if (failures.length > 0) {
  console.error(
    `\n[load-test] FAIL: ${failures
      .map((report) => `${report.pathname} (errors=${report.errors}, p95=${report.p95.toFixed(0)}ms)`)
      .join('; ')} — budget ${p95BudgetMs}ms`
  );
  process.exit(1);
}
console.log(`\n[load-test] PASS: no errors, every p95 ≤ ${p95BudgetMs}ms`);
