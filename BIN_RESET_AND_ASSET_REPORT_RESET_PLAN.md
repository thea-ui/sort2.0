# Daily Bin Reset & Report-Expiry Hardening Plan

> **Status:** Implemented (2026-09-11). See §10 Implementation Status.
> **Scope:** The 6:00 PM daily bin reset (`bin-reset.service.ts`), report-type classification, and the report status lifecycle around `EXPIRED`.
> **Related docs:** `ROLLOVER-READINESS-PLAN.md`, `AGENTS.md` (report/status lifecycle).

---

## 0. TL;DR (answers)

**What is implemented today:** At the configured time (default 18:00 Asia/Manila), `executeDailyBinReset()`:

1. Sets **every** `waste_bins` row to `fillLevel = 0`, `activeDispatch = false`, `lastEmptied = now`.
2. Sets **every** report with `status IN (PENDING, DISPATCHED)` **and** `reportType = WASTE` to `status = EXPIRED`, `completedAt = now`.
3. Writes a `DAILY_BIN_RESET` audit log.

**Two real defects:**

| # | Defect | Impact |
| --- | --- | --- |
| **D1** | Client report creation never sends `reportType`; it silently defaults to `WASTE`. | **Teacher asset reports are stored as `WASTE`**, so the 6 PM reset expires them. This is exactly the "reset is not applicable for asset reports, only waste" issue. |
| **D2** | The reset expires **`DISPATCHED`** reports and **verified** reports (`isVerified = true`) still in `PENDING`. | A verified report that MRF has not yet dispatched/collected is invalidated overnight. Live DB right now: **5/5 active reports are verified-but-not-dispatched and would be expired.** |

Also flagged: the reset clears `activeDispatch` on *all* bins even when an active `DISPATCHED` report still exists (state desync), and there is no manual trigger/dry-run for testing.

---

## 1. Current Implementation

### 1.1 Backend

| Concern | Location |
| --- | --- |
| Reset execution | `server/src/services/bin-reset.service.ts:29-73` |
| Expiry filter | `bin-reset.service.ts:44-50` |
| Scheduler / cron | `bin-reset.service.ts:93-122`; boot hook `server/src/index.ts:69` |
| Settings persistence | `server/src/routes/settings.routes.ts:44-115` (`binResetEnabled`, `binResetTime`) |
| Status lifecycle | `server/src/routes/report.routes.ts:151-219` (PATCH status), `:222+` (verify) |
| Verification / points | `server/src/services/report-points.service.ts:30-222` (`isVerified`, `pointsAwardedAt` set at verify) |
| Response mapping | `report-points.service.ts:224-247` (`reportType` returned) |

Current expiry predicate:

```ts
where: {
  status: { in: [PENDING, DISPATCHED] },
  reportType: 'WASTE',
}
data: { status: EXPIRED, completedAt: now }
```

### 1.2 Frontend

| Concern | Location |
| --- | --- |
| Teacher submit (pillars) | `src/pages/teacher/TeacherDashboard.tsx:185-219` — computes `isWaste` but **never passes `reportType`** |
| Student submit | `src/pages/student/StudentDashboard.tsx:133-142` — no `reportType` (students are always waste) |
| Client persistence + default | `src/hooks/useMockData.tsx:483-491` → `reportType: reportData.reportType || 'WASTE'` |
| Admin reset copy | `src/pages/admin/components/settings/AdminSyncSettingsTab.tsx:264-307` |
| Expired UI labels | `AdminCollectionsTab.tsx:237` ("Expired (6 PM Reset)"), `AdminReportsTab.tsx:657-659,967-969`, `ReportHistoryTab.tsx:38` |

Asset reports are only *heuristically* detected on the client via description markers:
`[PILLAR: FURNITURE] | [PILLAR: ELECTRONICS] | [PILLAR: FIXTURES] | [PILLAR: EQUIPMENT] | [PILLAR: OTHER]` (from `TeacherDashboard.tsx:147-159`).

### 1.3 Schema

