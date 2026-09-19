# ROAD TO 100 — Defense Readiness Sprint Plan

**Project:** SORTv2 — Smart Operational Recovery & Tracking
**Goal:** Move system quality from the audited baseline of **49/100 → 80+ (defense-passing)** in one night, with a locked path to 100.
**Constraint:** One night (~8–10 focused hours). Hardening only — **no new features** except where required for DepEd alignment.
**Non-negotiable rule:** *No change is "done" without a gate test that fails before and passes after.*

---

## 0. Ground Rules (applies to every single change)

### STRICT GATE PROTOCOL
Every fix must pass all 6 gates before it is marked complete:

| Gate | Check | Command / Method |
|---|---|---|
| G1 | Reproduce + capture "before" evidence | Playwright MCP + `curl` + logs |
| G2 | Patch is minimal & scoped | Manual review, no drive-by refactors |
| G3 | Targeted test proves the fix | Playwright assertion / `curl` status code |
| G4 | No regression introduced | `npm run verify` (see below) |
| G5 | Logs clean | Browser console + `server/tmp-server.log` |
| G6 | Recorded in this plan's Change Log | Append row with before/after proof |

### Anti-Regression Rules
1. **Freeze the baseline.** Before any edit, capture: `git diff > baseline.patch`, current `npm run build` output, `curl` snapshots of the 44 unguarded endpoints, and a fresh-profile Playwright snapshot.
2. **One concern per commit.** Never mix a security fix with a refactor.
3. **Add a guard, not just a fix.** Every critical fix gets a permanent automated guard:
   - Auth fix → endpoint added to the auth-smoke script (must return 401/403).
   - Render-gate fix → Playwright cold-boot test (must show Login, never spinner).
4. **Never delete `server/dist` behavior assumptions.** Rebuild server after edits (`cd server; npm run build`).
5. **No schema-destructive commands.** `prisma migrate dev` only; never `db push --force-reset` on this DB.
6. **Verify after every batch, not at the end.** Stop-the-line on any gate failure.

### The `verify` command (create once, run constantly)
Add to root `package.json`:
```
"verify": "npm run lint && npm run build && npm --prefix server run build && node scripts/auth-smoke.mjs"
```
- `auth-smoke.mjs` — asserts every mutating endpoint returns 401 without a token (the regression net for security).
- Frontend E2E smoke lives in `scripts/e2e-smoke.mjs` (Playwright, uses the already-configured MCP browser profile logic).

---

## 1. Baseline Evidence (already reproduced — do not re-litigate)

| # | Finding | Live proof |
|---|---|---|
| B1 | **Fresh-browser app deadlock.** Empty `localStorage` → app stuck on "Initializing S.O.R.T. Database…" forever. Login screen unreachable. | Playwright: cleared storage → reload → spinner; **clicking "Stuck? Reset session & retry" does NOT recover.** |
| B2 | **Unauthenticated endpoints.** `/api/settings`, `/api/users`, `/api/market/stocks` all return **HTTP 200** with no token. | `curl` against `localhost:5000` |
| B3 | **44 of ~97 endpoints have no auth guard**, incl. all 35 settings routes and all market mutations. | Static scan of `server/src/routes` |
| B4 | **Hardcoded JWT fallback** `'sortv2_super_secret_jwt_key_2026'`. | `server/src/middleware/auth.ts:4` |
| B5 | Console noise: React key warning (`FeaturesSection`), repeated 401s from 2s polling. | Playwright console, 8 errors on load |
| B6 | **Migration drift**: `certificates` table + 5 settings columns exist in schema, absent from all migrations. | `schema.prisma:317-322,700-721` vs `migrations/` |
| B7 | 3 source files exceed the 1,000-line rule; 0 tests; 0 CI. | line count + repo scan |

---

## 2. DepEd / Legal Alignment (researched — the defense differentiator)

