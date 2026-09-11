# Rollover Readiness Plan

> **Status:** Implemented and verified against the live dev EnrollPro API.
> **Scope:** Make SORTv2 safe to roll over to a new school year at any time without losing student history.

## 0. Layman's Guide — How Rollover Works

Think of **EnrollPro** as the school's master enrollment notebook, and **SORT**
as our copy of it.

1. **The school turns the page.** When a new school year starts, EnrollPro opens
   a fresh page (for example `2030-2031`). That new page starts **empty** —
   zero students. Everyone has to enroll again to get a new grade and section.
2. **We copy the page number.** When SORT next syncs, it sees the new page
   number and does its own "page turn": it takes a final photo of last year
   (points, market kilos, money), locks last year as read-only, and opens the
   new year.
3. **Nobody can log in yet.** Because the new page is empty, students are not
   enrolled yet, so SORT blocks their logins and shows a clear message: *"You
   are not enrolled for this school year yet."*
4. **Old accounts go in the yearbook, not the trash.** Students who left or
   graduated are **archived**. Their reports, points, and history stay forever
   for transparency. Graduates remain archived as alumni.
5. **Enrollment begins.** As students enroll, SORT wakes their existing account
   back up and updates their promoted grade and section. New students get new
   accounts. This repeats safely every year.

The key rule: **we never delete a student.** Deleting would also destroy their
reports, points, offenses, and snapshots. We archive instead.

## 1. Why This Exists

EnrollPro is the school's master enrollment system. When the school starts a new
school year, EnrollPro turns to a fresh page: the new year begins with **zero
enrolled learners** until the registrar enrolls them. Returning students get a
promoted grade level and a new section; graduates never come back.

SORTv2 mirrors that roster. The problem: the current sync treats an empty learner
roster as "everyone left the school" and **hard-deletes every student account**.
Because of `onDelete: Cascade` relations, deleting a student also destroys their
reports, point histories, offenses, point snapshots, and challenge data — while
the sync log still reports `SUCCESS`. This is permanent, silent data loss.

This plan replaces deletion with **archiving**, makes rollover carry forward real
inventory value, and makes the empty-roster state explicit and visible.

## 2. Locked Decisions

1. **Archive all students at rollover.** Returning students are re-activated by
   the next enrollment sync; graduates stay archived (alumni) forever.
2. **Unsold Recycle Market kilos carry forward** as real, sellable stock in the
   new school year.
3. **Rollover is the priority.** All other features are parked (see §9).

## 3. Confirmed Current State (live)

Checked against the dev EnrollPro integration API on 2026-09-10:

| Endpoint | Result |
| --- | --- |
| `GET /integration/v1/school-year` | SY 9, `2030-2031` (already rolled over) |
| `GET /integration/v1/learners` | `data: []`, `total: 0` (no enrollment yet) |
| `GET /integration/v1/faculty` | Populated (teachers do not re-enroll) |
| `GET /integration/v1/staff` | Populated |
| `GET /integration/v1/sections` | New-year sections exist, `enrolledCount: 0` |
| `GET /integration/v1/default/mrf/identities` | `401` — needs a separate MRF key |

## 4. Data Inventory (what we already keep per school year)

Already school-year scoped and preserved:

- `mrf_inventory_transactions` — `STOCK_IN` / `STOCK_OUT` / `ADJUSTMENT` /
  `ROLLOVER_CLOSING` / `ROLLOVER_OPENING`, with `schoolYearId`.
- `market_stock_snapshots` — opening/closing kg per category per year.
- `recycle_sale_transactions` — every vendor sale, with `schoolYearId` (money).
- `user_point_snapshots` — closing points and rank per student per year.
- `reports`, `point_histories`, `offenses`, `audit_logs` — `schoolYearId`.

Missing: a single "School Year Ledger" view (Phase 5) and correct archive
behavior so these rows survive roster changes.

## 5. Phase 0 — Schema Migration

File: `server/prisma/schema.prisma`