`server/prisma/schema.prisma`:
- `enum ReportType { WASTE, ASSET }` (line 44)
- `enum ReportStatus { PENDING, DISPATCHED, COLLECTED, RESOLVED, DISMISSED, EXPIRED }` (line 22)
- `Report.isVerified Boolean @default(false)` (line 161)
- `Report.reportType ReportType @default(WASTE)` (line 162)
- `Report.completedAt DateTime?` (line 165)

### 1.4 Live data snapshot (read-only)

| Metric | Value |
| --- | --- |
| Total reports | 5 |
| By `reportType` | `{ WASTE: 5 }` |
| Asset-by-marker stored as `WASTE` | 0 (latent bug; would trigger once a teacher files an asset report) |
| Active `PENDING`/`DISPATCHED` waste reports | 5 |
| — verified (`isVerified = true`) | **5** |
| — unverified | 0 |
| — `DISPATCHED` | 0 |

**Interpretation:** every currently-active report is verified-but-not-dispatched — i.e., precisely the cohort the reset would wrongly expire tonight.

---

## 2. Defect & Risk Register

| ID | Severity | Defect / risk | Evidence | Fix direction |
| --- | --- | --- | --- | --- |
| **D1** | High | `reportType` never sent; defaults to `WASTE` | `TeacherDashboard.tsx:211-219`, `useMockData.tsx:491`, `report.routes.ts:134` | Send explicit type; server derive + validate |
| **D2** | High | Reset expires `DISPATCHED` and verified-PENDING reports | `bin-reset.service.ts:44-50` | Narrow predicate (see §3) |
| **D3** | High | Asset reports expired by reset because typed `WASTE` | follows D1/D2 | Backfill + defensive exclusion |
| **D4** | Medium | `activeDispatch` cleared for bins that still have a `DISPATCHED` report | `bin-reset.service.ts:40-42` | Recompute per-bin or skip dispatched bins |
| **D5** | Medium | Duplicate guard blocks re-reporting while any `PENDING`/`DISPATCHED` exists; reset is the only unblock | `report.routes.ts:106-117` | Align with new expiry policy |
| **D6** | Low | No manual trigger / dry-run; hard to verify behavior | no route calls `executeDailyBinReset` | Admin "Run reset now" + preview |
| **D7** | Low | Reset audit log stores `schoolYearId: null` | `bin-reset.service.ts:52-60` | Tag active school year |
| **D8** | Low | `AdminSyncSettingsTab` sends `syncMode`/`syncIntervalMinutes`, but `PATCH /settings` ignores them | `AdminSyncSettingsTab.tsx:98`, `settings.routes.ts:46-84` | Out of scope; note separately |
| **D9** | Low | Reset is all-or-nothing; a bin reported at 5:59 PM is emptied at 6:00 PM | design | Document/accept or add buffer |

---

## 3. Desired Behavior (policy)

### 3.1 Report type — must be explicit

- Teacher **asset** pillars (`furniture`, `electronics`, `fixtures`, `equipment`, `other`) → `reportType = ASSET`.
- Teacher/student **waste** pillar → `reportType = WASTE`.
- Server derives `ASSET` from asset description markers when the client omits the field (defense-in-depth), and never downgrades an explicit `ASSET` to `WASTE`.

### 3.2 Reset scope — waste only, never assets

The reset must only ever consider `reportType = WASTE`, **and** defensively exclude any report whose description contains an asset pillar marker (covers legacy mis-typed rows).

### 3.3 Reset expiry criteria — final policy

> **Amended 2026-10-05:** dispatched WASTE reports that MRF has not completed by the reset now expire too — see §11. Asset dispatches still never expire.

**Expire all PENDING waste reports (verified or not); never assets; never dispatched:**

```
reportType = WASTE
AND status = PENDING
AND description has no asset pillar marker   -- defense-in-depth
```

Do **not** expire:

- `status = DISPATCHED` (active MRF task),
- `reportType = ASSET` (always),
- reports whose description contains an asset pillar marker (legacy mis-typed rows).

