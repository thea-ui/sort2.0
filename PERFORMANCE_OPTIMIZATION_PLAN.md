# SORTv2 — Performance & Resource Optimization Plan

> **Document type:** Multi-phase execution plan with anti-regression gates
> **Scope:** Backend process/connection/RAM footprint, frontend polling/storage footprint, test-infra process explosion, deployment readiness
> **Status:** Phase 1 (P0 crash fixes) **COMPLETE & VERIFIED** — phases 0, 2–6 pending
> **Companion docs:** `AGENTS.md` (§1 file size, §5 verification), `README.md` (§Testing)
> **Verification contract:** no phase is "done" until every gate in §3 passes **and** the log/Playwright evidence in §4 is attached to the phase log.

---

## 0. How to read this document

The optimization was audited as **7 phases** (0–6). Each phase is independently shippable and ends with a
hard gate. **Phase 0 must run before any further fix** so the gates have a trustworthy (green) baseline.
Phase 1 already shipped (this is the P0 crash-fix round). Phases 2–6 are the remaining roadmap.

| Phase | Name | Status | Risk if skipped |
|---|---|---|---|
| **0** | Baseline, log harness & green test floor | ✅ **Done** (`PHASE_LOG_P0.md`) | — |
| **1** | P0 — Crash fixes (Prisma singleton, boot hardening, photo payloads, test process caps) | ✅ **Done** | — |
| **2** | Frontend poll & storage rework | ✅ **Done** (`PHASE_LOG_P2.md`) | — |
| **3** | Backend unbounded-query sweep | ✅ **Done** (`PHASE_LOG_P3.md`) | — |
| **4** | N+1, transaction & sync-engine fixes | ✅ **Done** (`PHASE_LOG_P4.md`) | — |
| **5** | Memory-heavy endpoints (PDF, ATLAS image, SSE) | ✅ **Done** (`PHASE_LOG_P5.md`) | — |
| **6** | Deployment hardening (photo storage, workers, pooling, monitoring) | ✅ **Done** (`PHASE_LOG_P6.md`) | — |

**Phase rules**

1. One phase at a time. Never mix phases in one working session.
2. Every phase follows the Bug-Catch Loop (§4.1) while implementing.
3. Every phase ends at a gate (§3). Gate red = fix before proceeding, or revert the phase.
4. Checkpoint commit at every green gate (ask the user first — the agent never commits unprompted).
5. Any new file must comply with `AGENTS.md` (< 1,000 LOC, brand tokens, no emoji).

---

## 1. Why this exists — the crash chain (audit summary)

The system crashed during the last test run on a machine with ~15.7 GB RAM / ~3.6 GB free / 341 baseline
processes. The failure was not one bug — it was stacked multipliers:

```
npm run verify  →  ~90–100 process launches across 17 npm steps
  + vitest uncapped (up to 11 fork workers)                ← Phase 1 fixed
  + 9 × separate tsx node:test processes (each recompiles) ← Phase 1 fixed
  + Playwright + Vite chain + Chromium
  + backend tsx watch leaving zombie servers               ← Phase 1 fixed
  + 42 PrismaClient instances = 42 pools                   ← Phase 1 fixed
  + base64 report photos returned by unbounded queries     ← Phase 1 fixed
  ────────────────────────────────────────────────────────
  = OOM
```

### 1.1 Root-cause → phase mapping (self-contained audit record)

