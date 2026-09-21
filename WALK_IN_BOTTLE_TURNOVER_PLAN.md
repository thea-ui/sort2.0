# Walk-in Bottle Turnover, Weight Milestones & Prize Claims — Plan

> **Status:** Implemented (2026-09-20). See §17 Implementation Status.
> **Revised:** September 20, 2026
> **Scope:** Let MRF staff record a walk-in student's plastic-bottle turnover by volume (ml), credit eco-points server-side, estimate and accumulate the collected plastic's weight (grams) for milestone rewards, unlock claimable prizes, and give the admin a claim-release queue — while keeping every peso of point credit auditable through the existing ledger.
> **Offline note:** This feature is **local-first** and can be built and demoed before EnrollPro is live. EnrollPro is only the roster source and login delegate — the walk-in flow itself makes no EnrollPro calls. See §3.5.
> **Related:** `POINTS_SYSTEM_AND_CHALLENGES_PLAN.md`, `POINTS_AWARD_ON_COLLECTION_PLAN.md`, `MRF_DIRECT_PICKUP_UI_PLAN.md`, `ENROLLPRO_STRICT_MIRROR_SYNC_PLAN.md`, `AGENTS.md`.

---

## 0. TL;DR

A student walks into the MRF with plastic bottles. MRF staff open a new **Walk-in Station** tab, search the student by name/section, tap preset bottle sizes with counts, and confirm. In one server transaction the system:

1. **Credits points from volume** — the session's total ml drives `user.points` (500 ml = 1 pt ladder, min 1 pt per visit), one `PointHistory` row, one audit log.
2. **Records estimated weight in grams** — each bottle size has a researched gram factor; grams accumulate per student, per school year ("your own bin" total).
3. **Unlocks milestone prizes** — when cumulative grams cross a tier (1 kg / 3 kg / 5 kg / 10 kg), a claimable prize row is created once.
4. **Admin releases the prize** — a new Admin → Rewards queue has the **Claim / Release** button the professor asked for; releasing a prize either hands over a physical item (stock decremented) or credits bonus points to the ledger.

Students see their bottle activity, their kilogram progress bar, and their claim codes. Prizes are seeded as clearly-labeled placeholders until the student/professor interview finalizes them — the catalog is data-driven, so swapping prizes later needs no code change.

**Locked decisions (confirmed with product owner):**

| # | Decision |
|---|----------|
| L1 | Point rate: `500 ml = 1 pt`, `1 L = 2 pts` — linear half-litre ladder, configurable. |
| L2 | Student identity: search by name/section from the **local** student roster — EnrollPro-synced once available, offline-provisioned accounts supported meanwhile (§3.5). No QR scanning in v1. |
| L3 | Counting: preset bottle sizes with a count stepper per size (plus an "Other ml" option). |
| L4 | Credit scope: full — `user.points` + `PointHistory` + leaderboard + certificates. Challenge accrual is Phase 2 (see §12). |
| L5 | Points are based on **volume (ml)**; **weight (grams)** is estimated and recorded in parallel for inventory records and the kg milestone ladder. |
| L6 | Milestone prizes are **admin-released** via a claim queue; prizes are placeholder data until the interview (see §9). |

---

## 1. Basis of Points: Volume vs Weight (recommendation)

**Recommendation: volume (ml) for points, estimated weight (grams) for records and milestones.** Both are recorded, so no data is lost either way.

| Criterion | Volume (ml) — points | Weight (kg/g) — points |
|---|---|---|
| Where the number comes from | Printed on the bottle label; student can pre-count | Requires a scale at the counter, per bottle or per bag |
| Counter speed | Tap-tap-tap; no equipment | Weigh every visit; queue builds at peak |
| Fairness across brands | Equal for the same size regardless of plastic thickness | A thick soda bottle earns more than a thin water bottle of the same size |
| Small bottles (250–350 ml) | Works with a session-total ladder + visit minimum | ~8–16 g each; needs a very high points-per-kg to matter |
| Abuse resistance | Session total prevents "10 tiny bottles = 10 pts" farming | Very abuse-resistant but slow and equipment-dependent |
| Student comprehension | "Every 500 ml = 1 point" is instantly explainable | "0.3 points per bottle" is not |
| Environmentally "true" | Approximates plastic avoided | Exact mass, but water bottles are ~90% air by volume |

**Why not weight-only:** a 500 ml PET bottle weighs ≈ 19 g (bottle + cap + label). At a motivating rate like 10 pts/kg that is **0.19 pts per bottle** — unusable. A weight-only system would need 100+ pts/kg, making a 10 kg milestone worth 1,000 points, which distorts the existing point economy (report ranks are 15/10/5).

**Why record weight anyway:** the MRF sells recyclables by the kilogram, and a "10 kg collected" milestone is a concrete, honest environmental stat. Estimated grams give both without needing a scale: the gram table is configurable and calibrated later from a real 100-bottle sample (§3.3).

**Weight-weighted points (hybrid) is rejected** because it makes the same bottle worth different points depending on brand/manufacturer, which is impossible to explain at a school counter.

### 1.1 Small-bottle handling (the 250–350 ml case)

Points are computed on the **session total**, not per bottle, with a minimum of 1 point per visit:

| Turn-in | Total ml | Points |
|---|---:|---:|
| 1 × 250 ml (alone) | 250 | 1 (visit minimum) |
| 3 × 350 ml | 1,050 | 2 |
| 1 × 500 ml | 500 | 1 |
| 2 × 600 ml | 1,200 | 2 |
| 1 × 1 L | 1,000 | 2 |
| 1 × 1.5 L | 1,500 | 3 |
| 1 × 2 L | 2,000 | 4 |
| 3 × 500 ml + 1 × 2 L | 3,500 | 7 |
| 10 × 100 ml | 1,000 | 2 (not 10 — prevents small-bottle farming) |

This single rule answers the "small bottle" question cleanly: one tiny bottle still earns a point, but only when it is the whole visit; volume accumulates honestly across a session.

---

## 2. Point & Weight Formulas

### 2.1 Points (server-authoritative, session total)

```
totalMl     = Σ (bottleMl × quantity)
totalPoints = max(1, floor(totalMl ÷ 500 × ratePer500ml))
```

