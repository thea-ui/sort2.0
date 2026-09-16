# Certification / Term-End Awards — Plan

> **Status:** Implemented (2026-09-15). See §15 Implementation Notes.
> **Scope:** Formalize the certificate system into two families — an **instant Milestone certificate** (already built) and **term-end Ranked certificates for the Top 3** — with proper storage, term scoping, and issuance timing.
> **Chosen model:** **Model 1 — Term-end is Top-3 only.** Non-winners keep only the instant Milestone certificate.
> **Related:** `POINTS_SYSTEM_AND_CHALLENGES_PLAN.md`, `POINTS_AWARD_ON_COLLECTION_PLAN.md`, `SCHOOLYEAR-MANAGEMENT-PLAN.md`, `ROLLOVER-READINESS-PLAN.md`.

---

## 0. TL;DR

Two certificate families:

| Group | Certificate | When | Rank shown? |
| --- | --- | --- | --- |
| Top 1 (term) | 🏆 Eco-Champion | Term end (+ grace window) | Yes — Rank 1 |
| Top 2 (term) | 🥈 Eco-Leader | Term end (+ grace window) | Yes — Rank 2 |
| Top 3 (term) | 🥉 Eco-Advocate | Term end (+ grace window) | Yes — Rank 3 |
| Everyone ≥ `certificatePointThreshold` (incl. Top 1–3) | 🎖️ Eco-Milestone | **Instant** (already built) | No |
| Everyone below threshold | — | — | — |

- **Term end is Top-3 only.** No participation certificate and no term-end batch for non-winners.
- **Milestone stays instant** — reaching 500 pts lets the student claim immediately (current behavior, preserved).
- The distinct award per rank is the **default** (see §13) but is stored as data, so admin can rename/re-template later.
- Top-3 issuance **must happen after the term closes** because ranks are not final until then.

---

## 1. Decisions Locked

| # | Decision | Value |
| --- | --- | --- |
| D1 | Overall model | **Model 1** — term-end issues Top-3 ranked certs only |
| D2 | Milestone cert timing | **Instant** on reaching `certificatePointThreshold` |
| D3 | Top-3 timing | **After** term end (never before) |
| D4 | Issuance grace window | **3 days** after term end (configurable) to let pending MRF verifications settle |
| D5 | Certificates per rank | **Distinct**: Eco-Champion / Eco-Leader / Eco-Advocate |
| D6 | Term scope | Points earned within the active `AcademicQuarter` date range |
| D7 | Eligibility | Students only (teachers/MRF/admin do not earn or certify) |
| D8 | Milestone certificate rank display | **None** (keeps instant claiming fair regardless of mid-term standing) |

> D4 and D5 were recommended defaults and are configurable — say the word to change either before Phase 1.

---

## 2. Current Behaviour (evidence)

| Concern | Where | What happens today |
| --- | --- | --- |
| Points engine | `server/src/services/report-points.service.ts:96-224` | Rank + points awarded on MRF collection; `PointHistory` written; school-year scoped |
| Certificate storage | `server/prisma/schema.prisma:115` (`User.certificates String[]`) | Certificates are bare **name strings** — no date, term, rank, or serial |
| Milestone claim | `server/src/routes/user.routes.ts:219-285` | `POST /users/:id/claim-certificate`, enforces `certificatePointThreshold` |
| Admin batch | `server/src/routes/user.routes.ts:287-346` | `POST /claim-certificates-batch` — awards one generic name to **everyone** ≥ threshold |
| PDF | `server/src/services/certificate-pdf.service.ts:75-533` | Renders PDF; **recomputes rank + uses active SY at download time** |
| Threshold setting | `SystemSetting.certificatePointThreshold` (default 500) | Editable in `AdminPointsSystemTab.tsx` |
| Terms | `AcademicQuarter`, `TermCalendar`, `settings.routes.ts:538-565` | T1/T2/T3 exist with dates + `isActive` |
| Period-over flag | `src/pages/student/StudentDashboard.tsx:81` | `isPeriodOver` **hardcoded `false`** → term-gated claim UI is dead code |
| Rollover | `server/src/services/rollover.service.ts:251` | Wipes `certificates: []` on school-year rollover |

**Root problems:** (1) certificates aren't entities, so a reprint shows wrong rank/year; (2) there is no Top-3 certificate type or term-end trigger; (3) points are school-year scoped, not term scoped.

---

## 3. Certificate Families & Tiers

