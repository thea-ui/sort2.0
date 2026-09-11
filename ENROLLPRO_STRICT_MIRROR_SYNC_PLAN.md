# ENROLLPRO STRICT MIRROR & SYNC REFACTOR — IMPLEMENTATION HANDOFF

> STATUS: PLAN ONLY — NOT IMPLEMENTED. This document is the complete handoff spec for the implementing agent. Do not deviate from the decisions in §3 without confirming with the owner first.

---

## 1. CONTEXT & PROBLEM

SORTv2 mirrors user accounts from **EnrollPro** (external system, base URL configured in `server/.env` → `ENROLLPRO_BASE_URL`, hardcoded fallback `https://dev-jegs.buru-degree.ts.net/api`). The mirror has gone stale:

**Concrete symptom (owner-confirmed):** Account `1234501` logs in locally with `DepEd2026!`, but EnrollPro's real password for `1234501` is `DepEdSY2026!`. The local system is not updating dynamically and the "Demo Credentials" panel on the landing page advertises the stale/wrong password.

### Root cause (verified by investigation)

SORT is a **one-way, credential-blind provisioner** — not an authentication delegate:

1. **Login is 100% local.** `POST /api/auth/login` (`server/src/routes/auth.routes.ts:41-63`) matches `enrollproLrn`/`employeeId`/`email` against the local `users` table and bcrypt-compares against the local `password_hash`. **EnrollPro is never consulted at login.**
2. **EnrollPro's integration API returns no credentials.** `/integration/v1/learners|faculty|staff` (`server/src/services/enrollpro-sync.service.ts:27-75`) returns directory data only (name, LRN, grade, section, etc.). No password fields exist in the response types.
3. **Local passwords are invented at creation.** Sync CREATEs accounts with `bcrypt.hash(ENROLLPRO_DEFAULT_PASSWORD)` where the default is `'DepEd2026!'` (`enrollpro-sync.service.ts:11`, creation at lines 399-406). The UPDATE path (lines 362-378) **never rewrites `passwordHash`**. Therefore a password change on EnrollPro is permanently invisible to SORT.
4. Note: EnrollPro's real admin password (`DepEdSY2026!`) sits in `server/.env:12` as `ENROLLPRO_PASSWORD` — used only by (currently dead) sync-service self-authentication code, never for user login verification.

### Secondary sync bugs (also verified)