Rationale: the school physically clears bins at 6 PM, so any not-yet-dispatched report is moot and neutral to expire — this also re-enables the duplicate-report guard for the next day. DISPATCHED reports represent real in-flight MRF work and are preserved. Assets are never part of the nightly waste clear.

> This is the policy the user selected (expire unverified **and** verified waste; never asset; never dispatched).

### 3.4 Bin state consistency

- Bins with **no** active `DISPATCHED` report: reset as today (`fillLevel = 0`, `activeDispatch = false`).
- Bins with an active `DISPATCHED` report: leave `activeDispatch = true` (do not desync). Optionally still zero `fillLevel` (see Open Decisions Q3).

### 3.5 Alternatives considered

| Option | Behaviour | Trade-off |
| --- | --- | --- |
| **A (recommended)** | Expire unverified PENDING only; keep verified + DISPATCHED | Preserves admin/MRF work; duplicate guard still blocks for active recognized tasks |
| B | Expire all PENDING (verified or not); keep DISPATCHED | Simpler, but loses verified reports overnight |
| C | Expire nothing; make duplicate guard time-windowed | Nothing invalidated, but bins empty while reports linger |
| D | Adds a grace window (expire only reports older than X hours) | More config, more edge cases |

---

## 4. Implementation Plan

### Phase 1 — Report-type correctness (root cause)

Backend `server/src/routes/report.routes.ts`:
1. Add `deriveReportType(rawType, description)`:
   - explicit `ASSET`/`WASTE` wins;
   - else `ASSET` if description matches `[PILLAR: (FURNITURE|ELECTRONICS|FIXTURES|EQUIPMENT|OTHER)]`;
   - else `WASTE`.
2. Replace `(reportType as ReportType) || ReportType.WASTE` (line 134) with the helper.
3. Return `reportType` (already in `formatReportResponse`).

Frontend:
4. `TeacherDashboard.tsx:211` — pass `reportType: isWaste ? 'WASTE' : 'ASSET'`.
5. `StudentDashboard.tsx:133` — pass `reportType: 'WASTE'` (explicit).
6. `src/types/index.ts` — `Report` already has `reportType?: 'WASTE' | 'ASSET'` (line 51); make the submit param use it (optional tightening).

### Phase 2 — Harden the reset (`bin-reset.service.ts`)

7. Replace the expiry `where` with the §3.3 predicate, plus a defensive asset exclusion
   (`reportType: 'WASTE'`, `status: PENDING`, `isVerified: false`, and `NOT description contains asset markers`).
8. Recompute bin state in the same transaction:
   - fetch ids of bins referenced by remaining active `DISPATCHED` reports;
   - reset all other bins;
   - leave dispatched bins' `activeDispatch = true`.
9. Store the **active school year id** on the audit log.
10. Return richer result (`binsReset`, `reportsExpired`, `binsSkipped`) for observability.
11. Keep the concurrency guard and single-transaction atomicity.

### Phase 3 — Data backfill (legacy mis-typed reports)

12. One-off migration/script (`server/prisma/` or `src/scripts/`):
    ```sql
    UPDATE reports
    SET report_type = 'ASSET'
    WHERE report_type = 'WASTE'
      AND (
        UPPER(description) LIKE '%[PILLAR: FURNITURE]%' OR
        UPPER(description) LIKE '%[PILLAR: ELECTRONICS]%' OR
        UPPER(description) LIKE '%[PILLAR: FIXTURES]%' OR
        UPPER(description) LIKE '%[PILLAR: EQUIPMENT]%' OR
        UPPER(description) LIKE '%[PILLAR: OTHER]%'
      );
    ```
13. Idempotent; log counts. Do not alter statuses historically — only `report_type`.

### Phase 4 — Duplicate-guard alignment

14. Confirm server duplicate guard (`report.routes.ts:106-117`) still uses `PENDING`/`DISPATCHED`.
15. With Phase 2, unverified pending reports expire → students can re-report. Verified/dispatched reports legitimately block; if an admin wants to clear one, they use Dismiss.

### Phase 5 — Admin observability (optional but recommended)