### Family A — Milestone (instant, unlimited)
- **Trigger:** `user.points >= certificatePointThreshold`.
- **Name:** `Eco-Milestone Certificate`.
- **Claim:** immediately, via existing `POST /users/:id/claim-certificate`.
- **Shows:** student name, points reached, school year. **No rank.**
- **Change needed:** minor — persist as a `Certificate` row instead of a string (see §6).

### Family B — Ranked (term-end, exactly 3 per term)
| Tier code | Name | Who |
| --- | --- | --- |
| `CHAMPION` | Eco-Champion Certificate | Rank 1 by term points |
| `LEADER` | Eco-Leader Certificate | Rank 2 by term points |
| `ADVOCATE` | Eco-Advocate Certificate | Rank 3 by term points |

- **Trigger:** term close + grace window.
- **Shows:** name, final rank (`Rank N of <total students>`), term points, school year, term.
- **Claim:** term-end only; issued by the system or admin; then downloadable forever.

A Top-1 student can hold **both** a Milestone and a Champion certificate (different families).

---

## 4. Term-End Lifecycle

```
Term active ──► Live leaderboard ("you're currently #2") ──► Top-3 certs LOCKED
      │
      ▼
Term endDate reached ──► FREEZE standings at 23:59 of term end
      │
      ▼
Grace window (3 days) ──► late MRF verifications still count
      │
      ▼
Issue Top-3 ranked certs (auto job OR admin "Issue Term Awards")
      │
      ▼
Students see "Ranked certificate earned" → View / Download
```

Rules:
- Rank is computed **once**, at issuance, and **stored** (`rankAtIssue`, `pointsAtIssue`). Later point changes never alter an issued certificate.
- The freeze boundary is the term's `endDate`. Verifications dated after the freeze + grace window do not affect that term's ranks.
- If fewer than 3 students have points, award only as many ranked certs as there are eligible students.

---

## 5. Term-Scoped Points

Points are currently school-year scoped, so "term points" must be derived:

**Recommended:** sum `PointHistory.amount` for the user where `timestamp` falls inside the term's `[startDate, endDate]` and the school year matches.

- No balance reset, no data loss, works for T1/T2/T3.
- Requires `PointHistory` to be queryable by user + date (index exists via `point_histories`; confirm `(user_id, timestamp)` index).
- Positive and negative entries both count (offenses reduce term total) — confirm in §13.

Fallback (if auditing stricter later): snapshot term points into a `TermPointSnapshot` at term close.

---

## 6. Data Model

Replace string certificates with a persisted entity.

```prisma
enum CertificateType { MILESTONE, RANK }
enum CertificateTier { MILESTONE, CHAMPION, LEADER, ADVOCATE }

model Certificate {
  id             String          @id @default(cuid())
  userId         String
  user           User            @relation(fields: [userId], references: [id])
  serial         String          @unique   // e.g. SORT-HNHS-2026-T1-R1-P4820
  type           CertificateType
  tier           CertificateTier
  name           String                    // snapshot of display name at issue
  rankAtIssue    Int?                      // null for MILESTONE
  pointsAtIssue  Int
  termCode       String?                   // "T1" | "T2" | "T3"; null for MILESTONE
  schoolYearId   String?
  issuedAt       DateTime        @default(now())
  issuedBy       String?                   // admin userId, null = system
  templateVersion String         @default("v1")

  @@index([userId])
  @@index([schoolYearId, termCode])
  @@map("certificates")
}
```

Migration notes:
- Keep `User.certificates String[]` temporarily, or backfill existing strings into rows, then deprecate.
- Rollover (`rollover.service.ts:251`) must **not** delete `Certificate` rows — historical certificates should survive; only reset the working `points`. This is a behavior change vs today.
- Follow repo DB conventions: plural snake_case table, singular FKs, cuid PKs, indexed FKs.

---

## 7. PDF & Serial Changes

`certificate-pdf.service.ts` already accepts `CertificateData`. Changes:
- Add `termCode` and use **stored** `rankAtIssue` / `pointsAtIssue` / `schoolYear` (never recompute at download).
- Milestone template: no rank plaque, shows "reached N eco-points".
- Ranked templates: Champion / Leader / Advocate variants (color/seal/text), rank plaque.
- Serial format: `SORT-HNHS-{year}-{termCode}-R{rank}-P{points}` for ranked; `SORT-HNHS-{year}-M{seq}` for milestone.

---

## 8. API Surface

