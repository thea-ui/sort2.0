# SORT First-Time Login / SSO Audit — Review Copy for SMART Team AI

**From:** SORT/MRF engineering audit
**To:** SMART Team AI
**Date:** 2026-10-25
**Scope:** SORTv2 login, sessions, first-time verification, and EnrollPro companion SSO
**Source state:** `HEAD 926d0a9` plus unrelated working-tree UI changes; no auth/SSO code was modified
**Purpose:** give the SMART team enough evidence to verify SORT's real auth model and correct the first-time SSO integration plan

> **Implementation update (2026-10-25):** the owner removed the password-change gate. SORT no longer returns `403 PASSWORD_CHANGE_REQUIRED`; once EnrollPro validates the password, SORT issues its session and records the flag only to keep the local-first fast path disabled for that account. Any recommendation below to block must-change accounts is superseded by this decision.

> **Instructions for the SMART Team AI:** review this audit against the handoff. Do not assume SORT has SMART's session model or any verification gate. Confirm or challenge each finding, then propose the minimal safe integration for SORT first-time SSO. If a claim is not supported by the evidence below, mark it and ask for the missing file or runtime trace.

---

## 0. Executive summary

1. **SORT has no EnrollPro companion SSO.** There are no `companion-sso` callback, bootstrap, authorize, or exchange routes. Every candidate SSO endpoint returns HTTP 404.
2. **SORT has no first-time verification state.** The database has `AccountStatus` only (`ACTIVE`/`SUSPENDED`). There is no `verificationStatus`, verification ticket, or verify/resend/cancel endpoint.
3. **SORT does not enforce EnrollPro's first-login password flag.** EnrollPro's `mustChangePassword` (staff) / `requiresPasswordReset` (learner) is received and returned to the client, but SORT still issues a full access + refresh session.
4. **SORT's login is delegated password authentication**, not SSO. Staff use EnrollPro `POST /auth/login`; students use EnrollPro `POST /learner/auth`.
5. **The observed “first-time SSO” failure is most likely a missing route**, not a verification failure. `GET /api/auth/enrollpro/callback` returns `404 Not Found` with `Cannot GET /api/auth/enrollpro/callback`.
6. **Several SMART security properties are absent in SORT:** no httpOnly access/refresh cookies, no refresh-token reuse/family detection, no per-request DB status check, no CSRF middleware, and no general login audit row.

The immediate implementation task is therefore larger than “insert verification into the SSO callback”: SORT first needs a verification state, a shared post-identity gate, and the SSO endpoints themselves.

---

## 1. How this audit was produced

- Static review of the SORT server, frontend auth code, Prisma schema, migrations, E2E scripts, and existing handoff/plan documents.
- Read-only HTTP probes against the locally running SORT API on `localhost:5000`.
- No passwords, tokens, SSO codes, or secrets were read, logged, or reproduced.
- No login or SSO source code was changed.

### 1.1 Runtime probe results

```text
GET  /health                                            -> 200
GET  /api/auth/enrollpro/callback?code=test&state=test  -> 404 text/html
POST /api/auth/sso/exchange                             -> 404
POST /api/auth/sso/authorize                            -> 404
GET  /api/auth/companion-sso/callback?code=test         -> 404
POST /api/auth/verify                                   -> 404
```

Exact callback response:

```http
HTTP/1.1 404 Not Found
X-Powered-By: Express
Content-Type: text/html; charset=utf-8

<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Error</title></head>
<body><pre>Cannot GET /api/auth/enrollpro/callback</pre></body>
</html>
```

There is no JSON error code and no stack trace because the route/controller does not exist.

---

## 2. What SORT actually implements

### 2.1 Account model

SORT uses one `User` table for students, teachers, MRF staff, and admins.

| Concern | SORT implementation | Evidence |
|---|---|---|
| Account table | Single `User` model | `server/prisma/schema.prisma:129-182` |
| Roles | `STUDENT`, `TEACHER`, `MRF`, `ADMIN` | `server/prisma/schema.prisma:10-15`, `:135` |
| Account status | `ACTIVE`, `SUSPENDED` only | `server/prisma/schema.prisma:54-57`, `:138` |
| Unique identity fields | `email`, `employeeId`, `enrollproId`, `enrollproLrn` | `server/prisma/schema.prisma:132`, `:134`, `:147-148` |
| External subject | No `enrollproSubject`/`externalSubject`; `enrollproId` is a synthetic sync key | `server/prisma/schema.prisma:145-148`; `server/src/services/enrollpro-sync.service.ts:695-705`, `:723-745` |
| Provisioning | EnrollPro sync only; no self-signup, no admin-create, no login auto-create | `server/prisma/seed.ts:9-10`; `server/src/services/enrollpro-sync.service.ts:785-875`; `server/src/routes/auth.routes.ts:87-106` |