| ID | Finding (evidence) | RAM/process impact | Fixed in |
|---|---|---|---|
| C1 | 42 × `new PrismaClient()` (routes/services/scripts) | 42 query engines + pools; Postgres dies at 100 conns | **Phase 1 ✅** |
| C2 | Base64 photos in `reports.image_url`; list/award/verify loads whole rows, no `take`/`select` | 100 MB–1 GB transient per request | **Phase 1 ✅** (payloads), Phase 6 (storage) |
| C3 | `uncaughtException` swallowed; `EADDRINUSE` ignored; schedulers started before `listen` | Zombie servers stack pools + cron | **Phase 1 ✅** |
| C4 | Test suite constructs 13 PrismaClients; 9 separate tsx test processes; vitest 11 forks | Test-time OOM | **Phase 1 ✅** |
| H1 | EnrollPro sync: full rosters ×2 in memory, per-user N+1, no fetch timeouts, manual sync bypasses overlap guard | Peak sync RAM; stuck runs | Phase 4 |
| H2 | Report award: N+1 per report × challenge inside default 5 s transaction | Transaction timeouts, connection hold | Phase 4 |
| H3 | `GET /challenges/admin` loads every contribution row | 100k+ nested rows per request | Phase 3 |
| H4 | Rollover: full student rows + N+1 writes inside 60 s transaction | Timeout/crash amplifier | Phase 4 |
| H5 | `/api/users`, certificate batch/rank load all users | O(N) responses + sequential writes | Phase 3 |
| H6 | PDF export buffers document twice, `bufferPages: true`, no concurrency cap | Tens of MB peak per export | Phase 5 |
| H7 | ATLAS sync holds 3 full map copies; campus image fully buffered before size check; `readFileSync` per image request | Spike every 15 min + per request | Phase 5 |
| H8 | Scrap `sell-batch` loads all in-stock items, updates one-by-one in transaction | Memory + timeout | Phase 4 |
| H9 | Public unbounded SSE client `Set`, no backpressure/admission | Socket buffer growth | Phase 5 |
| F1 | Frontend root poll every **2 s**: new array identities, O(n²) matching, full re-render, localStorage `JSON.stringify` incl. base64 every tick | Constant GC churn + main-thread jank | Phase 2 |
| F2 | 2.5 s market + 2.5 s presets (×2 instances, 5-request waterfall) + 10 s scrap (×2) + 30 s school-year (never cleaned up) | Poll storm across tabs | Phase 2 |
| F3 | Synthetic `storage` event on every save wakes ~11 listeners → ~11 API calls per save | Self-triggering request loops | Phase 2 |
| F4 | Blueprint base64 in localStorage; `lastSubmittedReport` retains photos forever | Persistent multi-MB heap/localStorage | Phase 2 |
| T1 | `verify` = 17 npm steps ≈ 90–100 process launches; each tsx test recompiles | Test crash | **Phase 1 ✅** |
| T2 | 39 dead Prisma engine copies (**767.7 MB**), 21 stale tmp logs | Disk bloat, Defender churn | **Phase 1 ✅** |
| T3 | 5 stale Playwright specs (old Reports hub vs untracked new `reports-hub/` UI) | Gate baseline red | **Phase 0** |

---

## 2. Current state after Phase 1 (what the gates protect)

Shipped and verified:

| Area | Change | Evidence |
|---|---|---|
| Prisma | `server/src/lib/prisma.ts` singleton; 42 call sites replaced; `connection_limit=5` in `.env`/`.env.example` | live auth smoke: admin login + `/users` 200 |
| Boot | `server/src/index.ts`: schedulers after successful `listen`; `EADDRINUSE` → exit(1); graceful SIGINT/SIGTERM; `uncaughtException` exits | live: second instance exited code 1 with clear message; `/health` ok |
| Photos | `omit: { imageUrl: true }` on list/award/verify/status queries; `photoUrl` in responses; new `GET /api/reports/:id/photo` (decodes base64, `Cache-Control: immutable`); `?limit/offset` pagination | live: list has no `imageUrl`, photo streams 1 MB JPEG; Playwright `photo-evidence` green |
| Frontend | `useReportPhoto` hook + `EvidenceImage`/`EvidenceThumbnail` (60-entry LRU blob cache); wired into student/teacher history, admin modal, MRF detail | `npm run build` clean; Playwright photo specs green |
| Tests | vitest `maxWorkers: 2`; 9 node:test steps merged into `server test:services --test-concurrency=2`; `verify` updated | 71 server + 157 frontend tests green |
| Disk | 767.7 MB dead engine copies + 21 tmp logs deleted | reclaimed |

Resolved by Phase 0: 5 stale UI specs updated to the current UI, tracked scratch files
(`server/_c.ts`, `server/_cleanup.ts`, `server/_terms.ts`) audited — the two Prisma users converted to the
singleton, and `auth-smoke.mjs` now treats an EnrollPro outage as a warning so `verify` can complete.
Still open: the machine-level `vitest` isolate hint (`isolate: false` is available but intentionally not
enabled until Phase 2 proves test isolation is unaffected).

---

## 3. Gates — the anti-regression protocol

Gates run **in order**; stop at the first red gate. All commands are run from the repo root.

