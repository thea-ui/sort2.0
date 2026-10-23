# Phase 2 Log — Frontend Poll & Storage Rework

> Plan: `PERFORMANCE_OPTIMIZATION_PLAN.md` §5 (Phase 2)
> Date: 2026-10-19
> Status: **PASS** — all gates green, polling budgets verified at 0 requests / 0 writes per idle window.

---

## 1. Changes delivered

| Area | File(s) | What changed |
|---|---|---|
| Poll scheduler (new) | `src/utils/pollScheduler.ts` | Ref-counted, visibility-aware scheduler: one timer per dataset across all hook instances, no overlapping cycles (in-flight skip), hidden back-off, 250ms refresh on tab re-focus |
| Root provider | `src/hooks/useMockData.tsx` | 2s `setInterval` → scheduler (20s base / 60s hidden); change-gated `setReports`/`setChallenges`/`setUsers` via serialized refs (no new identities on unchanged polls); O(n²) merge → O(n) Map/Set indexing; removed per-tick `safeSetItem` writes; bins effect indexes active reports by stream once |
| Location store | `src/services/locationStore.ts` | Removed all 3 synthetic `new Event('storage')` dispatches (custom events + BroadcastChannel remain) — kills the ~11-listener same-tab reload storm |
| School years | `src/hooks/useSchoolYear.ts` | Module-level interval (never cleaned) → ref-counted scheduler (30s / 90s hidden); `notify()` only when the payload changed |
| Recycle market | `src/hooks/useRecycleMarket.ts` | Per-instance 2.5s pollers + request waterfall → shared cache + one ref-counted poller (15s / 60s); 3 endpoints fetched in parallel; localStorage written only on change |
| System presets | `src/hooks/useSystemPresets.ts` | Per-instance 2.5s pollers with 5-request waterfall (2 instances on the teacher dashboard) → shared cache + one poller (60s / 180s); parallel fetch; per-key storage listener instead of reload-on-anything |
| Asset scrap | `src/hooks/useAssetScrap.ts` | Duplicate 10s pollers (MRF dashboard + stock tab) → shared cache + one poller (30s / 90s); parallel fetch; change-gated state |
| Admin settings | `AdminItemPresetsTab.tsx`, `AdminAssetCategoriesTab.tsx` | Dropped synthetic storage dispatches; custom events + `broadcastPresetChange()` remain |
| Dashboards | `StudentDashboard.tsx`, `TeacherDashboard.tsx` | Submit/capture/GPS timers tracked in refs and cleared on unmount; dismissing the success view now clears `lastSubmittedReport` (drops the retained base64 photo) |
| Notifications | `src/hooks/useNotifications.ts` | In-memory feed capped at `MAX_CACHED_NOTIFICATIONS` (storage cap alone let long sessions grow unbounded) |
| Regression guard (new) | `tests/ui/resource-guard.spec.ts` | Reproduced the old behavior red, now green: idle + hidden request budgets and localStorage-write budget with telemetry output |

No backend changes in this phase.

## 2. Measured results (10s sampling windows, admin overview)

| Metric | Before (red run) | After (green run) | Budget |
|---|---|---|---|
| `/api/reports` polls while idle | **5** | **0** | ≤ 2 |
| All `/api/*` GETs while idle | > 10 (report + users + market storm) | **0** | ≤ 10 |
| localStorage writes while idle | > 5 (reports/users/challenges/market per tick) | **0** | ≤ 5 |
| `/api/reports` polls while hidden | **5** | **0** | ≤ 1 |

Server-side resources (fresh restart, 60s idle): **RSS 92.4 MB** (budget ≤ 300; Phase 0 baseline 85.7), **app DB connections: 1** (budget ≤ 5; Phase 0 baseline 2 measured including the psql session).

## 3. Gate results

| Gate | Command | Result |
|---|---|---|
| A — Static | `npm run lint`, `npm run build`, `npm --prefix server run build` | PASS (0 errors; warnings 110 → 102) |
| B — Unit | `npm run test:unit`, `npm --prefix server run test:services` | PASS (157 + 71) |
| C — Integration | `npm run test:auth`, `test:atlas`, `test:atlas:audit` | PASS (31/31 + 2 warnings, 21/21, 31/31) |
| D — UI | `npm run test:ui` | PASS (55 passed, 1 skipped, 0 failed; 3.9 min) |
| E — Resource | Telemetry spec + fresh-restart RSS/connections | PASS (see §2) |
| F — Boot | `boot-server.mjs` / `stop-server.mjs` | PASS (restart used for E; clean stop, ports freed) |
| G — Log scan | `log-scan.mjs` | PASS: 0 matches |
| Full chain | `npm run verify` | **PASS end-to-end (exit 0, 7.43 min)** |

## 4. Bug-catch evidence (red → green loop)

- `resource-guard.spec.ts` was written first and failed on the exact observed behavior: 5 report polls per 10s idle and 5 while hidden — proof the fix targets the real bug.
- New telemetry line in the spec prints budgets on every run: `[resource-guard] idle 10000ms → report polls: 0, total GETs: 0, localStorage writes: 0`.
- `report-verify-stability` (optimistic verify vs. stale poll) stays green; the change-gated merge preserves the optimistic-patch semantics when a poll does land.
- No console errors, Prisma pool warnings, or 5xx appear in the server logs during the whole phase (Gate G).

## 5. Behavior trade-offs (intentional)

- **Cross-device sync latency**: reports 2s → 20s, market 2.5s → 15s, scrap 10s → 30s, presets 2.5s → 60s, school years 30s → 30s (now ref-counted). Same-tab actions stay instant (optimistic updates + immediate reload after mutations), and a tab becoming visible refreshes within ~250ms.
- **Hidden tabs** back off to 60–180s, so background tabs stop competing for the API and browser memory.
- The old synthetic storage events were a same-tab broadcast hack; same-tab consumers now rely on the custom events they already had, and cross-tab consumers on real storage events / BroadcastChannel / the poller.

## 6. Deferred / noted

- Browser heap-growth budget (≤ 10 MB / 5 min) is proxied by the deterministic request/write budgets; direct heap sampling needs CDP `HeapProfiler` and is deferred to Phase 6 monitoring work.
- `vitest isolate: false` still deferred (not needed for the budgets; avoids cross-test module-state risk).
- Phase 3 will add `api-payload-guard.spec.ts` for response-size budgets.

## 7. Rollback point

Phase 2 touches only `src/**` hooks/services and one new spec + one new util. Revert the checkpoint commit to restore the previous polling model; no schema, API, or data changes are involved.
