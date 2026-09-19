# SORTv2 — Defense Kit

Everything in this document was executed against the live system on **2026-09-16** with the production accounts. Nothing here is aspirational.

---

## 1. Demo Script (≈7 minutes)

Run it in this order — it follows the real operational loop.

| # | Step | What to click | What to say |
|---|---|---|---|
| 1 | **Cold start** | Open the app in a **fresh browser profile** | "The landing page loads with no cached state — no spinner, no setup." |
| 2 | **Public monitoring** | Point at the Hall of Fame + campuses feed | "Live campus data is public; no login needed for transparency." |
| 3 | **Privacy notice** | Point at the notice under the login card | "Credentials are verified by EnrollPro. SORT never stores passwords — RA 10173." |
| 4 | **Learner login** | `202600000015` / `DepEd2026!!` | "Students sign in with their LRN." |
| 5 | **Report** | Report → pick a station → pick a category → **Demo Photo** → Submit | "Biodegradable, Non-Biodegradable, Recyclable and **Hazardous** — the DepEd DO 5 s. 2014 streams, with the mandated bin colours." |
| 6 | **Duplicate guard** | Immediately try the same bin again | "The system refuses a second report per bin until MRF clears it — anti-abuse by design." |
| 7 | **Admin verify** | Login `1234501` / `DepEdSY2026!` → Reports → **Verify All** | "Verification is a hard gate." |
| 8 | **Dispatch** | **Dispatch Collector** — note it was *disabled* until verified | "Assignment is role-checked and only unlocks after verification." |
| 9 | **MRF completion** | Login `1234503` / `DepEd2026!_` → Dispatches → **Complete & Finish** | "The MRF operator closes the task." |
| 10 | **Points + certificate** | Back as the student → Eco-Points rose → **Certificate Vault** → download PDF | "Points are awarded on verified collection, and certificates are issued with a serial." |

**Before you start:** set `certificatePointThreshold` to ~200 (Admin → Settings) — otherwise step 10 cannot be shown.
**The single most impressive 60 seconds** is step 10: points incremented *and* a real multi-page PDF generated on demand.

---

## 2. Manual Test-Case Table (evidence-backed)

| ID | Test case | Input | Expected | Actual | Status |
|---|---|---|---|---|---|
| TC-01 | Cold start, empty storage | Fresh profile, no token/cache | Landing + login visible | Landing rendered, **0 console errors** | PASS |
| TC-02 | Loader escape hatch | Clear all `sort_*` keys, reload | Landing renders | Landing renders | PASS |
| TC-03 | Student login | `202600000015` / `DepEd2026!!` | STUDENT session | role=STUDENT, dashboard loads | PASS |
| TC-04 | Teacher login | `1000005` / `DepEd2026!!` | TEACHER session | role=TEACHER | PASS |
| TC-05 | Admin login | `1234501` / `DepEdSY2026!` | ADMIN session | role=ADMIN, Admin Console | PASS |
| TC-06 | MRF login | `1234503` / `DepEd2026!_` | MRF session | role=MRF, MRF Terminal | PASS |
| TC-07 | Forged admin token | Token signed with the old default secret | Rejected | **HTTP 401** (was **200** before the fix) | PASS |
| TC-08 | Anonymous config read | `GET /api/settings` with no token | 401 | 401 | PASS |
| TC-09 | Anonymous config write | `PATCH /api/settings` no token | 401 | 401 | PASS |
| TC-10 | Learner privilege escalation | Student token `PATCH /api/settings` | 403 | 403 | PASS |
| TC-11 | Learner market/bins mutation | Student token PATCH market + bins | 403 | 403 | PASS |
| TC-12 | Public leaderboard PII | `GET /api/users` no token | 200, no email/employeeId | 200, no PII keys | PASS |
| TC-13 | Hazardous report submission | Station → Hazardous → Demo Photo → Submit | Persists as HAZARDOUS | `category=HAZARDOUS`, ticket **TKT-295736** | PASS |
| TC-14 | Duplicate report guard | Resubmit same bin | Blocked | "You Have Already Reported This Trash Bin" | PASS |
| TC-15 | Admin verify gate | Verify then check Dispatch button | Enabled only after verify | Disabled → verify → enabled | PASS |
| TC-16 | Dispatch assignment | Assign MRF staff | Status DISPATCHED + assignee | `DISPATCHED (AQUINO, MELCHORA)` | PASS |
| TC-17 | MRF closes task | Complete & Finish | COLLECTED + completedAt | `COLLECTED`, timestamp set | PASS |
| TC-18 | Points award | Check student balance | +15 (1st reporter) | **210 → 225**, ledger entry `+15` | PASS |
| TC-19 | Ledger reconciliation | Compare ledger sum to balance | Equal | 210+15 = 225 | PASS |
| TC-20 | Certificate issuance | Claim at threshold | Certificate + serial | serial `SORT-HNHS-2030-MILESTONE-P225` | PASS |
| TC-21 | Certificate PDF | Download endpoint | Valid PDF | 200, `application/pdf`, 23,366 B, `%PDF-` | PASS |
| TC-22 | Invalid weight | `weightCollected: -5` / `'abc'` | 400 | `400 INVALID_WEIGHT` ×2 | PASS |
| TC-23 | Invalid assignee | Non-existent UUID / a student ID | 400 | `400 INVALID_ASSIGNEE` ×2 | PASS |
| TC-24 | Forbidden field injection | PATCH status with `isVerified` | 400 | `400 FORBIDDEN_FIELDS` | PASS |
| TC-25 | Terminal immutability | Re-open a COLLECTED report | 409 | `409 INVALID_TRANSITION` | PASS |
| TC-26 | Role mirroring | EnrollPro staff roles vs SORT | Match | 1234501 SYSTEM_ADMIN→ADMIN, 1234502 HEAD_REGISTRAR→ADMIN, 1234503 MRF | PASS |
| TC-27 | Sync scheduling | Save Automatic + interval | Cron scheduled | log: `Auto-sync scheduled every 45 minutes` | PASS |
| TC-28 | Build integrity | `npm run verify` | All green | lint + build + server build + **28/28** auth checks | PASS |
| TC-29 | **Student "Ranks" tab white-screen (critical, fixed in rehearsal)** | Open Ranks as a learner | Leaderboard renders | **Was: entire app crashed to a blank page** (empty React root) because `GamificationTab` matched users by `email`, which the PII minimisation removed. Fixed with an id-or-email identity helper. Now renders with **0 console errors** | PASS |
| TC-30 | Student screens: Home / Report / Bin Map / Activity / Ranks | Click each | All render | All render, React root intact | PASS |
| TC-31 | Teacher screens: Home / Report / Bin Map / Activity | Click each | All render | All render ("Multi-Category Asset & Waste Report", live bin map) | PASS |
| TC-32 | Admin screens (9): Bin Map, School Years, Campus News, Audit Logs, Leaderboard, Operational Analytics, Collections, Settings, Users | Click each | All render | All render — Users shows 135 accounts, Audit Logs populated, School Years SY 2030-2031 | PASS |
| TC-33 | MRF screens (5): Direct Pickup, Asset Ledger, Scrap Stock, Recycle Market, History | Click each | All render | All render — History shows "COMPLETED JOBS 7", "RECYCLABLES GATHERED 2 kg" | PASS |
| TC-34 | Real EnrollPro sync run | `POST /api/sync/enrollpro` | Succeeds, roles correct | **178 pulled, 2 created, 135 updated in 2.4 s**; roles verified after: 1234501 ADMIN, 1234502 ADMIN, 1234503 MRF, 1234505 ADMIN — **no wrong demotions** | PASS |

