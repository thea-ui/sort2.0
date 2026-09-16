# School Year Sync & Ledger Unification Plan

> **Status:** Implemented (2026-09-11). See §10 Implementation Status.
> **Author context:** React 19 + Vite + Tailwind 4 frontend, Express + Prisma + PostgreSQL backend.
> **Related docs:** `SCHOOLYEAR-MANAGEMENT-PLAN.md`, `ROLLOVER-READINESS-PLAN.md`, `ENROLLPRO-MRF-STUDENT-AUTH-AND-API-CATALOG.md`.

---

## 0. TL;DR (answers to the two questions)

**Q1 — Does the school year fetch from EnrollPro?**
Partially. SORT only ever pulls the **single active** school year from EnrollPro via `GET /integration/v1/school-year`, then calls `ensureSchoolYear()` (`server/src/services/enrollpro-sync.service.ts:199-221`). It **never enumerates or imports historical school years**. I probed the live dev integration API (read-only, no secrets printed) and confirmed there is **no list endpoint**:

| Probe | Result |
| --- | --- |
| `GET /integration/v1/school-year` | `200` → `{ id: 9, yearLabel: "2030-2031" }` (active only) |
| `GET /integration/v1/school-years` | `404` |
| `GET /integration/v1/schoolyear` | `404` |
| `GET /integration/v1/school_year` | `404` |
| `GET /integration/v1/school-year/list` | `404` |
| `GET /school-years` | `401` (internal JWT route, outside the partner contract) |

Local DB currently holds **2** years (live check): `2030-2031` (active, enrollproId 9) and `2029-2030` (archived, enrollproId 8). EnrollPro's own database has 5. **Root cause:** the partner API only exposes the active year, and SORT had no way to enumerate the rest. > **Update:** the 5 years *are* recoverable by ID enumeration — EnrollPro IDs 5–9 map to `2026-2027` … `2030-2031`. See §10 for the implemented fix.

**Q2 — Should Ledger and Management be unified?**
Yes. The Ledger is the richer, read-mostly surface and already lets admins view any previous year. Management duplicates summary data and its "create" capability is actually broken (orphaned modal). **Recommendation:** make the Ledger the single "School Years" surface and fold the few genuinely useful management actions (Import from EnrollPro, Create, Edit, Activate, Deactivate) into it. Remove the Settings → School Years sub-page.

---

## 1. EnrollPro School Year Investigation

### 1.1 How sync works today

| Step | Location | Behaviour |
| --- | --- | --- |
| Fetch active SY | `enrollpro-sync.service.ts:199` | `GET /integration/v1/school-year` (no `schoolYearId`) |
| Parse dates | `enrollpro-sync.service.ts:210-211` | Uses **`term1Start` / `term1End` only** |
| Create/roll | `enrollpro-sync.service.ts:212` → `rollover.service.ts:311` | `ensureSchoolYear(id, label, start, end)` |
| Roster pull | `enrollpro-sync.service.ts:224-228` | Learners/faculty scoped to `schoolYearId`; staff global |

`ensureSchoolYear()` (`rollover.service.ts:311-377`) semantics:
- If `enrollproId` already exists → return it (reactivate only if inactive-but-not-archived).
- If no active year exists → create it.
- If an active year exists with a **different** EnrollPro ID → trigger `executeRollover()`.

**Consequence:** historical years are invisible to SORT. There is no code path that imports years 1–4.

### 1.2 Secondary data bug (dates)

`enrollpro-sync.service.ts:210-211` maps the school year to `term1Start` → `term1End`. Live rows show `start=2030-06-08`, `end=2030-09-15` — i.e. the "school year" is only Term 1, roughly 3 months. A school year should end at the last available term end (`term3End`, or `term4End` when present). This corrupts overlap detection and date-range display. **Must be fixed as part of this work.**

### 1.3 Options to obtain all 5 years

| # | Option | Feasibility | Notes |
| --- | --- | --- | --- |
| A | EnrollPro adds `GET /integration/v1/school-years` (paginated list) | Best long-term | Requires partner change; probe proves the contract gap |
| B | **Manual/import mirror (recommended interim)** | Available now | Admin creates each missing year in SORT and links `enrollproId`. Backend already supports create (`school-year.routes.ts:146-200`) |
| C | Backfill via internal `GET /api/school-years` using a registrar JWT | Not recommended | 401 for integration key; fragile, out of contract, couples to private API |