16. Add `POST /api/settings/bin-reset/run` (admin) → executes reset, returns result.
17. Add `?dryRun=true` support to preview counts without mutating.
18. UI: "Preview" + "Run reset now" in `AdminSyncSettingsTab`, plus a `binsSkipped` readout.

### Phase 6 — Verification

19. `npm run build`, `npm run lint`, `npm --prefix server run build`.
20. Targeted integration checks (§6).

---

## 5. API / Settings Changes

| Method | Endpoint | Change |
| --- | --- | --- |
| `POST` | `/api/reports` | `reportType` derived/validated server-side |
| `PATCH` | `/api/settings` | unchanged (`binResetEnabled`, `binResetTime`) |
| `POST` | `/api/settings/bin-reset/run` | **new** admin trigger (with `dryRun` query) |
| — | `system_settings` | no new column required |

No schema migration is required for the reset change itself; only the optional data backfill.

---

## 6. Test & Acceptance Matrix

### Backend
- [ ] Unverified PENDING waste report → EXPIRED by reset.
- [ ] Verified PENDING waste report → **not** expired.
- [ ] DISPATCHED waste report → **not** expired; its bin keeps `activeDispatch = true`.
- [ ] ASSET report (any status) → **never** touched by reset.
- [ ] Report with an asset marker but `reportType = WASTE` → **not** expired (defensive).
- [ ] Reset is atomic: a forced mid-transaction error rolls back everything.
- [ ] Concurrent reset attempts: second returns the guard error, no partial work.
- [ ] Audit log records counts + active `schoolYearId`.
- [ ] Dry-run mutates nothing and returns the same counts.

### Frontend
- [ ] Teacher asset submission persists `reportType = ASSET` (verify via API/DB).
- [ ] Teacher waste submission persists `reportType = WASTE`.
- [ ] Asset report never shows the "Expired (6 PM Reset)" state.
- [ ] Expired waste reports still render correctly in student/teacher/admin history.

### Regression
- [ ] Duplicate-report guard still blocks same bin/category while an active (verified/dispatched) report exists.
- [ ] Points awarded at verification are unaffected by reset.
- [ ] Existing reset schedule (`binResetTime`, enable flag) still works.
- [ ] Builds + lint pass.

---

## 7. Safeguards Against Regression

1. **Type first:** fix `reportType` at creation *and* derive server-side; never rely on client only.
2. **Defense in depth:** reset excludes asset markers even if `report_type` is wrong.
3. **Additive backfill:** data migration only flips `report_type`; no status/point changes.
4. **Atomicity preserved:** all reset mutations stay in one transaction with the concurrency guard.
5. **Bin/report consistency:** compute `activeDispatch` from surviving DISPATCHED reports.
6. **Explicit tests** for the four matrix combinations (verified × dispatched × type).

---

## 8. File Change Summary

| File | Change |
| --- | --- |
| `server/src/services/bin-reset.service.ts` | Narrow expiry predicate; asset exclusion; bin-skip logic; richer result; audit SY |
| `server/src/routes/report.routes.ts` | `deriveReportType()` + use at creation |
| `server/src/routes/settings.routes.ts` | Optional manual/dry-run bin-reset endpoint |
| `server/src/scripts/backfill-report-type.ts` (new) | Idempotent reclassification migration |
| `src/pages/teacher/TeacherDashboard.tsx` | Pass `reportType` for waste vs asset pillars |
| `src/pages/student/StudentDashboard.tsx` | Pass explicit `reportType: 'WASTE'` |
| `src/hooks/useMockData.tsx` | Keep default, but now fed by explicit type |
| `src/pages/admin/components/settings/AdminSyncSettingsTab.tsx` | Optional preview/run controls + copy |
| `src/types/index.ts` | (optional) tighten submit param to require `reportType` |

---

## 9. Decisions (resolved)