### 2.2 Login path

`POST /api/auth/login` accepts `{ identifier, password, portal? }`.

Decision order in `server/src/routes/auth.routes.ts:76-270`:

1. Look up a local `User` by `enrollproLrn`, `employeeId`, or `email` (`:86-95`).
2. If no local user → `401 INVALID_CREDENTIALS`; no auto-create (`:97-100`).
3. Require `syncSource = ENROLLPRO` → otherwise `401 NOT_PROVISIONED` (`:102-106`).
4. For students, block archived / not-enrolled / alumni (`:108-115`).
5. Route by role:
   - student → EnrollPro `POST /learner/auth` (`:117-121`)
   - staff → EnrollPro `POST /auth/login` (`:121`)
6. If EnrollPro is unreachable, try the offline cached bcrypt hash; if unavailable → `503 AUTH_SERVICE_UNREACHABLE` (`:128-141`).
7. Check suspension / auto-unsuspend (`:172-194`).
8. Portal gate: ADMIN portal → ADMIN only; MRF portal → MRF only; STAFF portal → STUDENT/TEACHER (`:64-71`, `:196-209`).
9. Cache the verified password hash unless offline or must-change (`:211-216`).
10. Issue access JWT + refresh token and return JSON (`:218-265`).

**There is no verification step anywhere in this flow.**

### 2.3 The first-login flag is accepted, not enforced

EnrollPro returns `mustChangePassword` for staff and `requiresPasswordReset` for learners:

- `server/src/services/enrollpro-auth.service.ts:77-85`
- `server/src/services/enrollpro-auth.service.ts:114-128`

SORT reads the flag but only sets a response field:

```ts
// server/src/routes/auth.routes.ts:159-169
if (authResult.mustChangePassword) {
  mustChangePassword = true;
  await clearCachedPassword(user.id);
  console.warn(`[Auth] Login accepted ... with must-change flag ...`);
}
```

It then issues a full session:

```ts
// server/src/routes/auth.routes.ts:257-265
return res.json({
  token: accessToken,
  accessToken,
  refreshToken,
  expiresIn: `${ACCESS_EXPIRY_SECONDS}s`,
  ...(mustChangePassword ? { mustChangePassword: true } : {}),
  user: safeUser(user),
});
```

The frontend does not act on the flag either:

- `src/hooks/useAuthState.ts:52-68` stores the token and marks the user authenticated.
- `src/components/auth/PortalLogin.tsx:88-98` only checks the role.
- `src/utils/loginErrors.ts:7` contains a `PASSWORD_CHANGE_REQUIRED` message, but no server branch emits that code.

This contradicts SORT's own approved plan:

- `LEARNER_AUTH_IMPLEMENTATION_PLAN.md:6`, `:37-45`, `:97` says staff `mustChangePassword` should return `403 PASSWORD_CHANGE_REQUIRED`.
- `ENROLLPRO-MRF-STUDENT-AUTH-AND-API-CATALOG.md:104-107` says MRF must not treat `requiresPasswordReset=true` as authorization.

### 2.4 Session model

| Concern | SORT implementation | Evidence |
|---|---|---|
| Access token | JWT, 15 minutes, hardcoded | `server/src/routes/auth.routes.ts:19`, `:218-223` |
| Refresh token | Opaque 80-hex token, 7 days, stored plaintext in `UserSession.refreshToken` | `server/src/routes/auth.routes.ts:20`, `:40-46`; `server/prisma/schema.prisma:592-607` |
| Offline refresh | 24 hours | `server/src/routes/auth.routes.ts:23`, `:236-239` |
| Rotation | Yes, old token replaced with a new one | `server/src/routes/auth.routes.ts:322-330` |
| Reuse detection | No family/revocation logic; an old token simply no longer matches | `server/src/routes/auth.routes.ts:281-291` |
| Browser storage | Access in `sessionStorage`; refresh in `localStorage` | `src/services/api.ts:52-63`; `src/hooks/useAuthState.ts:55-60` |
| Transport | `Authorization: Bearer` header; no cookies | `src/services/api.ts:124-138` |
| Status recheck | Middleware verifies JWT only; no DB lookup | `server/src/middleware/auth.ts:13-28` |
| Refresh checks | Rechecks `syncSource`, enrollment, suspension | `server/src/routes/auth.routes.ts:294-320` |
| `/me` checks | Rechecks `syncSource` and enrollment, not suspension | `server/src/routes/auth.routes.ts:437-444` |
| CSRF | No CSRF middleware; CORS `credentials: false` | `server/src/index.ts:69-83` |
| Login rate limit | 20 failed attempts / 15 min / IP, DB-backed | `server/src/routes/auth.routes.ts:25-36`; `server/src/lib/rate-limit-store.ts:17-67` |
| Deployment | PM2: one `sort-api` fork instance + one worker | `ecosystem.config.cjs:18-24` |