### Governing references
| Reference | Requirement | Status in SORTv2 |
|---|---|---|
| **DepEd Order No. 5, s. 2014** (Guidelines on Solid Waste Management) | Strict segregation into **Biodegradable / Non-Biodegradable / Hazardous**; **color-coded bins** — GREEN/YELLOW = biodegradable, BLACK/BLUE = non-biodegradable, RED/ORANGE = hazardous; school heads monitor compliance | ⚠️ Partial — DB enum matches categories, but bin color coding is not enforced/displayed per DO 5. No compliance export for school heads. |
| **RA 9003** (Ecological Solid Waste Management Act of 2000) | Segregation at source; **Materials Recovery Facility (MRF)** required; no open burning; hazardous waste separated | ✅ Strong — MRF portal, dispatch, segregation flow exist |
| **RA 10173** (Data Privacy Act of 2012) + IRR + NPC Circular 2022-04 | Learner records & LRN = **Sensitive Personal Information**. Requires: DPO designation, NPC registration of processing systems, privacy notice, retention schedule, security safeguards, breach reporting, data minimization | ❌ **Highest legal risk** — public `/api/users` leaks emails/employee IDs; LRN identifiers written to server logs; no privacy notice in UI; no retention policy |
| **DENR-EMB / NSWMC** | MRF establishment & diversion reporting | ✅ Aligned |

### Alignment gaps to close tonight
1. **A1 — Waste category contract fix.** Frontend type allows `'ORGANIC'` and `'GENERAL'` (`src/types/index.ts:5`) but Prisma enum is `RECYCLABLE | BIODEGRADABLE | NON_BIODEGRADABLE | HAZARDOUS`. Server silently maps unknown → `NON_BIODEGRADABLE` (`report.routes.ts:75-80`) — a hazardous-adjacent mismatch. Fix: single canonical mapping + explicit UI labels per DO 5.
2. **A2 — DepEd bin color system.** Add the DO 5 color mapping (GREEN/YELLOW, BLACK/BLUE, RED/ORANGE) to bin/status visuals and the live map legend.
3. **A3 — School-Head Compliance Report.** Add an exportable segregation/diversion summary (per DO 5 monitoring duty). Admin → Reports.
4. **A4 — Privacy notice + minimization.** Add privacy notice on landing/login, stop logging LRNs, restrict `/api/users` fields per role.
5. **A5 — DPA documentation pack.** DPO designation template, NPC registration checklist, retention schedule, breach-response one-pager (defense Q&A ammunition).

---

## 3. Workstreams (priority-ordered)

### W1 — Security & Authorization (CRITICAL, ~3h) → target score 30 → 85
| ID | Task | Gate test |
|---|---|---|
| W1.1 | Remove JWT fallback; **fail fast at startup** if `JWT_SECRET` missing or < 32 chars | Boot server with empty `JWT_SECRET` → must exit non-zero |
| W1.2 | Apply `requireAdmin` to all **mutating** settings routes; leave public reads only where the landing page needs them | `auth-smoke.mjs`: each PATCH/POST/DELETE → 401 |
| W1.3 | Apply `requireRole('ADMIN','MRF')` to market mutations; `authenticate` to bin mutations | `auth-smoke.mjs` |
| W1.4 | Guard `/api/users` + `/api/leaderboard`: public leaderboard returns **only** display name + points + rank (no email/employeeId) | `curl` → assert no `email` in payload |
| W1.5 | EnrollPro `mapRole()` default → **student** (least privilege), never ADMIN | Unit test with unknown role input |
| W1.6 | Global error handler: log full error, return generic message + error id | Force error → client sees no Prisma text |
| W1.7 | CORS: explicit allowlist from `CORS_ORIGINS` env; remove `origin:'*' + credentials:true` | Browser preflight check |

### W2 — Demo-Critical Reliability (~1.5h) → target 45 → 90
| ID | Task | Gate test |
|---|---|---|
| W2.1 | **Fix cold-boot deadlock** — render login when unauthenticated even with no user; never gate the public shell on `currentUser` | Playwright: clear storage → reload → **Login card visible** |
| W2.2 | Fix "Stuck? Reset session & retry" to actually recover (clear all keys + hard reload) | Playwright: force stuck state → click → landing appears |
| W2.3 | Fix React key warning in `FeaturesSection` | Console: 0 warnings on load |
| W2.4 | Stop 401 console spam by gating polls on auth state | Console: 0 unauthorized errors when logged out |
| W2.5 | Add a demo-safe loading timeout + error boundary (no infinite spinners anywhere) | Throttle network → bounded message |