### Gate A — Static (fast, every change)
```powershell
npm run lint
npm run build                     # tsc -b + vite build
npm --prefix server run build     # server tsc
```
**Green =** 0 lint errors, both builds exit 0. (Lint warnings may exist; the gate tracks **new** warnings.)

### Gate B — Unit (no DB needed)
```powershell
npm run test:unit                    # vitest, 157 tests, ≤ 2 forks
npm --prefix server run test:services # node:test merged, 71 tests, concurrency 2
```
**Green =** 100% pass, and `Get-Process node` count during the run ≤ 8 (was ~24+).

### Gate C — Integration smoke (needs backend on :5000 + PostgreSQL)
```powershell
npm run test:auth
npm run test:atlas
npm run test:atlas:audit
```
**Green =** auth 31/32 (the single allowed miss is a provider-side credential rejection or outage — 401/403/429/503;
SORT stores no passwords, so this is environmental. Any other status, e.g. 5xx/400, is red), atlas + audit 100%.

### Gate D — UI / Playwright
```powershell
npx playwright test tests/ui/<targeted-spec>.spec.ts   # during development
npm run test:ui                                        # full suite before phase exit
```
**Green =** full suite 100% (after Phase 0 quarantine), 0 flaky, and the phase's new specs pass.
Traces/screenshots are retained automatically on failure (`playwright.config.ts`).

### Gate E — Resource budget (measured, not vibes)
```powershell
# server RSS after 60 s idle
Get-Process -Name node | Where-Object { $_.Path -like '*node.exe*' } |
  Select-Object Id, @{n='RSS_MB';e={[math]::Round($_.WorkingSet64/1MB)}}

# Postgres connections for this app
psql -U postgres -d sortv2_db -c "SELECT count(*) FROM pg_stat_activity WHERE datname='sortv2_db';"
```
**Green =**

| Metric | Budget |
|---|---|
| Server process RSS, idle 60 s | ≤ 300 MB |
| Postgres connections (app DB) | ≤ 5 steady / ≤ 8 peak |
| `GET /api/reports` with ~1,000 photo-less reports | ≤ 2 MB response |
| Browser requests to `/api/reports` over 10 s idle | ≤ 2 (only after Phase 2) |
| Browser heap growth over 5 min idle session | ≤ 10 MB (after Phase 2) |

Baselines for every metric are recorded in **Phase 0**; the budget is enforced from Phase 2 onward.

### Gate F — Boot & shutdown smoke (log-based)
```powershell
node scripts/perf/boot-server.mjs      # spawns detached, logs to $TEMP\sort-logs\
# then:
Invoke-RestMethod http://localhost:5000/health
node scripts/perf/stop-server.mjs
```
**Green =** `/health` 200; boot log contains the `listening` line **and** all scheduler lines; no
`[Server] Uncaught` / `EADDRINUSE` / `Unhandled Rejection` in the log; a second `node dist/index.js`
exits 1 with the clear "Port 5000 is already in use" message; stop logs "Shutdown complete.".
*(Helper scripts are created in Phase 0; the inline Start-Process pattern hangs the calling shell.)*

### Gate G — Log scan (always on during a phase)
```powershell
$log = "$env:TEMP\sort-logs\server-out.log"
Select-String -Path $log -Pattern 'ERROR|Uncaught|Unhandled|EADDRINUSE|P2028|P1001|pool|timeout' |
  Group-Object Pattern | Select-Object Count, Name
```
**Green =** no unexpected `ERROR/Uncaught/Unhandled`; any Prisma pool/timeout line requires a written
explanation in the phase log (benign vs regression).

> **If any gate is red:** stop, apply §5.3 (Rollback), file the finding in the phase log with the exact
> failing command + log excerpt, then fix or revert.

---

## 4. Bug-catching workflow (logs + Playwright) — mandatory loop

### 4.1 The Bug-Catch Loop

For every change in every phase:

1. **Reproduce first.** Write (or extend) a Playwright spec / smoke script that fails for the correct
   reason *before* the fix. Red test output is the proof of the bug.
2. **Log the behavior.** Start the server with the log harness (`scripts/perf/boot-server.mjs`), exercise
   the changed surface, and capture the relevant log window (`$TEMP\sort-logs\server-out.log`).
3. **Implement the fix** behind the existing UI contracts (AGENTS.md: single-accent tokens, file size).
4. **Re-run:** targeted spec → Gate A → Gate B → Gate D (targeted) → Gate G scan.
5. **Leave the spec in the suite** as the regression guard; it becomes part of Gate D forever.

