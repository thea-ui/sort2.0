# Award Points on Collection (Not Verification) — Plan

> **Status:** Implemented (2026-09-14). See §13 Implementation Status.
> **Scope:** Move student report points (and rank bonuses) from **admin verification** to **MRF collection**, so reports that are never collected (expired by the 6 PM reset, dismissed, or dispatched-but-never-collected) never grant points.
> **Related:** `POINTS_SYSTEM_AND_CHALLENGES_PLAN.md`, `POINTS_SYSTEM_WORKHORSE_BRIEF.md`, `BIN_RESET_AND_ASSET_REPORT_RESET_PLAN.md`.

---

## 0. TL;DR

Today points are credited **the moment an admin verifies** a report (`report-points.service.ts`). The 6 PM bin reset then expires still-`PENDING` waste reports, so a student can keep points for a report whose trash was cleared before MRF ever collected it.

**Recommendation: award points at collection.** A student report earns points only when it reaches a successful terminal state:
- `COLLECTED` (waste) or `RESOLVED` (asset),
- never on `PENDING`, `DISPATCHED`, `EXPIRED`, or `DISMISSED`.

This also fixes a latent inconsistency: the MRF UI marks an entire cluster as collected client-side while the server only updates one report, so the other first-3 reporters would otherwise never be credited.

This **reverses** a recent deliberate decision (award at verification, tracked by `pointsAwardedAt`). That is intentional and must be confirmed (see §11).

---

## 1. Current Behaviour (evidence)

| Step | Where | What happens |
| --- | --- | --- |
| Verify (single/batch) | `server/src/routes/report.routes.ts:243-324` → `report-points.service.ts:30-222` | Locks the stream (`locationKey`+`category`+`schoolYear`), assigns `reporterRank` by `createdAt`, sets `isVerified`, `pointsAwarded`, `pointsAwardedAt`; **increments `user.points`**; creates `PointHistory`; records `REPORT_COUNT`/`HAZARDOUS_REPORT` challenge contributions |
| Collect / resolve | `report.routes.ts:151-241` | Sets `status=COLLECTED/RESOLVED`, `completedAt`; if `weightCollected>0`, records `WEIGHT_COLLECTED` challenge contribution (same transaction). **No points.** |
| 6 PM reset | `bin-reset.service.ts` | Expires `PENDING` waste reports (`EXPIRED`) — **points already granted at verify remain** |
| Points display | `ReportHistoryTab`, `AdminReportsTab`, `GamificationTab` | `pointsAwardedAt` non-null ⇒ "points awarded" |
| Certificates | `user.routes.ts:247,297` | Threshold on `user.points` |
| Rollover | `rollover.service.ts` | `user_point_snapshots` close on `user.points`, then reset |

Key consequence: **verification is currently the reward event.** `EXPIRED`/`DISMISSED` never reclaim points.

### Scenario walkthrough (current vs proposed)

| # | Lifecycle | Current points | Proposed points |
| --- | --- | --- | --- |
| 1 | Reported → verified → **not dispatched** → 6 PM reset expires | **Awarded** (kept) | 0 |
| 2 | Reported → verified → dispatched → **not collected** → reset (dispatched survives) | Awarded | 0 until collected |
| 3 | Reported → verified → dispatched → **collected** | Awarded | Awarded |
| 4 | Reported → **not verified** → reset expires | 0 | 0 |
| 5 | Reported → verified → dismissed before collection | Awarded (kept) | 0 |

---

## 2. Problem

- Points are decoupled from the physical outcome the reward is meant to represent.
- The reset intentionally expires uncollected work (chosen policy), but the points persist, so scoring no longer reflects collected waste.
- The cluster semantics make "first 3 reporters" fragile if only one report is server-collected.

---

## 3. Options

