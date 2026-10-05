# SINGLE-BUTTON SYNC (ROLLOVER → CALENDAR) — IMPLEMENTATION PLAN

> STATUS: PLAN ONLY — NOT IMPLEMENTED. Review the decisions in §2 before starting Phase 1.

---

## 1. CONTEXT & FINDINGS

### What the owner wants

When EnrollPro rolls over to a new school year, the admin should click **one** button — **Run Bulk Sync** — and the academic calendar (terms) must update along with users. Today the admin has to click a second button, "Sync from EnrollPro", on the Academic Calendar tab. That button must go, and so must the separate "Sync" (import) button on the School Years page.

### What already works (verified)

- **`POST /api/sync/all`** — the Run Bulk Sync endpoint (`server/src/routes/sync.routes.ts:62-79`) — **already** runs:
  - `runEnrollProSync()` (`server/src/services/enrollpro-sync.service.ts:483`) which mirrors the EnrollPro school-year catalog (`mirrorEnrollProSchoolYears`, line 512), performs the rollover (`ensureSchoolYear` → `executeRollover`, line 528), and syncs learners/faculty/staff.
  - `syncTermCalendar()` (line 920) which upserts `TermCalendar` + `AcademicQuarter` (T1/T2/T3) from EnrollPro's active SY and provisions challenges.
  - Branding (best-effort).
- **Academic Calendar tab** button calls `apiService.syncAcademicTerms()` → `POST /api/sync/terms` → only `syncTermCalendar()`. No rollover, no users. It is a strict subset of Run Bulk Sync.
- **School Years toolbar** "Sync" button calls `importSchoolYears()` → `POST /api/sync/school-years` → only `mirrorEnrollProSchoolYears()`. Also a strict subset of Run Bulk Sync.
- The calendar and ledger tabs are conditionally rendered (`SchoolSettingsPage.tsx:35-38`), so they remount and refetch from the DB whenever the admin switches to them — after a bulk sync they will already show fresh dates/rows once the extra buttons are removed.

### The one real backend gap

`/api/sync/all` runs users and terms **in parallel**:

```ts
const [syncResult, termResult] = await Promise.all([
  runEnrollProSync(),   // performs the rollover mid-run
  syncTermCalendar(),   // reads the ACTIVE school year for challenge provisioning
]);
```

At rollover the two race: `syncTermCalendar()` fetches EnrollPro's new SY dates (fine), but its challenge provisioning reads the **local** active SY (`enrollpro-sync.service.ts:994-998`) before `runEnrollProSync()` has finished the rollover, so challenges can be provisioned against the outgoing year. Running users → terms **sequentially** fixes this and guarantees the calendar always reflects the year the rollover just activated.

The same parallel pattern exists in the CLI (`server/src/scripts/bulk-sync.ts:11-14`) and the AUTO scheduler (`server/src/services/sync-scheduler.service.ts:31-34`), so "Run Bulk Sync" and the CLI/scheduler can diverge. Unify them.

### One latent frontend bug to fix in scope

`AdminSyncSettingsTab.tsx:122` hardcodes `http://localhost:5000/api/sync/all`. On the deployed tailnet host (`atheng.buru-degree.ts.net`) the browser's `localhost:5000` is the **user's machine**, not the server. Since Run Bulk Sync becomes the single sync action, switch it to `apiService` (which uses `VITE_API_URL` / the `/api` proxy, `api.ts:47`).

---

## 2. OWNER DECISIONS (LOCKED)

1. **One sync action only:** Run Bulk Sync in Settings → School & Sync → Sync & Integrations. It covers users, school years, rollover, term calendar, and branding.
2. **Remove** the "Sync from EnrollPro" button from the Academic Calendar tab.
3. **Remove** the "Sync" (import) button from the School Years ledger toolbar.
4. Calendar/School-Years pages refresh from the DB when opened — no background push needed.
5. EnrollPro remains authoritative for term dates: calendar dates are re-mirrored on every bulk sync (manual edits via the pencil are temporary and will be overwritten — keep the edit feature but relabel/annotate it as such).

---

## 3. IMPLEMENTATION PLAN

### Phase 1 — Backend: sequential full-sync orchestration

1. **New `server/src/services/full-sync.service.ts`** (keeps `enrollpro-sync.service.ts`, already 1,015 lines, from growing per AGENTS.md §1):
   - `export interface FullSyncResult { users: SyncResult; terms: { synced: number; error?: string }; }`
   - `export async function runFullSync(deps = { runEnrollProSync, syncTermCalendar })` — **sequential**: users first (mirror → rollover → cohorts), then terms (calendar + challenges against the freshly activated year). Dependency-inject for testability.
2. **`server/src/routes/sync.routes.ts:62-79`** — `POST /api/sync/all` calls `runFullSync()`; response keeps `{ message, users, terms, brandingUpdated }`. `POST /api/sync/terms`, `/enrollpro`, `/school-years` stay (granular diagnostics; do not remove endpoints).
3. **`server/src/scripts/bulk-sync.ts`** — replace the `Promise.all` with `runFullSync()`; add a `[Scheduler]`-style log line for the rollover case. Update the header text only if needed.
4. **`server/src/services/sync-scheduler.service.ts:31-34`** — `executeSync()` uses `runFullSync()`.
5. Return the rollover flag up to the API response (optional but cheap): `runEnrollProSync()` already knows `rolloverTriggered`; include it in `SyncResult` so the UI can toast "School year rolled over to SY X".