1. **Expiry policy:** ✅ expire **all PENDING waste** (verified and unverified); never ASSET; never DISPATCHED.
2. **Bins with active DISPATCHED reports:** bin `activeDispatch` handling left as-is for now (bins are not FK-linked to reports); noted as a follow-up if a link is introduced.
3. **Legacy verified-but-undispatched reports:** they expire per policy #1; points already awarded at verification are untouched.
4. **Backfill scope:** ✅ run the `report_type` reclassification now (migration + one-off execution).
5. **Manual trigger:** deferred (not required for correctness).

---

## 10. Implementation Status (2026-09-11)

**Backend**
- `server/src/routes/report.routes.ts`: added `deriveReportType()` — explicit `reportType` wins; otherwise derives `ASSET` from `[PILLAR: …]` description markers; defaults to `WASTE`. Creation now uses it.
- `server/src/services/bin-reset.service.ts`: expiry predicate narrowed to `status = PENDING AND reportType = 'WASTE'` with a case-insensitive exclusion of asset pillar markers. `DISPATCHED` and asset reports are never expired. Audit log now records the active `schoolYearId`.
- `server/prisma/migrations/20260911150000_backfill_asset_report_type/migration.sql`: idempotent reclassification of legacy `WASTE` rows that describe assets → `ASSET`.

**Frontend**
- `src/pages/teacher/TeacherDashboard.tsx`: sends `reportType: isWaste ? 'WASTE' : 'ASSET'`.
- `src/pages/student/StudentDashboard.tsx`: sends explicit `reportType: 'WASTE'`.

**Verified**
- Backfill executed against the dev DB: 0 rows needed reclassification (no asset reports yet); idempotent.
- Read-only predicate check: 5 active reports are `PENDING` waste → would expire; 0 `DISPATCHED`/`ASSET` survivors today (matches policy).
- `npm run build`, `npm run lint` (0 errors), and `npm --prefix server run build` pass.

**Not implemented (deferred / follow-up)**
- Manual admin "Run reset now / Preview (dry-run)" endpoint (`§4 Phase 5`).
- Bin `activeDispatch` reconciliation for surviving `DISPATCHED` reports (no reliable bin↔report link exists today).
- `AdminSyncSettingsTab` sends `syncMode`/`syncIntervalMinutes`, but `PATCH /settings` ignores them (pre-existing, unrelated to this change).

---

## 11. Amendment (2026-10-05) — Dispatched waste expires with the day

**Policy change:** WASTE reports that were dispatched to MRF but not completed by the daily reset now expire with that day's reset. Previously `DISPATCHED` was never expired, so an unfinished dispatch lingered on the MRF "Assigned Dispatches" list indefinitely (observed: a Sept 30 dispatch still active on Oct 5). An unfinished dispatch must not carry over to the next day.

**Unchanged:** ASSET reports (pending or dispatched) are still never touched, and both expiry update sets defensively exclude legacy rows whose description contains an asset pillar marker.

**Implementation:**
- `server/src/services/bin-reset.service.ts`: `executeDailyBinReset()` now performs two `updateMany` calls in the same transaction — `PENDING` waste (unchanged) and `DISPATCHED` waste (new) → `status = EXPIRED`, `completedAt = now`.
- `BinResetResult` now returns `dispatchesExpired` alongside `reportsExpired`; the `DAILY_BIN_RESET` audit log records both counts.
- `src/pages/admin/components/settings/AdminSyncSettingsTab.tsx`: policy copy updated.
- No schema/migration change. Points (awarded at verification) are unaffected; expiring the dispatch does not remove points.

---

## 12. Rollout Plan — make dispatched expiry live on tenants (2026-10-08)

**Problem.** The HINIGARAN tenant still lists `DISPATCHED` waste reports from September. The §11 amendment exists only in the working tree; the tenant runs the last committed build, where `DISPATCHED` is never expired, so unfinished dispatches linger indefinitely.

**Scope.** Ship the working-tree `bin-reset.service.ts` change, verify the predicate on the tenant DB, execute one reset, confirm assets are untouched. No schema change; no frontend change required for correctness.

