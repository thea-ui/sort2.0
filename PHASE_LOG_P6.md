# Phase 6 Log — Deployment Hardening

> Plan: `PERFORMANCE_OPTIMIZATION_PLAN.md` §5 (Phase 6)
> Date: 2026-10-21
> Status: **PASS** — file-backed photos, split process model, shared rate limits, observability and load test shipped; all gates green.

---

## 1. Changes delivered

| Area | Files | What changed |
|---|---|---|
| Photo storage | `server/prisma/schema.prisma`, `server/prisma/migrations/20261021120000_phase6_deployment_hardening/migration.sql`, `server/src/services/report-photo-storage.ts` | `reports.photo_path` added; new uploads decoded/capped (7 MB, JPEG/PNG/WebP) and written to `uploads/reports/<id>.<ext>`; traversal-safe resolution; body size cap |
| Photo routes | `server/src/routes/report.routes.ts` | `POST /reports` writes files (base64 no longer stored in the DB); `GET /reports/:id/photo` streams from disk, falls back to legacy base64, redirects external URLs; orphan file cleanup on failed insert |
| Backfill | `server/src/scripts/migrate-report-photos.ts`, `server/package.json` | Idempotent batch migration (`npm --prefix server run db:migrate-photos`); verified on the dev tenant |
| Process model | `server/src/worker.ts`, `server/src/index.ts`, `ecosystem.config.cjs`, `server/package.json` | Dedicated scheduler worker; API honours `RUN_SCHEDULERS=false`; PM2 config with heap caps/restart policies; graceful shutdown in both processes |
| Rate limits | `server/src/lib/rate-limit-store.ts`, `server/prisma/schema.prisma`, auth/atlas/walk-in routes | PostgreSQL-backed express-rate-limit store (shared across instances) with in-memory fallback; expired-row cleanup every 5 min; ATLAS manual-sync limit raised 8 → 30/min for the shared budget |
| Observability | `server/src/index.ts`, `server/src/lib/prisma.ts`, `server/.env.example` | `GET /health/deep` (DB latency, connections, RSS/heap, uptime; 2 s cache); `[SlowQuery]` warnings via Prisma query events (`SLOW_QUERY_MS`, default 500 ms) |
| Index | migration SQL | `reports(school_year_id, created_at)` for the newest-first year list |
| Load test | `scripts/perf/load-test.mjs`, root `package.json` | Dependency-free concurrency/p95 test (`npm run test:load`) with error + latency budgets |
| Ops runbook | `server/docs/DEPLOYMENT.md` | Topology, env, PM2, pgBouncer sizing, migrations, backups/restore, photo volume, monitoring, release checklist |

No frontend changes were needed (the photo endpoint contract is unchanged).

## 2. Verification evidence

**Photo migration (dev tenant)**

| Metric | Before | After |
|---|---|---|
| Reports with base64 `image_url` | **14** | **0** |
| Reports with `photo_path` | 0 | **15** (14 migrated + 1 upload smoke) |
| Files in `uploads/reports/` | 0 | **15** |

- `db:migrate-photos`: `14/14 migrated, 0 failed`.
- `scripts/perf/photo-storage-smoke.mjs`: new report → file on disk → `GET /photo` returns `image/png` (200), create response has no `imageUrl`.
- Endpoint traversal tests: 4 unit tests pass (parse/cap/round-trip/traversal).

**Process model**

- `worker-check.mjs` PASS: worker logs `[Worker] Scheduler process running` plus the sync/bin-reset/ATLAS/branding scheduler lines.
- API booted with `RUN_SCHEDULERS=false` logs `[Server] Schedulers disabled` and no scheduler lines.
- Boot branding sync ran from the worker (normal EnrollPro behavior; dev branding now reflects the dev tenant).

**Shared rate limiting**

