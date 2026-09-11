# TASK: Points System & Challenges — Full Implementation (Phases 0–6)

> **Status:** Approved for implementation. Execute phases in order; each has an exit gate that must pass before the next.
> **Source plan:** `POINTS_SYSTEM_AND_CHALLENGES_PLAN.md` (approved). This brief is the execution contract — where the source plan said "decide," the decision is now locked below. Where this brief and the source plan conflict, **this brief wins**.
> **Reference docs:** `ENROLLPRO-MRF-STUDENT-AUTH-AND-API-CATALOG.md` (not directly used here), `AGENTS.md` (file-size + design rules).
> **DB state at time of writing (2026-09-08, verified):** 1 report, 0 point history, 0 processed reports, 0 null-school-year reports, 2 challenge rows with non-attributable global progress ("Weekly Recycling Pioneer" progress=3; "Zero Single-Use Plastics" progress=1/completed). The audit phase is therefore light — do it, don't skip it.

---

## 0. Locked Decisions (do not re-litigate, do not improvise alternatives)

| # | Decision |
|---|----------|
| D1 | **Stream key** = `locationKey + category + schoolYearId`. `locationKey` is a NEW normalized column on `reports` (see Phase 1). Reports with `schoolYearId = null` form an **isolated legacy stream** — never mixed into active-year streams (delete the `OR schoolYearId: null` query). |
| D2 | **Ranking:** stored ranks immutable; next rank = **max stored `reporterRank` in the stream + 1** (fixes the current bug where `studentRank` restarts at 0 every run and re-awards rank 1). Zero-point ranks and faculty reports (rank null, 0 pts) are still marked processed via `pointsAwardedAt`. |
| D3 | **Awards happen ONLY** in `POST /api/reports/:id/verify` and `POST /api/reports/verify-batch`. `PATCH /:id/status` NEVER awards report points. `isVerified`/`skipPoints` in the status body → `400` with a clear message + `console.warn` the caller path. |
| D4 | **Empty `PointRule` table = 500 configuration error.** Delete every runtime `[15, 10, 5]` fallback (server `report-points.service.ts:89`, frontend `useMockData.tsx:463-472`). |
| D5 | **Batch verify = fail-fast:** any unknown ID → `404 {error, missingIds}` and any dismissed ID → `400 {error, dismissedIds}`, both **before any mutation**. No partial processing of bad batches. |
| D6 | **Weight challenges = lock-first-value:** the first qualifying collection event records the contribution; later weight corrections do NOT adjust it (unique key makes re-contribution a no-op). |
| D7 | **Challenge policy:** event-driven, students only, per-user progress; no historical progress inferred; global `progress`/`completed` columns are dropped and their current values discarded (they cannot be attributed — approved). Completion clamps to target and rewards exactly once (DB partial unique index + conditional update, not in-memory checks). |
| D8 | **Auth expansion (beyond source plan):** extract shared middleware `server/src/middleware/auth.ts` (`authenticate`, `requireAdmin` — copy the existing pattern from `school-year.routes.ts:11-30`, it is duplicated in 4 route files). Apply: ALL report routes require auth; `GET /` any authenticated role; `POST /` any authenticated (reporterId derived from JWT — **delete the client-supplied `reporterId`/`reporterEmail` handling and the random-student fallback** at `report.routes.ts:105-116`); `PATCH /:id/status` ADMIN or MRF; verify endpoints + `DELETE /purge` ADMIN only; challenge routes: `GET` any authenticated, mutations ADMIN only. |
| D9 | **`useMockData.tsx` is 1,056 lines — already over the AGENTS.md 1,000-line cap.** Phase 6 must bring it (and every new module) under 1,000. |
| D10 | **Landing page after auth lockdown:** unauthenticated landing components fall back to local seed data (verified pre-existing behavior — `.catch` fallbacks). Do NOT keep report endpoints public for the landing's sake. Verify in UI checks that the logged-out landing still renders (seed activity, no crash). |
| D11 | **Tests:** add `vitest` (devDependency, server only) with a dedicated `sortv2_test` database; script `"test": "vitest run"`. Run the source plan's Phase 5 case matrix (§below). |
| D12 | **Existing 2 challenge rows** migrate to: `Weekly Recycling Pioneer` → code `WEEKLY_RECYCLING_PIONEER`, type `REPORT_COUNT`; `Zero Single-Use Plastics` → code `ZERO_SINGLE_USE_PLASTICS`, type `REPORT_COUNT`. Keep existing title/description/pointsAwarded/target/iconName. Both `isActive: true`, open windows (null dates). |
| D13 | **Admin challenge management UI (NEW):** a settings sub-tab panel gives admins full control — list/create/edit/**activate-deactivate**/delete challenges — backed by the Phase 4 API. Core fields (`code`/`challengeType`/`target`/`pointsAwarded`) become read-only in the edit form once any user progress exists (mirrors the API's 409 rule); everything else (`title`/`description`/`iconName`/`startDate`/`endDate`/`isActive`) stays editable. See Phase 6 item 7. |

---

## Phase 0 — Audit snapshot (light, mandatory)

1. Run and record: schema dump (`npx prisma db pull` to a temp file or `migrate diff`), active school year, `PointRule` rows, challenge rows (verbatim), report/point-history counts, per-student `points` balances.
2. Run the source plan's audit queries (§Phase 0.2). Expected result given current DB: all zero anomalies. **If any anomaly exists, STOP and report — do not mutate.**
3. Confirm ≥1 `PointRule` rows per rank 1-3 exist (or seed them via the Phase 5 upsert BEFORE removing runtime fallbacks — see phase ordering note below).

**Gate 0:** audit output recorded in the report; zero anomalies (or STOP).

---

## Phase 1 — Schema + migration

Implement the source plan §Phase 1 Prisma models **verbatim** (`ChallengeType` enum; reworked `Challenge` with `code`/`challengeType`/`isActive`/dates, dropping `progress`/`completed`; `UserChallengeProgress`; `ChallengeContribution`; `PointHistory.challengeId` + relations; `Report.pointHistory`/`Report.challengeContributions` relations) **plus these amendments:**

- **Add to `Report`:** `locationKey String @map("location_key")` + `@@index([locationKey, category, schoolYearId])`. Normalization: `value.trim().toLowerCase().replace(/\s+/g, ' ')`.
- **Migration includes:** backfill `location_key` for existing rows (normalize `location_name` in SQL: `lower(trim(regexp_replace(location_name, '\s+', ' ', 'g')))`); backfill the two challenge rows per D12 (stable `code`, `challenge_type='REPORT_COUNT'`, then enforce unique); the partial unique index as raw SQL:
  ```sql
  CREATE UNIQUE INDEX "point_histories_user_challenge_unique"
    ON "point_histories"("user_id", "challenge_id")
    WHERE "challenge_id" IS NOT NULL;
  ```
- Versioned `prisma migrate dev` migration ONLY (no `db push`). Test `migrate deploy` against a **copy** of the dev DB before touching the real one.

**Gate 1:** `prisma validate` + `prisma generate` + `migrate deploy` succeed on the copy; row counts unchanged; inserting a duplicate `ChallengeContribution` (user+challenge+report) and a duplicate challenge `PointHistory` (user+challenge) are both rejected by the DB.

---

## Phase 2 — Canonical report-awarding service

Rewrite `server/src/services/report-points.service.ts` per source plan §Phase 2 requirements 1–13, specifically:

- Canonical stream key helper (single source of truth) used for grouping, the advisory lock key, and the stream query — `locationKey + category + schoolYearId` from the **report's own** `schoolYearId` (never `getActiveSchoolYearId()` fallback at verify time — remove `report-points.service.ts:76`). Null-SY reports stream together as their own legacy stream (`schoolYearId: null` group).
- **D2 ranking fix:** load max stored `reporterRank` among processed reports in the stream; `studentRank` starts at that max; processed reports (`pointsAwardedAt != null`) are skipped entirely (preserved as stored).
- Point rules loaded inside the transaction; empty table → throw (→ 500).
- Zero-point and faculty reports still get `pointsAwardedAt` set; `PointHistory` only for positive awards.
- Conditional `updateMany` with `pointsAwardedAt: null` guard stays (defense in depth).
- Challenge contributions invoked **inside the same transaction** via the Phase 4 service, passing the `tx` client (never a second `PrismaClient`).
- Dismissed targets rejected with 4xx before any transaction opens.
- Return shape: source plan §5 (single + batch contracts), including `alreadyProcessed`.

**Gate 2:** unit/integration tests (Phase 5 harness, added now, filled progressively) pass for: rank 1/2/3 from rules; rank 4 zero points; faculty rank-null; repeat verify idempotent; concurrent verify (two parallel calls, one award set); processed-then-new-report rank > max stored; dismissed rejected; different school years are separate streams; equal timestamps tie-break by id.

---

## Phase 3 — Routes, contracts, auth

`server/src/routes/report.routes.ts`:

1. Create `server/src/middleware/auth.ts` (D8) exporting `authenticate` and `requireAdmin` (+ `requireRole(...roles)` helper for the ADMIN-or-MRF case). Refactor `school-year.routes.ts`, `sync.routes.ts`, `user.routes.ts` to import from it (pure dedup, no behavior change).
2. `POST /:id/verify` (NEW): `requireAdmin`; calls the service with one ID; idempotent `alreadyProcessed` result on repeat.
3. `POST /verify-batch`: `requireAdmin`; validate array/non-empty/strings/dedupe/max 50; **D5 fail-fast** 404/400 before mutation.
4. `PATCH /:id/status`: `requireRole('ADMIN','MRF')`; lifecycle fields only (`status`, `assignedMrfId`, `weightCollected`, completion notes/timestamp); **D3**: reject `isVerified`/`skipPoints`/`pointsAwarded` in body with 400 + warning log. On transition to `COLLECTED`/`RESOLVED` with positive weight → invoke weight-challenge contribution in the same transaction (idempotent via unique key, D6).
5. `POST /` (create): `authenticate`; `reporterId` from `req.user.id`; remove `reporterId`/`reporterEmail` body handling and the random-student fallback; set `locationKey` (normalized) on create; move the duplicate-active-report check to `locationKey + category` (same user).
6. `GET /`: `authenticate` (any role). Keep existing filters.
7. `DELETE /purge`: `requireAdmin`.
8. Consistent error shapes (`{ error, code? }`); no stack traces.

**Frontend caller migration (part of this phase, server must not ship before callers stop sending forbidden fields):** grep `src/` for `isVerified`/`skipPoints`/`pointsAwarded` in status-update call sites (`useMockData.updateReportStatus`, MRF components) and remove them; switch verification to `verifyReport(id)` / `verifyReportsBatch(ids)` API methods (add to `api.ts` typed per §5 — batch shape: `updatedReports`, `awards`, `challengeCompletions`, `summary`).

**Gate 3:** API tests: unauthorized (401) / student-forbidden (403) on verify+purge; verify single + batch happy paths; status patch with `isVerified` → 400 and zero point mutation; status patch to RESOLVED with weight → exactly one weight contribution (repeat patch → still one); MRF can patch status, student cannot; logged-out landing page renders seed data (browser check).

---

## Phase 4 — Challenge service + API

1. `server/src/services/challenge-progress.service.ts`: transaction-client functions only. `recordReportContribution(tx, report, event)` for REPORT_COUNT/HAZARDOUS (called from Phase 2 verify tx) and `recordWeightContribution(tx, report, kg)` (called from Phase 3 status tx). Logic per source plan §Phase 4 steps 1–9: load active challenges matching type + date window at event time; skip non-students/dismissed; unique-key contribution attempt (conflict → no-op return); upsert `UserChallengeProgress`, increment, clamp to target; conditional completion transition (`completedAt`/`rewardedAt` set once, guarded against concurrent cross via the partial unique index on `point_histories`); increment user points + one `PointHistory` row linked by `challengeId` only on the successful completion transition.
2. `server/src/routes/challenge.routes.ts`: `GET /api/challenges` (authenticated; definitions flattened with caller's progress/completed/completedAt); `GET /api/challenges/admin` (admin; all definitions + aggregate stats — users in progress, completed count, total contributions — plus `hasProgress` boolean per challenge so the edit UI knows which fields are locked); `POST` (admin; validate title/code/type/positive target/non-negative reward/valid dates); `PATCH /:id` (admin; `code`/`challengeType`/`target`/`pointsAwarded` **immutable once any progress exists** → 409); `DELETE /:id` (admin; 409 if progress/contributions exist — offer deactivation semantics via `PATCH isActive`). Register in `server/src/index.ts` before any parameterized catch-all.

**Gate 4:** tests: contribution dedupe (same report verified twice → one contribution); completion race (two concurrent events crossing target → exactly one reward + one ledger row); out-of-window challenge → no progress; non-student reporter → no progress; immutable-field PATCH → 409; unauthorized mutations → 401/403; `GET /admin` stats counts are correct for seeded progress data; student token on `/admin` → 403.

---

## Phase 5 — Seed + test harness

1. `server/prisma/seed.ts`: upsert `SystemSetting` + `PointRule` (ranks 1-3 = existing configured values, e.g. 15/10/5 — read current DB before writing) + challenges by stable `code` (D12); zero user progress seeded; never delete reports/history/offenses; purge stays a separate explicit script.
2. Vitest per D11: `server/vitest.config.ts`, `server/src/tests/` with a global setup that (a) requires `DATABASE_URL_TEST`, (b) runs `migrate deploy`, (c) truncates relevant tables between tests. Create `sortv2_test` DB if it doesn't exist (document the command). Minimum cases: source plan §Phase 5 table (17 rows) — Gates 2/3/4 already cover most; consolidate into the suite.

**Gate 5:** `npm test` (server) green on the dedicated DB; `npm run db:seed` idempotent (run twice, no dupes/errors).

---

## Phase 6 — Frontend authority refactor

1. **Split `useMockData.tsx` (1,056 lines) first** into focused hooks (keep the provider as composition only): `useAuthState`, `useReportActions`, `useChallengeState`, `usePointsSync` (shared refresh helper). Every file < 1,000 lines.
2. Remove: `DEFAULT_CHALLENGES` as authority (`useMockData:69`), local challenge progress mutation + `addChallengeRewardPoints` (:663) + `completeChallenge` (:806), frontend `[15,10,5]` fallbacks (:463-472), all optimistic point mutations. `localStorage` = read-cache only; server response always wins; on API failure keep last server state + surface error.
3. `api.ts`: typed `getChallenges`/`createChallenge`/`updateChallenge`/`deleteChallenge`, typed verify methods; remove `pointsAwarded`/`skipPoints` from status-update input; shared `Report`/`Challenge`/award types (no `any`).
4. `types/index.ts`: `ChallengeType`, challenge date/completion fields, `alreadyProcessed`/`amount`/`rank` award types, `PointHistory.challengeId`.
5. UI (minimal edits, existing design tokens): `AdminReportsTab` → batch endpoint + display returned totals; `ReportHistoryTab` → show `pointsAwarded` only when `pointsAwardedAt` exists, distinguish pending/zero/positive; `GamificationTab` → API progress, clamp %, server completed state; `SubmitReportTab:333,799` + `AdminPointsSystemTab:15-18` → derive point text from fetched rules or neutral wording (remove hardcoded 15/10/5 copy); MRF components → lifecycle fields only.
6. After any mutation: refresh authoritative server data (parallel fetches, no waterfalls).
7. **Admin Challenges management panel (D13):**
   - New `src/pages/admin/components/settings/AdminChallengesTab.tsx`, wired into `AdminSettingsTab.tsx` as a new sub-tab (follow the existing pattern: import at ~line 27 area, render at ~line 257/421 area — e.g. `activeSubTab === 'challenges'`). Label it "Challenges" in the sub-tab nav using the existing nav-item styling.
   - **List view:** table/cards of all challenges showing title, code, type badge, target (raw count or kg with one decimal), reward points, date window (or "No window"), status pill (Active/Inactive), and aggregate stats per challenge (users in progress, completed count — from the Phase 4 `GET /api/challenges/admin` endpoint; students never see stats). Sort: active first, then by `createdAt` desc.
   - **Create modal:** fields — title, code (required, monospace input, must match `/^[A-Z0-9_]+$/`, auto-suggest uppercase-with-underscores from title as the user types until they manually edit), challengeType (select: REPORT_COUNT / WEIGHT_COLLECTED / HAZARDOUS_REPORT), target (positive int; helper text shows grams ↔ kg for WEIGHT_COLLECTED, e.g. "25000 g = 25 kg"), pointsAwarded (non-negative int), iconName (text; default `Target`), startDate/endDate (optional date inputs; validate start < end client-side), description (textarea). Submit → `createChallenge`, refresh list, success toast.
   - **Edit modal:** same fields, but `code`/`challengeType`/`target`/`pointsAwarded` render read-only (with a small lock icon + tooltip "Locked — users have progress on this challenge") when the challenge has any progress; still editable when progress-free. `isActive` is NOT in the edit modal — it has a dedicated toggle.
   - **Activate/Deactivate toggle:** inline switch/button per row → `updateChallenge(id, {isActive})`. Deactivated challenges show muted styling. Confirm dialog on deactivate only if the challenge has active progress ("N users are mid-progress; deactivating hides it from their list but preserves their progress").
   - **Delete:** button per row → `deleteChallenge(id)`; on 409 show the API message and suggest deactivation instead. Confirmation dialog always.
   - **Error/loading/empty states:** loading spinner, empty state with "Create your first challenge" CTA, API errors as toast + retained last-known list (never blank out).
   - Use the existing modal/toast/pill conventions from `AdminSchoolYearTab` (Create/EditSchoolYearModal) — same rounded-2xl cards, `#00A77C` action color, amber for warnings per AGENTS.md. Keep the file under 1,000 lines; extract the modals into `ChallengeFormModal.tsx` if the tab grows.

**Gate 6 (final):** `npm run build` + `npm run lint` (frontend), `npm run build` + `npm test` (server) — all green in touched files; browser checks: student sees pending → verified → points flow from server data only; admin batch-verify shows award summary; challenge card shows real progress; no localStorage-fabricated rewards; **admin Challenges panel: create → appears in list; deactivate → hidden from student challenge list while progress preserved; edit a progress-bearing challenge → core fields locked; delete a progress-bearing challenge → 409 surfaced with deactivation suggestion; student account cannot reach the panel (sub-tab hidden or access-denied state).**

---

## Constraints

- **Do NOT touch:** `server/src/routes/settings.routes.ts` (38 pre-existing TS errors, other in-flight work), `AdminCollectionsTab.tsx`, `AdminImpactTab.tsx` (3 pre-existing frontend errors). Flag, don't fix.
- **Out of scope:** `GET /api/users` public exposure (same PII class as reports — observed, will be scoped separately; do not refactor user routes beyond the middleware dedup in Phase 3.1); password/SSO work; MRF identity feed.
- No comments unless required by existing style; no emoji in code; design tokens per AGENTS.md for any UI changes.
- **Do NOT commit** — leave changes in the working tree.
- Never log/seed credentials; test DB only via `DATABASE_URL_TEST`.
- If any gate fails twice with the same root cause: STOP, record evidence, report — do not improvise schema or contract changes beyond this brief.

## Report back

Per phase (0–6): status, gate results with outputs (commands + exit codes), the audit snapshot, migration name + deploy proof, test run summary (N passed/failed), files changed with line references, the logged-out landing check result, any STOP conditions hit, and any deviation with reasoning.