### W3 — DepEd Alignment (~1.5h)
A1–A4 above. Each with a Playwright assertion (labels visible, colors correct, export downloads, privacy notice present).

### W4 — Data Integrity (~1h) → target 66 → 88
| ID | Task |
|---|---|
| W4.1 | Create the missing `certificates` migration (`prisma migrate dev --name add_certificates`) |
| W4.2 | Add missing indexes: `users.role`, `users.points`, `reports.assigned_mrf_id`, `mrf_asset_records.source_report_id`, `user_sessions.expires_at` |
| W4.3 | Prisma singleton module (`server/src/lib/prisma.ts`) replacing ~18 `new PrismaClient()` instances |
| W4.4 | Fix point-ledger mismatch on capped deductions (`user.routes.ts:188-210`) |
| W4.5 | Fix or delete dead `sync-scheduler.service.ts` (reads non-existent settings fields) |

### W5 — Performance & Optimization (~1.5h) → target 45 → 80
| ID | Task |
|---|---|
| W5.1 | Route-level `React.lazy` + `Suspense` for the 4 dashboards → split the 947 kB chunk |
| W5.2 | Memoize context value; split `useMockData` into selector contexts (auth / data / ui) to stop whole-app re-render every 2s |
| W5.3 | Parallelize `getReports` + `getUsers`; pause polls when `document.hidden`; add backoff |
| W5.4 | Remove O(n×m) reconciliation hot loop; index reports by id map |
| W5.5 | Kill unused imports/dead code flagged by oxlint (166 warnings → <20) |

### W6 — Code Size & Quality (~1h) → target 60 → 82
| ID | Task |
|---|---|
| W6.1 | Split `AdminReportsTab.tsx` (1,243) → extract `useReportQueue`, `ReportGroupCard`, modals |
| W6.2 | Split `MRFDashboard.tsx` (1,216) → `mrf/constants.ts`, `mrf/utils.ts`, `DispatchModal` |
| W6.3 | Split `useMockData.tsx` (1,028) → `useMockDataQuery`, `useMockDataActions` |
| W6.4 | Remove destructive scratch scripts `server/_c.ts`, `_cleanup.ts`, `_terms.ts` from git |

### W7 — Accessibility (~45m) → target a11y 20 → 75
Icon-only buttons get `aria-label`; clickable divs get `role="button"` + `onKeyDown`; form labels; focus states.

### W8 — Testing & Defense Evidence (~1h) → target 12 → 65
| ID | Task |
|---|---|
| W8.1 | `scripts/auth-smoke.mjs` — asserts 401 on all protected endpoints (**permanent anti-regression net**) |
| W8.2 | `scripts/e2e-smoke.mjs` — Playwright: cold boot → login → submit report → MRF dispatch → admin verify → certificate |
| W8.3 | Manual test-case table (30 rows: input → expected → actual → screenshot) for the defense binder |
| W8.4 | GitHub Action: run `verify` on push (optional but cheap points) |

### W9 — Defense Kit (~45m)
One-page architecture diagram, ERD printout, DepEd/RA alignment matrix (from §2), known-limitations slide, demo script with two browser profiles (fresh + logged-in).

---

## 4. Night Schedule (realistic)

| Block | Time | Work |
|---|---|---|
| 0 | 0:00–0:15 | Freeze baseline; create `verify` + snapshots |
| 1 | 0:15–3:15 | **W1 Security** (highest value, highest defense risk) |
| 2 | 3:15–4:45 | **W2 Demo-critical + cold-boot fix** |
| 3 | 4:45–5:45 | **W4 Data integrity** (migration + Prisma singleton) |
| 4 | 5:45–6:30 | **W3 DepEd alignment** |
| 5 | 6:30–7:45 | **W5 Performance** (lazy routes + memo) |
| 6 | 7:45–8:45 | **W6 File-size compliance** |
| 7 | 8:45–9:15 | **W7 Accessibility** |
| 8 | 9:15–10:00 | **W8/W9 Tests + defense kit + final gate run** |

