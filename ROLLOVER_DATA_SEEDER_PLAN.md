# Rollover Data Seeder Plan — Real-Data Generator for Demos & 4× Rollover Testing

> **Status:** Implemented (v1) on 2026-09-29. Service, admin routes, Data Seeder settings tab,
> planner unit tests and `test:data-seed` are in place. Not yet exercised against the live database.
> **Working name:** "Data Seeder" (the data produced is **real**, not demo-tagged — see §2).
> **Placement:** Admin → Settings → School & Sync → new **Data Seeder** section.

---

## 1. Goal

One admin button that generates a full, realistic school-year activity dataset using the
**actual EnrollPro-synced accounts** already in SORT. Purpose:

1. **Demo** — every dashboard (Overview, Reports, Collections, Leaderboard, Market, Walk-in,
   Certificates, Ledger, Impact) shows believable, populated data.
2. **Rollover testing** — let the team run **4 consecutive school-year rollovers** without
   weeks of manual data entry. Each seeded year becomes real history that exercises
   snapshots, points reset, market closing balances, archiving, and the School Year Ledger.

Rows produced by the seeder must be **indistinguishable from organic activity** — no
`[DEMO]` markers, no demo flag, no fake account names. The only trace is a truthful
`AuditLog` entry recording that a bulk data-generation action was run (§5.6).

## 2. Non-goals

- **Not** a demo-only dataset. Do not tag, prefix, or segregate seeded rows.
- **Not** account seeding. Accounts remain strictly EnrollPro-sourced
  (`enrollpro-sync.service.ts:482`).
- **Not** an auto-rollover trigger. Rollover stays EnrollPro-sync driven
  (`SCHOOLYEAR-MANAGEMENT-PLAN.md` §"Locked decisions").
- **Not** a replacement for `db:seed` (catalog seeding) or `db:reset-tenant`.

## 3. Verified current state (evidence)

| Area | Finding | Reference |
| --- | --- | --- |
| Accounts | Only EnrollPro sync creates users; keyed by `enrollproId`; roster absence archives, never deletes | `server/src/services/enrollpro-sync.service.ts:482`, `:775` |
| Catalog seed | Seeds settings, bins, categories, locations, waste types, urgency, point rules, market stocks, challenges, rewards. **Wipes all reports/points/offenses on every run.** | `server/prisma/seed.ts:87-90` |
| Report lifecycle | Verify = approval only. Points/ranks awarded when the MRF collects (`COLLECTED`/`RESOLVED`), stream-wide | `server/src/services/report-points.service.ts:41`, `:100` |
| Rank rules | Ranks restart at each daily reset boundary (`binResetTime`, Asia/Manila) | `report-points.service.ts:118-124`, `reset-cycle.service.ts:59` |
| Rank points | `PointRule` = 15/10/5/0 (1st/2nd/3rd/4th+) | `server/prisma/seed.ts:451-460` |
| Dismiss penalty | `dismissPointPenalty` / `falseReportPointPenalty` settings | `settings.routes.ts:157-160`, `report.routes.ts:218` |
| Walk-ins | `recordWalkIn()` creates turnover + items + points + milestone claims + audit in one transaction | `server/src/services/walk-in.service.ts:290` |
| Bottle math | `gramsForBottle()`, `computeWalkInPoints()` (1 pt per full 500 ml, min 1) | `walk-in.service.ts:45`, `:61` |
| Challenges | Contributions/progress fire on award; term-scoped visibility (`canAccrue`, visible quarter codes) | `challenge-progress.service.ts:101`, `challenge-term.service.ts` |
| Market | Stock accumulation is manual (`PATCH addKg`); sales cap at `thresholdLimitKg`; revenue = kg × price | `market.routes.ts:38`, `:101` |
| Daily bin reset | Clears bins, **expires stale PENDING waste reports**, never touches asset/dispatched reports | `bin-reset.service.ts:38-64` |
| Rollover | Single transaction: snapshots market/scrap/points, tags null-SY rows, archives year, resets points/stock/challenges, archives all students, revokes sessions | `rollover.service.ts:40` |
| Manual activate gap | `POST /school-years/:id/activate` only snapshots market stock + flips `isActive`; **no point snapshots, no resets, no archiving** | `school-year.routes.ts:293-357` |
| Last rollover state (doc) | 69 active + 25 archived students; points/leaderboard inconsistencies documented | `ROLLOVER_REMEDIATION_PLAN.md` |
| Settings UI | Section-tab pattern; Sync tab exists; Danger Zone has full purge | `SchoolSettingsPage.tsx`, `SettingsSectionTabs.tsx`, `AdminDangerZoneTab.tsx` |
| Purge | `DELETE /api/reports/purge` clears activity only (keeps accounts) | `report.routes.ts:17` |
| Test tooling | `node --import tsx --test src/services/__tests__/*.test.ts`; root `npm run verify` | `server/package.json`, `package.json` |
| File-size cap | `settings.routes.ts` is 819 lines; AGENTS.md caps files at 1,000 | AGENTS.md §1 |

