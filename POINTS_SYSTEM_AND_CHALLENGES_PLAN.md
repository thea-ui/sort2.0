# Points System and Accumulation Challenges Plan

**Status:** Planning only. Do not implement until this plan is approved.  
**Revised:** September 5, 2026  
**Priority:** High  
**Scope:** Server-authoritative report points, verification correctness, and per-user accumulation challenges.

## 1. Objective

Make points and challenge rewards trustworthy under retries, concurrent admin actions, status changes, and multiple browser sessions.

The finished system must guarantee:

1. Only the server calculates and awards points.
2. A report can produce at most one report-point ledger entry.
3. A challenge can produce at most one reward per user, enforced by both the transaction and a database constraint.
4. Verification is idempotent and concurrency-safe.
5. Challenge progress is per user, not global.
6. School year and report stream boundaries are explicit and consistent.
7. Existing awarded points are preserved; no silent recalculation occurs.
8. The frontend displays server results and never manufactures point history.

## 2. Repository Reality

This plan is based on the current repository, not the original mockup assumptions.

### Already present

- `server/src/services/report-points.service.ts` already contains transactional stream verification and PostgreSQL advisory locking.
- `server/src/routes/report.routes.ts` already exposes `PATCH /api/reports/:id/status` and `POST /api/reports/verify-batch`.
- `PointHistory.reportId` is already optional and unique, which is useful idempotency protection.
- `PointRule` and `/api/settings/point-rules` already exist.
- `Challenge` exists, but its `progress` and `completed` fields are global and cannot represent user progress.
- `src/hooks/useMockData.tsx` still owns local challenge rewards, optimistic state, localStorage persistence, and API synchronization.

### Known defects to fix

| Area | Current problem | Required correction |
|---|---|---|
| Stream key | Verification groups by location/category while the lock also includes school year; null school-year reports are mixed with active-year reports. | Use one canonical stream key everywhere: normalized location, category, and school year. |
| Ranking | Already processed reports are skipped without advancing the next rank. | Preserve stored ranks and initialize the next rank from the maximum stored rank. |
| Award trigger | Status updates can pass `isVerified: true` from dispatch/collection flows and accidentally award points. | Make verification the only award entry point; status changes never award points. |
| Award state | `pointsAwarded === 0` is ambiguous. | Treat `pointsAwardedAt` as the processed marker, including legitimate zero-point awards. |
| Point authority | The service and frontend contain `[15, 10, 5]` fallbacks/calculations. | Remove all point constants from runtime logic; read `PointRule` on the server. |
| Batch response | Existing response uses `updatedReports`, `amount`, `rank`, and `total*` summary fields; the old plan described another shape. | Keep one documented response contract and type it in the client. |
| Challenge state | Challenges are hardcoded and local progress can award duplicate rewards. | Persist challenge definitions, per-user progress, and idempotent contribution records. |
| Challenge reward ledger | A transaction-only completion check is not enough to protect against future code paths. | Link rewards to `challengeId` and enforce a database-level partial unique index for user/challenge rewards. |
| Challenge seed | Seed data is global, partially completed, and only created when the table is empty. | Use stable challenge codes and idempotent upserts; never seed fake user progress. |
| Authorization | Report and verification routes currently do not consistently enforce roles. | Require authentication and admin role for verification and challenge administration. |
| File size | `useMockData.tsx` is already over the repository’s 1,000-line limit. | Extract points/challenge synchronization before adding feature logic. |

## 3. Decisions Required Before Coding

These are proposed defaults. Approval should confirm them before implementation.

### 3.1 Report stream identity

```text
stream = normalize(locationName) + category + schoolYearId
```

- Normalize location once for matching: trim, collapse whitespace, and compare case-insensitively.
- Prefer a stable location ID in a future schema change; for this scope, use the canonicalized `locationName` already stored on reports.
- `category` is the database enum value.
- `schoolYearId` is mandatory for new reports and is never silently replaced by the current active year during verification.
- Legacy reports with `schoolYearId = null` must be reconciled before deployment. They must either be assigned to a verified school year or remain in an isolated legacy stream. They must not be mixed into an active-year stream by an `OR schoolYearId IS NULL` query.

### 3.2 Ranking policy