### 2.5 EnrollPro outage behavior

SORT is **not strictly fail-closed**. On an unreachable EnrollPro response, it verifies the cached bcrypt hash of the last successfully verified password and, if valid, issues a 24-hour session:

- `server/src/routes/auth.routes.ts:128-141`
- `server/src/services/offline-auth.service.ts:94-105`
- `server/prisma/schema.prisma:159-161`

If no usable cache exists, it fails closed with `503 AUTH_SERVICE_UNAVAILABLE`.

---

## 3. Answers to handoff §9

### 3.1 Account and role model

| # | Answer | Evidence | Confidence |
|---:|---|---|---|
| 1 | One `User` table with a `Role` enum; no separate student/teacher tables. | `server/prisma/schema.prisma:10-15`, `:129-135` | High |
| 2 | No shared “Admin MRF” account in code. Sync creates one row per unique `employeeId`; ADMIN and MRF are separate roles/accounts. Repo E2E identities are one ADMIN and one MRF staff account. | `server/src/services/enrollpro-sync.service.ts:715-747`, `:785-875`; `server/prisma/schema.prisma:134`; `DEFENSE_KIT.md:19-21`, `:37-38` | High for code; operational shared account UNKNOWN |
| 3 | Unique identifiers: `email`, `employeeId`, `enrollproId` (nullable), `enrollproLrn` (nullable). No `username`. Login matches LRN/employee ID/email. | `server/prisma/schema.prisma:132`, `:134`, `:147-148`; `server/src/routes/auth.routes.ts:86-95` | High |
| 4 | All roles use `POST /api/auth/login`; portal admission: ADMIN→ADMIN, MRF→MRF, STAFF→STUDENT/TEACHER. | `server/src/routes/auth.routes.ts:64-71`, `:196-209`; `src/components/landing/LoginCard.tsx:29`; `src/components/auth/PortalLogin.tsx:86` | High |
| 5 | No `externalSubject`/`enrollproSubject`. `enrollproId` is a synthetic sync key (`learner-…`, `faculty-…`, `staff-…`), not an SSO subject. | `server/prisma/schema.prisma:145-148`; `server/src/services/enrollpro-sync.service.ts:695-705`, `:723-745` | High |
| 6 | EnrollPro sync only. No self-signup, admin creation, CSV import, or first-login auto-create. | `server/prisma/seed.ts:9-10`; `server/src/services/enrollpro-sync.service.ts:785-875`; `server/src/routes/auth.routes.ts:87-106` | High |

### 3.2 First-time verification semantics

| # | Answer | Evidence | Confidence |
|---:|---|---|---|
| 7 | No defined “first time” trigger. Closest signal is EnrollPro `mustChangePassword`/`requiresPasswordReset`. | `server/src/routes/auth.routes.ts:127`, `:159-169`; `server/src/services/enrollpro-auth.service.ts:77-85`, `:114-128` | High |
| 8 | No verification method exists. No email link, OTP, admin approval, ID upload, or password setup in SORT. | `src/utils/loginErrors.ts:2`; `tests/ui/regression.spec.ts:58`; `LEARNER_AUTH_IMPLEMENTATION_PLAN.md:186-192` | High |
| 9 | No verification state. Only `AccountStatus` `ACTIVE`/`SUSPENDED`; no `verificationStatus`/`verifiedAt`/`verifiedBy`. | `server/prisma/schema.prisma:54-57`, `:138` | High |
| 10 | Not applicable — no per-account/email/device/enrollment verification. | `server/prisma/schema.prisma:129-182` | High |
| 11 | With a pending must-change flag, SORT does not block or redirect; it issues a full session. | `server/src/routes/auth.routes.ts:159-169`, `:214-265`; `src/hooks/useAuthState.ts:52-68`; `src/components/auth/PortalLogin.tsx:88-98` | High |
| 12 | Not resumable; no verification ticket. Only ordinary refresh tokens exist. | `server/prisma/schema.prisma:592-607`; `server/src/routes/auth.routes.ts:272-348` | High |
| 13 | No verify/resend/cancel endpoints. Auth routes are `/login`, `/refresh`, `/logout`, `/logout-all`, `/sessions`, `/me`. | `server/src/routes/auth.routes.ts:76`, `:273`, `:351`, `:366`, `:385`, `:417` | High |
| 14 | Any valid JWT can reach the role APIs it is authorized for; there is no verification gate. | `server/src/middleware/auth.ts:13-28`; e.g. `server/src/routes/report.routes.ts:66`, `:251`, `:452` | High |
| 15 | Verification does not activate anything because it does not exist. Accounts default to ACTIVE. | `server/prisma/schema.prisma:138`; `server/src/services/enrollpro-sync.service.ts:828-845` | High |
| 16 | Not applicable. | — | High |