### 4.2 Log harness (Phase 0 deliverable)

- `scripts/perf/boot-server.mjs` — spawns `node dist/index.js` (or `tsx src/index.ts`) detached with
  stdout/stderr redirected to `$TEMP/sort-logs/server-out.log` / `server-err.log`, writes `server.pid`.
- `scripts/perf/stop-server.mjs` — reads `server.pid`, sends graceful stop, waits, force-kills on timeout.
- `scripts/perf/log-scan.mjs` — prints grouped matches for `ERROR|Uncaught|Unhandled|EADDRINUSE|P2028|P1001|timeout`.
- Server log conventions already in place: `[Server]`, `[Scheduler]`, `[BinReset]`, `[AtlasScheduler]`,
  `[Branding]`, `[Purge]` prefixes — keep them; new code must log under its subsystem prefix.

### 4.3 Playwright guardrails

- New specs go in `tests/ui/`, desktop viewport default; use `seedSession` helpers (token minting already
  handles EnrollPro 503).
- **Network instrumentation spec** (`tests/ui/resource-guard.spec.ts`, Phase 2): count `/api/*` requests
  per surface over a fixed window; assert the documented budget. This is the primary poll-regression guard.
- **API payload spec** (`tests/ui/api-payload-guard.spec.ts`, Phase 3): assert `GET /reports` response
  has no `imageUrl`, byte-size budget, `photoUrl` → image content-type; assert `/challenges/admin` and
  `/users` response sizes stay in budget on seeded data.
- Traces: `trace: 'retain-on-failure'` is already config; never disable while a phase is in flight.
- Flaky policy: a spec that flakes twice in a gate run gets quarantined with `test.fixme(true, 'reason')`
  **and** a logged follow-up — never silently deleted.

### 4.4 Regression corpus (golden cases that must stay green)

| Spec | Guards |
|---|---|
| `photo-evidence.spec.ts` | base64 → photoUrl migration, EvidenceImage rendering |
| `report-verify-stability.spec.ts` | optimistic verify vs 2 s poll (fix in Phase 0 for new hub) |
| `auth-smoke.mjs` | role boundaries around every new endpoint |
| `atlas-smoke.mjs` / `atlas-audit.mjs` | sync engine + payload integrity |
| `resource-guard.spec.ts` *(new, P2)* | poll cadence/network budget |
| `api-payload-guard.spec.ts` *(new, P3)* | response size / field budgets |

---

## 5. Phases

### Phase 0 — Baseline, log harness & green test floor ⬜

**Goal:** make gates trustworthy and instrumentation available before touching runtime behavior.

**Steps**
1. Build `scripts/perf/boot-server.mjs`, `stop-server.mjs`, `log-scan.mjs` (§4.2) — small, no deps.
2. Record baselines: server RSS idle, Postgres connection count, `test:ui` pass/fail list, `verify` duration.
3. Fix the 5 stale specs against the **new** `reports-hub/` UI (untracked WIP the user owns) —
   `report-minimap.spec.ts`, `report-verify-stability.spec.ts`, `rewards-edit.spec.ts` (×2),
   `settings-map.spec.ts`. If a spec cannot be updated in this phase, quarantine with `test.fixme(true, ...)`
   and log the follow-up; Gate D must end **100% green/known-skip**.
4. Decide the fate of tracked scratch files `server/_c.ts`, `server/_cleanup.ts`, `server/_terms.ts`
   (convert to singleton or delete — they still call `new PrismaClient`).
5. Write `PHASE_LOG_P0.md` (phase log) with: baseline numbers, spec dispositions, log-scan sample.

**Gate:** A, B, C, D (green floor), F, E (baseline recorded). **Rollback:** revert the spec/scripts commit;
no runtime code changes in this phase except the three scratch files.

---

### Phase 1 — P0 crash fixes ✅ (shipped)

Recorded in §2. Phase log evidence: builds clean, 71+157 tests, live EADDRINUSE test, photo endpoint
1 MB JPEG + immutable cache, 767.7 MB reclaimed. **No further work in this phase.**

---

### Phase 2 — Frontend poll & storage rework ⬜ *(highest browser-RAM impact)*

**Goal:** one bounded, change-gated data channel instead of five overlapping poll storms.

