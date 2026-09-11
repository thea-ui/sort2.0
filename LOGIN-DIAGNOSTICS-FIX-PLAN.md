# LOGIN FAILURE DIAGNOSTICS & FIX PLAN

> **Status:** Investigation complete — root causes confirmed with live evidence. Fix plan below.
> **Symptom reported:** "No account found. Students use LRN, staff use Employee ID" when trying to log in as a student, after a manual EnrollPro sync that reported success.

---

## 1. Investigation Summary (Evidence)

| # | Check | Result | Verdict |
|---|-------|--------|---------|
| 1 | Backend running (port 5000), Postgres (5432), Vite (5174) | All listening | ✅ Infra OK |
| 2 | EnrollPro reachable, `X-Integration-Key` valid (SY 2029-2030, id 8) | 200 | ✅ OK |
| 3 | Local DB users | 124 ENROLLPRO users: 81 students (all with `enrollproLrn` + `employeeId`), 39 teachers, 3 admin, 1 MRF | ✅ Mirror complete |
| 4 | Sync log (latest, 2026-09-07 14:23) | SUCCESS, 165 pulled, 124 updated | ✅ Sync works |
| 5 | Full delegated login chain with staff `1234501` + `DepEdSY2026!` | **200 + JWT** | ✅ Delegation works |
| 6 | Student `202900000007` + `DepEd2026!` / `DepEdSY2026!` / wrong pw | 401 `Invalid credentials` | ❌ EnrollPro rejects password |
| 7 | Direct EnrollPro `POST /auth/login` `{accountName: LRN, password}` (wrong pw) | 401 `Invalid employee ID or password` | ✅ Contract correct; **password is simply not the student's EnrollPro password** |
| 8 | Learners with EnrollPro `portalAccount` | 80 of 81 active; accountName = LRN | ⚠️ 1 learner **cannot ever log in** |
| 9 | Learner without portal account | `CONTIS MARI`, LRN `117463100000`, `userId: null`, `portalAccount: null` | ⚠️ No credentials exist on EnrollPro side |
| 10 | Learner with `mustChangePassword: true` | `EDGAR SALAZAR`, LRN `202800000008` | ⚠️ Possible 403 semantics issue |
| 11 | CORS `origin: '*'`, Vite pinned 5174, API base `http://localhost:5000/api` | Browser can reach API | ✅ Not a CORS problem |

### Conclusion

**The system is not failing to fetch or sync.** Student accounts exist locally and match EnrollPro exactly (81 = 81). The delegated auth chain is proven working (staff login returns 200).

The login fails for one of only three real reasons, and the current UI shows the **same wrong message** for all of them:

1. **Wrong password** — the typed password is not that student's EnrollPro portal password. SORT cannot know or reset it (strict delegation by design; `ENROLLPRO_STRICT_MIRROR_SYNC_PLAN.md` owner decision #1).
2. **Student has no EnrollPro portal account** (e.g., CONTIS MARI `117463100000`) — EnrollPro returns 401; no password will ever work until EnrollPro provisions the account. Locally this student looks like a normal ACTIVE account (silent trap).
3. **Service unreachable** — EnrollPro or backend down at that moment; see defect D2 below, which misreports this as invalid credentials.

### Root defects found

- **D1 (UX, primary):** `useMockData.login()` (`src/hooks/useMockData.tsx:476-504`) swallows every API error and returns `false`; `LoginCard.tsx:32` then renders *"No account found…"* for **all** failures — wrong password, not provisioned, EnrollPro unreachable, and backend offline are indistinguishable. The server's specific messages (`Invalid credentials`, `Account not provisioned`, `Authentication service unreachable`) never reach the user.
- **D2 (misclassification):** `enrollpro-auth.service.ts:53-58` marks `unreachable` only for `TimeoutError`/`AbortError`/`ECONNREFUSED`/`ENOTFOUND`. Node's undici throws `TypeError: fetch failed` with the real code in `error.cause.code` (DNS failure, TLS, socket hang-up) — those return `success: false` **without** `unreachable`, so EnrollPro-down becomes 401 "Invalid credentials" → UI says "No account found".
- **D3 (data gap):** sync ignores `learner.portalAccount`. Learners without an active portal account can never authenticate, yet sync imports them as ordinary ACTIVE users with no warning.
- **D4 (possible 403 semantics):** `enrollpro-auth.service.ts:28-30` treats 403 as invalid credentials. If EnrollPro uses 403 for `mustChangePassword` accounts (EDGAR SALAZAR), login would fail with a misleading message instead of "change your password in EnrollPro".
- **D5 (observability):** the login route logs nothing on its decision branches — no way to tell from server output which stage failed.

---

## 2. Fix Plan

### Phase A — Honest, distinguishable login errors (fixes D1, D5)