| Option | Behaviour | Trade-off |
| --- | --- | --- |
| **A. Award at collection (recommended)** | Rank + points granted when the report is `COLLECTED`/`RESOLVED`; `EXPIRED`/`DISMISSED` never earn | Cleanest; requires moving rank logic and fixing stream collection |
| B. Keep verify award, reclaim on expire/dismiss | Grant at verify, deduct + negative `PointHistory` when expired/dismissed | Preserves "instant" feedback; reclaim is messy (ranks can't be reused cleanly, certificates/challenges already fired) |
| C. Hybrid | Award at verify for waste, assets unchanged | Doesn't solve the reported problem |
| D. Status quo | Do nothing | Points remain for uncollected reports |

---

## 4. Recommended Design (Option A)

### 4.1 Lifecycle contract

| Status | Meaning | Points |
| --- | --- | --- |
| `PENDING` | Submitted, not yet approved | none |
| `PENDING` + `isVerified` | Admin approved (awaiting dispatch) | none |
| `DISPATCHED` | Assigned to MRF | none |
| `COLLECTED` | Waste collected by MRF | **awarded** |
| `RESOLVED` | Asset repaired/decommissioned (faculty ⇒ 0) | **awarded (0 for faculty)** |
| `EXPIRED` | 6 PM reset cleared before collection | none |
| `DISMISSED` | Admin marked invalid | none |

### 4.2 Rank semantics

- Rank is assigned **at collection**, among the reports of the same stream (`locationKey`+`category`+`schoolYear`) that are `COLLECTED`/`RESOLVED`, ordered by `createdAt` (submission order), skipping already-credited (`pointsAwardedAt != null`) rows.
- If the earliest reporters expired/dismissed, the next collected report becomes rank 1 — i.e. "first 3 **collected** reporters".
- Points come from `PointRule` (15/10/5/0). Faculty (`TEACHER`/`ADMIN`/`MRF`) get `rank=null`, `points=0`, still marked credited for audit.
- Ranks remain immutable once stored; a later collection continues from the stored max rank (reuse the existing `maxProcessedRank` logic).

### 4.3 Stream (cluster) collection — required fix

MRF completes one pin but a stream has several reports. Today the client fakes the cluster locally; the server updates one row. Under Option A this means other reporters never earn points.

**Fix (choose one, see §11 Q2):**
- **(b1) Server resolves the whole stream** — on transition to `COLLECTED`/`RESOLVED`, update all active reports in the same stream in one transaction, then award ranks/points to eligible students. Recommended (atomic, idempotent).
- **(b2) Client sends every cluster report id** to a batch-collect endpoint. Simpler server, more client coupling.

### 4.4 Challenges alignment

- `WEIGHT_COLLECTED` contributions already happen at collection — keep.
- `REPORT_COUNT` / `HAZARDOUS_REPORT` contributions currently fire at **verify** (`report-points.service.ts:195-202`). Move them to **collection** so expired reports can't advance challenges or grant challenge points.
- `ChallengeContribution` uniqueness (`userId`,`challengeId`,`reportId`) keeps retries idempotent.

### 4.5 Downstream timing

- **Leaderboard / `user.points`**: updates at collection; UI copy changes to "points are awarded after MRF collection".
- **Certificates**: threshold checks happen after the collection credit.
- **Rollover snapshots**: unchanged structurally (still closes `user.points`).
- **Ledger**: `pointsAwarded`/`PointHistory` totals now reflect collected reports only.

---

## 5. Data Model & Migration

- **Reuse `Report.pointsAwardedAt` as the "credited" marker**, now set at collection (not verify). `isVerified` keeps meaning "admin approved".
- **No schema change required.** Optional: add a helper index `(locationKey, category, schoolYearId, status)` already exists (`@@index([locationKey, category, schoolYearId])`).
- **Grandfather existing data:** reports already carrying `pointsAwardedAt`/`pointsAwarded > 0` keep their credit. Do **not** retroactively reclaim.
- **Optional reconciliation report** (read-only): list reports where `pointsAwardedAt != null` but `status NOT IN (COLLECTED, RESOLVED)` — these are the historical "verified but uncollected" grants. Decide whether to leave (recommended) or flag for manual review.

---

## 6. Backend Implementation

1. `report-points.service.ts`:
   - Split into `approveReports(ids)` (marks `isVerified`, does **not** credit points or challenges) and `awardCollectedReports(streamKey)` (rank + credit + challenge contributions for `COLLECTED`/`RESOLVED`).
   - Keep the advisory-lock transaction and `pointsAwardedAt: null` conditional guard (defense in depth).
2. `report.routes.ts`:
   - `PATCH /:id/status`: when status becomes `COLLECTED`/`RESOLVED`, within one transaction (a) resolve the stream per §4.3, (b) call `awardCollectedReports`, (c) record `WEIGHT_COLLECTED` (existing).
   - `verify` / `verify-batch`: call `approveReports` only.
3. `challenge-progress.service.ts`: call `recordReportContribution(...)` from the collection path, not verify.
4. Ensure `DISMISSED`/`EXPIRED` transitions never invoke awarding; guard idempotently (`pointsAwardedAt == null`).
5. Return award summaries from the collect endpoint so the MRF/admin UI can toast "X reports credited, +Y pts".

---

## 7. Frontend Implementation

| Area | Change |
| --- | --- |
| `useMockData.ts` (verify/collect calls) | Verify no longer implies points; collection returns award summary |
| `MRFDashboard` complete handler | Optionally send the cluster id list (b2) or rely on server stream resolution (b1) |
| `ReportHistoryTab` / `AdminReportsTab` | Show "Pending collection" (not "Pending verification") when `isVerified` and not credited; show points only when `pointsAwardedAt` is set |
| Gamification "How Points Work" | Copy: points are awarded **after MRF collects** the reported waste |
| Admin verify UI | Remove any "points awarded" messaging at verify time |
| Toasts | On collection: "Report collected — +N pts awarded" |

---

## 8. Edge Cases & Regression Register

| ID | Risk | Mitigation |
| --- | --- | --- |
| R1 | MRF collects only one report in a stream → others never credited | Server stream resolution (§4.3 b1) |
| R2 | Double credit on retry | `pointsAwardedAt: null` guard + advisory lock + transaction |
| R3 | Verify previously credited points; now it must not | Split functions; remove credit from verify |
| R4 | Challenge report contributions still fire at verify | Move to collection |
| R5 | Certificate issues below threshold after expiry | Never reclaim; expiry only prevents *future* credit |
| R6 | Faculty/asset reports | `rank=null`, `points=0`, still marked credited |
| R7 | Dismissed after collection | Already credited (allowed); decide no reclaim (recommended) |
| R8 | Rollover while reports pending collection | Pending reports simply never credit; snapshots unchanged |
| R9 | Legacy credited-but-uncollected rows | Grandfather; optional read-only report |
| R10 | `reporterRank` reuse semantics | Preserve immutable ranks; continue from stored max |

---

## 9. Test & Acceptance Matrix

- [ ] Verify sets `isVerified` but awards **0** points / no `PointHistory`.
- [ ] Collect (`COLLECTED`) awards rank + points to the first-3 student reporters by `createdAt`.
- [ ] Collecting one report resolves the whole stream; all eligible reporters credited.
- [ ] `EXPIRED` (6 PM reset) never credits points or challenges.
- [ ] `DISMISSED` never credits points or challenges.
- [ ] Retrying a collect is idempotent (no duplicate `PointHistory`/points).
- [ ] Faculty reports never receive points but are marked credited.
- [ ] `REPORT_COUNT`/`HAZARDOUS_REPORT` challenges advance only on collection.
- [ ] Leaderboard, certificates, ledger, and rollover snapshots reflect collection-time credit.
- [ ] Legacy credited rows are untouched.
- [ ] Builds + lint pass.

---

## 10. Phased Rollout

1. **Phase 0** — Confirm decision to reverse verify-time award; snapshot current credited-but-uncollected counts.
2. **Phase 1** — Split `approveReports` / `awardCollectedReports`; verify stops crediting.
3. **Phase 2** — Collection path resolves stream + awards + moves challenge contributions.
4. **Phase 3** — Frontend copy/state changes and award toasts.
5. **Phase 4** — Verification (builds, lint, targeted integration) and monitoring.

---

## 11. Open Decisions (resolved)

1. **Reversal:** ✅ award at collection instead of verification (confirmed).
2. **Stream resolution:** ✅ server-side whole-stream resolution.
3. **Rank basis:** among **collected, admin-approved** reports in submission order (unapproved/uncollected skipped).
4. **Reclaim / legacy grants:** ✅ never reclaim; existing credited rows grandfathered.
5. **Assets:** awarded on `RESOLVED` too (faculty ⇒ 0).
6. **Reset:** verified-but-uncollected `PENDING` reports still expire at 6 PM — now with **no points**.
7. **Verify vs dispatch (added):** ✅ **verification is a hard gate** — a report must be `isVerified` before it can be `DISPATCHED` (server returns `409 NOT_VERIFIED`). Keeps verify meaningful as the false-report gate; dismissed/expired reports can never be dispatched.

---

## 13. Implementation Status (2026-09-14)

**Backend**
- `server/src/services/report-points.service.ts`:
  - `approveReports(ids)` replaced `verifyReports` — marks `isVerified` (whole stream, as before) with **no points, ranks, or challenges**.
  - New `awardCollectedReportsWithinTransaction(tx, stream)` — advisory-locked; ranks the stream's `COLLECTED`/`RESOLVED`, approved reports by `createdAt` (continuing from stored max rank), increments `user.points`, writes `PointHistory` (`"Collected Report: …"`), and records `REPORT_COUNT`/`HAZARDOUS_REPORT` challenge contributions. Idempotent via `pointsAwardedAt: null`.
- `server/src/routes/report.routes.ts`:
  - `PATCH /:id/status`: on `COLLECTED`/`RESOLVED`, resolves the whole stream (all `PENDING`/`DISPATCHED` in the same location+category+SY) then awards points; response returns `awards` + `challengeCompletions`.
  - `POST /:id/verify` and `/verify-batch`: approval only (`awards: []`, `totalPoints: 0`).
  - **Dispatch gate:** `PATCH /:id/status` rejects `DISPATCHED` with `409 NOT_VERIFIED` unless the report is already verified (and rejects `DISMISSED`/`EXPIRED` with their codes). Verification therefore remains the required false-report gate.

**Frontend (copy/state)**
- `useMockData.dispatchReport`: now calls `verifyReport(id)` then the status update, so the "Approve & Dispatch" flow satisfies the server gate; on rejection it re-fetches the report list to reconcile (no false local dispatch).
- `AdminReportsTab`: the "Dispatch Collector" button is disabled while a group still has unverified reports (the "Verify All" button is shown first).
- `AdminCollectionsTab`: removed the redundant duplicate `updateReportStatus('DISPATCHED')` call.
- `ReportHistoryTab`: verified-not-collected now shows "Verified · Awaiting MRF collection"; dispatched shows "points after collection"; collected shows "Collected by MRF · Points Awarded".
- `AdminReportsTab`: verify modal shows "Awaiting MRF collection" once approved.
- `GamificationTab` and `AdminPointsSystemTab`: rules copy now say points are awarded after MRF collection.

**Verified (dev DB, with cleanup)**
- Approve → `isVerified: true`, `pointsAwarded: 0`, `pointsAwardedAt: null`.
- Collect → `status: COLLECTED`, `pointsAwarded: 15`, `reporterRank: 1`, `user.points +15`, `PointHistory [15]`.
- Dispatch gate → unverified dispatch returns `409 NOT_VERIFIED`; after verify it returns `200` with `status: DISPATCHED`, `isVerified: true`.
- `npm run build`, `npm run lint` (0 errors), `npm --prefix server run build` pass.

**Left as-is / follow-ups**
- Existing reports verified under the old rule keep their credit (grandfathered); the reset policy continues to expire uncollected `PENDING` waste reports — now with no points risk.
- Optional later: read-only reconciliation report of historical "credited but uncollected" rows.

---

## 12. File Change Summary

| File | Change |
| --- | --- |
| `server/src/services/report-points.service.ts` | Split approve vs award-on-collection; move rank/points/challenge logic to collection |
| `server/src/routes/report.routes.ts` | Verify = approval only; collect resolves stream + awards + weight challenge |
| `server/src/services/challenge-progress.service.ts` | Report-count contributions invoked on collection |
| `src/hooks/useMockData.tsx` | Verify no longer implies points; handle collection award summary |
| `src/pages/mrf/MRFDashboard.tsx` | Collect flow aligns with server stream resolution |
| `src/pages/student/components/ReportHistoryTab.tsx` | "Pending collection" vs "Points awarded" states |
| `src/pages/admin/components/AdminReportsTab.tsx` | Verify vs collect messaging; remove verify-time award copy |
| `src/pages/student/components/GamificationTab.tsx` | "How Points Work" copy update |
| `server/src/routes/user.routes.ts` | Unchanged (certificate threshold reads the same `user.points`) |