- A stream is ordered by `createdAt ASC, id ASC`.
- The first successful verification of a stream assigns ranks to all currently unprocessed, non-dismissed student reports in that stream.
- Faculty/admin/MRF reports are processed with rank `null` and points `0`; they do not consume a student rank.
- Stored ranks and awards are immutable after processing. Later verification requests do not reorder already processed reports.
- A student rank without a matching configured point rule receives `0` points but is still marked processed.
- Changing `PointRule` affects future awards only. Historical `pointsAwarded` values are never recalculated.

This policy intentionally favors stable awards over retroactively changing a student’s rank when an earlier report is verified later.

### 3.3 Verification policy

- `POST /api/reports/:id/verify` and `POST /api/reports/verify-batch` are the canonical admin verification actions.
- Both call the same service and return idempotent results.
- `PATCH /api/reports/:id/status` is for lifecycle/status data only. It must not award points, even when changing `COLLECTED` or `RESOLVED`.
- Existing frontend callers must migrate away from sending `isVerified` or relying on `skipPoints` to control awards. During migration, reject or ignore those fields with a clear API response rather than guessing.
- Dismissed reports cannot be verified or awarded.

### 3.4 Challenge qualification policy

Challenges are event-driven and count only actions performed after the feature is deployed. No historical progress is inferred unless explicitly approved.

| Challenge type | Qualifying event | Increment | Deduplication key |
|---|---|---:|---|
| `REPORT_COUNT` | A student report is successfully verified and is not dismissed. | `1` | user + report + challenge |
| `HAZARDOUS_REPORT` | A verified, non-dismissed report has category `HAZARDOUS`. | `1` | user + report + challenge |
| `WEIGHT_COLLECTED` | A report reaches collection/resolution with a valid positive weight. | Integer grams (`round(weightCollectedKg * 1000)`) | user + report + challenge |

- Challenge activity windows use `startDate` inclusive and `endDate` exclusive. A null boundary is open-ended.
- A report contribution is evaluated at the qualifying event time, not by repeatedly scanning all reports.
- Only student reporters can earn challenge progress/rewards.
- Challenge completion clamps progress to `target` and awards once.
- `completeChallenge` is removed from the client; users cannot manually complete a challenge.

## 4. Delivery Sequence

Implement in this order. Each phase must pass its exit criteria before the next phase starts.

### Phase 0: Baseline, audit, and migration design

**Goal:** Understand existing data before changing award behavior.

Tasks:

1. Record the current database schema, active school year, point rules, challenge rows, report counts, point-history counts, and student balances.
2. Run an audit for:
   - `pointsAwarded > 0` with no `pointsAwardedAt`.
   - `pointsAwardedAt IS NOT NULL` with no matching `PointHistory.reportId`.
   - Multiple point-history rows per report, if legacy data bypassed the unique constraint.
   - `isVerified = true` with no processing timestamp.
   - Reports with `schoolYearId IS NULL`.
   - User balance versus the sum of point history, accounting for deductions and other point sources.
3. Produce a reconciliation report. Do not mutate ambiguous records automatically.
4. Decide the school year for every legacy report or mark it as an isolated legacy stream.
5. Snapshot the current challenge rows. Existing global `progress` and `completed` values cannot be attributed to users and must not become rewards.
6. Confirm the active `PointRule` rows. Seed/configure rules before removing runtime fallbacks.

Exit criteria:

- A written list exists for every ambiguous report and every null-school-year report.
- The migration decision is approved for production data.
- A rollback/backup procedure is documented.

### Phase 1: Data model and safe migration

**Goal:** Add explicit challenge state and preserve existing point data.

Update `server/prisma/schema.prisma`:

```prisma
enum ChallengeType {
  REPORT_COUNT
  WEIGHT_COLLECTED
  HAZARDOUS_REPORT
}

model Challenge {
  id              String        @id @default(uuid())
  code            String        @unique
  title           String
  description     String
  pointsAwarded   Int           @map("points_awarded")
  target          Int
  challengeType   ChallengeType @map("challenge_type")
  iconName        String        @map("icon_name")
  isActive        Boolean       @default(true) @map("is_active")
  startDate       DateTime?     @map("start_date")
  endDate         DateTime?     @map("end_date")
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  userProgress    UserChallengeProgress[]
  contributions   ChallengeContribution[]

  @@index([isActive, startDate, endDate])
  @@map("challenges")
}

model UserChallengeProgress {
  id           String     @id @default(uuid())
  userId       String     @map("user_id")
  challengeId  String     @map("challenge_id")
  progress     Int        @default(0)
  completed    Boolean    @default(false)
  completedAt  DateTime?  @map("completed_at")
  rewardedAt   DateTime?  @map("rewarded_at")
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")

  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  challenge    Challenge  @relation(fields: [challengeId], references: [id], onDelete: Cascade)

  @@unique([userId, challengeId])
  @@index([userId, completed])
  @@map("user_challenge_progress")
}

model ChallengeContribution {
  id           String     @id @default(uuid())
  userId       String     @map("user_id")
  challengeId  String     @map("challenge_id")
  reportId     String     @map("report_id")
  amount       Int
  createdAt    DateTime   @default(now()) @map("created_at")

  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  challenge    Challenge  @relation(fields: [challengeId], references: [id], onDelete: Cascade)
  report       Report     @relation(fields: [reportId], references: [id], onDelete: Cascade)

  @@unique([userId, challengeId, reportId])
  @@index([userId, challengeId])
  @@map("challenge_contributions")
}
```