### 3.3 Current SSO setup

| # | Answer | Evidence | Confidence |
|---:|---|---|---|
| 17 | Neither Flow A nor Flow B. No `companion-sso` routes. | `server/src/index.ts:140-155`; `UI_POLISH_PLAN.md:56`, `:143`, `:519`; `LEARNER_AUTH_IMPLEMENTATION_PLAN.md:189` | High |
| 18 | No callback, bootstrap, authorize, or exchange endpoints. | `server/src/index.ts:140-155`; `server/src/routes/auth.routes.ts:76-452` | High |
| 19 | No SSO identity payload. Current EnrollPro integration is password auth plus directory sync. | `server/src/services/enrollpro-auth.service.ts:66-86`, `:114-128`; `server/src/services/enrollpro-sync.service.ts:32-85`, `:692-747` | High |
| 20 | Sync role mapping: ADMIN/SYSTEM_ADMIN/HEAD_REGISTRAR/REGISTRAR→ADMIN; TEACHER/ADVISER/CLASS_ADVISER→TEACHER; MRF→MRF; unknown→TEACHER. Env overrides can force roles. This is not SSO mapping. | `server/src/services/enrollpro-sync.service.ts:134-148`, `:18-27`, `:727`, `:742`, `:750-752` | High |
| 21 | No SSO. Password login with no local account returns `401 BEFORE EnrollPro`; no auto-create. | `server/src/routes/auth.routes.ts:87-100` | High |
| 22 | No handler exists: `/api/auth/enrollpro/callback` → **404 HTML**, no error code, no stack trace. Same for other SSO paths. | Live probe; `server/src/index.ts:139-155`; `server/src/routes/auth.routes.ts:76-452` | High for 404; exact external URL UNKNOWN |
| 23 | No SSO callback. Password login issues a full session immediately. | `server/src/routes/auth.routes.ts:218-265` | High |
| 24 | No subject binding at login. `enrollproId` is bound during sync with a unique constraint. | `server/prisma/schema.prisma:147`; `server/src/services/enrollpro-sync.service.ts:808-848` | High |
| 25 | No SSO bootstrap. Refresh rechecks syncSource/enrollment/suspension; `/me` does not check suspension; middleware does not query the DB. | `server/src/routes/auth.routes.ts:294-320`, `:437-444`; `server/src/middleware/auth.ts:13-28` | High |
| 26 | Students are not expected to use companion SSO; they use EnrollPro `/learner/auth`. EnrollPro companion SSO is staff-only per the handoff/catalog. | `server/src/routes/auth.routes.ts:117-121`; `server/src/services/enrollpro-auth.service.ts:102-157`; `ENROLLPRO-MRF-STUDENT-AUTH-AND-API-CATALOG.md:125-128` | High for code; external contract per docs |
| 27 | Repo E2E identities are staff (ADMIN and MRF). No learner SSO identity is present. Actual identity EnrollPro sent is UNKNOWN. | `scripts/e2e/credentials.local.json:16`, `:21`; `DEFENSE_KIT.md:37-38` | Medium |

### 3.4 Session and security

