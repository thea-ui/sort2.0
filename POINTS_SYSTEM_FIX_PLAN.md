# Points System Fix: Implementation Plan

> **⚠️ SUPERSEDED** — This plan was partially implemented (transactional verify service, `verify-batch`, `pointsAwardedAt`, `PointHistory.reportId` unique). The remaining work is covered by `POINTS_SYSTEM_AND_CHALLENGES_PLAN.md` (approved) and executed via `POINTS_SYSTEM_WORKHORSE_BRIEF.md`. Do not implement from this document.

## Goal and Invariants

Make report points deterministic, server-authoritative, and safe under repeated or concurrent verification.

- A report is ranked once per `locationName + category + schoolYearId` stream.
- Ranking is oldest eligible student report first (`createdAt`, then `id` as a stable tie-breaker).
- The configured `PointRule` for that rank determines the award; ranks without a rule receive `0`.
- A student report receives points at most once. Faculty reports never receive points and do not consume a rank.
- Verification must be idempotent: retries, polling, double-clicks, and multiple admin tabs cannot increment balances twice.
- `reports.pointsAwarded` and `reports.reporterRank` are the display source of truth. The client must not infer an award from rank.

## Findings From Code Review

### 1. The current server fix is not concurrency-safe

`server/src/routes/report.routes.ts:229-280` reads the cluster and then performs separate updates outside a transaction. Two requests can both see `pointsAwarded = 0`, award the same rank, and create duplicate `PointHistory` rows.

The proposed `pointsAwarded: 0` filter only reduces reprocessing. It does not serialize the read/award/write sequence. A transaction alone is also insufficient unless concurrent transactions lock a common row or use a serializable/advisory-lock strategy.

### 2. Ranking must not be based only on unawarded reports

Removing already-awarded reports before calculating rank causes later verification to shift ranks. Example: if rank 1 is already awarded, processing rank 2 as the only unawarded row would incorrectly give it rank 1 points.

Read the complete active stream, preserve existing awarded ranks, and assign ranks only to reports that have not been processed. If existing data is inconsistent, fail/reconcile it explicitly rather than silently changing awarded points.

### 3. `0` is both a valid award and the current “not processed” sentinel

The schema uses `pointsAwarded Int @default(0)`, while the 4th+ rule also awards `0`. Therefore `pointsAwarded === 0` cannot distinguish “not processed” from “processed with no points.” `reporterRank` and `isVerified` are not sufficient in every retry path, especially for faculty reports.

Use an explicit processed state, preferably `pointsAwardedAt DateTime?` (or an equivalent `pointsAwarded` nullable migration). Set it for every processed eligible report, including zero-point and faculty reports. Do not overload `0` as a state flag.

### 4. The client currently has multiple award paths

`src/hooks/useMockData.tsx` performs optimistic point calculations in `updateReportStatus` and `verifyReport`, while both also call the API. `dispatchReport` calls `verifyReport` and then sends another status update. This can produce local duplicate history entries and transient totals that the 2-second poll does not reliably undo.

`AdminReportsTab.tsx:109-149` calls `verifyReport` once per report. That is an avoidable N-request batch and makes the UI responsible for ordering. The server should expose a batch/group verification operation, or the existing endpoint must be made fully idempotent and concurrency-safe before this loop remains.

### 5. API and display gaps

`GET /api/reports` currently returns `pointsAwarded` but not `reporterRank` (`server/src/routes/report.routes.ts:64-84`). `Report` already has an optional `reporterRank` field, so add the field to every report response, including the create/update response shape used by the client.

The student display at `ReportHistoryTab.tsx:223-230` must remove the `50` workaround and all `15/10/5` fallback guesses. Pending means “not processed”; processed zero means `+0 PTS AWARDED` (or a clear “No points awarded” label). Do not show an estimated award.

The admin modal at `AdminReportsTab.tsx:792-801` can remain a pure rendering change only if the API supplies the fields. It should distinguish pending/unprocessed from processed zero-point reports and display rank whenever `reporterRank` is present, including rank 4+.

## Revised Implementation Plan

### Phase 0: Confirm data model and existing data

1. Confirm whether `schoolYearId` is part of the intended stream boundary. It should be, because reports and point histories are school-year scoped.
2. Confirm whether location matching is exact or should use a canonical bin/location ID. If names can be edited or differ in casing/whitespace, add/use a stable `wasteBinId` or normalize the value at submission. Do not use an approximate location match for ranking.
3. Inspect existing reports where `pointsAwarded > 0`, `isVerified` is true, or `reporterRank` is set inconsistently. Record a reconciliation rule before deploying the new awarder.

### Phase 1: Make server awarding atomic and idempotent

**File:** `server/src/routes/report.routes.ts` (prefer extracting the awarder to `server/src/services/report-points.service.ts`)

Implement one service used by single and batch verification:

1. Start a Prisma transaction.
2. Acquire a PostgreSQL advisory transaction lock derived from the stream key, or lock a dedicated stream row. A report-row lock is not enough because a new report can be inserted while the cluster is being ranked. Document the chosen lock and PostgreSQL requirement.
3. Load the complete stream in chronological order using the exact stream boundary and deterministic ordering: `createdAt ASC, id ASC`. Exclude only reports that are explicitly ineligible, such as `DISMISSED`; do not exclude already-awarded active reports from the ranking calculation.
4. Load point rules ordered by numeric rank. Validate duplicate/missing/negative rules according to product policy. Treat missing ranks as zero without changing existing awards.
5. For each report, preserve its existing `reporterRank` and processed award. For unprocessed reports, assign the next rank according to eligible student reports. Faculty reports are marked processed/verified but do not consume a student rank.
6. For each newly processed student report, update the report with `reporterRank`, `pointsAwarded`, `pointsAwardedAt`, and verification state; increment the user balance and create exactly one history row in the same transaction.
7. For zero-point reports and faculty reports, still write the processed marker and rank metadata required by the UI, but do not increment the user or create a positive history row.
8. Use conditional updates (`where: { id, pointsAwardedAt: null }`) or the lock plus a processed marker as a defense in depth. If the conditional update affects zero rows, do not create the balance/history side effects.
9. Obtain `schoolYearId` once before the loop and pass it into the transaction. Do not call `getActiveSchoolYearId()` repeatedly inside a transaction.
10. Return the updated reports and award summary so the client can replace its local cluster from the response.