**Automated regression net:** `npm run verify` (28 assertions) — re-runnable after any change.

---

## 3. Anticipated Panel Questions

**"How do you secure student data?"**
Credentials are delegated to EnrollPro — SORT never stores passwords. Learner records are personal data under RA 10173, so: report payloads omit reporter emails, list endpoints are PII-minimised, identifiers are masked in server logs (`20******15`), and the login screen carries a privacy notice.

**"What stops a student from faking reports?"**
One report per bin per learner until MRF clears it; admin verification is a hard gate before dispatch; points are awarded only on MRF-verified collection; `weightCollected` and `assignedMrfId` are validated server-side against real MRF personnel.

**"What was your biggest weakness and how did you handle it?"**
We audited our own system and *reproduced* a critical auth bypass: the JWT secret had a hardcoded fallback, so a forged admin token returned HTTP 200. We rotated the secret, removed the fallback (the server now refuses to boot without a strong secret), guarded 44 previously anonymous endpoints, and proved the same forged token now returns 401.

**"How does this align with DepEd?"**
DepEd Order No. 5, s. 2014 mandates segregation into biodegradable / non-biodegradable / hazardous with colour-coded bins — the system implements all three plus recyclable (RA 9003), with the mandated colours, and an MRF workflow consistent with RA 9003's materials-recovery requirements.

**"What testing did you do?"**
28 automated assertions (`npm run verify`) plus 28 manually executed test cases with recorded outcomes (table above), including the full operational chain and negative/security cases.

**"What are the limitations?"**
No unit-test suite or CI yet; the EnrollPro sync schedule persists but historical registration needs baselining; three modules still exceed our 1,000-line rule; a few config values are still plain columns rather than typed settings. *(Own your limitations — panels reward it.)*

---

## 4. Known Limitations (slide content)

1. Test coverage is assertion-based (28 checks), not a full unit-test suite; no CI pipeline yet.
2. Prisma migration history is not yet baselined — 3 folders unapplied, `certificates` created outside migrations.
3. 3 files exceed the project's own 1,000-line limit (`AdminReportsTab`, `MRFDashboard`, `useMockData`).
4. MRF dispatch completion captures notes but not collection weight, so weight-based analytics miss dispatch closures.
5. ~18 modules instantiate their own Prisma client; a shared singleton is planned.
6. Accessibility: several icon-only controls still lack `aria-label`s.
7. School-head compliance export (segregation/diversion summary) is designed but not built.

---

## 5. Numbers to Have Ready

| Metric | Value |
|---|---|
| Total source | ~33,200 LOC (frontend + backend) |
| API endpoints | ~97 across 12 route modules |
| Endpoints hardened this cycle | 44 previously anonymous |
| Frontend bundle | 947 kB → **301 kB** main chunk (dashboards code-split) |
| Automated checks | 28 (auth + RBAC) |
| Critical vulnerability found & fixed | 1 (JWT auth bypass, reproduced) |
| DB indexes added | 5 |
| Build status | frontend + server both green, 0 lint errors |