## 4. Data generated (full showcase)

All rows are tagged to the **currently active school year** (`schoolYearId`) and dated inside
`[SY.startDate, min(SY.endDate, now)]`, weighted toward the term windows from
`AcademicQuarter` when available.

### 4.1 Report pools

| Pool | Share | Reporters | Notes |
| --- | --- | --- | --- |
| Waste | ~75% | Active ENROLLPRO students | Bin-sourced locations |
| Asset | ~25% | Active ENROLLPRO faculty/admin/MRF (students are blocked from asset reports — `report.routes.ts:134`) | Description carries real `[PILLAR: X]` markers (`bin-reset.service.ts:11-17`) |

Status distribution (waste; asset never EXPIRED), each respecting lifecycle rules:

- `COLLECTED`/`RESOLVED` — ~50%, `isVerified`, `weightCollected`, `completedAt`, rank + points.
- `DISPATCHED` — ~10%, recent only, `assignedMrfId` = real MRF/admin user.
- Verified but not dispatched — ~10%, recent only.
- `PENDING` — ~5%, **only inside the current daily reset cycle** (anything older would really
  have been expired; `bin-reset.service.ts:53`).
- `EXPIRED` — ~10% (waste only), `completedAt` = a reset boundary.
- `DISMISSED` — ~10%, dismiss penalty + negative `PointHistory` per settings.

Realistic titles/descriptions (e.g. "Overflowing PET bottles at Main Library Recyclables"),
locations from `WasteBin`/`CampusLocation`/`RoomLocation`, coordinates from the bin row,
`imageUrl: null` (photos cannot be fabricated).

### 4.2 Points & ranks (must match live math exactly)

- Group by stream `(locationKey, category, schoolYearId)` and by daily reset boundary
  (`computeResetCycleStart` + `BIN_RESET_TZ`).
- Assign ranks in `createdAt` order with `buildStreamAwardPlan()`
  (`report-award-plan.ts:19`) using the DB `PointRule` values; ranks restart each boundary.
- Set `reporterRank`, `pointsAwarded`, `pointsAwardedAt`; faculty rank = null, 0 points
  (same as live).
- `PointHistory` reason string replicated verbatim:
  `Collected Report: 1st Reporter Bonus (+15 pts) for <locationName>`.
- Increment each student's `points` by exactly the sum of their seeded positive histories
  (`increment` semantics; never overwrite pre-existing balances).

### 4.3 Challenges

- Mirror `recordReportContribution()`: `ChallengeContribution` rows + `UserChallengeProgress`
  counts (grams = kg × 1000 for `WEIGHT_COLLECTED`), completion exactly once with
  `Challenge Completed: <title> (+N pts)` history and `rewardedAt`.
- Only contributions inside the challenge's visible term window accrue — historical reports
  outside the term must not count (same as live).

### 4.4 Walk-ins (MRF station)

- 1–4 turnovers for a share of students; bottle sizes from the real presets; totals via
  `gramsForBottle` / `computeWalkInPoints`; reason string verbatim from
  `walk-in.service.ts:372`.
- Rows written directly (to allow backdating) but with identical invariants; milestone claims
  derived from the `Reward` catalog thresholds, with a realistic mix of
  `UNLOCKED`/`REQUESTED`/`RELEASED` states to populate the claims queue.

### 4.5 Market & sales

- `RecycleMarketStock` ending `accumulatedKg` per category (plausible values, one category
  above threshold with `isApprovedForSale=true`).
- 3–6 `RecycleSaleTransaction` rows spread through the year; per-sale `weightKg` ≤
  `thresholdLimitKg` (live cap, `market.routes.ts:122`), revenue = kg × `marketPricePerKg`,
  buyer = `defaultVendorName`.
- ⚠ Report `weightCollected` does **not** auto-feed market stock in live SORT (MRF adds it
  manually); the seeder should keep totals plausible but is not bound to strict conservation.

### 4.6 Asset scrap (optional include, default on)

- A few `AssetScrapItem` rows from disposed asset reports, scrap stock accumulation, one sale.
  Rollover's scrap carry-forward then has something real to carry.

### 4.7 Bins, offenses, certificates

