# Admin Reports Tab Scoping Plan (Expired & Historical Reports)

> **Status:** Implemented (2026-09-15). See §10.
> **Scope:** The admin **Reports** tab (`AdminReportsTab.tsx`). Keep it as the **current-day operational queue**; move expired/completed/historical reports to **History / Collections** so the queue only shows what still needs action.
> **Related:** `BIN_RESET_AND_ASSET_REPORT_RESET_PLAN.md`, `POINTS_AWARD_ON_COLLECTION_PLAN.md`.

---

## 0. TL;DR

Today the Reports tab lists **every** report regardless of age or terminal status — including `EXPIRED` ("Expired (6 PM)") rows and old completed ones. The admin queue should only show **today's active work**; `EXPIRED` (and other terminal, non-today reports) belong in **History**, not the action queue.

Proposed:
1. **Reports tab = today's reports** (created within the current school-local day) **plus** any still-active older reports (`PENDING`/`DISPATCHED`) that genuinely need action.
2. **`EXPIRED` is never shown in the Reports queue** — it is terminal and neutral. It moves to History.
3. A **"History" view/toggle** (or reuse **Collections**) shows expired/completed/older reports with filters + search + CSV.

---

## 1. Current Behaviour (evidence)

| Concern | Location | Behaviour |
| --- | --- | --- |
| Report list | `AdminReportsTab.tsx:164-198` `filteredReports` | No date scoping; all reports pass unless a status filter is chosen |
| Status filter | `AdminReportsTab.tsx:188-194` | `EXPIRED` is a first-class filter option; `DONE` includes `EXPIRED` |
| Grouping | `AdminReportsTab.tsx:200-226` | Groups all reports by `location__category` |
| Group rows | `AdminReportsTab.tsx:531-534` | `completedReports` explicitly includes `EXPIRED` |
| Expired badge | `AdminReportsTab.tsx` (~:657) | Renders "Expired (6 PM)" inside the queue |
| Expired helper | `src/utils/reportUtils.ts:18-31` | `isReportDoneAndExpired` treats `COLLECTED/RESOLVED/[dismissed]` as done; **does not include `EXPIRED`** |
| Collections tab | `AdminCollectionsTab.tsx:237` | Already labels `EXPIRED` as "Expired (6 PM Reset)" |

So `EXPIRED` currently renders in the **action queue**, even though nothing can be done with it.

---

## 2. Proposed Rules

1. **Queue scope (Reports tab):** show a report when **either**
   - it was created within the **current local day** (`Asia/Manila`), **or**
   - it is still **actionable** (`PENDING` or `DISPATCHED`) regardless of age,
   and **not** terminal-inactive.
2. **Never show in the queue:** `EXPIRED` (always), and completed `COLLECTED`/`RESOLVED` **from previous days** (they go to History).
   - Same-day completed reports may remain briefly for confirmation (decision D3).
3. **History:** an admin **History** surface (new tab section, or the existing **Collections** tab) lists `EXPIRED` + `COLLECTED`/`RESOLVED` + `DISMISSED` with date range, status, location, reporter, and CSV export.
4. **Timezone:** all "today" comparisons use the school's local day (`Asia/Manila`, same TZ as the 6 PM reset), not UTC, to avoid off-by-one.

---

## 3. Options

| Option | Behaviour | Trade-off |
| --- | --- | --- |
| **A (recommended)** | Reports = today + active; History shows expired/completed/old | Clean queue; needs a History location |
| B | Only hide `EXPIRED` from Reports; keep date scoping out | Minimal change, but old completed rows still clutter |
| C | Hide every terminal status entirely from Reports | Cleanest queue, but same-day completions vanish instantly (confusing) |

---

## 4. Where Expired Goes

| Choice | Notes |
| --- | --- |
| **Reuse Collections tab** (recommended) | It already shows completed dispatches and an "Expired (6 PM Reset)" badge |
| New **History** sub-tab under Management | Dedicated filters (Expired / Completed / Dismissed / date range) + CSV |
| School-Year Ledger | Already the long-term archive; expired rows are present there for audit |

---

## 5. Implementation Plan

### Phase 1 — Queue scoping (frontend)
1. In `AdminReportsTab.tsx`, add a `scope` concept:
   - `isToday(ts)` using `Asia/Manila`.
   - Include if `isToday || status === 'PENDING' || status === 'DISPATCHED'`.
   - Exclude `EXPIRED` entirely (unless the explicit History/Expired filter is selected).
2. Update `filteredReports` (`:164-198`) to apply the scope before the existing status filters.
3. Remove/relabel the `EXPIRED` option from the queue's status dropdown (move it to History).
4. Make `isReportDoneAndExpired` (`reportUtils.ts`) also treat `EXPIRED` as done/terminal so other views stay consistent.