| # | Answer | Evidence | Confidence |
|---:|---|---|---|
| 28 | JWT in `sessionStorage`; refresh token in `localStorage`; `Authorization: Bearer`; no httpOnly cookies. | `src/services/api.ts:52-63`, `:124-138`; `src/hooks/useAuthState.ts:55-60`; `server/src/routes/auth.routes.ts:257-265` | High |
| 29 | Access 15 min; refresh 7 days; offline refresh 24 h. Hardcoded. Rotation yes; no reuse/family detection; refresh tokens stored plaintext. | `server/src/routes/auth.routes.ts:19-23`, `:322-330`; `server/prisma/schema.prisma:595` | High |
| 30 | Access token in `sessionStorage`; refresh token in `localStorage`; automatic refresh once on 401. | `src/services/api.ts:52-63`, `:86-119`, `:124-150` | High |
| 31 | Logout deletes the supplied refresh session; logout-all deletes all sessions. Existing access tokens survive until expiry because middleware does not recheck the DB. | `server/src/routes/auth.routes.ts:350-382`, `:306-320`; `server/src/middleware/auth.ts:13-28` | High |
| 32 | No CSRF middleware. Bearer tokens + `credentials: false` reduce classic CSRF exposure; web-storage tokens increase XSS exposure. No SSO state validation exists. | `server/src/index.ts:69-83`; `src/services/api.ts:124-138` | High |
| 33 | Login rate limit: 20 failed / 15 min / IP, DB-backed. No verification/SSO limits. | `server/src/routes/auth.routes.ts:25-36`; `server/src/lib/rate-limit-store.ts:17-67`; `server/prisma/schema.prisma:353-363` | High |
| 34 | One API process in PM2; rate-limit counters are shared via PostgreSQL. No SSO code guard exists. | `ecosystem.config.cjs:18-24`; `server/src/lib/rate-limit-store.ts:9-16` | High |
| 35 | No callback/authorize/exchange URLs or SSO secrets. Existing EnrollPro env: `ENROLLPRO_BASE_URL`, `ENROLLPRO_SYNC_SECRET`, `ENROLLPRO_ROLE_OVERRIDES`. | `.env.example:22-26`; `server/src/services/enrollpro-auth.service.ts:1`; `server/src/services/enrollpro-sync.service.ts:6-7` | High |
| 36 | Not strictly fail-closed: if EnrollPro is unreachable, a valid cached bcrypt hash enables a 24-hour session; otherwise 503. | `server/src/routes/auth.routes.ts:128-141`; `server/src/services/offline-auth.service.ts:94-105` | High |

### 3.5 Product decisions needed from MRF

These cannot be answered from code. Recommended defaults are included for discussion.

| # | Answer | Recommendation |
|---:|---|---|
| 37 | UNKNOWN — need MRF confirmation. | Pre-provision via EnrollPro sync and deny unknown accounts (`ACCOUNT_NOT_PROVISIONED`) until sync. Add `PENDING_VERIFICATION` auto-provision only if explicitly required. |
| 38 | UNKNOWN — need MRF confirmation. | `ADMIN` must require approval; `MRF` may be auto-approved only if policy allows; `TEACHER`/`STUDENT` are not MRF SSO roles. |
| 39 | UNKNOWN — need MRF confirmation. | Keep students on `/learner/auth` until a learner SSO contract exists; require sync before login. |
| 40 | UNKNOWN — need MRF confirmation. | Use one SORT account per staff member. Do not bind a shared Admin/MRF account for per-user verification or audit. |
| 41 | UNKNOWN — need MRF confirmation. | Dedicated `/verify` page with stable machine codes; return to EnrollPro only with a plain message. |
| 42 | UNKNOWN — need MRF confirmation. | Re-verify on school-year rollover, role change, and long inactivity; make it explicit policy, not inferred state. |

---

## 4. §9.6 deliverables

### 4.1 Key code excerpts

**Local lookup and provisioning gate**

```ts
// server/src/routes/auth.routes.ts:87-106
const user = await prisma.user.findFirst({
  where: { OR: [
    { enrollproLrn: { equals: loginId, mode: 'insensitive' } },
    { employeeId: { equals: loginId, mode: 'insensitive' } },
    { email: { equals: loginId, mode: 'insensitive' } },
  ] },
});
if (!user) {
  return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
}
if (user.syncSource !== 'ENROLLPRO') {
  return res.status(401).json({ error: 'Account not provisioned. Contact your administrator.', code: 'NOT_PROVISIONED' });
}
```

**Must-change flag is not a gate**

```ts
// server/src/routes/auth.routes.ts:159-169
if (authResult.mustChangePassword) {
  mustChangePassword = true;
  await clearCachedPassword(user.id);
  console.warn(`[Auth] Login accepted ... with must-change flag ...`);
}
```

**Full session is issued anyway**

```ts
// server/src/routes/auth.routes.ts:257-265
return res.json({
  token: accessToken,
  accessToken,
  refreshToken,
  expiresIn: `${ACCESS_EXPIRY_SECONDS}s`,
  ...(mustChangePassword ? { mustChangePassword: true } : {}),
  user: safeUser(user),
});
```

**Middleware does not re-check account status**

```ts
// server/src/middleware/auth.ts:13-28
const decoded = jwt.verify(token, getJwtSecret(), { algorithms: JWT_ALGORITHMS });
(req as AuthenticatedRequest).userId = decoded.id;
(req as AuthenticatedRequest).userRole = decoded.role;
next();
```

**Sync role mapping**