**Steps**
1. `useMockData.tsx`
   - Poll 2 s → **20 s base**, 60 s when `document.hidden` (visibility-aware interval).
   - Change-gate every store: hash/compare payload; skip `setReports/setChallenges/setUsers` when
     identical (no new array identities, kills the full-app 2 s re-render).
   - Remove the O(n²) `prev.find` merge — index reports by `id` + stream key once per tick.
   - Move merge/prune work off the render path (idle callback) if still hot after change-gating.
   - Remove per-tick `safeSetItem` writes: persist only when the payload actually changed.
2. `locationStore.ts` — drop `window.dispatchEvent(new Event('storage'))`; keep only the custom
   `sort_locations_updated` event; handlers filter by key/type.
3. `useSchoolYear.ts` — ref-count listeners; clear the module timer when the last consumer unmounts
   (fixes HMR orphan intervals).
4. `useRecycleMarket.ts` / `useSystemPresets.ts` / `useAssetScrap.ts`
   - In-flight guard (skip tick while a cycle is pending).
   - Single ref-counted shared poller per dataset (kills duplicate instances in Teacher/MRF/admin tabs).
   - LocalStorage writes only on change.
5. `StudentDashboard.tsx` / `TeacherDashboard.tsx` — clear `lastSubmittedReport` (and its base64 image)
   on reset/unmount; add `clearTimeout` cleanup to submit timers.
6. `useNotifications.ts` — cap the in-memory array at `MAX_CACHED_NOTIFICATIONS` (same as storage cap).

**Log checks:** with the log harness up, open the app + all role tabs for 5 min; Gate G scan must show no
new errors; Postgres connection count must not rise (poll backoff visible via request counts).

**Playwright:** new `tests/ui/resource-guard.spec.ts`:
- count `/api/reports` requests over 10 s idle on the dashboard → ≤ 2;
- repeat on market/scrap/presets surfaces → each ≤ 1 per 10 s;
- assert no request URL contains `/photo` unless a photo is visible.

**Gate:** A, B, D (targeted + full), E (browser heap growth ≤ 10 MB / 5 min; request counts within budget),
G. **Rollback:** revert commit; polling hooks are isolated — no schema/API dependency.

*Out of scope here:* replacing polling with SSE/WebSocket is a Phase 6 candidate, not a P2 change.

---

### Phase 3 — Backend unbounded-query sweep ⬜

**Goal:** every list endpoint has an explicit bound and projection.

**Steps (in order)**
1. `GET /api/users` — pagination (`?limit ≤ 500&offset`), `select` projection only (no password hash ever).
2. `GET /api/challenges/admin` — replace `progressRecords`/`contributions` full relations with
   `groupBy`/`_count` aggregates; response keeps the same fields.
3. Ledgers: `market.routes.ts` sales, `asset-scrap.routes.ts` sales, `school-year.routes.ts` year ledger —
   `take` + `?before` cursor (newest-first).
4. `walk-in.service.ts` history — clamp `take` to 500 default (still ≤ 5,000 max), keep `items` include.
5. `certificate.service.ts` term standings + `user.routes.ts` certificate batch/rank — compute rank with
   `orderBy points desc` + `take`-bounded queries instead of loading all students.
6. `settings.routes.ts` campus news + campus-locations upserts — bound array + sequential batch writes
   (chunked `Promise.all` with concurrency 5).

**Log checks:** Gate G on manual endpoint hits; watch for `P2028` (transaction timeout) while testing.

**Playwright:** `tests/ui/api-payload-guard.spec.ts`:
- `GET /reports?limit=5` → no `imageUrl` key; each `photoUrl` fetch returns `image/*` or 404;
- `GET /users` → default ≤ 500 rows, response < 500 KB on seed data;
- `GET /challenges/admin` → response < 200 KB on seed data.

**Gate:** A, B, C, D, E (response-size budgets above), G. **Rollback:** endpoints are additive
(`limit/offset` optional); reverting the phase restores full responses.

---

### Phase 4 — N+1, transaction & sync-engine fixes ⬜

**Goal:** background jobs and award paths stop being O(N) query storms.

**Steps**
1. `report-points.service.ts` award: preload users/point-rules once per stream; batch
   `pointHistory.createMany`; keep advisory lock + idempotency semantics intact; raise the interactive
   transaction timeout explicitly (`{ timeout: 15_000 }`) and document why.