| Method | Route | Purpose | Change |
| --- | --- | --- | --- |
| POST | `/users/:id/claim-certificate` | Milestone claim | Update to write a `Certificate` row |
| POST | `/claim-certificates-batch` | Admin manual award | Repurpose → `Issue Term Awards` (Top-3) |
| POST | `/certificates/issue-term` | Issue Top-3 for a term | **New** (admin) |
| GET | `/certificates` | List a user's certificates | **New** |
| GET | `/certificates/:id/download` | Download PDF (by cert id) | **New** (replaces name-based lookups) |
| GET | `/certificates/:id/view` | Inline PDF | **New** |
| GET | `/terms/current` | Active term + status | Extend existing quarters endpoint |

Client wrappers in `src/services/api.ts:590-662` are updated to the id-based routes.

---

## 9. Student UI

- **Overview tab** (`OverviewTab.tsx`): progress bar stays; add a `CertificateCard` grid grouped by family (Milestone vs Ranked).
- **Gamification tab** (`GamificationTab.tsx`): remove the dead `isPeriodOver` gate; wire to real term status.
- **New components** (keep each file well under the 1,000-line rule):
  - `src/pages/student/components/CertificateCard.tsx`
  - `src/pages/student/components/CertificatePreviewModal.tsx`
  - Hook: `src/hooks/useCertificates.ts` (mirror `useSchoolYear.ts` cache pattern)
- States to handle gracefully: locked ("finalizes at term end"), earned, downloading, error.

---

## 10. Admin UI

- New `src/pages/admin/components/settings/AdminCertificateTab.tsx`:
  - Threshold, tier names/descriptions, grace-window days, term scope toggle.
  - **Issue Term Awards** button with preview of the projected Top 3 + confirmation.
  - Issuance history / audit (term, rank, recipient, issued-at).
- Wire into `AdminSettingsTab.tsx` (pattern at lines 27-30/421-425) and `SETTINGS_SUBITEMS` in `DashboardLayout.tsx:85-97`.

---

## 11. Phased Roadmap

| Phase | Deliverable | Files |
| --- | --- | --- |
| **1. Data core** | `Certificate` model + migration + backfill; issuance service; term-point query | `server/prisma/schema.prisma`, new `server/src/services/certificate.service.ts` |
| **2. Term-end issuance** | Top-3 computation, grace window, `POST /certificates/issue-term`, admin manual trigger | `certificate.service.ts`, `user.routes.ts` (or new `certificate.routes.ts`) |
| **3. PDF rework** | Stored-rank rendering, Milestone/Ranked templates, new serial | `certificate-pdf.service.ts` |
| **4. Student UI** | `useCertificates`, `CertificateCard`, preview modal, real term status | `src/hooks/useCertificates.ts`, `src/pages/student/components/*`, `StudentDashboard.tsx` |
| **5. Admin UI** | `AdminCertificateTab` + settings wiring + history | `AdminCertificateTab.tsx`, `AdminSettingsTab.tsx`, `DashboardLayout.tsx` |
| **6. Automation & polish** | Scheduled term-close job, unify leaderboards on `/users/leaderboard`, certificate gallery | `server/src/services/*`, `GamificationTab.tsx`, `AdminLeaderboardTab.tsx` |

Later phases depend on Phase 1; Phases 3–5 can run partly in parallel.

---

## 12. File Reference Map

| Area | Path |
| --- | --- |
| Types | `src/types/index.ts` (`User.certificatesEarned`, `SystemSettings.certificatePointThreshold`) |
| API client | `src/services/api.ts:590-662` |
| Mock/data hook | `src/hooks/useMockData.tsx:730-769` |
| Auth normalize | `src/hooks/useAuthState.ts:22,61` |
| Student cert UI | `src/pages/student/components/OverviewTab.tsx`, `GamificationTab.tsx` |
| Admin cert UI | `src/pages/admin/components/settings/AdminPointsSystemTab.tsx` |
| PDF | `server/src/services/certificate-pdf.service.ts` |
| Issuance routes | `server/src/routes/user.routes.ts:219-464` |
| Points engine | `server/src/services/report-points.service.ts` |
| Terms | `server/src/routes/settings.routes.ts:538-565`, `src/pages/admin/components/settings/AdminAcademicCalendarTab.tsx` |
| Rollover | `server/src/services/rollover.service.ts:251` |
| Schema | `server/prisma/schema.prisma` |

---

## 13. Open Items / Configurable Defaults