| Change | Purpose |
| --- | --- |
| `User.archivedAt DateTime?` (`@map("archived_at")`) | Timestamp an account was archived |
| `EnrollmentSyncLog.message String?` | Carry an informational state such as "no students enrolled yet" without abusing `errorMessage` |
| `User.enrollmentStatus` (already `String?`) | Formalize values: `ENROLLED` / `NOT_ENROLLED` / `ALUMNI` |

No foreign-key or cascade changes are required. Once deletion stops, cascades
never fire for roster changes.

Migration: `npx prisma migrate dev --name rollover_archive_safety`.

## 6. Phase 1 — Rollover Service

File: `server/src/services/rollover.service.ts`

Inside the existing `executeRollover` transaction:

- **Archive all students**: set `enrollmentStatus = 'NOT_ENROLLED'` and
  `archivedAt = now` for `role = STUDENT, syncSource = ENROLLPRO`; delete their
  `user_sessions` so nobody stays logged in.
- **Carry forward market stock**: keep `accumulatedKg` (do not reset to 0);
  reset only `isApprovedForSale` and `approvedAt`. The opening snapshot already
  records the carried balance, so the live stock now matches it.
- **Audit log**: include `studentsArchived` count and carried kg in details.
- Keep snapshots, inventory closing/opening transactions, points reset, and
  challenge-progress reset exactly as they are.

## 7. Phase 2 — Sync Service

File: `server/src/services/enrollpro-sync.service.ts`

- **Never delete EnrollPro users.** Replace the delete-propagation block with
  archiving: a user present in the local mirror but absent from a successfully
  fetched roster becomes `enrollmentStatus = 'ALUMNI'`, `archivedAt = now`, and
  has sessions revoked. Apply to learners, faculty, and staff cohorts.
- **Empty-roster guard.** If the learner roster is `0` with no fetch error, set
  the sync `message` to
  `NO_STUDENTS_ENROLLED: EnrollPro SY {label} has no enrolled learners yet`.
  Absent learners are archived as `NOT_ENROLLED` (awaiting enrollment), never
  `ALUMNI`, so they are blocked now and re-activated when enrollment begins. No
  deletions.
- **Reactivation.** On upsert, if an existing user is archived, clear
  `archivedAt`, set `enrollmentStatus = 'ENROLLED'`, and update grade/section.
  Matching uses the stable `enrollproId`, so this is safe across years.
- Graduates simply never reappear, so they remain `ALUMNI`.

## 8. Phase 3 — Login Gate

After a delegated EnrollPro login succeeds, check the local mirror. If the user
is archived, `NOT_ENROLLED`, or `ALUMNI`, deny the session with a clear message:
"You are not enrolled for this school year yet."

## 8b. Phase 4 — Admin Visibility

- `/api/sync/status` now returns the `message` field for the last sync and each
  history entry, so the admin Sync panel shows the `NO_STUDENTS_ENROLLED`
  banner. The panel's "Deleted" metric is relabeled "Archived".

## 8c. Phase 5 — School Year Ledger

- `GET /api/school-years/:id/ledger` (admin only) aggregates per-year
  transparency data: report totals by status/category plus detailed report rows,
  collected weight, points awarded/deducted plus point transaction rows, top
  students, market sales (revenue + kg), market stock openings/closings, and
  inventory movement totals and transactions.
- A dedicated page (`AdminLedgerPage`) reachable from the **School Year Ledger**
  nav item renders the data as an Excel-style workbook: sortable grid with row
  numbers, sticky headers, zebra rows, totals row, sheet tabs (Reports, Points
  Ledger, Leaderboard, Market Sales, Market Stock, Inventory), a search filter,
  and CSV export. The "Ledger" buttons in `AdminSchoolYearTab` deep-link into
  this page for a specific year.

## 9. Parked Features (do not implement now)