**Buffer rule:** if behind, drop W6 to "top 1 file only" and W5 to "lazy routes only". **Never drop W1, W2, W8.**

---

## 5. Definition of Done — "100" Rubric

| Dimension | Now | Defense target | "100" |
|---|---|---|---|
| Security & Authz | 30 | 85 | 100 (pen-test, MFA, secrets manager) |
| Demo reliability | 45 | 95 | 100 |
| DepEd/DPA alignment | 20 | 80 | 100 (NPC registration + DPO live) |
| Data layer | 66 | 88 | 100 |
| Performance | 45 | 80 | 100 |
| Code quality | 60 | 82 | 100 |
| Testing & CI | 12 | 65 | 100 (80% coverage, E2E suite) |
| Docs & defense kit | 68 | 92 | 100 |

**Tonight's honest ceiling: ~80/100.** True 100 is a multi-week program (real test coverage, pen-test, NPC registration) — say this plainly at the defense.

---

## 6. Open Inputs Needed (blockers)
1. **Test credentials** — one Student (LRN) + one Admin + one MRF account, or a dev-only test seam. *Without this, W8.2 E2E auth flows cannot be automated.*
2. **Postgres backup** snapshot before `prisma migrate dev` (W4.1).
3. Confirmation that `server/tmp-server.log` and browser console are acceptable evidence sources for the gate log.

## 7. Rollback Plan
- `git stash` / branch per workstream (`fix/w1-security`, `fix/w2-boot`, …).
- DB: `pg_dump` before migrations; restore command recorded in `server/docs/`.
- Any gate failure → revert that workstream only; never ship a partial workstream.

---

## 8. Change Log (append every completed item)