Add a migration for `pointsAwardedAt` (or nullable points) and backfill existing awarded records. If adding a `reportId` to `PointHistory`, make it nullable for legacy rows, then add a unique constraint for report awards. This is the strongest duplicate-history safeguard and makes reconciliation auditable.

### Phase 2: Add an explicit batch verification operation

**Files:** `server/src/routes/report.routes.ts`, `src/services/api.ts`, `src/hooks/useMockData.tsx`, `src/pages/admin/components/AdminReportsTab.tsx`

Add `POST /api/reports/verify-batch` with a validated array of report IDs, or a stream-level endpoint if the UI always verifies an entire group.

- Authorize the endpoint as admin-only, validate non-empty IDs, deduplicate IDs, and cap the batch size.
- Group IDs by the canonical stream and invoke the same transactional award service per stream.
- Return authoritative updated reports, user totals if needed, and a summary of awarded/pending/zero-point reports.
- Change `handleVerifyGroup` and `handleVerifySelected` to await one batch request per stream rather than calling `verifyReport` in a synchronous `forEach` loop.
- Keep the single-report endpoint for one-row verification, but route it through the same service.

### Phase 3: Make the client server-authoritative

**File:** `src/hooks/useMockData.tsx`

- Remove optimistic increments to `users` and `pointHistory` from verification and final-status updates. A failed request must not leave fake points in local state.
- After a successful mutation, merge the returned reports and refresh users/reports as one operation. On failure, show an error and refresh the affected stream instead of silently swallowing the error.
- Ensure `dispatchReport` does not trigger a second points-awarding verification request. Use one status mutation with explicit `skipPoints` semantics, or call the shared server operation once.
- Replace every `pointRules.sort(...)` with a non-mutating copy (`[...pointRules].sort(...)`), including both `updateReportStatus` locations and `verifyReport`. Prefer a small `getRankPoints()` helper if it prevents future mutation regressions.
- Treat polling as eventual synchronization, not correctness protection. Do not rely on a 2-second poll to repair optimistic point/history changes.

### Phase 4: Fix response typing and displays

**Files:** `server/src/routes/report.routes.ts`, `src/types/index.ts`, `src/pages/student/components/ReportHistoryTab.tsx`, `src/pages/admin/components/AdminReportsTab.tsx`

- Add `reporterRank` and the processed marker to the API response and `Report` type. Keep response fields consistent for GET, POST, PATCH, and batch responses.
- Student history: show the actual `pointsAwarded` only when processed. Show `Pending Admin Verification` when unprocessed. Show `+0 PTS AWARDED` or `No points awarded` for processed zero-point reports. Remove `const rank = rep.reporterRank || 1` unless rank is used for a separate badge.
- Admin modal: show actual points; show `Rank #N` whenever rank exists; distinguish unprocessed from processed zero-point. Do not infer rank or points client-side.
- Ensure the server returns `reporterRank` for faculty reports if the UI is expected to explain why they received no points.

## Verification and Test Matrix

Prefer automated server/service tests against a test PostgreSQL database, plus a short manual UI pass.

1. Three student reports in one stream verified in one batch produce exactly `15/10/5` with ranks `1/2/3`.
2. Four student reports produce `15/10/5/0`; the fourth is marked processed and never receives a later award.
3. Faculty reports do not consume ranks and do not change faculty balances.
4. Reports from different categories, locations, or school years do not share ranks.
5. Equal timestamps use the stable `id` tie-breaker.
6. Repeating the same single request, batch request, or clicking Verify All twice leaves user balances and history counts unchanged.
7. Two concurrent verification requests for the same stream produce one consistent ranking and no duplicate history rows.
8. Verifying a later report after an earlier report was already awarded preserves the earlier report's rank and points.
9. A transaction failure rolls back report flags, user points, and point history together.
10. Existing awarded data is reconciled and remains unchanged after deployment.
11. Student history and the admin modal show actual values for awarded, pending, and processed-zero reports.
12. Run `npm run build` from the root and `npm run build` from `server`; run the repository's lint/test commands if configured.

## Scope and File Checklist

Expected implementation files, subject to the service extraction decision:

| File | Planned change |
|---|---|
| `server/prisma/schema.prisma` + migration | Add explicit processed/award idempotency metadata; optionally link history to report |
| `server/src/services/report-points.service.ts` | Transactional, locked, deterministic award logic |
| `server/src/routes/report.routes.ts` | Use service; add batch endpoint; expose rank/processed fields |
| `src/services/api.ts` | Add typed batch verification call |
| `src/hooks/useMockData.tsx` | Remove client award authority; fix non-mutating sort and mutation flow |
| `src/types/index.ts` | Type response metadata |
| `src/pages/student/components/ReportHistoryTab.tsx` | Render actual award state |
| `src/pages/admin/components/AdminReportsTab.tsx` | Use batch action and render actual award state |

Do not change `AdminReportsTab` only on the assumption that upstream data is sufficient: its batch action must be changed if the N-request loop remains. Do not purge production data as a verification step; use a test database or a clearly labeled development dataset.
