# Phase 4 Log — N+1, Transaction & Sync-Engine Fixes

> Plan: `PERFORMANCE_OPTIMIZATION_PLAN.md` §5 (Phase 4)
> Date: 2026-10-19
> Status: **PASS** — award path batched, sync engine single-flight + bounded, all gates green.

---

## 1. Changes delivered

| Area | File | What changed |
|---|---|---|
| Award path | `server/src/services/report-points.service.ts` | Stream report read narrowed to the columns the planner needs (no reporter join); removed the per-award report re-read; point histories batched with one `createMany`; one user-point increment per distinct reporter; explicit 15 s timeout on the approve transaction |
| Collection route | `server/src/routes/report.routes.ts` | Explicit 15 s transaction timeout for stream collection + award (default 5 s was too tight) |
| Rollover | `server/src/services/rollover.service.ts` | Minimal student projection; point snapshots bulk-created (`createMany`, 1,000 chunks) with updates only for pre-existing rows (retry path) instead of one upsert per student |
| EnrollPro sync | `server/src/services/enrollpro-sync.service.ts` | 30 s `AbortSignal.timeout` on every EnrollPro call; single-flight guard wrapping the whole run; identity maps preloaded once (no per-user `findUnique` by enrollproId/email/employeeId); reconciliation batched per cohort (one `deleteMany` + one `updateMany`); duplicate-creation fallback preserved |
| Sync routes | `server/src/routes/sync.routes.ts` | `/enrollpro` and `/all` return **409 `SYNC_IN_PROGRESS`** while a run is active |
| Schedulers | `sync-scheduler.service.ts`, `atlas-sync-scheduler.service.ts`, `bin-reset.service.ts` | Reschedules serialized behind an in-flight promise, so concurrent boot/settings calls cannot orphan a cron task |
| Data seeder | `server/src/services/data-seeder.service.ts` | All bulk inserts chunked (1,000 rows); challenge progress upserts in 25-row chunks; user balances preloaded once (no per-row `findUnique`); stage progress logs |
| Scrap sell-batch | `server/src/routes/asset-scrap.routes.ts` | In-stock item read capped at 5,000; explicit 15 s transaction timeout |
| Job smoke (new) | `scripts/perf/job-smoke.mjs` | Deterministic single-flight guard check + health-under-load assertion |

No schema or migration changes.

## 2. Bug-catch evidence (guard smoke)

Run against an isolated instance whose `ENROLLPRO_BASE_URL` points at a hanging address,
so the first sync stays in flight while the second request arrives:

```
[job-smoke] health: ok
[job-smoke] sync status: HTTP 200, lastSync=SUCCESS
[job-smoke] concurrent sync results: client-timeout, 409
[job-smoke] health after concurrent triggers: ok
[job-smoke] PASS
```

- Exactly one request started the sync; the concurrent one was rejected with **409**.
- The guard is set synchronously before any await, so there is no window for two runs.
- The server stayed healthy while the stalled upstream request was pending.
- Before this phase, manual routes called `runEnrollProSync()` directly with no shared guard (audit H1).

## 3. Verification scope (deliberate exclusions)

Destructive live jobs — a real EnrollPro sync, a school-year rollover, and a HEAVY
data-seed — were **not** run against the dev tenant. The guard/timeout path was verified
on the isolated hanging-upstream instance; the seeder plan builder and award planner
remain covered by the existing unit suites (`test:data-seed`, `report-award-plan`), and
all changed files pass `tsc`. Running those jobs is safe to do in staging, not on the
shared dev data.

## 4. Gate results

| Gate | Command | Result |
|---|---|---|
| A — Static | `npm run lint`, `npm run build`, `npm --prefix server run build` | PASS (0 errors; 102 warnings) |
| B — Unit | `npm run test:unit`, `npm --prefix server run test:services` | PASS (157 + 71) |
| C — Integration | `npm run test:auth`, `test:atlas`, `test:atlas:audit` | PASS (31/31 + 2 warnings, 21/21, 31/31) |
| D — UI | `npm run test:ui` | PASS (56 passed, 1 skipped, 0 failed; 4.2 min) |
| E — Resource | After the full suite | RSS **227.7 MB** under load (budget ≤ 300), pool at its 5-connection cap, no leaks after the run |
| F — Boot | `boot-server.mjs` / `stop-server.mjs` (isolated :5098 + :5000) | PASS |
| G — Log scan | `log-scan.mjs` | PASS: **0 matches** (no P2028 / pool timeout) |
| Job smoke | `node scripts/perf/job-smoke.mjs` | PASS (409 + healthy) |
| Full chain | `npm run verify` | **PASS end-to-end (exit 0, 5.6 min)** |

## 5. Deferred

- `recordReportContribution` still issues per-report/per-challenge queries inside the
  award loop. Batching it requires a challenge-progress redesign (progress + completion
  detection are interleaved); tracked for a later pass. The award path is now O(1) extra
  reads per stream instead of O(reports) reads.
- The data-seed transaction timeout remains 180 s; writes are chunked and stage-logged,
  so a HEAVY run no longer constructs one giant multi-thousand-row statement.
- EnrollPro sync still holds the fetched roster arrays while staging entries (bounded by
  the school's roster size); freeing pages incrementally is a follow-up.

## 6. Rollback point

Revert the checkpoint commit to restore the previous per-row logic. No schema or data
changes are involved.