### Phase 2 — Frontend: one button

1. **`src/pages/admin/components/settings/AdminAcademicCalendarTab.tsx`**
   - Delete the `syncing` state (line 36) and `handleSyncFromEnrollPro` (51-60), and the button block (86-95).
   - Replace the header-right button with a text link/notice: "Term dates mirror EnrollPro — use **Run Bulk Sync** in Sync & Integrations." Add an optional `onOpenSync?: () => void` prop that switches to the Sync tab.
   - Keep the edit-pencil modal; since dates are overwritten by the next sync, add a one-line hint inside the modal ("Dates mirrored from EnrollPro; manual changes last until the next Run Bulk Sync.").
2. **`src/pages/admin/components/settings/SchoolSettingsPage.tsx`** — pass `onOpenSync={() => setSection('sync-integrations')}` to `AdminAcademicCalendarTab`.
3. **`src/pages/admin/components/AdminLedgerPage.tsx` + `src/pages/admin/components/ledger/LedgerToolbar.tsx`**
   - Remove `handleImport`/`importing`/`onImport` and the toolbar "Sync" button (LedgerToolbar.tsx:87-95). Keep **Refresh** (local refetch) and everything else.
   - Remove the now-unused `importSchoolYears` from `useSchoolYear.ts:229-244` and `apiService.importSchoolYears` (`api.ts:575`) if no other consumer (grep shows only the ledger); the server endpoint stays.
   - Optional note chip on the page: "Years mirror EnrollPro via Run Bulk Sync."
4. **`src/pages/admin/components/settings/AdminSyncSettingsTab.tsx`**
   - Add `apiService.runFullSync()` (`POST /sync/all`) and use it in `handleRunSync` instead of the hardcoded localhost fetch (fixes deployed hosts).
   - Toast on success: include counts, e.g. "Bulk sync complete — {users.recordsPulled} users, {terms.synced} terms"; warn on `PARTIAL` status and surface `terms.error` if present.
   - Add a subtitle under "Run Bulk Sync" listing what it covers: users, school years/rollover, term calendar.

### Phase 3 — Docs & tests

1. **Docs:** add a "Superseded" note in `SCHOOLYEAR-SYNC-AND-LEDGER-UNIFICATION-PLAN.md` §around line 295 (ledger "Sync from EnrollPro" action is replaced by Run Bulk Sync) and reference this plan from `ENROLLPRO_STRICT_MIRROR_SYNC_PLAN.md` §Phase 4 (line 120 stays valid; add that terms/school-years ride along).
2. **Server unit test** `server/src/services/__tests__/full-sync.test.ts`: inject fakes into `runFullSync` and assert (a) call order is users → terms, (b) terms still run when users return `PARTIAL`, (c) result shape.
3. **UI guard** `tests/ui/school-sync.spec.ts` (seeded ADMIN, same helpers as `admin-modals.spec.ts`):
   - Academic Calendar tab has **no** "Sync from EnrollPro" button; the "Run Bulk Sync" link is visible and navigates to Sync & Integrations.
   - School Years page has **no** "Sync" import button; "Refresh" remains.
   - Sync & Integrations shows "Run Bulk Sync Now".

---

## 4. VERIFICATION CHECKLIST

1. `npm run lint` (0 new errors) + `npm run build` at root; `npm --prefix server run build`.
2. `server`: `npm run sync:enrollpro` — output shows users then terms sequentially; `EnrollmentSyncLog` row written.
3. Rollover dry-run (staging EnrollPro only): switch EnrollPro's active SY → one Run Bulk Sync → local active `SchoolYear` updated, users scoped to the new SY, `AcademicQuarter` T1-T3 = new term dates, challenges provisioned for the new year. No second click required.
4. UI: open Academic Calendar after the sync → new dates visible (remount refetch). Calendar has no sync button; School Years has no import button.
5. Run Bulk Sync from the deployed tailnet host (not localhost) → succeeds via `apiService` proxy.
6. `npx playwright test school-sync.spec.ts` passes.

---

## 5. RISKS & NOTES

- **Sequential duration:** terms now wait for the user sync (adds a few seconds). Acceptable for a manual admin action; the AUTO scheduler inherits the same order.
- **Manual calendar edits are ephemeral** by design (EnrollPro strict mirror). The modal hint set expectations; do not build a local override system.
- **Endpoints retained:** `POST /api/sync/terms` and `/school-years` remain for diagnostics/manual API use — only their UI entry points are removed.
- **`mirrorEnrollProSchoolYears` still never activates/rolls over** — activation stays inside `runEnrollProSync` via `ensureSchoolYear`. Do not change that contract.
- Keep every touched file under the 1,000-line rule; do not commit secrets or hardcoded host URLs.