- Scheduled auto-sync cron (rollover should not depend on a manual sync).
- In-flight reports at the rollover boundary.
- Offense/suspension cross-year rules.
- Alumni directory search.
- Challenge dates scoped per school year.
- Dedicated MRF identity key (`/default/mrf/identities` currently `401`).
- Certificate/rank history across years.

## 10. Test Matrix

1. Sync with an empty roster: no deletes, clear `NO_STUDENTS_ENROLLED` message.
2. Rollover: all students archived and logged out, points snapshotted and reset,
   market kg preserved, idempotent on retry.
3. Enroll a student in EnrollPro: next sync re-activates with the new grade and
   section.
4. Graduate: stays `ALUMNI`, history intact, login denied.
5. Mid-rollover failure: full transaction rollback.
6. `npm run build`, `npm run lint`, `npm --prefix server run build` pass.

## 11. File Change Summary

| File | Change |
| --- | --- |
| `server/prisma/schema.prisma` | `User.archivedAt`, `EnrollmentSyncLog.message` |
| `server/prisma/migrations/...` | Migration for the fields above |
| `server/src/services/rollover.service.ts` | Archive students, revoke sessions, carry market kg, audit |
| `server/src/services/enrollpro-sync.service.ts` | Archive instead of delete, empty-roster guard, reactivation |
| `server/src/routes/auth.routes.ts` | Deny archived/not-enrolled student logins, refreshes, and `/me` |
| `src/types/index.ts` | Added EnrollPro `gradeLevel`/`sectionName`/`academicProgram` to `User` |
| `src/pages/admin/components/AdminCollectionsTab.tsx` | Widen settings prop type; drop redundant casts |
| `src/pages/admin/components/AdminImpactTab.tsx` | Use `Report.timestamp` (API never returns `createdAt`) |
| `server/src/routes/sync.routes.ts` | Expose sync `message` in status + history |
| `server/src/routes/school-year.routes.ts` | New `GET /:id/ledger` aggregation endpoint (with detail rows) |
| `src/services/api.ts` | `getSchoolYearLedger` client method |
| `src/hooks/useSchoolYear.ts` | Ledger types + `getSchoolYearLedger` |
| `src/pages/admin/components/LedgerSheetTable.tsx` | Reusable Excel-style sortable grid |
| `src/pages/admin/components/AdminLedgerPage.tsx` | Dedicated ledger workbook page |
| `src/pages/admin/AdminDashboard.tsx` | Render `admin-ledger` page; deep-link from school years |
| `src/components/layout/DashboardLayout.tsx` | "School Year Ledger" nav item |
| `src/pages/admin/components/AdminSchoolYearTab.tsx` | Ledger buttons deep-link to the page |
| `src/pages/admin/components/settings/AdminSyncSettingsTab.tsx` | Show sync `message`; "Archived" label |

## 12. Verification (2026-09-10)

Live dev EnrollPro had already rolled over to SY 9 `2030-2031` with `0`
learners. The old sync code had hard-deleted 80 records. After the fix:

- `npm --prefix server run build` — passes.
- `npm run lint` — passes (warnings only).
- Live `npm run sync:enrollpro`:
  - `NO_STUDENTS_ENROLLED: EnrollPro SY 2030-2031 has no enrolled learners yet`
  - `learners: pulled 0, archived 1` (never deleted)
  - `faculty: 42 updated`, `staff` updated, term calendar synced.
- Post-sync DB: `studentsActive = 0`, `studentsArchived = 1`,
  `enrollmentStatus = NOT_ENROLLED`, all 13 reports intact, market stock intact.
- Sync log `message` carries the `NO_STUDENTS_ENROLLED` state.
- Frontend `npm run build` — passes (fixed 3 pre-existing type errors in
  `AdminCollectionsTab.tsx`, `AdminImpactTab.tsx`, and `src/types/index.ts`).
- Ledger endpoint verified live (admin token): SY 9 returns 0s (new year);
  archived SY 8 returns 13 reports, 510 points awarded, ₱1,800 sales revenue,
  100 kg sold, and inventory closing totals.
