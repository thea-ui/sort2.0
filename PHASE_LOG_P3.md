# Phase 3 Log — Backend Unbounded-Query Sweep

> Plan: `PERFORMANCE_OPTIMIZATION_PLAN.md` §5 (Phase 3)
> Date: 2026-10-19
> Status: **PASS** — all list endpoints bounded, aggregate stats in place, all gates green.

---

## 1. Changes delivered

| Endpoint / area | File | What changed |
|---|---|---|
| `GET /api/users` | `server/src/routes/user.routes.ts` | `?limit` (1–500, default 500) + `?offset`; projection unchanged (select-only, no password hash) |
| `GET /api/challenges/admin` | `server/src/routes/challenge.routes.ts` | Removed `progressRecords` + `contributions` relations; three `groupBy` aggregates replace them (`_count` per challenge). Response shape unchanged |
| `GET /api/market/sales` | `server/src/routes/market.routes.ts` | `?limit` (1–5000, default 1000) + `?before=ISO` cursor, newest-first |
| `GET /api/asset-scrap/sales` | `server/src/routes/asset-scrap.routes.ts` | Same limit + `?before` cursor |
| `GET /api/school-years/:id/ledger` | `server/src/routes/school-year.routes.ts` | Sales list bounded to 1000 newest; `revenuePhp`/`soldKg` now come from a `_sum` aggregate (archived-year totals stay exact beyond the display window) |
| `GET /api/walk-ins` | `server/src/services/walk-in.service.ts` | Default rows 100 → 500; hard cap stays 5000 (UI explicitly requests 5000) |
| Certificate rank | `server/src/routes/user.routes.ts` | Download/view rank now `count(points > user.points) + 1` instead of loading every student id and `findIndex` |
| Term standings | `server/src/services/certificate.service.ts` | Hydrates only the top 200 term-point candidates (issuance needs top 3, preview shows 10) instead of every student; zero-point students excluded (issuance already skipped them) |
| Campus news | `server/src/routes/settings.routes.ts` | `?limit` (1–200, default 100) |
| Campus locations | `server/src/routes/settings.routes.ts` | Max 200 per request; upserts chunked (10 at a time) instead of unbounded `Promise.all` fan-out |
| Payload guard (new) | `tests/ui/api-payload-guard.spec.ts` | Reproduced the unbounded behavior red, now green; prints payload telemetry on every run |

No schema or migration changes.

## 2. Bug-catch evidence (red → green)

- `api-payload-guard.spec.ts` was written first and failed on the exact bug:
  `GET /api/users?limit=10` returned **143 rows** (the limit was ignored).
- After the sweep: `?limit=10` returns ≤10, market sales `?limit=5` returns 5, and the payload telemetry is:
  `[api-payload-guard] users=143 (66226B), marketSales=5, reports=5, walkIns=5, challenges=6 (3657B)`.
- `GET /challenges/admin` no longer serializes relation arrays; the guard asserts `progressRecords`/`contributions` are absent and the three aggregate stats are numbers.
- Existing report/photo regression checks (no `imageUrl`, `photoUrl` present) remain green.

## 3. Environment inventory (measured before the sweep)

Seed tenant at verification time: **143 users, 1,795 reports, 1,639 point histories, 24 market sales, 263 walk-ins**. Caps are therefore non-truncating for current data, while protecting against tenant growth.

## 4. Gate results

| Gate | Command | Result |
|---|---|---|
| A — Static | `npm run lint`, `npm run build`, `npm --prefix server run build` | PASS (0 errors; 102 warnings) |
| B — Unit | `npm run test:unit`, `npm --prefix server run test:services` | PASS (157 + 71) |
| C — Integration | `npm run test:auth`, `test:atlas`, `test:atlas:audit` | PASS (31/31 + 2 warnings, 21/21, 31/31) |
| D — UI | `npm run test:ui` | PASS (56 passed, 1 skipped, 0 failed; 4.5 min) |
| E — Resource | Fresh dist instance, 30s settle | PASS: **RSS 84.3 MB**, total app sessions ≤ 2 |
| F — Boot | `boot-server.mjs` on :5099 (user's dev server untouched) | PASS: health 200, schedulers logged, clean stop |
| G — Log scan | `log-scan.mjs` | PASS: **0 matches** |
| Full chain | `npm run verify` | **PASS end-to-end (exit 0, 7.95 min)** |

## 5. Behavior notes / limits

- **`GET /users` default cap 500**: current tenant (143 users) is unaffected. Tenants beyond 500 users need UI-side pagination (the API already supports `limit`/`offset`) — tracked for the deployment/UI work (Phase 6).
- **Ledger defaults**: market/scrap sales default 1000 rows with a `?before` cursor for older pages. The Reports Hub ledger reads one school-year window; totals in the year ledger remain exact via aggregates.
- **Walk-ins**: the MRF UI explicitly requests `limit=5000`, so its view is unchanged; the hard cap remains 5000.
- **Term standings**: only students with positive term points are ranked (previously zero-point students were listed after everyone else; issuance already refused to award them).
- **Campus locations**: the client never sends more than a handful of stations; the new 200 cap is a safety bound.

## 6. Deferred

- Offset pagination in the admin Users UI (>500-user tenants).
- Keyset pagination for ledgers beyond 1000 rows in the hub (cursor is supported server-side; UI wiring can follow).
- Raw-SQL distinct-user counts were unnecessary: `@@unique([userId, challengeId])` makes the `groupBy` row count exact.

## 7. Rollback point

All changes are server-side query bounds and one test spec. Revert the checkpoint commit to restore unbounded responses; no schema/data changes are involved.