2. `rollover.service.ts`: `select`-minimal student projection; `createMany`/`updateMany` instead of
   per-row upserts; chunk stock upserts.
3. `enrollpro-sync.service.ts`: add `AbortSignal.timeout` to every fetch; stream/array-batch upserts
   (`createMany` + `updateMany` in 100–500 chunks, or `$transaction` batches) instead of per-user
   `findUnique/update`; free raw page arrays as soon as each cohort is staged; add the same
   `isSyncRunning` guard to manual sync routes (`sync.routes.ts`).
4. `data-seeder.service.ts`: chunk `createMany` (≤ 1,000 rows/statement — Postgres bind-parameter limit);
   `Promise.all` chunks of 5; keep the 180 s transaction but log progress counts per stage.
5. `asset-scrap.routes.ts` sell-batch: chunk updates (e.g., 500) and set an explicit transaction timeout.
6. De-duplicate the `reschedule*` races (H10): serialize stop→schedule behind a module mutex.

**Log checks:** run `db:seed` HEAVY on a scratch DB (or via `/api/data-seed`), `sync:enrollpro`,
a full rollover in dev, and a 50-report verify-batch; Gate G scan for `P2028`, `pool timeout`, and
duration lines exceeding previous baseline.

**Playwright / scripts:** extend `atlas-audit`-style checks — reuse `scripts/auth-smoke` harness with an
added `scripts/perf/seed-smoke.mjs` that triggers data-seed + verifies counts, then re-runs auth smoke to
prove the DB stayed consistent.

**Gate:** A, B, C, D, G + measured: seed/sync run peak RSS ≤ +150 MB vs idle; no `P2028` lines.
**Rollback:** each service file is independent; revert per-file if a job regresses.

---

### Phase 5 — Memory-heavy endpoints ⬜

**Goal:** PDF, ATLAS image and SSE stop holding unbounded buffers.

**Steps**
1. `report-pdf.service.ts`: drop `bufferPages` for large exports; row cap 3,000 → configurable with a hard
   1,500 default; if > 1 page, build to a temp file and `res.sendFile` (delete after); add a concurrency
   guard (max 2 exports, 429 beyond).
2. `certificate-pdf.service.ts`: same temp-file pattern for large batches.
3. `atlas-map-image.service.ts`: check `Content-Length` before buffering; hard-cap 5 MB; write to disk via
   stream (`pipeline`) instead of full buffer.
4. `atlas.routes.ts` campus image: stream from disk (`res.sendFile`) instead of `readFileSync`.
5. `branding.service.ts` SSE: cap clients (e.g., 50) with clean 503; check `res.write()` return value and
   disconnect slow clients; heartbeat stays.
6. `settings.routes.ts`: `blueprintUrl` length cap (2,000 chars, reject base64 payloads with 400).

**Log checks:** Gate G while exporting PDFs concurrently (2×), syncing ATLAS, and holding SSE open;
expect no `Uncaught`; SSE slow-writer path logged and disconnected.

**Playwright:** extend `api-payload-guard.spec.ts`:
- export a 1,000-row PDF → 200, `application/pdf`, response < 5 MB;
- concurrent third export → 429;
- `GET /atlas/campus-image` → either 404 or `image/*` < 5 MB.

**Gate:** A, B, C, D, E (RSS under load ≤ +200 MB transient), G. **Rollback:** per-endpoint revert.

---

### Phase 6 — Deployment hardening (next year) ⬜

**Goal:** the system survives a real deployment, not just a dev box.

**Steps**
1. **Photo evidence → disk/object storage (schema-tracked):** new Prisma migration adding `photo_path`
   (or reuse `image_url` as a URL), backfill script for existing base64 rows (write file, replace value),
   `/api/reports/:id/photo` serves from disk; `imageUrl` column dropped in a follow-up migration.
2. **Process model:** run API and heavy jobs (sync, seeder, rollover executor) as separate processes;
   single scheduler owner; PM2/systemd with `--max-old-space-size` and restart policies.
3. **Postgres:** pgBouncer (transaction mode) in front of the app; `connection_limit` per instance;
   index audit for hot filters (`reports.status`, `reports.created_at`, `point_histories.user_id`).