### Phase 2 — History surface
5. Add expired/completed/old reports to the **Collections** tab (or a new `AdminHistoryTab`) with a date-range filter and CSV.
6. Add a small **"View history"** link on the Reports tab.
7. Ensure KPIs/counts on the Reports tab reflect the **scoped** queue (not the full DB), and label them accordingly.

### Phase 3 — Backend (optional, if scoping server-side)
8. `GET /api/reports` already supports `status`/`schoolYearId`; optionally add `from`/`to` (or `scope=today`) so the client can request only the queue, avoiding pulling the whole table.

### Phase 4 — Verification
9. Builds + lint; manual QA of the queue vs history.

---

## 6. Regression Register

| ID | Risk | Safeguard |
| --- | --- | --- |
| R1 | Hiding expired loses access to it | It remains in Collections/Ledger; only hidden from the queue |
| R2 | Same-day completions vanish too fast | Keep same-day `COLLECTED`/`RESOLVED` visible until day rollover (decision D3) |
| R3 | Timezone off-by-one | Compare in `Asia/Manila`, matching the 6 PM reset TZ |
| R4 | Counts/KPIs become misleading | Recompute/label counts for the scoped queue |
| R5 | Other consumers rely on `isReportDoneAndExpired` | Update helper once; verify student/teacher/admin history views |
| R6 | The "3-report limit" UX depends on active counts | Scope only the list rendering; the limit logic already counts `PENDING`/`DISPATCHED` |
| R7 | Expired still appears in group headers | Exclude expired rows before grouping, and fix `completedReports` grouping |
| R8 | CSV/export changes | Export the scoped rows; provide a History export for the rest |

---

## 7. Test & Acceptance Matrix

- [ ] A report created today appears in the Reports queue.
- [ ] An older `PENDING`/`DISPATCHED` report still appears (actionable).
- [ ] An `EXPIRED` report does **not** appear in the queue.
- [ ] Same-day `COLLECTED`/`RESOLVED` behaviour matches the chosen policy (D3).
- [ ] Expired/completed/old reports are visible and exportable in History/Collections.
- [ ] Reports-tab counts match the scoped list.
- [ ] No duplicate/again-dispatchable rows (pairs with the transition guard).
- [ ] Builds + lint pass.

---

## 8. Open Decisions

1. **Queue definition:** today + still-active (recommended) vs today-only?
2. **Same-day completed:** keep visible until day rollover (recommended) or hide immediately?
3. **History home:** reuse **Collections** (recommended) or add a dedicated **History** tab?
4. **Server-side scoping:** add `scope=today` / date params to `GET /api/reports`, or filter client-side for now?
5. **Timezone source:** hardcode `Asia/Manila` or expose a configurable school timezone?

---

## 9. Related Fix (already applied)

While investigating, a real bug was found and fixed: a completed report could be **re-dispatched**, which re-opened it and produced duplicate records.
- Server: `PATCH /reports/:id/status` now rejects changing a terminal report (`COLLECTED`/`RESOLVED`/`EXPIRED`/`DISMISSED`) → `409 INVALID_TRANSITION`.
- Admin UI: the group "Dispatch Collector" button now appears only when the group has a `PENDING` report; groups with only terminal rows show "Completed / Archived".
- Server: `POST /assets` is now idempotent per `sourceReportId + action` (no duplicate ledger rows).

---

## 10. Implementation Status (2026-09-15)

Decisions used: **today + still-active** queue; **same-day completed stay visible**; **History = Collections**; **client-side** filtering.

**Frontend**
- `AdminReportsTab.tsx`: added a `isSameLocalDay()` helper (`Asia/Manila`). `filteredReports` now:
  - always excludes `EXPIRED`, and
  - includes a report only if it is **active** (`PENDING`/`DISPATCHED`) **or** created **today**.
- Removed the `Expired` option from the queue's status dropdown; `DONE` now means `COLLECTED`/`RESOLVED` only.
- Header subtitle changed to "Today's action queue · N shown · expired & older reports are in **Collections**".
- `src/utils/reportUtils.ts`: `isReportDoneAndExpired` now treats `EXPIRED` as terminal/done.
- Group fix (from §9): "Dispatch Collector" shows only when the group has a `PENDING` report; terminals show "Completed / Archived".

**Verified (browser + API)**
- Admin Reports tab: no `EXPIRED` text/badge; completed group shows **Completed / Archived** (no Dispatch button); 7 rows in scope.
- Server: re-dispatch of `COLLECTED`/`EXPIRED` → `409 INVALID_TRANSITION`; asset create twice → `201` then `200`, 1 row.
- Builds + lint (0 errors) pass.

**Note:** Expired/completed/older reports remain available in **Collections** (already renders the "Expired (6 PM Reset)" badge) and the School-Year Ledger.