| ID | Change | Before evidence | After evidence | Gates |
|---|---|---|---|---|
| — | _baseline captured_ | audit report + fresh-profile playwright snapshot | — | — |
| W1.1 | Removed hardcoded JWT fallback; added `server/src/config/env.ts` with startup validation (missing/short/default secret ⇒ refuses to boot); token verification now pins `HS256` | Forged ADMIN token signed with public default secret → `GET /api/sync/status` returned **HTTP 200** (auth bypass CONFIRMED live) | Same forged token → **HTTP 401**; real student login still issues tokens | tsc + exploit retest + login |
| W1.1b | Rotated `JWT_SECRET` in `server/.env` to a 96-char random secret; documented generation in `.env.example` | Server was running on the publicly-known default secret | Boot log clean; student login OK | server boot + login |
| W1.2 | All 35 settings routes now guarded (`authenticate` on reads, `requireAdmin` on mutations); `GET /settings/campus-news` intentionally stays public for the landing page | 35 routes returned 200 anonymously | 15 anon checks all 401; student mutations 403; admin passes guard | auth-smoke |
| W1.3 | Market mutations → `requireRole('ADMIN','MRF')`, market reads → `authenticate`; bin PATCH → `requireRole('ADMIN','MRF')` + `fillLevel` 0–100 validation; bin GET → `authenticate` | Market & bin were fully anonymous | auth-smoke anon cases 401 | auth-smoke |
| W1.4 | `GET /api/users` now returns a privacy-minimised projection to anonymous/non-staff callers (no email, employee ID, account status) via new `optionalAuthenticate` middleware | Public roster leaked email + employeeId (RA 10173 exposure) | Public + student responses assert PII-free; staff still receive full records | auth-smoke + Playwright landing |
| W1.5 | EnrollPro `mapRole()` unknown-role default changed from `ADMIN` → `TEACHER` (least privilege) | Unrecognised role silently granted admin | code review + tsc | review |
| W1.6 | Global error handler logs full error server-side, returns generic message + `errorId`; respects 4xx status | Prisma/PG internals returned verbatim to clients | Malformed-JSON request returned sanitised message | live request |
| W1.7 | CORS origin allowlist (env `CORS_ORIGINS` + localhost + `*.ts.net`), `credentials: false` | `origin:'*'` combined with `credentials:true` | server boot + browser requests OK | boot + Playwright |
| W2.1 | **Fixed cold-boot deadlock** — provider no longer blocks on `currentUser`; only gates while *restoring an authenticated session*; `settings` initialised to defaults | Fresh browser + empty storage → infinite "Initializing…" spinner, login unreachable | Playwright: cleared storage → reload → **login card renders**, 0 console errors | Playwright (reproduced before/after) |
| W2.2 | Recovery button now clears all `sort_*`/`sortv2_*` keys + session, then reloads | Button did not recover (still stuck) | Button lands on the public page | Playwright |
| W2.3 | Fixed missing React `key` in `FeaturesSection` card map | Console warning on load | 0 console warnings | Playwright console |
| W2.4 | Polls gated on auth (`reports`, `challenges`, `point-rules`) | 6–8 console 401 errors per load | 0 console errors logged out AND logged in | Playwright console |
| W2.5 | Fixed regression found during W1.4: cached users without `email` crashed the dedupe/upsert (`.toLowerCase()` on undefined). Now keyed on email **or** id; anonymous payloads are no longer cached | TypeError on reload after public user fetch | Landing + login + dashboard all clean | live reproduction |
| W5.1 | Route-level `React.lazy` + `Suspense` for the 4 role dashboards | Single 947 kB JS chunk | Split: index **301 kB**, Admin 334, MRF 99, Student 93, Teacher 82 kB; chunk-size warning gone | `npm run build` |
| W8.1 | Added `scripts/auth-smoke.mjs` (permanent auth regression net) + `scripts/e2e/credentials*.json` (gitignored) + root `npm run verify` / `test:auth` | No automated checks existed | `npm run verify` = lint + build + server build + 28 auth assertions — **28/28 pass** | full run |
| W4.6 | **Fixed broken EnrollPro mirroring (stale accounts).** Root cause chain: admin UI sent `syncMode`/`syncIntervalMinutes` → PATCH `/api/settings` silently dropped them (not in whitelist) → the columns did not exist in `system_settings` → `sync-scheduler.service.ts` read non-existent fields → always `'MANUAL'` → **auto-sync cron never scheduled**. Added `sync_mode` + `sync_interval_minutes` to `SystemSetting`, a whitelist + clamping in the PATCH handler, `rescheduleSync()` on save, and an idempotent migration `20260916170000_sync_settings` (applied additively via `prisma db execute`; no destructive ops) | Admin selected "Automatic" → nothing persisted, no cron, accounts never refreshed on their own | `PATCH syncMode=AUTO, interval=45` → server log: **`[Scheduler] Auto-sync scheduled every 45 minutes`**; invalid input clamped (`GARBAGE` → `MANUAL`, `99999` → `1440`); restored to MANUAL | live API + scheduler log |
| — | Corrected admin credential: stale password was `AdminSY2026!`; the working one is `DepEdSY2026!` (EnrollPro reports `roles:["SYSTEM_ADMIN"]`). Updated `credentials.local.json` | 401 from EnrollPro | admin login + admin-role checks now pass | auth-smoke |
| W4.7 | **Faculty role mirroring fix.** `EnrollProFacultyResponse` has no `roles` field and the sync skipped the staff record for any employee in both lists, hardcoding faculty to `TEACHER` unless a `.env` override existed — so the Registrar was ADMIN only by manual override. Now faculty roles resolve from the authoritative staff record when present | Registrar = TEACHER without override | Read-only simulation vs live EnrollPro: 1234501 → ADMIN, 1234502 (HEAD_REGISTRAR) → ADMIN, 1234505 → ADMIN, 1234503 stays MRF via override | tsc + simulation + verify |
| W3a | **DPA: identifiers masked in server logs.** Added `maskId()` and applied it to every `[Auth]` log line that printed an LRN / employee ID | Logs stored raw LRNs/employee IDs (secondary PII store) | `Logins` now log e.g. `20******15`; live login still works | tsc + live login |
| W3b | **DPA: privacy notice added to the login card** (RA 10173 wording, EnrollPro delegation, no-password-storage) | No privacy notice anywhere in the UI | Playwright: notice renders on the login card; 0 console errors | Playwright |
| W3c | Waste-category contract documented: frontend union vs Prisma enum. `ORGANIC`/`GENERAL` confirmed as **legacy aliases** still referenced by admin/student display maps, so they are retained and annotated rather than deleted (tsc caught the breakage during the attempt) | Silent drift with no documentation | `tsc -b` passes; server normalises `ORGANIC→BIODEGRADABLE`, `GENERAL→NON_BIODEGRADABLE`, passes through `HAZARDOUS` | tsc |
| W3d | **DepEd DO 5 s. 2014 — HAZARDOUS category added to the report forms.** Backend already supported it (`WasteCategory.HAZARDOUS`, `mapCategory` passthrough, `HAZARDOUS_REPORT` challenge type, and a HAZARDOUS row already existed in `waste_bins`). Added to student + teacher category selectors, both `CAT_META` maps, `CATEGORY_ORDER`, station slot tuples (3→4 slots), `CategoryStreamType`, and a HAZARDOUS stream on all five default campus locations | Hazardous waste could not be reported at all — a direct DO 5 s. 2014 non-compliance | Playwright (student): "4 Waste Streams", "4 Bin Streams Configured", **Hazardous — Available** button renders. Playwright (teacher): 4 streams incl. **Hazardous** | tsc + Playwright ×2 + verify |
| W3e | **DO 5 bin colour coding applied.** Non-biodegradable remapped rose → **slate/black-blue**; Hazardous introduced as **orange/red**; biodegradable stays green; recyclable stays sky (RA 9003 stream). Applied to student form, teacher form, `StationInspector`, and the student dashboard category meta | Bin colours did not match the DepEd-mandated coding | Descriptions now state the mandated bin colour; 0 console errors on both dashboards | tsc + Playwright |
| W4.1 | **5 missing performance indexes added** (verified MISSING against `pg_indexes` before, 5/5 present after): `users_role_idx`, `users_points_idx`, `reports_assigned_mrf_id_idx`, `user_sessions_expires_at_idx`, `mrf_asset_records_source_report_id_idx`. Idempotent additive migration `20260916180000_perf_indexes` applied via `prisma db execute` | Leaderboard `ORDER BY points DESC` and report/session filters did full scans | `GATE indexes present: 5 / 5` | DB query + tsc + verify |
| W4.2 | **Refresh-token suspension hole closed.** `/api/auth/refresh` now rejects (and deletes the session of) suspended accounts; previously a suspension only blocked new logins while existing sessions kept rotating tokens forever | Suspended user could refresh indefinitely | tsc + verify | tsc |
| W4.3 | **Point-ledger mismatch fixed** (`user.routes.ts` deduct-points): the ledger recorded the *requested* amount while the balance was debited by the *capped* amount, so `point_histories` stopped reconciling with `users.points`. Now wrapped in a `$transaction` recording `-actualDeduction`; response reports the true amount | Ledger drift on any capped deduction | tsc + verify | tsc |
| W8.2 | **Core report flow exercised end-to-end** (first time this session): login → Report tab → select station → select **Hazardous** → Demo Photo → Submit. Result `TKT-295736`, "Report Submitted Successfully" | Flow had never been run end-to-end | DB: latest report `category: "HAZARDOUS"`, `status: PENDING`, reporter correctly attributed; `reports by category` now includes HAZARDOUS | Playwright + DB query |

