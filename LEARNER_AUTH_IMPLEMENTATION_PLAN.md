# LEARNER AUTH IMPLEMENTATION PLAN — Route Student Login to `/api/learner/auth`

> **Status:** Approved plan — ready for implementation. Do NOT implement beyond this scope.
> **Source of truth:** `ENROLLPRO-MRF-STUDENT-AUTH-AND-API-CATALOG.md` (EnrollPro's official response, live-verified 2026-09-08)
> **Supersedes:** the student-login conclusions in `LOGIN-DIAGNOSTICS-FIX-PLAN.md` §root cause (the endpoint contract was the missing piece)
> **Owner decisions (final):** (1) remove `portalAccountActive` login fail-fast, (2) rate limit = 20 attempts / 15 min / per IP, (3) staff `mustChangePassword` → block with `403 PASSWORD_CHANGE_REQUIRED` (rationale in §2), (4) MRF identity-feed key request — DEFERRED.

---

## 1. Background (verified facts)

Students cannot log in because SORT forwards **all** credentials to `POST /api/auth/login`, which matches `User.accountName` / `employeeId` / `email` only — it structurally cannot accept a learner LRN. EnrollPro's catalog (confirmed live) defines a dedicated learner endpoint:

```text
POST /api/learner/auth        body: { "lrn": "<exactly 12 digits>", "password": "..." }
```

**Live-verified response contract (2026-09-08 probes):**

| Case | Result |
|------|--------|
| 200 success | `{ token, requiresPasswordReset: bool, schoolName, schoolAcronym, gradeLevelName, sectionName, learner: { id, lrn, firstName, lastName, middleName } }` |
| 401 unknown LRN | `{ code: "INVALID_LRN", message: "Invalid LRN or password." }` |
| 401 wrong password | `{ code: "INVALID_PASSWORD", message: "Invalid LRN or password." }` — message identical to INVALID_LRN (anti-enumeration); the `code` field differs |
| 401 inactive portal user | `{ code: "ACCOUNT_INACTIVE", message: ... }` |
| 400 malformed | `{ message: "Validation failed", errors: { ... } }` (e.g., empty password → `Password is required`) |
| 5xx | `JWT_SECRET_MISSING` / `SERVER_ERROR` |

**Staff endpoint facts (from catalog):** `/api/auth/login` returns `{ token, user }`; `mustChangePassword` is carried in the **JWT payload** (verified: payload is `{ userId, roles, mustChangePassword, iat, exp=iat+24h }`). It **never** returns 403 for must-change — login succeeds with the flag. The current 403-sniffing heuristic in `enrollpro-auth.service.ts:29-36` is dead code.

**Password semantics (from catalog):** the admin panel's Password Control value is a *reset target*, never the current password. New/auto-provisioned accounts use `DepEd2026!` with `mustChangePassword=true`. A learner with **no** linked portal account (e.g., CONTIS MARI `117463100000`) can authenticate with the default password — EnrollPro auto-provisions the portal user and returns `requiresPasswordReset: true`.

**Rate limiting (from catalog, §A4):** EnrollPro has **no** lockout on its auth endpoints and explicitly instructs consumers to rate-limit their own login surface.

---

## 2. Owner decision #3 — staff `mustChangePassword` handling (decided: BLOCK)

**Approach:** staff login with `mustChangePassword: true` → `403 PASSWORD_CHANGE_REQUIRED` (same as learners).

Rationale:
1. **Consistency** — one policy for all cohorts; the learner decision table in the EnrollPro catalog mandates blocking, and divergent staff behavior doubles the code paths and confuses users.
2. **Security** — a must-change flag means the account is still on a known/guessable default password. The Admin Gate grants destructive powers (purges, user management); accepting default passwords there is unacceptable.
3. **Zero new UI** — `PASSWORD_CHANGE_REQUIRED` code, server branch, and frontend message already exist.
4. EnrollPro's own client allows staff in only because it immediately opens its embedded password-change UI; SORT has no such flow, so blocking with an actionable message is our equivalent.

**Alternative rejected:** allow login + non-blocking "change your password" banner — weaker security at the admin gate, inconsistent with learners, and requires new UI.

---

## 3. Phase 1 — Learner auth routing (the core fix)

### 3a. `server/src/services/enrollpro-auth.service.ts`

1. **Add `authenticateLearnerWithEnrollPro(lrn: string, password: string): Promise<EnrollProAuthResult>`**:
   - `POST ${ENROLLPRO_BASE}/learner/auth` with body `{ lrn, password }`, `AbortSignal.timeout(10000)`, same header set as the staff call.
   - Response mapping:
     - `200` → `{ success: true, mustChangePassword: body.requiresPasswordReset === true }` — do **not** return or persist the learner JWT anywhere (catalog Security Requirements; SORT issues its own session).
     - `401` with `code === 'ACCOUNT_INACTIVE'` → `{ success: false, accountInactive: true }`.
     - `401` (`INVALID_LRN` / `INVALID_PASSWORD` / anything else) → `{ success: false, error: 'Invalid credentials' }`.
     - `400` → `{ success: false, error: 'Validation failed' }` (defensive — should not occur since the route pre-validates; see 3b).
     - `5xx` → `{ success: false, unreachable: true, error }` (fail-closed: EnrollPro auth misconfigured = auth unavailable).
   - Extract the network-error classification (`isNetworkError` with `error.cause?.code` checks) currently inlined in the staff function's catch into a shared local helper; both functions use it.
2. **Unify the result interface** (rename/extend the existing one):
   ```ts
   export interface EnrollProAuthResult {
     success: boolean;
     mustChangePassword?: boolean;  // staff: JWT payload flag; learner: requiresPasswordReset
     accountInactive?: boolean;     // learner: ACCOUNT_INACTIVE
     token?: string;                // internal only; callers must not persist
     user?: { id: number; name: string; email: string; role: string };
     error?: string;
     unreachable?: boolean;
   }
   ```
3. **Fix the staff function (`authenticateWithEnrollPro`):**
   - **Delete the 403 body-sniffing heuristic** (lines 29-36) — dead code; `/auth/login` never 403s for must-change.
   - On `200`, decode the JWT payload to read `mustChangePassword` (base64url-decode `token.split('.')[1]`, `JSON.parse`, wrap in try/catch → flag `undefined` on malformed). Return it as `mustChangePassword`.
   - Keep 401 → invalid, other non-ok → error, network → unreachable.

### 3b. `server/src/routes/auth.routes.ts` — login route

Current order: lookup → not-found 401 → syncSource 401 → **portalAccountActive fail-fast (REMOVE)** → staff delegate → unreachable 503 → must-change 403 → !success 401 → suspension → session.

New order:
1. Local lookup + `syncSource` guard — unchanged.
2. **DELETE the `portalAccountActive === false` fail-fast block** (owner decision #1). EnrollPro's own `ACCOUNT_INACTIVE` is now the source of truth, and removing the block enables the auto-provisioning path for unprovisioned learners.
3. **Route by role:**
   ```ts
   const authResult = user.role === 'STUDENT'
     ? await authenticateLearnerWithEnrollPro(user.enrollproLrn || loginId, loginPassword)
     : await authenticateWithEnrollPro(loginId, loginPassword);
   ```
   (Use the canonical stored `enrollproLrn`, falling back to the typed identifier — both equal the LRN in our mirror.)
   - Optional cheap fast-path: if `user.role === 'STUDENT'` and the LRN is not exactly 12 digits (`/^\d{12}$/`), return `401 INVALID_CREDENTIALS` immediately without the network call.
4. `unreachable` → `503 AUTH_SERVICE_UNREACHABLE` — unchanged.
5. `mustChangePassword` → `403 PASSWORD_CHANGE_REQUIRED` — unchanged branch, now fed by real data from both endpoints.
6. **NEW:** `accountInactive` → `403 NO_ENROLLPRO_ACCOUNT` (existing code + message: "Your EnrollPro portal account is not yet activated. Contact the registrar.").
7. `!success` → `401 INVALID_CREDENTIALS` — unchanged.
8. Suspension checks + session creation — unchanged.
9. Keep the per-branch `console.log` diagnostics (identifier only, never passwords).

### 3c. Frontend — NO changes required in Phase 1

All codes (`INVALID_CREDENTIALS`, `PASSWORD_CHANGE_REQUIRED`, `NO_ENROLLPRO_ACCOUNT`, `AUTH_SERVICE_UNREACHABLE`) and messages already exist in `src/utils/loginErrors.ts` and are wired through all three gates.

### 3d. Known-acceptable side effect

With the fail-fast removed, a learner whose `portalAccountActive` is stale-`false` locally can still authenticate (correct behavior). The Admin Users "Not login-ready" badge and the Sync-tab readiness card now reflect *sync freshness*, not live login ability — acceptable. Optional wording tweak for the readiness card: "N students without an activated EnrollPro portal account" instead of "cannot log in" (see Phase 3).

---

## 4. Phase 2 — Rate limiting (owner decision #2)

Per the catalog's §A4 mandate (EnrollPro has no lockout; consumers must throttle):

1. `npm install express-rate-limit` in `server/`.
2. Create the limiter in `auth.routes.ts` (keeps `index.ts` untouched):
   ```ts
   const loginLimiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     limit: 20,
     standardHeaders: true,
     legacyHeaders: false,
     skipSuccessfulRequests: true,   // successful logins don't consume the budget
     handler: (_req, res) => res.status(429).json({
       error: 'Too many login attempts. Please try again in 15 minutes.',
       code: 'RATE_LIMITED',
     }),
   });
   router.post('/login', loginLimiter, async (req, res) => { ... });
   ```
3. Apply to `POST /login` **only** (not `/refresh` — it is token-keyed, not a brute-force surface).
4. Frontend: add to `src/utils/loginErrors.ts` map:
   `RATE_LIMITED: 'Too many login attempts. Please try again in 15 minutes.'`
5. Per the catalog: never claim EnrollPro locked the account (it doesn't maintain that state) — the message above attributes the limit to SORT, which is correct.
6. Note for future production: if deployed behind a reverse proxy, set `app.set('trust proxy', <depth>)` so IP keying works; out of scope for dev.

---

## 5. Phase 3 — Cleanups (small, do with Phase 1/2)

1. **Drop the `x-school-year-context-id` header** from `fetchAllPages` in `enrollpro-sync.service.ts` (lines ~121-123). The catalog states the integration-v1 contract is the `schoolYearId` **query parameter**, which we already send; the header is not part of the contract.
2. Keep everything else about `portalAccountActive` (sync mirroring, admin badge, readiness card) — only the login fail-fast is removed.
3. Optional (nice-to-have, skip if risky): readiness-card wording tweak per §3d.
4. Optional (nice-to-have): surface `GET /integration/v1/health` (verified working with our key) as a small status line in `AdminSyncSettingsTab`.

---

## 6. Verification checklist (all must pass)

**Static:**
- [ ] `npx tsc --noEmit` (server) — zero errors in touched files (pre-existing `settings.routes.ts` errors are out of scope)
- [ ] `npx tsc --noEmit -p tsconfig.app.json` (frontend) — zero errors in touched files (3 known pre-existing errors elsewhere are out of scope)
- [ ] `npx oxlint` — no new warnings in touched files

**Live probes against `http://localhost:5000/api/auth/login`:**
- [ ] Staff `1234501` + `DepEdSY2026!` → `200` + JWT (regression — must still work)
- [ ] Student `202700000004` + wrong password → `401 {code: "INVALID_CREDENTIALS"}` (proves learner endpoint is now called — previously this same probe pattern failed via the staff endpoint)
- [ ] Unknown 12-digit LRN `999999999999` → `401 INVALID_CREDENTIALS` (same message as wrong password — anti-enumeration preserved)
- [ ] 11-digit identifier for a student → `401 INVALID_CREDENTIALS` (fast-path or EnrollPro 401)
- [ ] EDGAR SALAZAR `202800000008` + `DepEd2026!` → `403 {code: "PASSWORD_CHANGE_REQUIRED"}` (known must-change learner — end-to-end flag mapping)
- [ ] CONTIS MARI `117463100000` + `DepEd2026!` → observe and log: expected `403 PASSWORD_CHANGE_REQUIRED` via auto-provisioning (`requiresPasswordReset: true`), or `401` if EnrollPro's auto-provision path differs from the catalog — **if 401, capture the EnrollPro response body in the server log and report; do not improvise**
- [ ] Staff `1234501` + `mustChangePassword` case → logic verified by code review if no such staff account exists to test
- [ ] Rate limit: 21 rapid failing attempts from same IP → 21st returns `429 {code: "RATE_LIMITED"}`; then a **successful** staff login still works immediately after (skipSuccessfulRequests sanity)
- [ ] Verify server logs show the new branch routing (learner endpoint for students, staff endpoint for others) with no password material logged

**UI (manual, browser at `http://127.0.0.1:5174`):**
- [ ] Landing LoginCard: student + wrong password → "Incorrect LRN/Employee ID or password. Passwords are managed by EnrollPro…" (not "No account found")
- [ ] EDGAR SALAZAR + `DepEd2026!` → "Please change your password in EnrollPro first, then sign in."
- [ ] Admin Gate / MRF Terminal: role-mismatch and wrong-password behavior unchanged (regression)

**End-to-end caveat:** a genuine student **success** login cannot be verified by us — real learner passwords are unknown (they changed them in EnrollPro; the admin panel only shows reset targets). After implementation, the registrar should verify one real learner login. Note this in the report.

---

## 7. Constraints

- No file may approach 1,000 lines (AGENTS.md). Touched files are far below (`auth.routes.ts` ~330, `enrollpro-auth.service.ts` ~83).
- No comments unless required by existing style.
- **Do NOT commit** — leave changes in the working tree.
- Do NOT modify `.env`, Prisma schema, or migrations (nothing needed).
- Do NOT touch `server/src/routes/settings.routes.ts` or `AdminCollectionsTab.tsx`/`AdminImpactTab.tsx` (pre-existing errors belong to other in-flight work).
- Never log or persist passwords or EnrollPro JWTs.

## 8. Out of scope / deferred (do not do)

- MRF-specific integration key request + migration to `/integration/v1/default/mrf/identities` (owner decision #4 — deferred).
- One-time-code SSO flow (`MRF-ENROLLPRO-SSO.md`) — long-term option only.
- `/api/auth/verify` companion contract (requires `COMPANION_APP_URLS` registration with EnrollPro).
- Any change-password UI work (strict policy: passwords live only in EnrollPro).
- Rate limiting keyed by IP+identifier (basic IP keying approved; identifier-keying is a future enhancement).

## 9. Report back (workhorse)

Include: files changed with line references; outputs of every verification probe (status + body); the CONTIS MARI observation (§6); rate-limit test result; confirmation that server logs route students to `/learner/auth`; any deviation from this brief with reasoning.