### Phase 1 — Land the code (repo)
1. Review the working-tree diff of `server/src/services/bin-reset.service.ts` (PENDING + DISPATCHED expiry, marker exclusions, `dispatchesExpired` in result and audit log).
2. Confirm consumers compile (`BinResetResult.dispatchesExpired` is additive): `npm run lint`, `npm --prefix server run build`.
3. Add regression coverage (recommended): extract the expiry predicate into an exported pure helper (e.g. `buildExpirableWasteWhere()`) and unit test it with `node:test` + `tsx` (matching server test style):
   - WASTE + PENDING → expires
   - WASTE + DISPATCHED → expires
   - ASSET (type) → never
   - WASTE + `[PILLAR: …]` marker → never
4. Commit only the relevant files (`bin-reset.service.ts`, test, this doc). Do not sweep the unrelated working-tree modifications into the commit.

### Phase 2 — Pre-deploy verification (read-only)
1. Run the read-only predicate script against the tenant DB (same WHERE clauses as `executeDailyBinReset`):
   - expect every stale `DISPATCHED` WASTE row → `wouldExpire=true`; every ASSET / pillar-marked row → spared.
2. Snapshot active counts by status/type for the acceptance check, and record the IDs of rows that will expire (for rollback).

### Phase 3 — Deploy
1. Build the server (`npm --prefix server run build`) and deploy the artifact.
2. Restart the server process on the tenant host — required: `rescheduleBinReset()` runs at boot and schedules the 18:00 Asia/Manila cron.
3. Confirm the startup log `[BinReset] Scheduled daily reset at 18:00 (Asia/Manila)`.
4. Confirm tenant settings `binResetEnabled = true`, `binResetTime = 18:00` (Admin → Settings).

### Phase 4 — Execute & verify
- **Option A (automatic):** the next 18:00 reset expires the dispatches. First automatic run is the next day if the server restarted after 18:00.
- **Option B (immediate, recommended for demo):** add a one-off script `server/src/scripts/run-bin-reset.ts` that calls `executeDailyBinReset()` and prints the result; run it once on the tenant host. Expect `dispatchesExpired = <stale dispatch count>`, assets untouched.

Acceptance checks:
- Reports page with an active-status filter → no leftover PENDING/DISPATCHED; stale rows now `EXPIRED` (visible only under All Status / Done).
- The asset report (ceiling fan) remains `DISPATCHED` — never touched.
- Admin → Audit Logs shows `DAILY_BIN_RESET` with both counts.
- Bins reset to empty (expected side effect).

### Phase 5 — Post-deploy hygiene
1. Re-run the read-only predicate: active waste = 0, asset rows intact.
2. The list is never deleted — if a truly empty Reports page is needed, use the tenant/DB reset, not the daily reset.
3. **Rollback:** redeploy the previous build; the change is status-only. Restore `EXPIRED → DISPATCHED` for the recorded IDs if needed.

### Risks & mitigations
| Risk | Mitigation |
| --- | --- |
| Asset report expired | Two independent guards (reportType + pillar markers); predicate unit test + read-only dry run before enabling |
| Server down at 18:00 → cron missed | Option B manual run, or wait for the next day |
| Server restarted after 18:00 → no run today | Use Option B |
| Users confused by EXPIRED rows under All Status | Expected: history is retained; communicate that the daily reset expires, never deletes |

### Status (2026-10-08)
- **Phase 1 — done locally:** predicate extracted to `server/src/services/report-expiry.ts` (`ASSET_DESCRIPTION_MARKERS` + `buildExpirableWasteWhere()`), shared by `bin-reset.service.ts` and `report.routes.ts` (single marker source). Unit test `server/src/services/__tests__/report-expiry.test.ts` covers E1–E4; wired as `npm --prefix server run test:report-expiry` and added to the root `verify` script.
- **Phase 2 — tooling done:** `npm --prefix server run db:verify-reset-predicate` (read-only classification using the exact reset predicate).
- **Phase 4 — tooling done:** `npm --prefix server run db:run-bin-reset` (manual one-off reset, same code path as the cron).
- **Pending:** commit + deploy the server build, restart the tenant process, then run the Phase 2/4 scripts on the tenant host and complete the acceptance checks.