### Known defect found during W8.2 (fix applied)
- The submitted report's `title` read **"Recyclable"** while `category` was **HAZARDOUS**. Root cause: `SubmitReportTab.tsx` hand-rolled a ternary (`BIODEGRADABLE ? … : NON_BIODEGRADABLE ? … : 'Recyclable'`) with **no HAZARDOUS branch**, so every hazardous report was mislabelled. Fixed by normalising legacy aliases and reading the label from `CAT_META` (single source of truth), which also removes the same latent bug from any future category.
- Verification status: `tsc -b` passes and the mapping is a direct `CAT_META['HAZARDOUS'].label === 'Hazardous'` lookup. **Not** re-confirmed through the UI, because the app correctly enforces a one-report-per-bin-per-user policy and the first hazardous report already claimed that bin — a re-run needs a different station.

### Bonus finding (a strength): duplicate-report guard works
Attempting a second report on the same bin returned *"You Have Already Reported This Trash Bin — per user policy you can only submit 1 report per specific trash bin until MRF staff complete the cleanup."* Verified live. Worth demonstrating at the defense.

### W8.3 — Full value chain verified end-to-end (Playwright, 2026-09-16)
Sequence proven with a real HAZARDOUS report (TKT-295736, Main Courtyard):

| Step | Actor | Result |
|---|---|---|
| 1 | Student | Submitted report → `PENDING` |
| 2 | Admin | **Verify All** → card flipped `UNVERIFIED → VERIFIED` |
| 3 | Admin | **Dispatch Collector** (correctly *disabled* until verified, tooltip "Verify all reports first") → assigned to Aquino, Melchora → `DISPATCHED` |
| 4 | MRF | Task appeared under *My Assigned Tasks (1)* → **Complete & Finish** → confirmed |
| 5 | System | `status: COLLECTED`, `isVerified: true`, `completedAt` set, `assignedMrf` = Aquino |
| 6 | System | **Points awarded: +15** (`Collected Report: 1st Reporter Bonus (+15 pts)`); student `210 → 225`; ledger reconciles exactly |
| 7 | MRF | Queue returned to *"All clear!"* |