```ts
// server/src/services/enrollpro-sync.service.ts:134-148
function mapRole(roles: string[]): Role {
  const r = roles.map(x => x.toUpperCase()).join(' ');
  if (r.includes('ADMIN') || r.includes('SYSTEM_ADMIN') || r.includes('HEAD_REGISTRAR') || r.includes('REGISTRAR')) return Role.ADMIN;
  if (r.includes('TEACHER') || r.includes('ADVISER') || r.includes('CLASS_ADVISER')) return Role.TEACHER;
  if (r.includes('MRF')) return Role.MRF;
  return Role.TEACHER;
}
```

### 4.2 Schema

| Model | Key columns | Notes |
|---|---|---|
| `users` | `id`, `name`, `email` unique, `passwordHash?`, `employeeId` unique, `role`, `accountStatus` default `ACTIVE`, `suspendedUntil`, `syncSource`, `enrollproId?` unique, `enrollproLrn?` unique, `enrollmentStatus?`, `portalAccountActive?`, `archivedAt?`, `passwordCachedAt?` | `server/prisma/schema.prisma:129-182`; no verification columns |
| `user_sessions` | `id`, `userId`, `refreshToken` unique, `deviceInfo`, `ipAddress`, `expiresAt`, `createdAt` | `:592-607`; no family/reuse/revocation fields |
| `audit_logs` | `actorName`, `actorRole`, `actionType`, `details`, `ipAddress`, `schoolYearId`, `createdAt` | `:645-660`; no `actorId`, severity, or result |
| `rate_limit_counters` | `key`, `totalHits`, `resetAt` | `:353-363` |

Absent models/fields:

- `verificationStatus`, `verificationMethod`, `verifiedAt`, `verifiedBy`
- `externalSubject` / `enrollproSubject`
- `CompanionSsoCode`
- `VerificationTicket`

### 4.3 Current first-time login flow

```text
1. POST /api/auth/login { identifier, password, portal? }
2. Find local User by enrollproLrn | employeeId | email.
   No local user -> 401 INVALID_CREDENTIALS. No auto-create.
3. Require syncSource = ENROLLPRO -> otherwise 401 NOT_PROVISIONED.
4. Student enrollment gate -> 403 NOT_ENROLLED when archived/not enrolled.
5. Delegate to EnrollPro /auth/login (staff) or /learner/auth (student).
6. EnrollPro unreachable -> try offline cached bcrypt hash; else 503.
7. Check suspension; auto-unsuspend if expired.
8. Portal role gate -> 403 WRONG_PORTAL.
9. Cache verified password hash (unless offline or must-change).
10. Issue access JWT (15m) + refresh token (7d), store UserSession, return JSON.
    No verification state exists; no pending-verification branch.
```

### 4.4 Proposed first-time SSO flow (not implemented)

```text
EnrollPro -> GET /api/auth/<companion>/callback?code=...&state=...
1. Server-to-server exchange the one-time code.
2. Resolve the local User by a stable external subject (does not exist yet).
3. No account -> deny ACCOUNT_NOT_PROVISIONED, or create PENDING_VERIFICATION
   only if MRF chooses auto-provisioning.
4. SUSPENDED -> deny ACCOUNT_UNAVAILABLE.
5. verificationStatus != VERIFIED -> issue a short-lived single-use
   verification ticket; redirect to /verify. Do NOT issue a SORT session.
6. Verification succeeds -> mark VERIFIED, bind externalSubject atomically
   (unique constraint + P2002 handling), revoke ticket, issue session.
7. Re-check status and verificationStatus at session bootstrap and refresh.
```

### 4.5 Exact failure

```text
$ curl.exe -i "http://localhost:5000/api/auth/enrollpro/callback?code=test&state=test"
HTTP/1.1 404 Not Found
Content-Type: text/html; charset=utf-8

<!DOCTYPE html><html><body><pre>Cannot GET /api/auth/enrollpro/callback</pre></body></html>
```

No error code, no stack trace: no route/controller exists. If the failing test used a different URL, that exact URL is still needed.

### 4.6 Test identity

The repo's E2E credentials are two staff accounts: one ADMIN and one MRF (`scripts/e2e/credentials.local.json:16`, `:21`; `DEFENSE_KIT.md:37-38`). No learner SSO identity is present. The actual identity EnrollPro sent during the failing SSO test is UNKNOWN.

### 4.7 Logs

No secret-bearing logs were collected. SORT masks identifiers in auth logs (`server/src/routes/auth.routes.ts:58-62`) and does not log passwords. This document contains no passwords, tokens, SSO codes, or secrets.

---

## 5. Handoff §11 mapping