- **Bins** — partial fill levels representing a day since the last reset; `lastEmptied` = last
  reset boundary; 1–2 `activeDispatch=true` consistent with DISPATCHED reports.
- **Offenses** (light, default on) — handful of `WARNING` offenses with `expiresAt`,
  matching `warningsCount`, and auto-deduct history if configured.
- **Certificates** (optional, recommend deferring) — either call `issueTermCertificates` for
  completed terms or write rows directly with correct tier/points/serial.

### 4.8 Audit trail

- One `AuditLog` row: `actionType: 'DATA_SEED'`, actor = requesting admin, details =
  mode/volume/year/counts. This is the only marker, and it is truthful system history.

## 5. Architecture

### 5.1 `server/src/services/data-seeder.service.ts` (target < 700 lines)

- `planDataSeed(input): SeedPlan` — **pure planner**, deterministic seeded PRNG (derived from
  SY id unless overridden). Produces all drafts with pre-generated UUIDs so writes can use
  `createMany` (Prisma `createMany` supports explicit ids) and stay fast.
- `runDataSeed(options): Promise<DataSeedResult>` — loads reference data (active SY, term
  windows, point rules, settings, bins/locations, reward catalog, account pools), plans, then
  writes inside one `prisma.$transaction({ timeout: 120_000 })` in FK-safe order.
- `getDataSeedStatus()` / `getYearActivityCounts()` — for the UI card.
- `clearActiveYearActivity()` — ordered deletes of only the active year's activity (used by
  `RESEED_YEAR` and by the UI's "Clear This Year's Activity").
- Concurrency guard (`dataSeedInProgress`) and refusal while `isRolloverInProgress()`.

### 5.2 `server/src/routes/data-seed.routes.ts` (new module; keeps settings.routes.ts under cap)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/data-seed/status` | admin | Active SY, eligible students/staff, current-year counts, last seed audit |
| `POST` | `/api/data-seed` | admin | Run the seeder (body below) |
| `POST` | `/api/data-seed/clear-year` | admin | Delete the active year's activity only (typed confirmation) |

Request body:

```jsonc
{
  "mode": "SEED_EMPTY",            // or "RESEED_YEAR"
  "volume": "NORMAL",              // LIGHT ~120 reports | NORMAL ~350 | HEAVY ~700
  "include": { "walkIns": true, "marketSales": true, "offenses": true, "assetScrap": true, "certificates": false },
  "seed": 12345                    // optional deterministic RNG seed
}
```

- `SEED_EMPTY` refuses with `409 YEAR_NOT_EMPTY` (+counts) if the active year already has
  reports/walk-ins/histories/offenses/sales. Prevents accidental duplication.
- `RESEED_YEAR` runs `clearActiveYearActivity()` first, then seeds. UI gates it behind a typed
  confirmation.
- Mount in `server/src/index.ts` (`app.use('/api/data-seed', dataSeedRoutes)`).

### 5.3 Frontend

- `src/services/api.ts`: `getDataSeedStatus()`, `runDataSeed(options)`,
  `clearActiveYearData()` — use the existing `fetchAPI` (do **not** copy the hardcoded
  `http://localhost:5000` pattern in `AdminSyncSettingsTab.tsx:122`).
- New `src/pages/admin/components/settings/AdminDataSeederTab.tsx` (~300 lines):
  - Status card: active SY, eligible students, current activity counts, last DATA_SEED run.
  - Volume radio (Light/Normal/Heavy), include toggles.
  - Primary **"Generate Year Data"** button → confirmation modal (`ConfirmDialog`/`AppModal`
    patterns) with a typed confirm for `RESEED_YEAR`.
  - "Clear This Year's Activity" danger action.
  - Result panel with generated counts + toast.
- `SchoolSettingsPage.tsx`: add section `{ id: 'data-seeder', label: 'Data Seeder', icon: DatabaseZap }`.
- Optional legacy alias: `demo-seed` → `data-seeder` in `AdminSettingsTab.tsx`.

### 5.4 Account sourcing

1. **Students:** `role=STUDENT`, `syncSource=ENROLLPRO`, `archivedAt=null`
   (prefer `enrollmentStatus='ENROLLED'`, `portalAccountActive=true`).
2. **Asset reporters / collectors:** active TEACHER/ADMIN/MRF accounts.
3. **Zero active students:** return `409 NO_ACTIVE_STUDENTS` with a clear action message
   ("Sync EnrollPro after enrolling learners, then retry"). No fake accounts, no silent
   fallback to archived students (see Open Decision 1).

## 6. Supported 4× rollover workflow