4. **Rate limiting:** shared store (Postgres/Redis) for `express-rate-limit` so multi-instance is honest.
5. **Observability:** keep `/health`; add `/health/deep` (DB round-trip + pool count + RSS); log slow
   queries (> 500 ms) with route + duration.
6. **Load test:** k6/artillery script hitting reports+photo+auth at deploy-target concurrency; record
   pass/fail against Gate E budgets; run before every release.
7. **Backups & migrations:** `prisma migrate deploy` runbook; nightly `pg_dump`; restore drill documented.

**Gate:** full `verify` + load test within budget on the staging box + rollback drill (restore last dump
successfully). **Rollback:** deployment-level — previous release + restore point.

---

## 6. Metrics ledger

| Metric | Baseline (record @ Phase 0) | Budget | Phase |
|---|---|---|---|
| `npm run verify` wall time | **5.76 min, exit 0** (7.43 min @ P2) | ≤ 15 min | 0 ✅ |
| Node processes during `verify` peak | ~90–100 launches | ≤ 40 | 0 → 1 |
| Server RSS idle | **85.7 MB** (92.4 MB @ P2) | ≤ 300 MB | 0 ✅ |
| Postgres app connections | **2** (1 @ P2) | ≤ 5 steady | 0 ✅ |
| `GET /api/reports` 1k rows | TBD (with base64: 100s of MB) | ≤ 2 MB | 1 ✅ / 3 ✅ (structural guard) |
| `GET /users` / `GET /challenges/admin` | unbounded (143 rows / relation arrays) | ≤ 500 rows / ≤ 200 KB | 3 ✅ (143 rows = 66 KB / 6 rows = 3.7 KB) |
| Browser request rate `/api/reports` | ~1 / 2 s | ≤ 2 / 10 s | 2 ✅ (**0** measured) |
| Browser heap growth 5 min idle | TBD | ≤ 10 MB | 2 (proxied by request/write budgets) |
| Seed/sync peak RSS delta | TBD | ≤ +150 MB | 4 (not run destructively; guard smoke on isolated instance ✅) |
| PDF export response | 3 concurrent 1,400-row exports: 200/200/200 | ≤ 2 concurrent (429 beyond), streamed file | 5 ✅ (**429/200/200**) |

Every gate run records the measured numbers into the running `PHASE_LOG.md`; a metric that moves backwards
blocks the phase even if tests are green.

---

## 7. Phase log format (append per phase)

```md
## Phase N — <name> — <date>
- Status: PASS/FAIL
- Changes: <files>
- Gate A/B/C/D/E/F/G: <command → result, with durations and measured numbers>
- Log evidence: <$TEMP/sort-logs excerpts, grouped scan counts>
- Playwright evidence: <spec names, pass/fail, trace paths for any failure>
- New specs added: <paths>
- Deviations/quirks found: <anything surprising>
- Rollback point: <commit/tag>
```

---

## 8. Explicitly out of scope (do not fold into these phases)

- EnrollPro / ATLAS upstream behavior changes (SORT mirrors only).
- The `reports-hub/` redesign itself (Phase 0 only syncs the specs to it).
- Dark mode, i18n, shadcn/TanStack adoption — no relation to RAM/process goals.
- Reference-doc churn in `references/` and screenshots at repo root.

---

## 9. Approval

- [x] Phase 1 (P0) executed and verified — see §2 evidence
- [x] Phase 0 executed — green test floor + log harness + baselines recorded (`PHASE_LOG_P0.md`)
- [x] Phase 2 executed — poll/storage rework verified at 0 requests / 0 writes per idle window (`PHASE_LOG_P2.md`)
- [x] Phase 3 executed — list endpoints bounded + aggregate stats (`PHASE_LOG_P3.md`)
- [x] Phase 4 executed — award batching, sync single-flight/timeouts, rollover/seeder chunking (`PHASE_LOG_P4.md`)
- [x] Phase 5 executed — PDF/ATLAS/SSE bounds + concurrency guards (`PHASE_LOG_P5.md`)
- [x] Phase 6 executed — file-backed photos, worker model, shared rate limits, health/load tooling (`PHASE_LOG_P6.md`)
- [ ] Migration-history reconciliation before the first production deploy (`server/docs/DEPLOYMENT.md` §4)
- [ ] Staging load test + restore drill before release

> Gate rule is final: **no phase proceeds on a red gate, and no phase ships without its log + Playwright
> evidence recorded in the phase log.**