- One failed login produced `rate_limit_counters: ::/56 → total_hits 1`.
- The first audit run hit 429s because the shared ATLAS budget (8/min) is now enforced across scripts — correct cross-process behavior. Raised to 30/min (admin-only) and re-ran: atlas 21/21, audit 26/26.

**Load test** (API with 6,000+ seeded rows, concurrency 8, 40 req/path):

| Path | Errors | p50 | p95 | Max |
|---|---|---|---|---|
| `/health` | 0 | 7 ms | 13 ms | 15 ms |
| `/api/reports?limit=50` | 0 | 41 ms | 81 ms | 155 ms |
| `/api/market/sales?limit=50` | 0 | 21 ms | 27 ms | 28 ms |
| `/api/users?limit=50` | 0 | 20 ms | 41 ms | 42 ms |
| report photo | 0 | 20 ms | 37 ms | 42 ms |

**Observability**

- `/health/deep`: `{"status":"ok","db":{"ok":true,"latencyMs":2,"connections":5},"memory":{"rssMb":394,"heapUsedMb":57},"uptimeSec":360}` after the stress run; clean idle restart measured **69.7 MB RSS / 1 DB connection**.
- `[SlowQuery]` lines during all runs: **0**.

## 3. Gate results

| Gate | Command | Result |
|---|---|---|
| A — Static | lint + frontend/server builds | PASS (0 errors; 102 warnings) |
| B — Unit | unit + server services (75 tests now) | PASS (157 + 75) |
| C — Integration | auth / atlas / atlas audit | PASS (31/31 + 2 warnings, 21/21, 26/26) |
| D — UI | `npm run test:ui` | PASS (59 passed, 1 skipped, 0 failed; 3.0 min) |
| E — Resource | clean idle restart + load test | PASS (69.7 MB idle, p95 ≤ 81 ms) |
| F — Boot | API (`RUN_SCHEDULERS=false`) + worker | PASS (both logged as expected) |
| G — Log scan | `log-scan.mjs` | PASS: 0 matches |
| Full chain | `npm run verify` | **PASS end-to-end (exit 0, 4.01 min)** |

## 4. Deployment blocker found (must resolve before release)

`prisma migrate status` shows divergent history (pre-existing, not introduced here):

- DB-only migration `20260920160000_kilo_leaderboard` (missing from the repo).
- Local migration `20261015000000_market_approval_reference` not applied to the dev DB.
- `migrate diff` shows certificate drift: `CertificateType` enum difference and legacy `prize_given*` columns in the DB.

The Phase 6 migration is additive; it was applied locally with the exact SQL because `db push` would have applied the unrelated destructive certificate drift. The runbook (§4) documents the reconciliation steps required for an existing production database. A fresh database can run the full chain.

## 5. Notes / side effects of verification

- **Post-phase fix — EnrollPro host restored:** `server/.env` now points at
  `https://dev-jegs.buru-degree.ts.net/api` again (the `dev` host was the temporary
  instance while `dev-jegs` was offline). Verified through the app: `/api/sync/health`
  reports `enrollproOnline: true` + `integrationKeyValid: true`, branding re-synced from
  dev-jegs, and the auth smoke now runs the full student role suite (**39/39 checks
  passed**; only the MRF credential still warns 401 — a provider-side password mismatch,
  not a configuration issue). Both EnrollPro hosts serve the same tenant branding
  (HINIGARAN NATIONAL HIGH SCHOOL), so no visual change resulted from the switch.
- One smoke report (`Phase 6 photo smoke …`) was created in the dev tenant to verify the
  upload → disk → `/photo` path. Remove it with the Danger Zone purge/report cleanup if undesired.
- The `uploads/` directory is gitignored and now holds runtime photos; production must
  mount it as a persistent volume and back it up (runbook §5–§6).

## 6. Rollback point

Revert the checkpoint commit. `photo_path`, `rate_limit_counters` and their indexes are additive; photo files on disk remain harmless if the code rolls back. The legacy `image_url` column was intentionally kept for rollback and can be dropped in a follow-up once all environments are backfilled.