Also add these fields/relations:

- `PointHistory.challengeId String?`, `challenge Challenge?`, and the existing optional `reportId` relation to `Report`.
- A PostgreSQL partial unique index on `point_histories(user_id, challenge_id) WHERE challenge_id IS NOT NULL`; this preserves existing non-challenge history while enforcing one challenge reward per user/challenge. Keep the index in the migration because Prisma compound uniqueness with an optional field is provider/version-sensitive.
- `User.challengeProgress` and `User.challengeContributions` relations; retain the existing `User.pointHistories` relation for both report and challenge ledger rows.
- `Challenge.pointHistories` relation.
- `Report.pointHistory PointHistory?` and `Report.challengeContributions` relations.

Use integer grams consistently for weight challenge `target`, `progress`, and contribution `amount`; for example, a 25 kg target is stored as `25_000`. Convert only at API/UI boundaries. This avoids the current `Float` report field being silently truncated and keeps atomic increments exact.

Migration rules:

- Use a version-controlled Prisma migration. Do not use `db push` for this change.
- Add `code` with a temporary default only if required by PostgreSQL, backfill stable codes, then enforce uniqueness.
- Add `code` and challenge type mappings before removing legacy global progress/completion fields; existing challenge definitions with no approved type must be disabled until an admin classifies them.
- Do not create `UserChallengeProgress` rows from the old global progress.
- Do not create challenge reward history for old global completions.
- Preserve `PointHistory`, report award fields, and user balances.
- Backfill `pointsAwardedAt` only for records proven to be already processed. For ambiguous zero-point or verified records, use the approved reconciliation decision.
- Add/verify indexes for stream lookup: normalized location is not currently stored, so either add a canonical location column or document the normalized query strategy. Prefer adding `locationKey` if query performance requires it.

Exit criteria:

- `prisma migrate deploy` succeeds on a copy of the current database.
- Row counts and awarded balances are unchanged except for explicitly approved reconciliation updates.
- Duplicate contribution and duplicate challenge reward inserts are rejected by the database.

### Phase 2: Canonical report awarding service

**Goal:** Make one small service the only report-point authority.

Refine `server/src/services/report-points.service.ts` rather than creating a duplicate service.

Required behavior:

1. Validate all requested report IDs and reject missing or dismissed targets with a useful 4xx error.
2. Deduplicate IDs and group targets by the complete canonical stream key.
3. Sort stream groups before processing to make batch behavior deterministic and reduce lock-order deadlocks.
4. Open one transaction per stream and acquire the advisory transaction lock using the exact canonical key.
5. Load all non-dismissed reports in that stream ordered by `createdAt ASC, id ASC`.
6. Load `PointRule` rows inside the transaction. An empty table is a configuration error, not a reason to use `[15, 10, 5]`.
7. Determine faculty/non-student reporters from the database role.
8. Preserve every report with `pointsAwardedAt IS NOT NULL` exactly as stored and advance the next student rank from its stored `reporterRank`.
9. Assign ranks to remaining student reports once, compute points from `PointRule`, and set `pointsAwardedAt` for every processed report, including zero-point reports.
10. Update each report conditionally with `pointsAwardedAt: null` as a defense against races.
11. For a positive award, increment the user and create exactly one `PointHistory` row linked by `reportId`.
12. Invoke the challenge contribution service in the same transaction for each qualifying verified report.
13. Return the updated reports, report awards, challenge completions, and an accurate summary.

Do not use a separate `PrismaClient` inside a nested service transaction. Pass the transaction client to challenge helpers so report points, challenge progress, user balances, and ledger entries commit or roll back together.