| SMART concept | SORT equivalent | Present? | Notes |
|---|---|---|---|
| `User.username` / employee ID | `User.employeeId` unique; `User.enrollproLrn` unique; no `username` | Partial | `server/prisma/schema.prisma:134`, `:148`; login matches either plus email |
| `User.email` | `User.email` unique; learners get synthetic `lrn@sort.local` | Yes | `:132`; `server/src/services/enrollpro-sync.service.ts:697` |
| `User.role` (`TEACHER`/`ADMIN`/`REGISTRAR`) | `Role` enum `STUDENT`/`TEACHER`/`MRF`/`ADMIN` | Yes, different values | `:10-15`, `:135` |
| `User.status` (`ACTIVE`/`SUSPENDED`) | `AccountStatus` `ACTIVE`/`SUSPENDED` | Yes | `:54-57`, `:138` |
| `User.enrollproSubject` (unique) | No `externalSubject`; `enrollproId` unique nullable is a synthetic sync key | Partial/No | `:147`; `server/src/services/enrollpro-sync.service.ts:695-705`, `:723-745` |
| `Teacher.employeeId` | No separate Teacher table; `User.employeeId` on the single `User` table | Partial | `:129-134` |
| `RefreshToken` family/rotation | `UserSession` rotation; no family/reuse detection; plaintext token | Partial | `:592-607`; `server/src/routes/auth.routes.ts:322-330` |
| Access JWT 15 min | Hardcoded 15 minutes | Yes | `server/src/routes/auth.routes.ts:19` |
| Refresh token 7 days | Hardcoded 7 days; offline 24h | Yes | `server/src/routes/auth.routes.ts:20-23` |
| `CompanionSsoCode` hash/TTL/consume | None | No | No SSO models/routes |
| First-time verification state | None | No | No fields in `users` |
| Verification ticket | None | No | No endpoints |
| SSO callback endpoint | None | No | `/api/auth/enrollpro/callback` → 404 |
| SSO session bootstrap | None | No | No endpoint |
| SSO authorize endpoint | None | No | No endpoint |
| SSO exchange endpoint | None | No | No endpoint |
| Role mapping table | `mapRole` + env overrides | Yes, sync only | `server/src/services/enrollpro-sync.service.ts:134-148`, `:18-27` |
| Audit log | `AuditLog` model; only offline login writes a login audit row | Partial | `server/prisma/schema.prisma:645-660`; `server/src/routes/auth.routes.ts:242-255` |

---

## 6. Handoff §8 acceptance-test readiness

| # | Scenario | Current SORT result |
|---:|---|---|
| 1 | First SSO launch, no local account, provisioning enabled | BLOCKED — no SSO route; no provisioning state |
| 2 | First SSO launch, no local account, provisioning disabled | BLOCKED — no SSO route |
| 3 | Pre-provisioned account, verification pending | BLOCKED — no verification state |
| 4 | Verification succeeds | BLOCKED — no verification endpoint |
| 5 | Verification abandoned, relaunch | BLOCKED — no ticket/state |
| 6 | SSO code replayed | BLOCKED — no code exchange |
| 7 | Two simultaneous first-time launches | BLOCKED — no SSO |
| 8 | Already verified user launches | BLOCKED — no SSO |
| 9 | Suspended user launches | BLOCKED — no SSO |
| 10 | Role not mapped for SORT | BLOCKED — no SSO |
| 11 | Student/learner identity through companion SSO | BLOCKED — no SSO; student path is `/learner/auth` |
| 12 | Shared Admin MRF account used by two subjects | BLOCKED — no SSO; no shared-account handling |
| 13 | EnrollPro unreachable | PARTIAL — password login can use offline cache; SSO unavailable |
| 14 | Verification ticket expired/reused | BLOCKED — no ticket |
| 15 | Role/verification state changes during onboarding | BLOCKED — no SSO/verification state |
| 16 | Callback double-mount (React StrictMode) | N/A — no SSO callback page |
| 17 | Cold full-page load of authorize/verification page | N/A — no such page |
| 18 | Logs reviewed | PARTIAL — identifiers masked; no general login audit; no SSO logs |

---

## 7. Contradictions and risks to resolve