| # | Question | Default if no answer |
| --- | --- | --- |
| O1 | Grace window length | 3 days after term `endDate` |
| O2 | Distinct per-rank certificates vs one "Top 3" cert | **Distinct** (Champion/Leader/Advocate) |
| O3 | Do negative `PointHistory` (offenses) reduce term points? | Yes — net points |
| O4 | Behavior if a term ends with < 3 eligible students | Award only as many as eligible |
| O5 | Should historical (pre-existing) string certs be backfilled into rows? | Yes, best-effort backfill |

---

## 14. Acceptance Criteria

1. Reaching the threshold still lets a student claim the Milestone certificate immediately.
2. No ranked certificate is claimable before the term's `endDate`.
3. After term end + grace window, exactly the Top 3 (by net term points) can claim Champion/Leader/Advocate.
4. An issued certificate always renders with its **stored** rank, points, term, and school year — even if downloaded years later.
5. Certificates survive school-year rollover; only the working points balance resets.
6. Non-winners receive no term-end certificate (Model 1).
7. Admin can preview and manually issue term awards, with an audit trail.
8. Build passes (`npm run build`) and lint introduces no new errors (`npm run lint`); no file exceeds the 1,000-line limit.

---

## 15. Implementation Notes (2026-09-15)

### Server
- `server/prisma/schema.prisma` � added `CertificateType` / `CertificateTier` enums, the `Certificate` model (`certificates` table), `User.certificatesIssued` relation, and 5 new `SystemSetting` columns (`certificate_grace_days`, `certificate_milestone_name`, `certificate_champion_name`, `certificate_leader_name`, `certificate_advocate_name`).
- `server/src/services/certificate.service.ts` (new) � term status (`getTermStatus`), term point aggregation from `PointHistory` (`computeTermStandings`), Top-3 issuance (`issueTermCertificates`), milestone issuance (`claimMilestoneCertificate`), read helpers, serial generation.
- `server/src/routes/certificate.routes.ts` (new) � `GET /term-status`, `GET /`, `POST /claim-milestone`, `POST /issue-term` (admin), `GET /history` (admin), `GET /:id/download`, `GET /:id/view`. Registered at `/api/certificates` in `server/src/index.ts`.
- `server/src/services/certificate-pdf.service.ts` � accepts `termName`, `serial`, `isRanked`; renders stored rank/points (no recompute), milestone-aware plaque, and dynamic serial.
- `server/src/routes/settings.routes.ts` � persists the new certificate settings.
- `server/src/services/rollover.service.ts` � certificates are no longer wiped on school-year rollover (historical awards survive).

### Client
- `src/types/index.ts` � `Certificate`, `CertificateType`, `CertificateTier`, `TermStatus`, `TermState`, `TermStanding`, `IssueTermResult`; extended `SystemSettings`.
- `src/services/api.ts` � `getUserCertificates`, `getTermStatus`, `claimMilestoneCertificate`, `issueTermCertificates`, `getCertificateHistory`, `downloadCertificateById`, `viewCertificateById`.
- `src/hooks/useCertificates.ts` (new) � fetches certificates + term status, `claimMilestone`, `refresh`.
- `src/pages/student/components/CertificateCard.tsx`, `CertificatePreviewModal.tsx`, `CertificateVault.tsx` (new) � tier-styled cards, preview modal, term banner, instant milestone claim, ranked-award section.
- `src/pages/student/components/GamificationTab.tsx` � replaced the dead `isPeriodOver` claim flow and legacy name-based certificate list with `CertificateVault`.
- `src/pages/student/components/OverviewTab.tsx` � replaced name-based cert chips with a Certificate Vault CTA and progress messaging.
- `src/pages/student/StudentDashboard.tsx` � dropped obsolete tournament/claim props.
- `src/pages/admin/components/settings/AdminCertificateTab.tsx` (new) � term status, issue/force-issue Top-3, certificate naming/threshold/grace config, issuance history.
- `src/pages/admin/components/AdminSettingsTab.tsx` + `src/components/layout/DashboardLayout.tsx` � wired the new `certificates` settings sub-tab.
- `src/pages/admin/components/settings/AdminPointsSystemTab.tsx` - removed the duplicate "Certificate Awards" panel; issuance now lives only in Settings -> Certificates.

### Database
- Applied via additive SQL (migration history already had pre-existing drift). `prisma db push` was **not** used because it would drop the stale `mrf_inventory_items` / `mrf_inventory_transactions` tables (20 rows).
- ?? Pending: backfill of legacy `users.certificates` strings into `certificates` rows (open item O5).

### Verification
- `npm run build` (client) and `npm run build` (server `tsc`) pass; `npm run lint` reports 0 errors.
- Service smoke-tested against the live DB (term status, names, standings, certificate count).