The service must not:

- Recalculate or rewrite processed ranks.
- Include reports from another school year.
- Award points based on status changes.
- Trust client-supplied `pointsAwarded`, `reporterRank`, or `schoolYearId`.
- Catch and suppress a unique-constraint failure that could hide a partial award.

### Phase 3: Verification and status API contracts

**Goal:** Separate verification from lifecycle updates.

Update `server/src/routes/report.routes.ts`:

#### Canonical verification endpoints

- `POST /api/reports/:id/verify`
  - Authentication required.
  - Admin role required.
  - Calls the shared awarding service with one ID.
  - Repeated calls return `alreadyProcessed` results without creating new ledger rows.

- `POST /api/reports/verify-batch`
  - Authentication and admin role required.
  - Body: `{ reportIds: string[] }`.
  - Validate array, non-empty input, string IDs, deduplication, and maximum batch size of 50.
  - Process streams deterministically and sequentially through the shared service.
  - Decide and document whether missing IDs fail the entire request or are returned as per-item errors. Prefer a clear 404/400 before mutating any stream.

#### Lifecycle endpoint

- `PATCH /api/reports/:id/status`
  - Updates status, assignment, weight, completion notes, and completion timestamp.
  - Never increments points or challenge progress for report-count/hazard challenges.
  - On a qualifying collection/resolution transition, invokes only the weight challenge contribution logic in the same transaction.
  - Must prevent a second weight contribution when the same report is patched repeatedly.

Remove `isVerified`, `pointsAwarded`, and `skipPoints` from the client-facing status contract after callers are migrated. If temporary compatibility is necessary, ignore/reject them and log the caller rather than allowing them to control awards.

Use consistent errors for not found, invalid state, unauthorized, and unexpected database failures. Do not expose stack traces.

### Phase 4: Challenge service and API

**Goal:** Atomically update per-user progress and award each challenge once.

Create `server/src/services/challenge-progress.service.ts` with transaction-client functions, not a second standalone Prisma client.

For each qualifying event:

1. Load active challenges whose date window contains the event time and whose type matches the event.
2. Ignore non-student reporters and dismissed reports.
3. Attempt to create `ChallengeContribution` with the unique user/challenge/report key.
4. If the contribution already exists, return without changing progress.
5. Upsert `UserChallengeProgress`.
6. Increment progress by the contribution amount and clamp it to `target` (grams for weight challenges).
7. If the record crosses the target, set `completedAt` and `rewardedAt` in the same transaction.
8. Increment user points and create one `PointHistory` row linked to the challenge only when the completion transition succeeds.
9. Return progress and completion information for the API response.

The challenge reward transaction must tolerate two concurrent qualifying events for the same user/challenge. Use the unique contribution key, a row-level/conditional completion update, and the PostgreSQL partial unique index on challenge ledger rows; do not rely on an in-memory `completed` check. A unique-constraint conflict must be handled as an idempotent already-rewarded result only after confirming the existing ledger row belongs to the same user and challenge.

Create `server/src/routes/challenge.routes.ts`:

- `GET /api/challenges`: authenticated user; return active challenge definitions flattened with that user’s progress, completion, and completion date.
- `POST /api/challenges`: admin only; validate title, code, type, positive target, non-negative reward, and valid date range.
- `PATCH /api/challenges/:id`: admin only; validate the same constraints. Do not silently reset existing user progress. Prefer making `code`, `challengeType`, target, and reward immutable once the challenge has progress; create a new challenge code for changed semantics.
- `DELETE /api/challenges/:id`: admin only; prefer deactivation for challenges with progress. Hard delete only when no progress/contributions exist.

Register the route in `server/src/index.ts` before any parameterized catch-all route.

### Phase 5: Seed and backend tests

**Goal:** Make development data safe and prove the invariants.

Update `server/prisma/seed.ts`:

- Upsert system settings and point rules.
- Upsert challenges by stable `code`, not table count.
- Seed definitions with zero user progress and explicit type/date values.
- Never delete reports, point history, or offenses as part of a normal seed.
- Keep destructive purge behavior explicit and separate from seeding.

Add server tests using the repository’s available TypeScript test tooling, or add the smallest approved test runner. Use a dedicated test database and reset it between tests.

Minimum backend cases:

| Case | Expected result |
|---|---|
| Three student reports in one stream | Ranks 1/2/3 use current `PointRule` values. |
| Fourth student report | Rank 4 is processed with zero points if no rule exists. |
| Faculty/admin/MRF report | Processed with rank null and zero points. |
| Different locations/categories/school years | Independent streams and locks. |
| Equal timestamps | ID tie-breaker is stable. |
| Repeat same verification | No extra balance or history entry. |
| Two concurrent verifications in one stream | One final rank assignment and no duplicate ledger rows. |
| Processed report followed by a new report | New rank is greater than the maximum stored rank. |
| Dismissed report | Cannot be verified or awarded. |
| Point rule changed after an award | Historical award remains unchanged. |
| Transaction failure | Report, user balance, history, and challenge changes roll back together. |
| Duplicate collection/status patch | Weight challenge contribution is created once. |
| Challenge completion race | One reward and one challenge history entry only. |
| Challenge outside date window | No progress. |
| Legacy null school year | Never mixed into an active-year stream without explicit reconciliation. |
| Unauthorized verification/challenge mutation | 401/403 and no database mutation. |

### Phase 6: Frontend authority and UI integration

**Goal:** Make the UI a consumer of server state, not a second points engine.

First split `src/hooks/useMockData.tsx` into focused modules before adding more logic. Suggested boundaries:

- `useAuthState` for session/current-user behavior.
- `useReportActions` for create/status/verification actions.
- `useChallengeState` for challenge fetching and refresh.
- `usePointsSync` or a small shared refresh helper for reports/users/challenges.
- Keep the context/provider as composition only; no file should approach 1,000 lines.

Update `src/services/api.ts`:

- Add typed `verifyReport` and update `verifyReportsBatch` to the actual backend response shape.
- Add `getChallenges`, `createChallenge`, `updateChallenge`, and `deactivate/deleteChallenge` methods.
- Remove `pointsAwarded` and `skipPoints` from generic status update input.
- Reuse shared `Report`, `Challenge`, and award response types rather than `any`.

Update `src/types/index.ts`:

- Add `ChallengeType`.
- Add challenge date/completion fields and optional `challengeType` to `Challenge`.
- Add `alreadyProcessed`, `amount`, and `rank` response types.
- Add `challengeId` to `PointHistory` when returned by the API.

Update `src/hooks/useMockData.tsx` and consumers:

- Remove `DEFAULT_CHALLENGES` as an authority, local challenge progress mutation, `addChallengeRewardPoints`, and `completeChallenge`.
- Remove frontend `[15, 10, 5]` fallbacks and all rank-to-points calculations.
- Do not optimistically mutate user points or point history.
- After verification, status completion, or challenge mutations, refresh the authoritative server records. Fetch independent resources in parallel.
- Treat localStorage as an optional read cache only. Never write cached points/challenge progress as if they were server awards, and do not let stale cache overwrite a successful API response.
- On API failure, show an error and retain the last known server state; do not silently fabricate a local reward.
- Surface loading, empty, and error states for challenges.

Update the existing UI files only where needed:

- `src/pages/admin/components/AdminReportsTab.tsx`: use the batch endpoint, remove the per-report fallback loop once the API is required, and display returned award totals.
- `src/pages/student/components/ReportHistoryTab.tsx`: show `pointsAwarded` only when `pointsAwardedAt` exists; distinguish pending, processed zero-point, and positive awards.
- `src/pages/student/components/GamificationTab.tsx`: render API progress, clamp percentage to 100, and show completed state from the server.
- `src/pages/student/components/SubmitReportTab.tsx` and admin report copy: derive explanatory point text from fetched point rules or use neutral wording when unavailable.
- MRF collection components: send lifecycle fields only; do not send verification/award flags.

## 5. API Contracts

### Single verification

```ts
{
  success: true,
  report: Report,
  award: {
    reportId: string,
    userId: string,
    amount: number,
    rank: number | null,
    alreadyProcessed: boolean
  },
  challengeCompletions: Array<{
    challengeId: string,
    pointsAwarded: number
  }>
}
```

### Batch verification

Keep the existing naming convention and extend it only as needed:

```ts
{
  success: true,
  updatedReports: Report[],
  awards: Array<{
    reportId: string,
    userId: string,
    amount: number,
    rank: number | null,
    alreadyProcessed: boolean
  }>,
  challengeCompletions: Array<{
    challengeId: string,
    userId: string,
    pointsAwarded: number
  }>,
  summary: {
    totalRequested: number,
    totalProcessed: number,
    totalAlreadyProcessed: number,
    totalAwarded: number,
    totalPoints: number
  }
}
```