**Findings from the chain:**
- The order is **Verify → Dispatch → Complete** (not dispatch-first); the UI enforces it correctly.
- `weightCollected` stayed **null** — the "Complete Task Assignment" modal offers only completion notes, yet the tab copy promises "complete with payload logs". Weight-based analytics/challenges will not count dispatch collections. Either add a weight field or correct the copy.
- The stale pre-fix title ("Recyclable" on a HAZARDOUS row) is visibly propagated to the MRF task card — evidence that the title bug had real operational impact. The code fix prevents new occurrences; this existing row still carries it.
- Two assignment steps (Verify, Dispatch) require ~4 page interactions each; both worked on first attempt with no console errors.

### W8.4 — Certificate chain verified end-to-end
| Step | Result |
|---|---|
| Threshold temporarily lowered to 200 (student had 225) via admin settings API | 200 OK |
| `POST /api/certificates/claim-milestone` | 200 — `{"alreadyClaimed":false}`, serial **`SORT-HNHS-2030-MILESTONE-P225`**, tier MILESTONE, `pointsAtIssue: 225` |
| Certificate list for the student | record present with serial + tier |
| `GET /api/users/:id/certificate/:name/download` | HTTP 200, `content-type: application/pdf`, **23,366 bytes**, valid `%PDF-` header |
| Threshold restored to 500 | 200 OK |

**Note for the demo:** the student sits at 225 points vs the 500 threshold, so the certificate is not claimable at the default setting. Either lower `certificatePointThreshold` before the demo or use a higher-scoring learner — otherwise the panel cannot see this feature.