| Bug | Location | Effect |
|---|---|---|
| Silent fetch failure | `enrollpro-sync.service.ts:248-259` — each endpoint's `.catch` returns `[]` | Broken URL/key = zero updates, logins keep working on stale data; partial failures log as `SUCCESS` (line 489) |
| Coarse delete guard | `enrollpro-sync.service.ts:451-473` — guard is global `totalPulled > 0` | If only 1 of 3 endpoints succeeds, the other two cohorts get **wrongly deleted** (over-deletion hazard); if 0 pulled, stale accounts linger forever |
| Partial field updates | `enrollpro-sync.service.ts:362-378` — update skips `email` and `employeeId` | Email/employee-ID changes on EnrollPro never propagate; logins by old email keep working |
| Hardcoded demo credentials | `src/components/landing/LoginCard.tsx:5-9`, panel UI at 136-170 | Landing page advertises the fake `DepEd2026!` password (already a pending item in `AUDIT_REPORT.md:563`) |
| Stale docs | `README.md:16-28`, `POSTGRES_SETUP.md:7-19` | Document 7 seed accounts (`student1@sort.edu`/`student123` etc.) that `seed.ts` no longer creates |
| Dead code | `getEnrollProToken()` (`enrollpro-sync.service.ts:118-146`), `generateTempPassword()` (111-114), `SystemSetting.smartSyncEnabled` (`server/prisma/schema.prisma:240` — stored/CRUD'd but never read by sync) | Confusion / maintenance burden |
| No sync CLI | root & `server/package.json` | Sync only runs inside the live server process (startup + hourly cron + admin-only API endpoints with no UI) |

### Current sync architecture (for reference)

- **Hourly cron** `0 * * * *` (env-overridable via `SYNC_INTERVAL_CRON`) — `server/src/index.ts:59-91`, with an `isSyncRunning` mutex.
- **Startup sync** (unconditional) — `server/src/index.ts:93-112`.
- **Manual admin API** (JWT + `requireAdmin`) — `server/src/routes/sync.routes.ts`: `POST /api/sync/enrollpro` (line 31), `POST /api/sync/terms` (44), `POST /api/sync/all` (57), `GET /api/sync/status` (75), `GET /api/sync/health` (116), `GET /api/sync/school-years` (150), `GET /api/sync/enrollpro-school-year` (191).
- **Frontend "Sync from EnrollPro" button** exists only for TERMS (`src/pages/admin/components/settings/AdminAcademicCalendarTab.tsx:51-64`) — nothing in the UI triggers a user sync.
- **Fetch is FULL, not incremental** (no cursors/`updatedSince`): three paginated endpoints pulled in parallel, `limit=200`/page, auth via `X-Integration-Key: ENROLLPRO_SYNC_SECRET` header.
- **Write:** upsert in batches of 50, match cascade `enrollproId` → `email` → `employeeId` (P2002 recovery). Delete propagation for `syncSource: 'ENROLLPRO'` users missing from the pull, plus unconditional purge of `syncSource: 'LOCAL'` accounts every run.
- **State:** every run writes an `EnrollmentSyncLog` row (`schema.prisma:458-474`, written at `enrollpro-sync.service.ts:486-511`) with counts, status, duration.

---

## 2. OWNER DECISIONS (LOCKED)

These were explicitly confirmed by the owner. Do not change them without re-confirmation:

1. **Strict EnrollPro delegation for credentials.** "What EnrollPro provides is only it; we don't override data here like passwords. If EnrollPro's password is what it is, it strictly applies here." → Login must be delegated to EnrollPro's own `/auth/login`. No local password overrides, no local default passwords, no local change-password.
2. **Wipe scope: accounts + user data only.** Wipe users, sessions, and user-owned content (reports, points, offenses, notifications, snapshots). **Keep** bins, categories, locations, settings, inventory. Then bulk-sync fresh.
3. **Sync cadence: admin-controlled settings.** An admin settings UI toggle controls MANUAL (default) vs AUTOMATIC sync (with interval). Manual "Run Bulk Sync Now" must always be available. No always-on hourly cron.
4. **Demo Credentials panel: remove completely** from the landing page (no env-gated variant).
5. Cadence rationale (context): owner only needs data for the year, wants bulk manual sync for now, with auto available as a flip of a toggle later.

---

## 3. IMPLEMENTATION PLAN

> Follow repo rules in `AGENTS.md`: no source file approaching 1,000 lines (modularize into hooks/atomic components); Tailwind with official design tokens (bg `#F9F3F0`, primary text `#00271D`, accent `#00A77C`, gold `#C69B26`; radius system `rounded-full`/`rounded-3xl`/`rounded-2xl`/`rounded-xl`); React 19 + TS + Vite + Tailwind 4; Prisma migrations via `npx prisma migrate dev` (not manual schema edits); no request waterfalls (`Promise.all`); graceful loading/error states.

### PHASE 0 — Verification spike (DO THIS FIRST — it gates Phase 1)

The integration API never exposes passwords, so the ONLY way to strictly apply EnrollPro passwords is delegating login to EnrollPro's own `/auth/login`. Verify its contract before building anything:

1. `POST {ENROLLPRO_BASE_URL}/auth/login` with `1234501` / `DepEdSY2026!` (known-good) — capture the exact response shape (success payload, error shape, HTTP codes).
2. Test which identifiers EnrollPro's login accepts:
   - a **learner** identifier (LRN, e.g. `202900000006`),
   - a **faculty** employeeId (e.g. `1000007`),
   - the **admin** employeeId (`1234501`).
3. Check rate limits / throttling if any are advertised.

**STOP CONDITION:** If learner LRNs cannot authenticate against EnrollPro's `/auth/login`, delegated auth has a broken contract for the student cohort. Do NOT improvise (e.g., do not fall back to local hashes). Stop and report back to the owner with findings before implementing Phase 1.

### PHASE 1 — Strict credential mirror (delegated auth)

- **`server/src/routes/auth.routes.ts:30-120`** — rewrite `POST /login`:
  1. Look up the local user by `enrollproLrn` / `employeeId` / `email` (keep current matching, keep requiring `syncSource === 'ENROLLPRO'` — local membership stays governed by bulk sync so deletes remain strict).
  2. Forward the user's typed identifier + password to EnrollPro `POST /auth/login` (use the response contract validated in Phase 0).
  3. EnrollPro success → issue SORT JWT + refresh session (existing `UserSession` flow). EnrollPro failure / 401 → return 401. **Never bcrypt-compare locally.**
  4. Handle EnrollPro-unreachable distinctly (e.g., 503 with a clear "authentication service unreachable" message) — graceful failure per AGENTS.md §4. Strict mode means login is unavailable while EnrollPro is down; the UI must say so clearly rather than pretend wrong-password.
- **Stop owning passwords locally:**
  - Remove the `bcrypt.hash(ENROLLPRO_DEFAULT_PASSWORD)` write in sync account creation (`enrollpro-sync.service.ts:399-406`).
  - Make `User.passwordHash` nullable (or drop the column) in `server/prisma/schema.prisma:97` — **via a real migration** (`npx prisma migrate dev`; the repo currently relies on `db push` — create the initial migration baseline first if `migrations/` is empty).
  - Remove/disable `PATCH /api/auth/change-password` (`auth.routes.ts:274-322`) — password changes happen on EnrollPro only. Remove the frontend change-password UI wherever it exists (search `change-password` / `changePassword` in `src/`).
  - Remove `ENROLLPRO_DEFAULT_PASSWORD` from `server/.env`, `.env.example`, and code.
- After this phase, the ONLY password truth is EnrollPro. `DepEd2026!` must fail everywhere; `DepEdSY2026!` must work for `1234501`.

### PHASE 2 — Sync engine fixes (strict mirror, manual-first)

**`server/src/services/enrollpro-sync.service.ts`:**
- **Per-endpoint success tracking.** Track success/failure per cohort (learners / faculty / staff) instead of a global `totalPulled`. Delete propagation runs **per cohort, only when that cohort's fetch fully succeeded** — this simultaneously fixes (a) stale retention on total failure and (b) the over-deletion hazard when only some endpoints succeed.
- **Wider update path.** The `enrollproId`-matched UPDATE (lines 362-378) must also update `email` and `employeeId`. Log unique-constraint conflicts as per-row errors (do not silently skip).
- **Accurate run status.** Run outcome = `SUCCESS` (all cohorts ok) / `PARTIAL` (some cohorts ok, some failed) / `FAILED` (all failed). Record per-endpoint error details in `EnrollmentSyncLog` (extend the model if needed — via migration). No more "fetched nothing but logged SUCCESS".
- **Remove dead code:** `getEnrollProToken()` (118-146), `generateTempPassword()` (111-114), and the now-unneeded `ENROLLPRO_ACCOUNT` / `ENROLLPRO_PASSWORD` env consumption (keep only if Phase 0/other tooling genuinely needs them — otherwise delete from `.env`/`.env.example`).
- Keep the existing full-fetch algorithm (3 parallel paginated pulls, `X-Integration-Key` auth), the `enrollproId → email → employeeId` match cascade, the `LOCAL`-account purge, and the `isSyncRunning` mutex behavior.

**`server/src/index.ts:59-112` — scheduler becomes settings-driven:**
- Default mode = **MANUAL**: no cron scheduled, no unconditional startup sync.
- When mode = AUTOMATIC (set via admin settings): schedule node-cron at the configured interval; optionally sync once at startup.
- Support **live rescheduling**: when the admin changes mode/interval, destroy and recreate the cron task (expose a `rescheduleSync()` from a new small scheduler module rather than growing `index.ts` — see file-size rule).

**New CLI (bulk sync without a login):**
- `server/src/scripts/bulk-sync.ts` (new file, run via tsx) + `server/package.json` script: `npm run sync:enrollpro`. Runs the same fixed sync engine, prints a summary (per-cohort pulled/created/updated/deleted + status + errors), exit code non-zero on FAILED/PARTIAL.
- Wire the run through the same `EnrollmentSyncLog` logging so `GET /api/sync/status` reflects CLI runs too.

### PHASE 3 — Wipe (accounts + user data only)

- **New script** `server/prisma/wipe-accounts.ts` (npm script `db:wipe-accounts`):
  - In one transaction, delete/truncate: `users`, `user_sessions`, and **all user-owned tables** — enumerate every model with a FK to `User` in `schema.prisma` (expected: reports, point_histories, user_point_snapshots, offenses, notifications, plus anything else the FK scan finds — do the scan, don't trust this list blindly) — in FK-safe order (children before parents; or `TRUNCATE ... CASCADE` if acceptable).
  - **Keep:** bins, categories, locations, settings, inventory, term calendars, and other non-user data.
  - Idempotent + prints what was wiped (row counts).
- **Execution order for the fresh start:** run the wipe → run `npm run sync:enrollpro` → verify counts (see §4).
- Update `server/prisma/seed.ts` header comment (it already claims "no user accounts are seeded" — keep it accurate after changes).

### PHASE 4 — Admin sync settings UI

- **New "Sync & Integrations" tab** in admin settings (`src/pages/admin/components/settings/` — new atomic component(s) + custom hook; keep every file well under 1,000 lines; follow AGENTS.md design tokens exactly):
  - Auto-sync toggle (default **off** = MANUAL) + interval selector (when auto is on).
  - **"Run Bulk Sync Now"** button → `POST /api/sync/all` (loading state; result toast).
  - Last-run summary + recent history from `GET /api/sync/status`: status, timestamp, duration, records pulled/created/updated/deleted, per-endpoint errors.
- **Backend persistence:** store real settings keys (e.g. `syncMode` = MANUAL|AUTO, `syncIntervalMinutes` or cron string) in `SystemSetting`. Replace the decorative `smartSyncEnabled` key (`schema.prisma:240`) — remove it and its CRUD references rather than leaving another dead flag.
- Settings PATCH (or a dedicated small route) must trigger the scheduler reschedule from Phase 2.
- Guard the destructive wipe script behind deliberate action (CLI-only is fine; do NOT expose the wipe as a casual UI button without an owner-approved confirmation flow — default: CLI only).

### PHASE 5 — Cleanup

- Remove `DEMO_ACCOUNTS` and the "Demo Accounts" collapsible panel from `src/components/landing/LoginCard.tsx:5-9,136-170` (plus `showDemo`/`fillDemo` at 23/25).
- Neutralize demo hints: `src/pages/admin/AdminLogin.tsx:84` (`e.g. 1234501`) and `src/pages/mrf/MRFLogin.tsx:84` (`e.g. 1234503`) — generic placeholders, no real IDs.
- Update stale docs: `README.md:16-28` and `POSTGRES_SETUP.md:7-19` — remove the obsolete 7 seed accounts; document the new login behavior (delegated to EnrollPro), sync commands (`npm run sync:enrollpro`, `db:wipe-accounts`), admin sync settings, and the correct login shape (`identifier` + password).
- Env hygiene: `server/.env` + `.env.example` — remove `ENROLLPRO_DEFAULT_PASSWORD`; remove `ENROLLPRO_ACCOUNT`/`ENROLLPRO_PASSWORD` if Phase 0/2 made them unnecessary; keep `ENROLLPRO_BASE_URL`, `ENROLLPRO_SYNC_SECRET`; remove `SYNC_INTERVAL_CRON` if superseded by DB settings (pick one source of truth — DB settings wins per owner decision #3).

---

## 4. VERIFICATION CHECKLIST (required before declaring done)

1. **Builds & lint clean:** `npm run lint` + `npm run build` at root; `npm run build` (tsc) in `server/`. No new lint errors.
2. **Phase 0 contract recorded** (response shapes documented in the PR/description).
3. **Fresh start:** `db:wipe-accounts` → `npm run sync:enrollpro` → local user count per cohort matches EnrollPro pull counts; `EnrollmentSyncLog` shows SUCCESS with non-zero counts.
4. **Strict credentials:** `1234501` + `DepEdSY2026!` → login succeeds; `1234501` + `DepEd2026!` → 401. Learner + teacher logins succeed with their real EnrollPro passwords. Local `password_hash` is null/absent for synced users.
5. **Mirror delete propagation:** delete a throwaway account on EnrollPro → run sync → locally gone (sessions included). EnrollPro unreachable → run logs FAILED/PARTIAL (never SUCCESS), local data untouched.
6. **Per-cohort guard:** simulate one endpoint failing → only that cohort's deletes are skipped; other cohorts still sync.
7. **Settings:** default mode is MANUAL and no cron runs; toggle AUTO on → sync fires at the configured interval; toggle off → cron stops. "Run Bulk Sync Now" works from the admin UI.
8. **UI:** no Demo Credentials panel on landing page; sync settings tab matches design tokens; loading/error states graceful.
9. **Docs/env** updated per Phase 5.

---

## 5. RISKS & NOTES

- **Phase 0 is the critical gate.** If EnrollPro's `/auth/login` rejects learner LRNs, strict delegation cannot cover students — report back, do not improvise local fallbacks (owner explicitly rejected overrides).
- **Strict = EnrollPro-down = no logins.** This is the accepted trade-off of owner decision #1. Surface a clear "auth service unreachable" state in the UI; do NOT silently fall back to stale local hashes.
- Repo uses `db push` today (no `migrations/` folder). Switch to `npx prisma migrate dev` properly (baseline first) per AGENTS.md §7 — schema changes in Phases 1/2/4 all need migrations.
- Keep `server/src/services/enrollpro-sync.service.ts` under the 1,000-line rule as you extend it — split per-cohort logic into helpers/modules if needed.
- Do not commit secrets: `server/.env` is git-ignored; keep it that way. Never print real credential values in logs, docs, or commits.