1. **Plan vs code:** `LEARNER_AUTH_IMPLEMENTATION_PLAN.md:6`, `:37-45`, `:97` says must-change staff should get `403 PASSWORD_CHANGE_REQUIRED`; `server/src/routes/auth.routes.ts:159-169`, `:257-265` issues a full session instead.
2. **Catalog vs code:** `ENROLLPRO-MRF-STUDENT-AUTH-AND-API-CATALOG.md:104-107` says `requiresPasswordReset=true` must not authorize normal entry; SORT currently authorizes it.
3. **No local password storage vs code:** `ENROLLPRO_HANDOFF_STUDENT_AUTH.md:143` says no local password storage/fallback; `server/src/services/offline-auth.service.ts:71-77` stores a bcrypt hash and accepts it when EnrollPro is unreachable.
4. **Config drift:** `.env.example:13-14` defines `JWT_ACCESS_EXPIRY` and `JWT_REFRESH_EXPIRY`, but no server code reads them; actual lifetimes are hardcoded in `auth.routes.ts:19-23`.
5. **Status revocation lag:** suspension blocks login/refresh but not an already-issued access token; middleware does not re-check the database (`server/src/middleware/auth.ts:13-28`).
6. **Shared-account risk:** if MRF uses one shared Admin/MRF account, binding a single `externalSubject` would block other staff and destroy per-user audit. Current code has no shared-account handling.

---

## 8. Recommended minimal design for SORT

1. **Add verification state** to `users` (or a `user_verifications` table):
   - `verificationStatus`: `PENDING`, `VERIFIED`, `FAILED`, `EXPIRED`
   - `verificationMethod`: `PASSWORD_SETUP`, `EMAIL`, `OTP`, `ADMIN_APPROVAL`, `NONE`
   - `verifiedAt`, `verifiedBy`
2. **Add a stable external subject** separate from `enrollproId`:
   - `externalSubject` unique, nullable
   - Bind after verification (or after a strong pre-provisioned match), inside a transaction with `P2002` handling.
3. **Create one shared gate** used by password login and SSO:

```ts
async function finishLogin(account, identitySource) {
  if (account.accountStatus === 'SUSPENDED') throw new AuthError('ACCOUNT_UNAVAILABLE');
  if (account.verificationStatus !== 'VERIFIED') {
    return { kind: 'verification_required', ticket: await issueVerificationTicket(account.id) };
  }
  return { kind: 'session', session: await issueSession(account) };
}
```

4. **Make must-change a real gate.** Return `403 PASSWORD_CHANGE_REQUIRED` or a restricted verification ticket; never issue a full session while the default password is in use.
5. **Add SSO routes only after provisioning policy is decided:**
   - callback (code exchange)
   - session bootstrap
   - authorize (reverse flow, if required)
   - exchange (reverse flow, if required)
6. **Add verification tickets:**
   - opaque random token, stored hashed
   - 10–15 minute TTL
   - single-use, bound to account + external subject + method
   - scoped only to verification endpoints
7. **Re-check status and verification** at session bootstrap and refresh; consider a DB status check in middleware.
8. **Harden sessions:**
   - hash refresh tokens
   - add rotation-family reuse detection
   - audit successful/failed logins
9. **Adopt stable error codes:**
   - `ACCOUNT_NOT_PROVISIONED`
   - `ACCOUNT_PENDING_VERIFICATION`
   - `VERIFICATION_TICKET_INVALID`
   - `VERIFICATION_FAILED`
   - `IDENTITY_CONFLICT`
   - `ROLE_NOT_ALLOWED`
   - `ACCOUNT_UNAVAILABLE`
   - `SSO_CODE_INVALID`
   - `SSO_NOT_CONFIGURED`
   - `SSO_UNREACHABLE`

---

## 9. Questions for the SMART Team AI

1. Is `enrollproId` sufficient as a future SSO subject, or must SORT add a dedicated `externalSubject` fed by the companion SSO assertion?
2. Should SORT use companion SSO at all, or keep password delegation for staff until a learner SSO contract exists?
3. What exact EnrollPro assertion fields should SORT bind on first login, and which fields are stable across school years?
4. How should SORT map `SYSTEM_ADMIN` and `MRF` into its local `ADMIN`/`MRF` roles without granting broader access than intended?
5. Should first-time verification be required for staff only, or for students as well?
6. If MRF uses a shared Admin/MRF account, should SORT reject SSO for it, or explicitly mark it as a shared/kiosk account?
7. What is the exact callback URL and test identity EnrollPro used in the failing first-time SSO attempt?
8. Does the handoff expect SORT to add verification before SSO, or is the SSO failure considered the first blocker?

---

## 10. Bottom line for the SMART Team AI

- SORT currently has **no SSO** and **no verification gate**.
- The 404 on `/api/auth/enrollpro/callback` is the first concrete blocker; it is not evidence of a verification bug.
- The second concrete blocker is that `mustChangePassword`/`requiresPasswordReset` is not enforced; SORT issues a full session.
- A safe implementation must add verification state and a shared post-identity gate **before** adding SSO routes.
- Do not copy SMART's session model blindly: SORT uses web-storage Bearer tokens, a plaintext refresh token, no rotation-family reuse detection, and no per-request DB status check.

No SORT login or SSO source code was changed during this audit.