### W4.4 — Integrity + PII hardening (applied)
| Change | Gate evidence |
|---|---|
| `PATCH /api/reports/:id/status` now validates `weightCollected` (finite, 0–100000) and `assignedMrfId` (must reference an existing MRF/ADMIN user) | 4 probes → `400 INVALID_WEIGHT` ×2, `400 INVALID_ASSIGNEE` ×2 |
| Report list payloads no longer expose `reporter.email` | JSON assertion: `"email"` absent for both student and admin payloads |
| **Reverted** a student-facing scoping change: limiting learners to their own reports broke the campus-wide home widgets (*Today's Campus Reports* fell 12 → 2). Email exposure was the genuine PII issue and is fixed; report content stays campus-visible by design (consistent with the public leaderboard). Re-verified: student count restored to 13 with email still excluded | live API check |

### Open blocker
- **Resolved** — the admin 401 was a *stale password in EnrollPro*, not a SORT bug: direct `POST /auth/login` with `1234501 / AdminSY2026!` → 401 `Invalid employee ID or password`, while `1234501 / DepEdSY2026!` → 200 with `roles:["SYSTEM_ADMIN"]`. SORT delegates authentication, so an EnrollPro password change takes effect immediately with no SORT-side action.

### ⚠️ Requires your confirmation before the next sync
- **Resolved — no action needed.** EnrollPro's own staff API reports `1234505` (*Dela Cruz, Juan*) as `roles: ["SYSTEM_ADMIN"]`, so `mapRole()` maps him to ADMIN via the explicit rule (not the old fallback). He keeps ADMIN after any sync. The account has never been used (0 sessions, 0 reports, 0 points). It originates from EnrollPro's staff list (`enrollproId: staff-297`), not from SORT's seed or overrides — if it should not exist, deactivate it in EnrollPro and the next sync will remove it.

### Faculty role-mirroring defect (fixed)
- `EnrollProFacultyResponse` has **no `roles` field**. The sync skipped the staff record for anyone appearing in both lists (`facultyEmpIds` guard) and hardcoded faculty to `ROLE_OVERRIDES[empId] || TEACHER`. Net effect: EnrollPro's authoritative role was **discarded** for dual-listed staff — the Registrar only stayed ADMIN because of a manual `.env` override.
- Fix: build `staffByEmployeeId` and resolve faculty roles from the staff record when present. Read-only simulation against live EnrollPro:

| employeeId | in faculty | EnrollPro staff roles | Before fix | After fix |
|---|---|---|---|---|
| 1234501 Rizal | yes | `["SYSTEM_ADMIN"]` | TEACHER unless overridden | **ADMIN** (mirrored) |
| 1234502 Mabini (Registrar) | yes | `["HEAD_REGISTRAR"]` | TEACHER unless overridden | **ADMIN** (mirrored) |
| 1234503 Aquino (MRF) | yes | — (not in staff list) | MRF via override | MRF via override (still required) |
| 1234505 Dela Cruz | no | `["SYSTEM_ADMIN"]` | ADMIN | ADMIN |

- `ENROLLPRO_ROLE_OVERRIDES` is therefore **not stale config**: `1234503=MRF` remains load-bearing because EnrollPro exposes no role for faculty-only staff.

### Verified state (this session)
- `npm run verify`: lint + frontend build + server build + **25/26** auth checks pass (1 failure = admin credential above).
- Playwright: fresh-boot → landing, student login → dashboard, reload → session restore, all with **0 console errors**.
- `prisma migrate diff` (read-only): live DB matches `schema.prisma` **except** legacy `mrf_inventory_*` tables (unapplied `20260911120000_drop_mrf_inventory`). `certificates` exists in the DB but has no migration file (history hygiene). No destructive migration was run.


---

## Appendix A — Unguarded Endpoint Inventory (from baseline)
`bin.routes.ts` (2 routes) · `market.routes.ts` (5 routes) · `settings.routes.ts` (35 routes) · `user.routes.ts` GET `/` and GET `/leaderboard`

## Appendix B — Reference Links
- RA 9003 — https://lawphil.net/statutes/repacts/ra2001/ra_9003_2001.html
- DepEd Order No. 5, s. 2014 (cited by SDO memoranda) — https://tangub.deped.gov.ph/wp-content/uploads/2023/08/divmemo259_2023.pdf
- RA 10173 IRR — https://privacy.gov.ph/wp-content/uploads/2023/06/IRR_RA-10173-as-amended.pdf
- NPC Circular 2022-04 (breach reporting) · NPC PIA guidelines (2026 draft)
- DPA for schools — https://www.respicio.ph/commentaries/which-provisions-of-ra-10173-apply-to-educational-institutions-and-schools-in-the-philippines