Do not report `totalAwarded` as the number of positive point awards if the UI needs the number of processed reports. Keep those concepts separate.

### Challenge list

```ts
{
  id: string,
  code: string,
  title: string,
  description: string,
  pointsAwarded: number,
  target: number,
  challengeType: 'REPORT_COUNT' | 'WEIGHT_COLLECTED' | 'HAZARDOUS_REPORT',
  iconName: string,
  isActive: boolean,
  startDate: string | null,
  endDate: string | null,
  progress: number,
  completed: boolean,
  completedAt: string | null
}
```

## 6. File Plan

### Modify

- `server/prisma/schema.prisma`
- `server/prisma/seed.ts`
- `server/src/services/report-points.service.ts`
- `server/src/routes/report.routes.ts`
- `server/src/index.ts`
- `src/services/api.ts`
- `src/types/index.ts`
- `src/hooks/useMockData.tsx` or extracted replacements
- `src/pages/admin/components/AdminReportsTab.tsx`
- `src/pages/student/components/GamificationTab.tsx`
- `src/pages/student/components/ReportHistoryTab.tsx`
- `src/pages/student/components/SubmitReportTab.tsx`
- MRF components that currently send verification flags

### Add

- A Prisma migration for challenge state and approved data reconciliation.
- `server/src/services/challenge-progress.service.ts`
- `server/src/routes/challenge.routes.ts`
- Focused frontend hooks/services extracted from `useMockData.tsx`.
- Backend unit/integration tests and test setup documentation.

### Do not create

- A second report-points service.
- A frontend points calculator.
- A global challenge-progress singleton.
- A client-side manual challenge-completion path.
- A migration that silently resets balances or deletes production data.

## 7. Verification Gates

Run after each relevant phase:

```bash
npm run lint
npm run build
```

```bash
cd server
npm run build
```

For database changes:

```bash
cd server
npx prisma validate
npx prisma generate
npx prisma migrate deploy
```

Before approval for release:

1. Run the full backend test matrix against a disposable PostgreSQL database.
2. Run the audit queries again and compare balances/history before and after.
3. Exercise concurrent verification with two requests and inspect `PointHistory`.
4. Exercise repeated status updates and verify no duplicate challenge contribution exists.
5. Test admin, student, MRF, and unauthenticated API access.
6. Test the UI with empty, loading, API error, pending, zero-point, awarded, and completed-challenge states.
7. Confirm no runtime source file approaches 1,000 lines.
8. Inspect the final diff for hardcoded point values, local reward writes, `any` response contracts, and unprotected mutation routes.

## 8. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Ambiguous legacy awards | Audit first; reconcile only approved records; preserve balances and history. |
| Advisory lock mismatch | Build the lock key from the same canonical stream helper used by the query. |
| Advisory lock hash collision | Keep the unique `PointHistory.reportId` and conditional report update as defense in depth; document the chosen PostgreSQL hash strategy. |
| Concurrent challenge completion | Unique contribution key, conditional reward transition, and one transaction. |
| Stale localStorage | Cache only; server response always wins; refresh after mutations. |
| Point-rule changes | Apply rules only to new awards; never recalculate history. |
| Batch partial failures | Process deterministic stream transactions and return a defined failure contract; test rollback boundaries. |
| Unauthorized awards | Enforce auth/admin middleware on every verification and challenge-management mutation. |
| Oversized provider file | Extract hooks before feature work and enforce the repository file-size rule. |
| Seed destroying data | Replace count-based/destructive challenge seeding with stable upserts and separate purge tooling. |

## 9. Definition of Done

- No client code calculates, increments, or creates report/challenge points.
- Verification and challenge rewards are idempotent under retries and concurrent requests.
- Stream ranking is stable, school-year scoped, and tested with equal timestamps and processed gaps.
- Zero-point reports are visibly and unambiguously processed.
- Challenge definitions and per-user progress come from PostgreSQL.
- Challenge rewards appear in the point ledger exactly once.
- Status updates cannot trigger report-point awards.
- Existing data is audited and preserved according to the approved reconciliation rules.
- API response types match server behavior.
- Authentication/authorization covers all new mutation routes.
- Prisma migration, backend tests, frontend build, backend build, and lint pass.
- The implementation remains within the repository’s file-size and design-system guidelines.

**Approval checkpoint:** Confirm the proposed stream, ranking, verification-trigger, challenge-qualification, and legacy-data policies before implementation begins.
