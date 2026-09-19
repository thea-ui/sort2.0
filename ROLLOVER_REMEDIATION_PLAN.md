# Rollover Remediation Plan — SY 2030-2031 → 2031-2032

Investigated live against the database on **2026-09-18**. Nothing was modified.

---

## 1. Root cause found

### 🔴 TWO school years are marked active at the same time

| School year | isActive | ID |
|---|---|---|
| **2031-2032** | **true** | `c81a86cd` |
| **2030-2031** | **true** | `edbfd25e` |
| 2029-2030 and older | false | — |

The rollover activated the new year but **never deactivated the previous one**. Every downstream symptom follows from this.

---

## 2. What did NOT archive (evidence)

| # | Data | State found | Should be |
|---|---|---|---|
| 1 | **Previous school year** | `2030-2031` still `isActive = true` | deactivated |
| 2 | **Continuing student points** | CASTILLO, ERIKA holds **790 points** tagged `SY=2031-2032`, `ENROLLED` | closed out for 2030-2031, reset for the new year |
| 3 | **Alumni still ranked** | DEL ROSARIO, BEATRIZ — `archivedAt = YES`, `enrollmentStatus = ALUMNI`, still holds **225 points** and shows as **Rank #2** on the live leaderboard | excluded from leaderboard |
| 4 | **Point snapshots** | Only **1 snapshot** exists in the whole system (from 2026-09-10). Nothing was snapshotted at this rollover | one snapshot per student per closed year |
| 5 | **Reports** | All 14 reports remain on the old `schoolYearId = edbfd25e` — correct, but the leaderboard counts *current-year* reports, so every student now shows **"0 reports"** against carried-over points | consistent |
| 6 | **Point history** | All 11 entries still on the old year | correct (history is historical) |
| 7 | **Student counts** | 69 active + **25 archived = 94** shown as "STUDENTS 94" | 69 active |
| 8 | **Login readiness** | "94/94 students login-ready" includes 25 alumni | 69 active learners |
| 9 | **Users tab** | Shows archived users with **no badge, no filter** — indistinguishable from active | archived flagged / filterable |

**Archived totals:** 25 of 137 users are archived (all students). 94 students total; 69 active.

---

## 3. Why the Users tab "didn't update"

It *did* receive the data — 25 students were archived in the database. The tab simply **does not distinguish or filter archived accounts**:

- "REGISTERED ACCOUNTS 137" includes the 25 archived
- The Students stat card shows **94** (69 active + 25 archived)
- The list renders archived and active rows identically

So it looks like nothing happened. The fix is a UI change (archived badge + "Active / Archived / All" filter), not a sync problem.

---

## 4. Impact if a panel sees this

- Ask "how many students do you have?" → you'd answer 94, but only 69 are enrolled.
- Open the Leaderboard → the **#2 ranked student is an alumni** who cannot even log in.
- Ask about year-over-year reporting → points carried over with zero reports, which looks broken.
- Open School Years → two active years; new data may be tagged to the wrong one.

---

## 5. Remediation plan (phased, safe)

### Phase 0 — Safety first (5 min)
1. `pg_dump` the database before any write.
2. Record "before" counts (this document serves as the baseline).

### Phase 1 — Single active school year (critical, low risk)
3. Set `2030-2031.isActive = false`; keep `2031-2032` active.
4. Audit `getActiveSchoolYearId()` — make it deterministic (highest `startDate` among active) and log a warning if more than one active year is found.
5. Add a DB-level guard: a partial unique index ensuring at most one active school year.

### Phase 2 — Points policy (needs your decision — see §7)
6. Choose the policy, then, for each affected student:
   - write a `UserPointSnapshot` for the closing year (`closingPoints`, `rank`),
   - then apply the chosen policy (reset to 0, or carry over with a documented reason).
7. Affected cases: **CASTILLO (790 pts, continuing)** and **DEL ROSARIO (225 pts, alumni)**.

### Phase 3 — Archive visibility (UI + queries)
8. **Leaderboard**: exclude `archivedAt != null` users.
9. **Users tab**: add an *Active / Archived / All* filter and an "Archived" badge on rows; default to Active.
10. **Student stat card & Login Readiness**: count active students only; show archived separately.
11. **School Years tab**: guard the activate action so it deactivates the previous year in the same transaction.

### Phase 4 — Verification gate (must pass before calling it done)
12. Exactly **one** active school year.
13. Leaderboard contains **no archived** users and no unreachable alumni.
14. Users tab: Students card = 69 by default; the 25 archived appear only under "Archived".
15. Login readiness reflects only active learners.
16. Playwright walkthrough: Admin → Users (all three filters), Admin → Leaderboard, Admin → School Years; Student → Ranks. 0 console errors.
17. `npm run verify` → 28/28.

### Phase 5 — Anti-regression (prevent a repeat)
18. Make rollover **single-transaction and idempotent**: snapshot points → archive non-enrolled → deactivate old year → activate new year → write one `SyncLog` summary. Any failure rolls back everything.
19. Rollover **dry-run mode** that prints exactly what it will change, with a count of affected students.
20. Add a rollover assertion script to `npm run verify`: fails if >1 active SY, if archived users hold points in the new year, or if archived users appear on the leaderboard.

---

## 6. Files likely involved
- `server/src/services/rollover.service.ts` — year activation / archiving
- `server/src/services/enrollpro-sync.service.ts` — archived count reporting
- `server/src/routes/user.routes.ts` — leaderboard query
- `src/pages/admin/components/AdminUsersTab.tsx` — archived filter/badge
- `src/pages/admin/components/AdminLeaderboardTab.tsx` — exclude archived
- `src/pages/admin/components/settings/AdminAcademicCalendarTab.tsx` / School Years — activation guard
- `server/prisma/schema.prisma` — active-year uniqueness guard

---

## 7. Decisions — CONFIRMED by the school

1. **Points reset at rollover, honouring the certificate grace window.**
   - On year/term end, keep points available for `certificateGraceDays` (currently 3) so learners can still claim certificates.
   - Once the grace window closes: write a `UserPointSnapshot` (`closingPoints`, `rank`) for the closing year, then **reset points to 0** for the new year.
   - This is the intended model; the current data never performed the reset, which is why carried-over points sit next to "0 reports".
2. **Archived students are not shown as active.**
   - "Archived" = `archivedAt` is set / `enrollmentStatus = ALUMNI` (graduated, no longer enrolled). Records are retained for history only.
   - Exclude them from: the Students stat card, Student Login Readiness, the leaderboard, and default Users listing.
   - Add an **Active / Archived / All** filter to the Users tab, default **Active**, with an "Archived" badge.
3. **Alumni cannot log in — already enforced** (verified: login and token refresh both reject `ALUMNI` / `NOT_ENROLLED`). No profile access is required for them; they disappear from all active views.

### Definition of done (revised)
- Exactly **one** active school year.
- Points reset to 0 for active students, with snapshots recorded for the closed year.
- Leaderboard contains **only active, enrolled** learners.
- Students card = **69** (active); the 25 alumni appear only under the "Archived" filter.
- Login readiness reflects active learners only.
- `npm run verify` → 28/28, plus a new rollover assertion (≤1 active year, no archived user holds current-year points).

---

## 8. Recommended order tonight
1. Phase 0 backup
2. Phase 1 (single active year) — fixes the root cause immediately
3. Phase 3 items 8 + 10 (leaderboard + counts) — removes the visibly wrong data
4. Phase 2 once you decide the points policy
5. Phase 4 verification, then Phase 5 guards