**Recommendation (final):** **enumerate** the catalog from the active year (Option B') — walk IDs downward and resolve each label via `/school-year`, falling back to `/sections`/`/learners` for years where EnrollPro returns `409`. No manual creation. If EnrollPro later adds a list endpoint (Option A), it is used automatically instead.

### 1.4 Proposed sync architecture

1. Add `fetchEnrollProSchoolYears()` that tries the documented list endpoint when it exists.
2. If the endpoint returns `404`/unsupported, return `{ supported: false }` and fall back to the current single-active-year behaviour — **no regression**.
3. When supported, upsert every year by `enrollproId`:
   - Existing local year → update label/dates only.
   - Missing local year → create as **inactive, non-archived** (never active).
   - **Never** call `ensureSchoolYear` for non-active years (that could trigger rollover).
4. Move the active-year detection/ rollover trigger to run only for the year matching EnrollPro's authoritative active pointer.
5. Fix date mapping to use all available terms: `start = term1Start`, `end = max(term1End, term2End, term3End, term4End)`.

---

## 2. Ledger vs Management Analysis

### 2.1 Current surfaces

| Surface | Entry point | Component | Capabilities |
| --- | --- | --- | --- |
| School Year Ledger | Top nav `admin-ledger` (`DashboardLayout.tsx:64`) | `AdminLedgerPage.tsx` | Year picker incl. **archived**, KPIs, 5 sheets, search, sort, CSV export |
| School Year Management | Settings → `school-years` (`DashboardLayout.tsx:89`) | `AdminSchoolYearTab.tsx` | Active hero, summary, details modal, Edit, Activate, Deactivate |
| Broken | (never rendered) | `CreateSchoolYearModal.tsx` | Create — **orphaned** |

Both are gated by `SETTINGS_SUBITEMS.some(...)` in `AdminDashboard.tsx:573`, so `activeTab === 'school-years'` mounts **both** `AdminSchoolYearTab` (line 417) and an empty `AdminSettingsTab` (no `school-years` case). This dual-mount is fragile and confusing.

### 2.2 Overlap matrix

| Capability | Ledger | Management | Keep where |
| --- | --- | --- | --- |
| View previous/archived years | ✅ | ✅ (list only) | Ledger |
| Per-year detailed records | ✅ | ❌ | Ledger |
| CSV export | ✅ | ❌ | Ledger |
| View aggregate counts | ✅ (KPIs) | ✅ (cards) | Ledger |
| View snapshots / top students | ❌ | ✅ (details modal) | Fold into Ledger |
| Create year | ❌ | ❌ (orphaned modal) | Ledger (fix) |
| Edit year | ❌ | ✅ (inactive only) | Ledger |
| Activate / Deactivate | ❌ | ✅ | Ledger |
| Lifecycle status badges | ❌ | ✅ | Ledger |

### 2.3 Decision

- **Keep** `AdminLedgerPage` as the single "School Years" destination.
- **Retire** `AdminSchoolYearTab` and the Settings → School Years sub-item.
- **Move** lifecycle actions + snapshot/leaderboard detail into the Ledger page as a management header and an expanded detail area.
- **Wire** the existing `CreateSchoolYearModal` into the Ledger page (fix the orphan).
- Rename the top nav item from "School Year Ledger" to **"School Years"** (ledger remains the content).

### 2.4 Target UX

```
School Years  (top-level nav → AdminLedgerPage)
├── Toolbar: [Year ▾]  [Import from EnrollPro]  [New Year]  [Refresh]  [Export CSV]
├── Year banner: SY label · status badge · dates · EnrollPro ID
│    └── actions: Edit · Activate · Deactivate   (hidden per lifecycle rules)
├── KPI strip (revenue, kg sold, collected, reports, points, ranked)
├── Workbook: Reports | Points | Leaderboard | Market Sales | Market Stock
└── Empty/error/loading states per surface
```

Archived years remain **read-only**; the banner shows an "Archived" lock badge instead of actions.

---

## 3. Bug & Regression Risk Register

| ID | Severity | Bug / risk | Location | Fix |
| --- | --- | --- | --- | --- |
| B1 | High | Historical EnrollPro years never imported | `enrollpro-sync.service.ts:199-221` | List-driven mirror + import endpoint + manual create UI |
| B2 | High | SY end date = Term 1 end | `enrollpro-sync.service.ts:210-211` | Use max term end |
| B3 | High | No create UI; `CreateSchoolYearModal` orphaned | `AdminSchoolYearTab.tsx:3`, `CreateSchoolYearModal.tsx` | Wire into Ledger page |
| B4 | Medium | `school-years` double-mounts `AdminSchoolYearTab` + `AdminSettingsTab` | `AdminDashboard.tsx:417,573` | Remove `AdminSchoolYearTab` + sub-item |
| B5 | Medium | Deactivate auto-picks `inactiveYears[0]` with no chooser | `AdminSchoolYearTab.tsx:78-95` | Add explicit replacement selector in Ledger |
| B6 | Medium | No DB constraint for one-active year or unique label | `schema.prisma` (SchoolYear) | Partial unique index + unique label (only if data clean) |
| B7 | Medium | `useSchoolYear` 30s poll per consumer (3 independent pollers) | `useSchoolYear.ts:142-153` | Context/provider or single fetch + event bus |
| B8 | Low | Archived-year date/label non-uniqueness not checked against archive | `school-year.routes.ts:46-57` | Confirm intended policy |
| B9 | Low | Ledger caps at 1000 rows, no pagination | `school-year.routes.ts:366,483` | Document cap; add `rowsTruncated` UX (already present) |
| B10 | Low | Timezone off-by-one in `toLocaleDateString()` on UTC dates | Frontend lists | Normalize to date-only |
| B11 | Low | Deactivate route doesn't guard replacement already active | `school-year.routes.ts:284-329` | Add state validation |
| B12 | Info | Importing historical years must never trigger rollover | new code | Explicit guard + tests |

---

## 4. Implementation Plan

### Phase 0 — Contract & inventory freeze (no code)
- Confirm EnrollPro will/won't provide a list endpoint (owner: integration contact).
- Snapshot current DB counts (years, users per year, null `schoolYearId`) for rollback reference.
- Decide date semantics: inclusive/exclusive; store date-only at UTC midnight for SY boundaries.

### Phase 1 — Backend: EnrollPro school-year mirror
File: `server/src/services/enrollpro-sync.service.ts`
1. Add response type for a list payload and `fetchEnrollProSchoolYears()`.
2. Probe list endpoint; on `404`, set `supported:false` and preserve existing active-only behaviour.
3. In `runEnrollProSync()`, before roster fetch, mirror the returned years:
   - Upsert by `enrollproId`; new ones `isActive:false, isArchived:false`.
   - Update label/start/end for existing rows (skip archived? see B8 decision).
4. Keep `ensureSchoolYear()` only for the authoritative active year.
5. Fix term-end mapping (B2).

File: `server/src/routes/sync.routes.ts`
6. Add `POST /api/sync/school-years` (admin) → backfill all available EnrollPro years; returns `{ supported, created, updated, skipped }`.
7. Extend `GET /api/sync/enrollpro-school-year` with `listSupported: boolean`.

### Phase 2 — Backend: lifecycle hardening
File: `server/src/routes/school-year.routes.ts`
8. Add `PUT`-free, `PATCH`-only edits (already done) — keep.
9. Validate replacement year in `deactivate` is inactive & non-archived (B11).
10. Optional migration: partial unique index `is_active AND NOT is_archived` + unique `label` (B6) — only after Phase 0 confirms clean data.
11. Keep all error shapes stable (`{ error: { code, message } }`).

### Phase 3 — Frontend: unify Ledger + Management
Files: `AdminLedgerPage.tsx`, `CreateSchoolYearModal.tsx`, `EditSchoolYearModal.tsx`, `useSchoolYear.ts`, `api.ts`
12. Add a management header to `AdminLedgerPage`:
    - `New Year` → `CreateSchoolYearModal` (wire B3).
    - `Import from EnrollPro` → `POST /api/sync/school-years`, then refresh.
    - Contextual `Edit` (inactive only), `Activate`, `Deactivate` (with replacement chooser).
13. Add status badges + EnrollPro ID + snapshot/top-student detail (reuse `AdminSchoolYearTab` details markup).
14. Split the page to respect the <1000-line rule: extract `SchoolYearActions`/`SchoolYearDetailModal`/`SchoolYearToolbar` components.
15. Add `importSchoolYears` to `api.ts` and `useSchoolYear`.
16. Fix `useSchoolYear` polling duplication (B7): introduce a provider or dedupe with a module-level cache + `sort_schoolyear_updated` event (mirroring `sort_market_updated` pattern).

### Phase 4 — Navigation cleanup
File: `DashboardLayout.tsx`, `AdminDashboard.tsx`
17. Rename nav `{ id: 'admin-ledger', label: 'School Years' }`.
18. Remove `{ id: 'school-years' }` from `SETTINGS_SUBITEMS`.
19. Remove the `activeTab === 'school-years'` block and `AdminSchoolYearTab` import from `AdminDashboard.tsx`.
20. Delete `AdminSchoolYearTab.tsx` once its details markup is migrated.

### Phase 5 — Verification
21. Run `npm run build`, `npm run lint`, `npm --prefix server run build`.
22. Apply migration in an isolated DB and validate invariants.
23. Manual QA per §6.

---

## 5. API Contract Changes

| Method | Endpoint | Change | Auth |
| --- | --- | --- | --- |
| `GET` | `/api/sync/enrollpro-school-year` | add `listSupported`, `activeYear` | Admin |
| `POST` | `/api/sync/school-years` | **new** backfill mirror | Admin |
| `GET` | `/api/school-years` | unchanged | Admin |
| `POST` | `/api/school-years` | unchanged (create inactive) | Admin |
| `PATCH` | `/api/school-years/:id` | unchanged | Admin |
| `POST` | `/api/school-years/:id/activate` | unchanged | Admin |
| `POST` | `/api/school-years/:id/deactivate` | add replacement-state validation | Admin |
| `GET` | `/api/school-years/:id/ledger` | unchanged | Admin |

Backfill response example:
```json
{ "supported": false, "created": 0, "updated": 0, "skipped": 0,
  "message": "EnrollPro does not expose a school-year list endpoint; use manual creation." }
```

---

## 6. Test & Acceptance Matrix

### Backend
- [ ] With no list endpoint, sync behaviour is byte-for-byte compatible with today (no regression).
- [ ] With a mocked list endpoint, all 5 years mirror; only 1 active; historical years never trigger rollover.
- [ ] Backfill is idempotent (running twice creates 0 duplicates).
- [ ] Year end date uses the last available term end.
- [ ] `deactivate` rejects an invalid/already-active replacement.
- [ ] Exactly one active non-archived year after every mutation (concurrency test if index added).

### Frontend
- [ ] Single "School Years" nav item; Settings has no School Years sub-item.
- [ ] Year dropdown lists active + archived; selecting an archived year is read-only.
- [ ] Create/Edit/Activate/Deactivate work with loading, validation, and server error states.
- [ ] Import button reports `supported:false` gracefully.
- [ ] Detail (snapshots + top students) renders for archived years.
- [ ] No duplicate 30s polling requests in the network tab.
- [ ] Mobile layout has no horizontal scroll for primary actions.

### Build
- [ ] `npm run build`, `npm run lint`, `npm --prefix server run build` pass.

---

## 7. Safeguards Against Regression

1. **Feature detection, not assumption:** the list endpoint is optional; absence must not change current behaviour.
2. **Never roll over on import:** historical upserts create inactive years only.
3. **Keep route/error contracts:** no renames of existing endpoints or error codes.
4. **Additive DB changes only:** constraints added only after a clean-data report; otherwise transaction-level checks remain.
5. **Incremental deletes:** `AdminSchoolYearTab` is removed only after its detail markup is migrated into the Ledger.
6. **Idempotency:** backfill and rollover are retry-safe.
7. **Verification gate:** build + lint + backend build + manual QA before merge.

---

## 8. File Change Summary

| File | Change |
| --- | --- |
| `server/src/services/enrollpro-sync.service.ts` | List-endpoint detection, year mirror, term-end fix, no-rollover guard |
| `server/src/routes/sync.routes.ts` | `POST /sync/school-years`, extend status payload |
| `server/src/routes/school-year.routes.ts` | Replacement validation (+ optional constraints) |
| `server/prisma/schema.prisma` + migration | Optional unique label / one-active partial index |
| `src/services/api.ts` | `importSchoolYears` |
| `src/hooks/useSchoolYear.ts` | Import action, dedupe polling (B7) |
| `src/pages/admin/components/AdminLedgerPage.tsx` | Management header + detail + split into sub-components |
| `src/pages/admin/components/CreateSchoolYearModal.tsx` | Wire in (unused → used) |
| `src/pages/admin/components/EditSchoolYearModal.tsx` | Reused unchanged |
| `src/pages/admin/components/AdminSchoolYearTab.tsx` | Delete after migration |
| `src/components/layout/DashboardLayout.tsx` | Nav rename; remove Settings sub-item |
| `src/pages/admin/AdminDashboard.tsx` | Remove `school-years` block/import |

---

## 9. Open Decisions

1. Will EnrollPro expose a `school-years` list endpoint? (determines Option A vs B)
2. Should SORT allow manual creation of years **without** an `enrollproId`, or require one for linked years?
3. Archiving policy for existing inactive-but-unlinked years when a matching EnrollPro year is later imported (merge vs separate).
4. Should archived year labels/dates be editable for corrections, or remain immutable?
5. Date convention: store SY boundaries as UTC date-only midnight for all new/imported rows?
6. Is a PostgreSQL partial unique index acceptable for the one-active invariant?

---

## 10. Implementation Status (2026-09-11)

Implemented and verified:

**Backend**
- `enrollpro-sync.service.ts`: added `fetchEnrollProSchoolYears()`, `mirrorEnrollProSchoolYears()`, and `resolveSchoolYearRange()`. Since EnrollPro has **no list endpoint**, the catalog is **enumerated** from the active year: IDs are walked downward (with a consecutive-miss stop) and each year's label is resolved via `/school-year`, falling back to `/sections` then `/learners` (needed for years where EnrollPro returns `409 TERM_ORDER_INVALID`). Ranges use the last term end; years lacking term data derive dates from their label using the observed academic-calendar pattern. Sync mirrors the catalog and corrects existing active-year dates.
- `sync.routes.ts`: `POST /api/sync/school-years` (sync-only, never activates/rolls over).
- `school-year.routes.ts`: **removed** the manual deactivate endpoint (`POST /:id/deactivate`) — the active year is owned by EnrollPro. The `POST /school-years` create route remains for API compatibility but is no longer exposed in the UI.

**Frontend**
- `api.ts` + `useSchoolYear.ts`: added `importSchoolYears`; the hook now uses a shared module-level cache + single 30s poller (removes duplicate polling across consumers).
- `AdminLedgerPage.tsx`: single "School Years" surface with year selector, lifecycle banner (status, dates, EnrollPro ID, reports/sales), and actions: **Sync from EnrollPro**, Edit, Activate, Refresh, Export CSV. Manual "New Year" creation and "Deactivate" were removed — years and the active pointer come from EnrollPro.
- New `SchoolYearDetailModal.tsx` (snapshots + top students).
- `DashboardLayout.tsx`: top nav item renamed to **School Years**; removed Settings → School Years sub-item.
- `AdminDashboard.tsx`: removed the old management tab; `AdminSchoolYearTab.tsx` and `CreateSchoolYearModal.tsx` deleted.

**Verified**
- Live probe: `/integration/v1/school-year?schoolYearId=<id>` resolves IDs 5–9 (`2026-2027` … `2030-2031`); `/school-year` returns `409 TERM_ORDER_INVALID` for IDs 6 and 7, but their labels are recovered from `/sections`/`/learners`.
- Live mirror: catalog `source=ENUMERATED`, 5 years fetched, **3 created / 2 updated**. Local DB now has all 5 years; active `2030-2031` dates corrected to `2030-06-08 → 2031-04-08`.
- `npm run build`, `npm run lint` (0 errors), and `npm --prefix server run build` all pass.

**Note**
- Enumeration assumes school-year IDs are roughly sequential below the active year (true for EnrollPro). If the partner later exposes `GET /integration/v1/school-years`, it is used automatically and enumeration is skipped.