- `ratePer500ml` from `SystemSetting.walkInPointsPer500ml` (default `1`); snapshotted on the turnover row so history never changes.
- `floor` is conservative: a 900 ml bottle counts as one full 500 ml → 1 pt; 1 L → 2 pts.
- The visit minimum (`max(1, …)`) only applies when at least one bottle was recorded.
- Clients **never** send points; they send `{ bottleMl, quantity }[]`.

### 2.2 Preset sizes (PH market research)

Presets curated from actual Philippine bottle sizes (Coca-Cola PH PET: 250 / 300 / 500 / 600 ml / 1 L / 1.5 L / 2 L; Nature's Spring: 350 / 500 ml / 1 L / 6.6 L / 10 L):

| Preset | Notes |
|---|---|
| 250 ml | Small soda/water |
| 330 ml | Soda bottles / cans-sized bottles |
| 350 ml | Nature's Spring small |
| 500 ml | Most common |
| 600 ml | Coke PH standard |
| 1 L | |
| 1.5 L | |
| 2 L | |
| **Other ml** | Bounded 100–20,000 ml; covers 6.6 L / 10 L jugs and odd sizes |

"Other" uses the nearest preset's gram factor (e.g., 450 ml → 500 ml factor).

### 2.3 Estimated grams per bottle (research-grounded)

Sources: NEA (Singapore) Packaging Benchmarking Database for PET water bottles — median overall weights incl. cap + label: 330 ml ≈ 16.5 g, 500 ml ≈ 19.4 g, 600 ml ≈ 18.8 g, 1 L ≈ 39.5 g, 1.5 L ≈ 32.3 g; Coca-Cola's 2024 lightweighting of small PET to 18.5 g. Soda bottles are heavier than still-water bottles; these are planning estimates, calibrated in production (see calibration note).

| Preset | Est. grams (bottle + cap + label) |
|---|---:|
| 250 ml | 12 |
| 330 ml | 15 |
| 350 ml | 14 |
| 500 ml | 19 |
| 600 ml | 22 |
| 1 L | 39 |
| 1.5 L | 36 |
| 2 L | 48 |
| Other | nearest preset |

- `totalGrams = Σ (gramsFor(bottleMl) × quantity)`; grams are stored per item and per turnover.
- These constants live in `walk-in.service.ts` (single source) and are snapshotted into each turnover item, so recalibration never rewrites history.

**Calibration note:** before go-live, weigh a 100-bottle sample per common size at the MRF and adjust the constants; differences of ±20% only shift milestone timing, never point credit.

### 2.4 Milestone math (why 10 kg is the "big" tier)

At ≈ 19 g per 500 ml bottle:

| Cumulative weight | ≈ 500 ml bottles | Placeholder tier (§9) |
|---:|---:|---|
| 1 kg | ~53 | Badge + bonus points |
| 3 kg | ~158 | Physical prize (tumbler) |
| 5 kg | ~263 | Physical prize (tote/kit) |
| 10 kg | ~526 | Premium prize (hoodie / voucher) |

The tiers are data-driven; the interview can change them without code.

---

## 3. Repository Reality (what we reuse)

| Concern | Existing mechanism | Reuse |
|---|---|---|
| Point authority | Server-only awards; clients never compute points (`POINTS_SYSTEM_AND_CHALLENGES_PLAN.md`). | Walk-in points computed server-side in one transaction. |
| Balance | `User.points` integer, incremented transactionally (`report-points.service.ts:193`). | Same increment pattern. |
| Ledger | `PointHistory` (amount, reason, optional FKs, `schoolYearId`) (`schema.prisma:238`). | One ledger row per turnover; one per released points-prize. |
| School-year scoping | `getActiveSchoolYearId()` (`rollover.service.ts:383`). | Turnovers, claims, milestones scoped to the active year. |
| Rollover/certificates | Snapshots close on `user.points`; thresholds on `user.points`. | No structural change. |
| Admin transparency | `GET /api/school-years/:id/ledger` returns `PointHistory` (`school-year.routes.ts:406`). | Walk-ins and prize point-credits appear automatically. |
| Audit trail | `AuditLog` created by services (`bin-reset.service.ts:72`). | One audit row per turnover and per claim release. |
| MRF shell/nav | `MRFDashboard.tsx` tabs + `MRF_NAV_ITEMS` (`DashboardLayout.tsx:43`). | Add `mrf-walkin` tab. |
| Admin nav groups | `ADMIN_SECTIONS` (`DashboardLayout.tsx:53`). | Add `admin-rewards` (Rewards). |
| Auth | `authenticate`, `requireRole` (`middleware/auth.ts`). | All new routes role-gated. |
| API client | `fetchAPI<T>` wrapper (`src/services/api.ts:80`). | Typed walk-in/reward methods. |

**Constraint:** `ChallengeContribution.reportId` is required (`schema.prisma:306`), so walk-ins cannot advance challenges without a schema adaptation — deliberately Phase 2 (§12).

---

## 3.5 EnrollPro-Offline Readiness (can this be built before EnrollPro is live?)

**Yes.** Walk-in recording has **zero runtime dependency** on EnrollPro: student search reads the local `users` table (PostgreSQL) and points/grams/milestones/claims are local transactions. EnrollPro only affects *roster population* and *login*.

| Concern | EnrollPro needed? | Offline behavior |
|---|---|---|
| Student search (`GET /api/walk-ins/students`) | No | Queries local `users`; works from the last synced roster or offline-provisioned accounts. |
| Points / ledger / grams / milestones / claims | No | Pure local Postgres transactions. |
| MRF / admin login | Yes | Login is delegated (`auth.routes.ts:56-110`); unreachable → `503 AUTH_SERVICE_UNREACHABLE`. |
| Student login | Yes | Same; non-`ENROLLPRO` accounts are rejected with `NOT_PROVISIONED` (`auth.routes.ts:83`). |
| Offline-created student accounts | Sync hazard | A successful sync purges **all** `syncSource: 'LOCAL'` users (`enrollpro-sync.service.ts:818-821`), cascading away their turnovers/points. Must be scoped first (item 2 below). |

**Required offline adaptations (folded into the phases):**

1. **Search includes offline accounts.** Drop the `syncSource: 'ENROLLPRO'` restriction from the walk-in search only; return `syncSource` so the picker can badge `Local (offline)` results. Archived users stay excluded.
2. **Scope the LOCAL purge** (`enrollpro-sync.service.ts:818-821`): delete only `LOCAL` accounts that own **no** reports, point histories, walk-ins, claims, or sessions. This matches the sync service's own stated principle at lines 773-776 ("NEVER delete: accounts own reports, points, offenses, and snapshots"). Without this, offline students and their credits would be silently destroyed by a future sync.
3. **Offline roster provisioning (choose one — D10):**
   - **Option A (recommended now):** `server/prisma/seed-offline-students.ts` — an explicit, re-runnable dev script creating realistic local students (`syncSource: 'LOCAL'`, generated `employeeId: 'LOCAL-…'`, optional LRN, grade/section). Never part of `seed.ts`; perfect for the defense/classroom demo.
   - **Option B:** an admin "Add offline student" action in Admin Users (name, grade, section, optional LRN) for real pre-EnrollPro onboarding. Add only if the owner wants production offline enrolment.
4. **Login during an outage:** use the repo's existing minted-token contingency (`scripts/e2e/token.mjs`, already used by `atlas-smoke` and Playwright sessions) to demo MRF/admin/student views. **Do not** add local passwords — the owner locked strict EnrollPro delegation (`ENROLLPRO_STRICT_MIRROR_SYNC_PLAN.md` §2.1).
5. **Linking when EnrollPro comes online:** add `server/src/scripts/link-offline-students.ts` to re-point a local account's turnovers, claims, and point-history rows to the matched synced account (by LRN, then name + section), then archive the local account. Until linked, offline accounts' credits appear in Admin Users and the ledger but are excluded from the leaderboard and certificate issuance (both filter `syncSource: 'ENROLLPRO'` — `user.routes.ts:73`, `certificate.service.ts:185`).
6. **Offline demo checklist:** seed offline roster → mint role tokens → MRF records a turnover → admin releases a prize → verify student ledger, milestone unlock, and claim queue — all with no EnrollPro traffic in the network tab.

---

## 4. Data Model & Migration

### 4.1 Turnover models

```prisma
model WalkInTurnover {
  id             String   @id @default(uuid())
  studentId      String   @map("student_id")
  recordedById   String?  @map("recorded_by_id")
  recordedByName String   @map("recorded_by_name")   // audit snapshot
  totalMl        Int      @map("total_ml")
  totalBottles   Int      @map("total_bottles")
  totalGrams     Int      @map("total_grams")        // estimated
  pointsAwarded  Int      @map("points_awarded")
  ratePer500ml   Int      @map("rate_per_500ml")     // rule snapshot
  notes          String?
  idempotencyKey String   @unique @map("idempotency_key")
  schoolYearId   String   @map("school_year_id")     // required (active year at record time)
  createdAt      DateTime @default(now()) @map("created_at")

  student      User                 @relation("WalkInStudent", fields: [studentId], references: [id], onDelete: Cascade)
  recordedBy   User?                @relation("WalkInRecorder", fields: [recordedById], references: [id], onDelete: SetNull)
  schoolYear   SchoolYear           @relation(fields: [schoolYearId], references: [id])
  items        WalkInTurnoverItem[]
  pointHistory PointHistory?
  rewardClaims RewardClaim[]

  @@index([studentId, schoolYearId])
  @@index([studentId, createdAt])
  @@index([recordedById])
  @@index([createdAt])
  @@map("walk_in_turnovers")
}

model WalkInTurnoverItem {
  id         String   @id @default(uuid())
  turnoverId String   @map("turnover_id")
  bottleMl   Int      @map("bottle_ml")
  quantity   Int
  grams      Int      // estimated per item, snapshotted at record time
  createdAt  DateTime @default(now()) @map("created_at")

  turnover WalkInTurnover @relation(fields: [turnoverId], references: [id], onDelete: Cascade)

  @@index([turnoverId])
  @@map("walk_in_turnover_items")
}
```

No `pointsEarned` per item: points are a session-total rule (§2.1), so only the turnover carries `pointsAwarded`. This avoids arbitrary per-line allocations for small bottles.

### 4.2 Rewards & claims models

```prisma
enum RewardType {
  POINTS    // release credits pointsValue to the student
  PHYSICAL  // release hands over a physical prize (stock tracked)
}

enum RewardClaimStatus {
  UNLOCKED   // milestone reached; visible to admin queue and student
  REQUESTED  // student tapped "I'll claim this"
  RELEASED   // admin handed over / points issued
  CANCELLED  // admin voided
}

model Reward {
  id            String     @id @default(uuid())
  code          String     @unique
  title         String
  description   String
  iconName      String
  rewardType    RewardType @default(PHYSICAL) @map("reward_type")
  requiredGrams Int        @map("required_grams")     // cumulative bottle grams to unlock
  pointsValue   Int        @default(0) @map("points_value") // used when rewardType = POINTS
  stock         Int?                                       // null = unlimited
  isActive      Boolean    @default(true) @map("is_active")
  sortOrder     Int        @default(0) @map("sort_order")
  createdAt     DateTime   @default(now()) @map("created_at")
  updatedAt     DateTime   @updatedAt @map("updated_at")

  claims RewardClaim[]

  @@index([isActive, requiredGrams])
  @@map("rewards")
}

model RewardClaim {
  id            String            @id @default(uuid())
  userId        String            @map("user_id")
  rewardId      String            @map("reward_id")
  turnoverId    String?           @map("turnover_id")   // the turnover that crossed the tier
  status        RewardClaimStatus @default(UNLOCKED)
  claimCode     String            @unique               // short counter code, e.g. ECO-7F3K9Q
  gramsAtUnlock Int               @map("grams_at_unlock")
  unlockedAt    DateTime          @default(now()) @map("unlocked_at")
  requestedAt   DateTime?         @map("requested_at")
  releasedAt    DateTime?         @map("released_at")
  releasedById  String?           @map("released_by_id")
  schoolYearId  String            @map("school_year_id")
  notes         String?

  user       User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  reward     Reward      @relation(fields: [rewardId], references: [id], onDelete: Cascade)
  turnover   WalkInTurnover? @relation(fields: [turnoverId], references: [id], onDelete: SetNull)
  releasedBy User?       @relation("RewardReleasedBy", fields: [releasedById], references: [id], onDelete: SetNull)
  schoolYear SchoolYear  @relation(fields: [schoolYearId], references: [id])

  @@unique([userId, rewardId, schoolYearId])  // each tier unlocks at most once per student per year
  @@index([status, unlockedAt])
  @@index([userId])
  @@map("reward_claims")
}
```

### 4.3 Schema amendments

| Model | Change | Why |
|---|---|---|
| `User` | `walkIns WalkInTurnover[] @relation("WalkInStudent")`, `walkInsRecorded WalkInTurnover[] @relation("WalkInRecorder")`, `rewardClaims RewardClaim[]`, `rewardReleases RewardClaim[] @relation("RewardReleasedBy")` | Relations. |
| `SchoolYear` | `walkInTurnovers WalkInTurnover[]`, `rewardClaims RewardClaim[]` | Year scoping / annual reset. |
| `PointHistory` | `walkInTurnoverId String? @unique @map("walk_in_turnover_id")`, `rewardClaimId String? @unique @map("reward_claim_id")` + relations | Exactly one ledger row per turnover and per released points-prize. |
| `SystemSetting` | `walkInPointsPer500ml Int @default(1) @map("walk_in_points_per_500ml")`, `walkInEnabled Boolean @default(true) @map("walk_in_enabled")` | Configurable rate + kill switch. |
| `SystemSetting` (Phase 2) | `walkInDailyPointCap Int @default(0) @map("walk_in_daily_point_cap")` | 0 = uncapped. |

### 4.4 Migration rules

- One version-controlled `npx prisma migrate dev` migration. **No `db push`.**
- Purely additive: new tables, nullable `PointHistory` columns, `SystemSetting` defaults backfilled by the migration. No existing row is mutated.
- Seed `Reward` rows by stable `code` with **placeholder** prizes (§9), never touching existing data.
- Exit check: `prisma validate` + `generate` + `migrate deploy` on a DB copy; duplicate `idempotency_key`, duplicate `(user, reward, year)` claim, and duplicate ledger FKs are rejected.

---

## 5. API Contracts

Routes: `server/src/routes/walk-in.routes.ts` and `reward.routes.ts`, registered in `server/src/index.ts` before any parameterized catch-all.

### 5.1 `GET /api/walk-ins/students?q=` (MRF, ADMIN)

- `q` min 2 chars; limit 10; `role = STUDENT`, `archivedAt = null`. Includes `syncSource: 'LOCAL'` offline accounts (§3.5) — the `ENROLLPRO`-only filter used elsewhere is intentionally not applied here.
- Returns `{ students: [{ id, name, gradeLevel, sectionName, points, syncSource }] }` (minimal projection, mirrors `user.routes.ts:10`). The picker badges `syncSource !== 'ENROLLPRO'` results as `Local (offline)`.
- Rate limited with the existing `express-rate-limit` dependency.

### 5.2 `POST /api/walk-ins` (MRF, ADMIN)

```jsonc
{
  "studentId": "uuid",
  "items": [ { "bottleMl": 500, "quantity": 3 }, { "bottleMl": 2000, "quantity": 1 } ],
  "notes": "Optional remarks",
  "idempotencyKey": "client-generated-uuid"
}
```

| Validation | Failure |
|---|---|
| `items` non-empty, ≤ 6 lines | `400 VALIDATION_ERROR` |
| `quantity` integer 1–200 | `400 VALIDATION_ERROR` |
| `bottleMl` integer 100–20 000 | `400 VALIDATION_ERROR` |
| Student exists, `STUDENT`, not archived | `404 STUDENT_NOT_FOUND` / `409 STUDENT_NOT_ELIGIBLE` |
| UUID-shaped `idempotencyKey` | `400 VALIDATION_ERROR` |
| Active school year exists | `409 NO_ACTIVE_SCHOOL_YEAR` |
| `walkInEnabled` is true | `403 WALK_IN_DISABLED` |

Response:

```ts
{
  success: true,
  alreadyProcessed: false,
  turnover: {
    id, studentId, totalMl, totalBottles, totalGrams, pointsAwarded, ratePer500ml,
    notes, createdAt, items: [{ bottleMl, quantity, grams }]
  },
  student: { id, name, points },          // new balance
  progress: {
    yearGrams: number,                    // cumulative for active school year (after this turnover)
    yearMl: number,
    nextReward: { id, title, requiredGrams, remainingGrams } | null
  },
  newlyUnlocked: [{ claimId, claimCode, reward: { id, title, rewardType } }]
}
```

Idempotent retry: an existing `idempotencyKey` returns the stored turnover with `alreadyProcessed: true`, plus current progress — never a second ledger row.

### 5.3 `GET /api/walk-ins?date=YYYY-MM-DD&studentId=` (MRF, ADMIN)

Today's station list (max 100) with student name/section and items. Powers the recent list under the form.

### 5.4 `GET /api/walk-ins/me?limit=20` (any authenticated)

Caller's own turnovers plus `progress` (year grams/ml, next reward). Powers the student activity card and kg progress bar.

### 5.5 `GET /api/rewards` (any authenticated)

Catalog flattened with caller progress:

```ts
{
  id, code, title, description, iconName, rewardType, requiredGrams, pointsValue, stock,
  progressGrams,                    // caller's cumulative grams this school year
  unlocked: boolean,
  claim: { id, status, claimCode, unlockedAt, releasedAt } | null
}
```

### 5.6 Student claim actions

- `POST /api/rewards/claims/:id/request` (own claim only) → `REQUESTED`, sets `requestedAt`. Idempotent.
- Claim codes are shown in the student UI ("Show this code at the MRF/Admin office").

### 5.7 Admin claim queue — the Claim button

- `GET /api/rewards/claims?status=&schoolYearId=` (ADMIN): list with `student { name, gradeLevel, sectionName }`, `reward`, `status`, `claimCode`, `unlockedAt`, `requestedAt`.
- `POST /api/rewards/claims/:id/release` (ADMIN):

```
1. updateMany({ where: { id, status: { in: [UNLOCKED, REQUESTED] } }, data: { status: RELEASED, releasedAt, releasedById } })
   → count 0 means already released / cancelled → return 409 ALREADY_RELEASED (no side effects).
2. If rewardType = PHYSICAL:
   - If reward.stock is not null and stock <= 0 → roll back with 409 OUT_OF_STOCK.
   - Decrement stock (conditional `stock: { gt: 0 }` guard).
3. If rewardType = POINTS:
   - user.points increment + exactly one PointHistory
     (reason: `Prize Claim: {title} (+{n} pts)`, rewardClaimId, schoolYearId).
4. tx.auditLog.create({ actionType: 'REWARD_RELEASED', details, schoolYearId }).
5. Return { claim, student: { id, name, points }, pointsAwarded: n }.
```

- Release is idempotent: double-clicking cannot double-credit or double-decrement (conditional transition + unique `PointHistory.rewardClaimId`).
- Cancel: `POST /api/rewards/claims/:id/cancel` (ADMIN) → `CANCELLED` (no points/stock change).

### 5.8 Reward catalog administration (Phase 3)

- `POST /api/rewards`, `PATCH /api/rewards/:id` (ADMIN): title/description/icon/type/requiredGrams/pointsValue/stock/isActive/sortOrder. Changing `requiredGrams` never rewrites already-unlocked claims.
- Deletion is soft (`isActive: false`) once claims exist.

---

## 6. Server Transactions

### 6.1 `walk-in.service.ts` — record turnover

```
1. Validate payload server-side (never trust client totals/points/grams).
2. Fast-path idempotency check by idempotencyKey → return stored result if found.
3. Load SystemSetting (rate, enabled). Resolve active school year.
4. Open one transaction:
   a. Re-check student (role STUDENT, archivedAt null).
   b. Compute totalMl, totalBottles, totalGrams, totalPoints from `items` (formulas §2).
   c. Create WalkInTurnover + items (gram snapshots).
      P2002 on idempotencyKey → fetch and return the existing turnover (race loser).
   d. user.update({ points: { increment: totalPoints } }) → capture new balance.
   e. PointHistory.create({ ..., walkInTurnoverId, schoolYearId }) — one row.
   f. AuditLog.create({ actionType: 'WALK_IN_TURNOVER', ... }).
   g. Sum year grams for the student (including this turnover).
   h. Unlock milestones: for each active reward with requiredGrams <= yearGrams and no
      existing claim (userId, rewardId, schoolYearId) → create RewardClaim
      (UNLOCKED, claimCode, gramsAtUnlock, turnoverId). P2002 → skip (already claimed).
5. Commit; return turnover + student + progress + newlyUnlocked.
```

Properties: atomic; idempotent at both the turnover and claim level; **no advisory locks needed** (points use atomic increments and there is no ranking); never recalculates or reverses history.

### 6.2 `reward.service.ts` — release claim

Implements §5.7 inside one transaction. Points-type releases are guarded by `PointHistory.rewardClaimId @unique`; physical releases by a conditional stock decrement and the status transition.

**Corrections:** no reversal flow. Admins use the existing `POST /api/users/:id/deduct-points` (`user.routes.ts:191`), which already writes a negative ledger row; physical prizes can be re-issued by adjusting stock in the catalog.

---

## 7. End-to-End Flows

### 7.1 MRF counter (happy path)

```
Student arrives with bottles
        │
        ▼
MRF opens MRF → Walk-in Station
        │
        ▼
① Find student: type name/section → debounced search → tap student
   (chip: name · section · current points)
        │
        ▼
② Count bottles: preset grid [250][330][350][500][600][1L][1.5L][2L][Other]
   each card: − / count / + stepper; live litres + grams shown
        │
        ▼
③ Summary rail: total bottles · total litres · est. grams · +N pts
   "Progress after this: 4.2 / 5 kg → next: Eco Tote"
        │
        ▼
④ Confirm → POST /api/walk-ins (single idempotency key)
        │
        ▼
⑤ Receipt: "Credited +7 pts to Juan Dela Cruz — new balance 341"
   + "🏆 Unlocked: Green Tumbler! Claim code ECO-7F3K9Q"
   Form resets, key rotates, today's list refreshes
```

### 7.2 Student reflection

| Surface | What updates |
|---|---|
| Points balance | `student.points` (server increment; refreshed on fetch). |
| Bottle activity card | "Bottle Turn-ins" list from `GET /api/walk-ins/me`. |
| Kilogram ladder | Progress bar toward next tier + unlock history. |
| Claim codes | Unlocked/requested prizes with counter codes. |
| Leaderboard / certificates | Existing mechanisms on `user.points`. |

### 7.3 Admin reflection

| Surface | What shows |
|---|---|
| **Rewards tab (new)** | Claim queue with **Claim / Release** button + reward catalog editor. |
| School Years ledger | Walk-in and prize `PointHistory` rows with descriptive reasons. |
| Users / Leaderboard | Updated balances and ranking. |
| Audit Logs | `WALK_IN_TURNOVER` and `REWARD_RELEASED` entries. |
| Impact analytics (optional, Phase 5) | Bottle recovery totals (ml/kg) via §5 summary endpoint. |

Rationale for no admin pre-approval of walk-ins: the MRF operator is the accountable witness at the counter; every entry is immutable, attributed, rate-limited, and auditable. Prizes, which leave the building, are admin-released.

---

## 8. Milestone & Prize Claim System

### 8.1 Lifecycle

```
grams accumulate ──► requiredGrams crossed
                        │  (school-year cumulative, idempotent)
                        ▼
                 RewardClaim: UNLOCKED  ── student taps reserve ──► REQUESTED
                        │                                            │
                        └────────── admin clicks Claim/Release ◄─────┘
                                             │
                              ┌──────────────┴──────────────┐
                              ▼                             ▼
                        PHYSICAL: stock −1            POINTS: ledger +N pts
                        status RELEASED               status RELEASED
```

- Claims are unique per `(student, reward, school year)`; every claim carries a short unique **claim code** for the counter so the right student gets the right prize.
- Unlocking never touches points or stock; only admin release does.
- Annual reset: progress is summed per active school year, and claim uniqueness is per year, so a new school year restarts the ladder cleanly (consistent with rollover behavior).
- Physical rewards can be marked `stock = null` (unlimited) or tracked; release is blocked with `409 OUT_OF_STOCK` when exhausted, and the claim stays `UNLOCKED`/`REQUESTED` until restocked.

### 8.2 Placeholder prize catalog (replace after interview)

**These are placeholders.** The interview will finalize names, values, and stock; because the catalog is data-driven, changing them is configuration, not code.

| Code | Tier | Placeholder title | Type | Value | Stock |
|---|---|---|---|---|---|
| `TIER_1KG` | 1 kg | Recycler Badge (+25 pts) | POINTS | 25 pts | ∞ |
| `TIER_3KG` | 3 kg | Eco Green Tumbler | PHYSICAL | — | 25 |
| `TIER_5KG` | 5 kg | MRF Tote + School Supplies Kit | PHYSICAL | — | 15 |
| `TIER_10KG` | 10 kg | Eco-Champion Hoodie / Canteen Voucher | PHYSICAL | — | 10 |

Optional Phase 3 catalog additions (admin-managed): "1 free print" style vouchers, extra points bundles, or donor/sponsor prizes.

### 8.3 Admin Claim/Release UI

- New nav: `admin-rewards` → **Rewards** (icon `Gift`), placed in the MANAGEMENT group (`DashboardLayout.tsx:53`).
- `AdminRewardsTab.tsx` with two sub-views:
  - **Claims queue** (default): filter `REQUESTED` first, then `UNLOCKED`; columns: student (name · section), prize, tier, claim code, unlocked/requested dates, **Claim / Release** button, Cancel (with confirm). Release shows a success toast with the student's new balance / stock remaining.
  - **Catalog**: placeholder prize list with enable/disable and stock editing (Phase 3 adds full CRUD).
- Students without the app still appear in the queue (claims auto-unlock), so the professor's manual claim button always works.

---

## 9. Frontend Plan

### 9.1 MRF (new tab)

| File | Responsibility | Size target |
|---|---|---|
| `src/hooks/useWalkInTurnover.ts` | API calls, debounced student search, idempotency key lifecycle, submit + receipt state | < 260 lines |
| `src/pages/mrf/components/MRFWalkInTab.tsx` | Orchestrator: 3-step layout, summary rail, submit | < 320 lines |
| `src/pages/mrf/components/WalkInStudentPicker.tsx` | Search, results, selected-student chip | < 200 lines |
| `src/pages/mrf/components/BottleSizeStepper.tsx` | 8 presets + "Other ml" steppers, live ml/grams | < 220 lines |
| `src/pages/mrf/components/WalkInReceipt.tsx` | Receipt, newly-unlocked prizes, today's list | < 220 lines |

- Nav item `{ id: 'mrf-walkin', label: 'Walk-in Station', icon: Recycle, roles: ['MRF'] }` in `MRF_NAV_ITEMS`; render in `MRFDashboard.tsx` beside `mrf-direct`.
- Design tokens per `AGENTS.md` §3: `rounded-3xl` container, `rounded-2xl` cards, `#00A77C` actions, amber for points/prizes, `rounded-full` pills.
- Mobile: search + steppers stack; steppers sized for one-thumb counter use.

### 9.2 Student

| File | Responsibility |
|---|---|
| `src/pages/student/components/WalkInActivityCard.tsx` | Recent turn-ins (date, bottles, L, kg, pts) + empty state |
| `src/pages/student/components/RewardLadderCard.tsx` | kg progress bar, next tier, unlocked/requested claims + claim codes, reserve button |

Mounted in `GamificationTab.tsx` (existing rewards/challenges surface). No optimistic point mutation; all state from the server.

### 9.3 Admin

| File | Responsibility |
|---|---|
| `src/pages/admin/components/AdminRewardsTab.tsx` | Tab shell: claims queue + catalog sub-views |
| `src/pages/admin/components/RewardClaimQueue.tsx` | Queue table + **Claim / Release** + Cancel |
| `src/pages/admin/components/RewardCatalogTable.tsx` | Placeholder prize list, stock, active toggle |

### 9.4 Shared types & client

- `src/types/index.ts`: `WalkInTurnoverItem`, `WalkInTurnover`, `BottleProgress`, `Reward`, `RewardClaim`, `RewardClaimStatus`, `RecordWalkInInput/Result`.
- `src/services/api.ts` via existing `fetchAPI`: `searchWalkInStudents`, `recordWalkIn`, `getWalkInHistory`, `getMyWalkInHistory`, `getRewards`, `requestRewardClaim`, `getRewardClaims`, `releaseRewardClaim`, `cancelRewardClaim`.

---

## 10. Edge Cases & Regression Register

| ID | Risk | Mitigation |
|---|---|---|
| R1 | Double-tap / retry double-credits | In-flight lock + unique `idempotency_key`; server returns the stored turnover. |
| R2 | Concurrent identical requests | DB unique constraint wins; loser returns stored result. |
| R3 | Client tampers with points/grams | Server recomputes everything from `bottleMl`/`quantity`. |
| R4 | Rate/gram constants changed later | Snapshotted per turnover/item; history immutable. |
| R5 | Non-student or archived target | 404/409 before any write. |
| R6 | No active school year | 409 `NO_ACTIVE_SCHOOL_YEAR`; keeps ledger and rollover clean. |
| R7 | Tiny-bottle farming (many <250 ml) | Session-total formula: 10 × 100 ml = 2 pts, not 10. |
| R8 | Same milestone reached twice | `@@unique([userId, rewardId, schoolYearId])`; P2002 → skip. |
| R9 | Double-click release | Conditional status transition + unique `PointHistory.rewardClaimId`; second click → 409, no side effects. |
| R10 | Stock exhausted at release | Rollback + 409 `OUT_OF_STOCK`; claim remains open until restock. |
| R11 | Wrong claim code shown | Codes are unique; queue shows student + section + prize together. |
| R12 | Rollover mid-turnover | Active year resolved inside the request; progress/claims are year-scoped. |
| R13 | Ledger inflation by tests | Extend `DELETE /purge` (`report.routes.ts:16`) to wipe turnovers, claims, rewards (or keep rewards as catalog with reset script). |
| R14 | File-size cap | All new files small and split by responsibility. |

---

## 11. Phase 2 — Challenge Accrual (deferred, designed now)

`ChallengeContribution.reportId` is required today, so walk-ins cannot feed challenges without schema work. When approved:

1. Add `ChallengeType.BOTTLE_VOLUME` (progress in ml; alternatively `BOTTLE_WEIGHT` in grams).
2. Make `ChallengeContribution.reportId` optional; add `walkInTurnoverId`; enforce one source; add a Postgres partial unique index on `(user_id, challenge_id, walk_in_turnover_id) WHERE walk_in_turnover_id IS NOT NULL`.
3. Add `recordBottleVolumeContribution(tx, turnover)` to `challenge-progress.service.ts`; call it inside the walk-in transaction.
4. UI: label/icon for the type in `GamificationTab` and the admin challenge editor; target entered in litres, stored in ml.

Note the overlap with §8: challenges are auto-rewarded (existing behavior), milestones are admin-released. Keep them distinct so point grants remain predictable.

---

## 12. Delivery Phases & Gates

| Phase | Work | Exit gate |
|---|---|---|
| **1. Schema** | Prisma models + amendments (§4), migration, `Reward` placeholder seed, purge update, scoped LOCAL purge + optional offline roster seed (§3.5). | `prisma validate/generate`; `migrate deploy` on a DB copy; duplicate-insert rejection proven; offline seed re-runnable. |
| **2. Backend: turnover** | `walk-in.service.ts`, `walk-in.routes.ts`, register route, settings fields. | §13 backend rows pass; `npm --prefix server run build` green. |
| **3. Backend: rewards** | `reward.service.ts`, `reward.routes.ts`, unlock logic, release/cancel, audit. | Unlock-once + release-once tests pass; roles enforced. |
| **4. MRF UI** | Nav tab, hook, 4 components, receipt + today list. | Counter flow works end-to-end; idempotent retry shows one credit; lint/build green. |
| **5. Student UI** | Activity card + reward ladder in Gamification. | Turn-in and unlock visible; reserve flow works; no optimistic mutations. |
| **6. Admin UI** | Rewards nav + claims queue with Claim/Release + catalog. | Release credits points once / decrements stock once; audit visible. |
| **7. Polish (optional)** | Impact-tab summary, ledger reason filter, catalog CRUD, offline-linking script (§3.5 item 5). | Totals reconcile with `PointHistory`; linking preserves balances. |
| **8. Challenges (deferred)** | §11. | Contribution dedupe tests pass; rewards fire once. |

---

## 13. Test & Acceptance Matrix

**Point math (session total)**

- [ ] 1 × 250 ml → 1 pt; 3 × 350 ml → 2 pts; 1 × 500 ml → 1 pt; 2 × 600 ml → 2 pts.
- [ ] 1 L → 2 pts; 1.5 L → 3 pts; 2 L → 4 pts; 3 × 500 ml + 2 L → 7 pts.
- [ ] 10 × 100 ml → 2 pts (no small-bottle farming).
- [ ] `ratePer500ml = 2` → 500 ml = 2 pts, 1 L = 4 pts.
- [ ] Client-sent points/grams ignored.

**Weight estimation**

- [ ] Per-size gram factors applied; `totalGrams` = Σ item grams.
- [ ] "Other" ml uses nearest-preset factor (e.g., 450 ml → 19 g).
- [ ] Historic turnovers keep their snapshotted factors after constants change.

**Integrity**

- [ ] Duplicate `idempotencyKey` → one turnover, one ledger row, one balance increment.
- [ ] Concurrent duplicates → same.
- [ ] Forced failure rolls back turnover + items + balance + ledger + audit.
- [ ] No negative/zero points on a valid visit.

**Milestones & claims**

- [ ] Crossing 1 kg unlocks Tier 1 exactly once; repeat turnover below next tier unlocks nothing.
- [ ] Two concurrent turnouts crossing the same tier → one claim.
- [ ] Claim code unique; student sees only their claims.
- [ ] New school year resets progress; prior-year claims untouched.
- [ ] Double release (POINTS) → one ledger row and one increment; second call 409.
- [ ] Double release (PHYSICAL) → stock decremented once.
- [ ] Stock 0 → 409 `OUT_OF_STOCK`, claim stays open, no side effects.
- [ ] Cancel changes nothing except status.
- [ ] Non-admin release → 403; MRF can record but not release.

**Auth & validation**

- [ ] STUDENT/PUBLIC on `POST /api/walk-ins` → 401/403, no mutation.
- [ ] MRF/ADMIN succeed; TEACHER → 403.
- [ ] Archived/non-student → 404/409; bounds violations → 400.
- [ ] `walkInEnabled = false` → 403; no active school year → 409.
- [ ] Search returns offline (`LOCAL`) students flagged with `syncSource`; archived users excluded.
- [ ] Walk-in recording works with EnrollPro unreachable (no outbound EnrollPro call in the flow).
- [ ] A successful EnrollPro sync never deletes a `LOCAL` account that owns turnovers, claims, or ledger rows.

**Reflection**

- [ ] Student points, leaderboard, certificates, school-year ledger, and audit logs reflect turnover and prize credits.
- [ ] Rollover snapshots include both.

**UI**

- [ ] Search debounce; steppers clamp; live ml/grams/points; receipt shows new balance and unlocks.
- [ ] Student ladder progress bar + claim codes; admin queue Claim/Release with confirm.
- [ ] Empty/loading/error states; design tokens per `AGENTS.md`; `npm run lint`, `npm run build`, `npm --prefix server run build` pass; no file near 1,000 lines.

---

## 14. File Plan

**Add**

- `server/prisma/migrations/<timestamp>_walk_in_turnovers_rewards/`
- `server/prisma/seed-offline-students.ts` (optional demo roster, §3.5)
- `server/src/scripts/link-offline-students.ts` (optional Phase 7, §3.5)
- `server/src/services/walk-in.service.ts`, `server/src/services/reward.service.ts`
- `server/src/routes/walk-in.routes.ts`, `server/src/routes/reward.routes.ts`
- `src/hooks/useWalkInTurnover.ts`, `src/hooks/useRewards.ts`
- `src/pages/mrf/components/MRFWalkInTab.tsx`, `WalkInStudentPicker.tsx`, `BottleSizeStepper.tsx`, `WalkInReceipt.tsx`
- `src/pages/student/components/WalkInActivityCard.tsx`, `RewardLadderCard.tsx`
- `src/pages/admin/components/AdminRewardsTab.tsx`, `RewardClaimQueue.tsx`, `RewardCatalogTable.tsx`

**Modify**

- `server/prisma/schema.prisma`, `server/prisma/seed.ts` (placeholder rewards, settings)
- `server/src/services/enrollpro-sync.service.ts` (scope the LOCAL purge to activity-free accounts, §3.5)
- `server/src/index.ts` (route registration before catch-alls)
- `server/src/routes/report.routes.ts` (purge includes turnovers/claims)
- `src/types/index.ts`, `src/services/api.ts`
- `src/components/layout/DashboardLayout.tsx` (MRF nav + admin Rewards nav)
- `src/pages/mrf/MRFDashboard.tsx` (render tab)
- `src/pages/student/components/GamificationTab.tsx` (activity + ladder cards)
- `src/pages/admin/AdminDashboard.tsx` (render Rewards tab)

**Do not create**

- A client-side points or grams calculator.
- A second point-award service (`PointHistory` remains the single ledger).
- A separate approval workflow for walk-in recording (only prize release is admin-gated).

---

## 15. Open Decisions (need approval)

| # | Question | Recommended default |
|---|---|---|
| D1 | Should walk-in grams also add to PET `recycle_market_stocks` accumulated kg? | **No in v1.** Grams drive milestones; stock stays weight-based through existing weigh flows (avoid double counting when staff also log direct pickups). Add an `walkInAutoAddPetStock` setting later if approved. |
| D2 | Daily point cap per student | `walkInDailyPointCap = 0` (off) in v1; enable in Phase 2 if abuse appears. |
| D3 | No active school year | Reject `409 NO_ACTIVE_SCHOOL_YEAR` (keeps rollover/ledger clean). |
| D4 | Corrections | No reversal; admins use `POST /api/users/:id/deduct-points`; prizes re-issued via stock adjustments. |
| D5 | "Other ml" bounds | 100–20 000 ml; nearest-preset gram factor. |
| D6 | Challenge integration timing | Phase 2 per §11. |
| D7 | Prize list finalization | Seeded placeholders (§8.2) until the student/professor interview; data-driven swap after. |
| D8 | Who may release prizes | ADMIN only (professor's request). If the prize desk is at the MRF, add `MRF` to `release` later; recording walk-ins already allows MRF. |
| D9 | Milestone resets | Per school year (§4.2/§8.1). Alternatively lifetime — but yearly matches rollover and prize budgeting. |
| D10 | Offline roster provisioning | Option A: `seed-offline-students.ts` for demos now; add Option B (admin "Add offline student") only if real pre-EnrollPro onboarding is needed. |
| D11 | Offline accounts on leaderboard/certificates | Keep the `ENROLLPRO`-only filters until linked; offline credits remain visible in Admin Users and the ledger meanwhile. |

---

## 16. Definition of Done

- MRF staff can record a walk-in in under ~30 seconds: search → tap sizes → confirm → receipt (with unlocks).
- Points come from session volume; grams are recorded and accumulate per student per school year; clients never author either.
- Retries and concurrent submits credit exactly once per turnover and unlock each tier exactly once.
- Students see their balance, turn-in activity, kilogram progress, and claimable prizes with codes.
- Admin has a Rewards queue with a working **Claim / Release** button; releasing credits points once or decrements stock once, with audit logs.
- Historical rates, grams, points, and claims are immutable; catalog changes affect only future unlocks.
- Migration, builds, lint, and the acceptance matrix pass; no source file approaches 1,000 lines; design tokens honored.
- The feature demos end-to-end with EnrollPro offline (local roster + minted-token sessions), and a future sync cannot delete offline accounts that own credits.

**Approval checkpoint:** confirm L1–L6 and Open Decisions D1–D11 before Phase 1 begins.

---

## 17. Implementation Status (2026-09-20)

**Database (migration `20260920142737_walk_in_turnovers_rewards`)**
- New: `walk_in_turnovers`, `walk_in_turnover_items`, `rewards`, `reward_claims`; enums `RewardType`, `RewardClaimStatus`.
- Amended: `PointHistory.walkInTurnoverId` / `rewardClaimId` (unique), `SystemSetting.walkInPointsPer500ml` / `walkInEnabled`, User/SchoolYear relations.
- Seeded 4 placeholder reward tiers (`TIER_1KG`..`TIER_10KG`) via `npm run db:seed-walkin` (idempotent, non-destructive).

**Backend**
- `walk-in.service.ts`: session-total point rule (`max(1, floor(totalMl/500*rate))`), per-size gram estimates, idempotent turnover transaction (turnover + items + points + ledger + audit), milestone unlock via `INSERT ... ON CONFLICT DO NOTHING` (avoids Postgres 25P02 aborts), progress aggregation, local-roster student search (offline accounts included).
- `reward.service.ts`: student ladder, reserve, admin claim queue, release (points exactly-once via unique `PointHistory.rewardClaimId`; physical stock guarded decrement), cancel, catalog list/create/update.
- Routes: `POST/GET /api/walk-ins`, `/students`, `/me`, `/progress/:studentId`; `GET /api/rewards`, `/admin`, `/claims`, `POST /claims/:id/request|release|cancel`, `POST/PATCH /api/rewards`. Registered in `index.ts`.
- Offline readiness: `seed-offline-students.ts` (LOCAL demo roster, `enrollmentStatus = OFFLINE_DEMO`), scoped LOCAL purge in `enrollpro-sync.service.ts` (activity-free accounts only), `/auth/me` serves `OFFLINE_DEMO` accounts only when a valid signed token is presented (login remains strictly EnrollPro-delegated).
- `DELETE /api/reports/purge` now also clears reward claims and walk-in turnovers.
- Scripts: `npm run db:seed-walkin`, `npm run db:seed-offline`.

**Frontend**
- MRF: `Walk-in Station` nav tab; `MRFWalkInTab` + `WalkInStudentPicker` (offline badge) + `BottleSizeStepper` (8 presets + Other) + `WalkInReceipt` (points, balance, kg progress, unlocked claim codes); today's station log.
- Student: `WalkInActivityCard` + `RewardLadderCard` in the Ranks/Gamification tab (kg ladder, claim codes, reserve action).
- Admin: `Rewards` nav tab with stats, `RewardClaimQueue` (Claim/Release + Cancel) and `RewardCatalogTable` (stock, enable/disable).
- `useWalkInTurnover` hook, typed API methods, `WalkIn*`/`Reward*` types.

**Verified (dev DB)**
- API smoke: 60�500 ml ? 60 pts / 1.14 kg, TIER_1KG unlocked; duplicate `idempotencyKey` ? one credit; release ? +25 pts; double release ? 409.
- UI: MRF search ? select ? 2�1 L ? +4 pts receipt (new balance 89); admin queue shows pending Eco Green Tumbler with Claim/Release; release decremented stock 25?24; student view shows 3.31 kg, turn-ins, and claimed tiers. Zero console errors in the tested flows.
- `npm run lint` 0 errors, `npm run build` green, `npm --prefix server run build` green.

**Deferred (per plan)**
- Challenge accrual for walk-ins (`BOTTLE_VOLUME`, �11/�12) � Phase 2.
- `link-offline-students.ts` merge script � Phase 7.
- Daily point cap � off by default (D2).