1. Ensure EnrollPro has the active SY with enrolled learners; run **Run Bulk Sync**.
2. **Settings → School & Sync → Data Seeder → Generate Year Data** (Normal/Heavy).
3. Demo/validate every dashboard + the School Year Ledger for the active year.
4. Roll EnrollPro forward to the next school year (authoritative path), then **Run Bulk Sync**
   → `ensureSchoolYear()` → `executeRollover()` snapshots closing balances, resets
   points/stock/challenges, archives students, opens the new year.
5. Enroll learners in EnrollPro for the new SY (or the test plan's enrollment step), sync.
6. Repeat steps 2–5 four times → four years of real history in **School Years / Ledger**.
7. If a year's test must be redone: `RESEED_YEAR` (or Clear + Generate).

> ⚠ **Known gap:** Admin → School Years **"Activate" is not a full rollover**
> (`school-year.routes.ts:293-357`). If the 4 rollovers are meant to be triggered manually from
> the UI, wiring that action through `executeRollover()` is a **separate required task**.
> See Open Decision 2.

## 7. Safety rules

- Admin-only (`authenticate` + `requireAdmin` as in `settings.routes.ts`).
- Refuse when: no active SY, zero eligible students, seeding already running, or a rollover is
  in progress.
- Never touches: user accounts/credentials, school years, `AuditLog` history, snapshots.
- `RESEED_YEAR` touches only the active year's activity rows, in FK-safe order
  (challenges → points → claims → walk-in items/turnovers → reports → offenses → year sales),
  mirroring `reset-tenant`'s ordering (`wipe-tenant-data.ts:116-160`).
- All-or-nothing transaction; on failure nothing is written.

## 8. Files to create / modify

| File | Change |
| --- | --- |
| `server/src/services/data-seeder.service.ts` | **New** planner + writer + status + clear |
| `server/src/routes/data-seed.routes.ts` | **New** admin routes |
| `server/src/index.ts` | Mount `/api/data-seed` |
| `src/services/api.ts` | Client methods |
| `src/pages/admin/components/settings/AdminDataSeederTab.tsx` | **New** UI card |
| `src/pages/admin/components/settings/SchoolSettingsPage.tsx` | Add section tab |
| `src/pages/admin/components/AdminSettingsTab.tsx` | Optional legacy alias |
| `server/src/services/__tests__/data-seeder.test.ts` | **New** planner unit tests |
| `server/package.json` + root `package.json` | `test:data-seed` script; wire into `verify` |

## 9. Test plan

Pure planner unit tests (`node --import tsx --test`):

1. Deterministic output for a fixed seed.
2. Rank assignment restarts at each reset boundary; `PointRule` points applied; faculty skipped.
3. Sum of each student's seeded `PointHistory` equals the points delta applied to the user.
4. Lifecycle invariants: no stale PENDING, EXPIRED = waste only, DISMISSED has a penalty,
   COLLECTED implies `isVerified` + rank + `completedAt`.
5. All dates inside `[SY.start, min(SY.end, now)]`.
6. Walk-in totals and points match `gramsForBottle`/`computeWalkInPoints`.
7. Idempotency: `SEED_EMPTY` refuses a non-empty year; `RESEED_YEAR` yields identical counts.

Then: `npm --prefix server run build`, `npm run lint`, `npm run verify`, plus a Playwright
smoke (seed Light → dashboards populated → clear-year → empty).

## 10. Open decisions

1. **Post-rollover, zero active learners:** recommended = fail with a clear message. Optional
   later: temporary cohort using the currently-unused `User.isTemporarilyEnrolled` field
   (`schema.prisma:155`), clearly audited and re-archived by the next sync.
2. **Rollover trigger for the 4 cycles:** EnrollPro sync (works today) vs. wiring manual
   "Activate" through `executeRollover` (separate task). Needs a decision before testing.
3. **Default volume:** recommend `NORMAL`; expose `HEAVY` for defense/demo.
4. **Certificates in v1:** recommend deferring to a later phase.
5. **Section label:** "Data Seeder" (data is real). Confirm or keep "Demo Data".

## 11. Risks

- Bin reset will expire any seeded PENDING waste report the next evening — by design; the
  planner only creates recent PENDING rows.
- If EnrollPro's roster changes mid-year, the next sync may archive seeded reporters; that is
  correct mirror behavior (`enrollpro-sync.service.ts:775`).
- Seeding into a year that already has partial real data: `SEED_EMPTY` blocks; `RESEED_YEAR`
  is destructive for that year — UI must make this unmistakable.
- Heavy volume in one transaction: use `createMany` + explicit UUIDs; keep the 120s timeout.