**Server — `server/src/routes/auth.routes.ts` (login route only):**
1. Add error codes to every failure response:
   - user not found / EnrollPro 401 → 401 `{ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }` (same message for both — avoids account enumeration)
   - `syncSource !== 'ENROLLPRO'` → 401 `{ code: 'NOT_PROVISIONED' }`
   - EnrollPro unreachable → 503 `{ code: 'AUTH_SERVICE_UNREACHABLE' }`
   - suspended → 403 `{ code: 'ACCOUNT_SUSPENDED' }` (existing message + code)
2. Add a one-line `console.log` on each failure branch (which stage, identifier used, no passwords) — D5.

**Server — `enrollpro-auth.service.ts`:**
3. Classify **every** fetch exception as `unreachable: true` (check `error.cause?.code` for ECONNREFUSED/ENOTFOUND/ENOTFOUND-style codes, plus `TypeError: fetch failed`) — fixes D2.
4. Investigate 403 handling: if EnrollPro returns 403 for `mustChangePassword`, return `success: true` with `mustChangePassword: true` flag or a distinct error `code: 'PASSWORD_CHANGE_REQUIRED'` — fixes D4 (verify against EDGAR SALAZAR `202800000008` once password is known).

**Frontend:**
5. `src/services/api.ts` `login()`: surface the server's JSON body (error + code) in the thrown error (attach `code`).
6. `useMockData.login()`: return a structured result — `{ ok: true, user } | { ok: false, code, message }` — instead of `boolean`; on network failure return `{ ok: false, code: 'SERVER_UNREACHABLE' }`.
7. `LoginCard.tsx`: render message per code:
   - `INVALID_CREDENTIALS` → "Incorrect LRN/Employee ID or password. Passwords are managed by EnrollPro — use your EnrollPro portal password."
   - `NOT_PROVISIONED` → "Account not provisioned. Contact your administrator."
   - `AUTH_SERVICE_UNREACHABLE` → "Authentication service unreachable. Please try again later."
   - `SERVER_UNREACHABLE` → "Cannot reach the SORT server. Please try again later."
   - `ACCOUNT_SUSPENDED` → existing suspension message.
   - `PASSWORD_CHANGE_REQUIRED` → "Please change your password in EnrollPro first, then sign in."

### Phase B — Mirror portal-account readiness (fixes D3)

**`server/src/services/enrollpro-sync.service.ts`:**
8. Capture `learner.portalAccount` per learner:
   - `portalAccount` null or `isActive: false` → store `accountStatus: 'PENDING_PROVISION''` (add enum value) or a dedicated boolean column `portalAccountActive` (prefer the column — `accountStatus` has operational semantics for suspensions).
   - Mirror `mustChangePassword` similarly if exposed.
9. Login route: if the local user is a student with no portal account, fail fast with `code: 'NO_ENROLLPRO_ACCOUNT'` → "Your EnrollPro portal account is not yet activated. Contact the registrar." (No pointless network call.)
10. Admin Sync tab (`AdminSyncSettingsTab`): show login-readiness summary — "Students login-ready: 80/81".
11. Admin Users tab: badge for not-login-ready accounts.

### Phase C — Verification (must pass before marking done)

1. `npm run build` + lint clean (frontend and server).
2. Staff `1234501` + `DepEdSY2026!` → 200 (regression).
3. Student + wrong password → UI shows the new INVALID_CREDENTIALS message (not "No account found").
4. Unknown identifier → same INVALID_CREDENTIALS message (enumeration-safe).
5. CONTIS MARI `117463100000` (after Phase B) → clear "portal account not activated" message.
6. Stop EnrollPro host resolution (e.g., bad `ENROLLPRO_BASE_URL` in a test env) → 503 AUTH_SERVICE_UNREACHABLE surfaced in UI.
7. Backend down → SERVER_UNREACHABLE message (not "No account found").

### Operational note (immediate, no code)

- The user's student login will succeed **only with that student's EnrollPro portal password** (accountName = LRN). If unknown, the registrar must verify/reset it in EnrollPro. `DepEd2026!`/`DepEdSY2026!` (staff/stale defaults) do not work for learners — verified live.
- CONTIS MARI (`117463100000`) has no EnrollPro portal account and cannot log in until EnrollPro provisions one.

---

## 3. Files to Touch

| File | Change |
|------|--------|
| `server/src/routes/auth.routes.ts` | error codes + branch logging |
| `server/src/services/enrollpro-auth.service.ts` | robust unreachable classification, 403 semantics |
| `server/prisma/schema.prisma` (+ migration) | `portalAccountActive` (Phase B) |
| `server/src/services/enrollpro-sync.service.ts` | mirror portal-account readiness |
| `src/services/api.ts` | propagate error codes |
| `src/hooks/useMockData.tsx` | structured login result |
| `src/components/landing/LoginCard.tsx` | per-code messaging |
| `src/pages/admin/components/settings/AdminSyncSettingsTab.tsx` | login-readiness summary |

All changes respect the 1,000-line file limit and existing module boundaries.
