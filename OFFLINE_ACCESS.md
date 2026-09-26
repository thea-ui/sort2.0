# Offline Access — Operating SORT During an EnrollPro Outage

SORT delegates all credential verification to **EnrollPro**. When EnrollPro is
unreachable, SORT fails closed by default: every fresh sign-in returns
`503 AUTH_SERVICE_UNREACHABLE`. This document is the runbook for keeping the
school working through an outage — and for preparing before the next one.

---

## 1. What still works during an outage (no action needed)

| Area | Behaviour |
|---|---|
| **Already signed-in users** | Fully working. Tokens are verified locally (HS256) and refreshed against SORT itself, so an open session keeps working for up to 7 days. |
| Reports, walk-ins, points, market, rewards, certificates, bin map | Fully local — unaffected. |
| ATLAS campus map | Separate system — unaffected. |
| EnrollPro sync | Fails safely: a FAILED/PARTIAL log is written and **no local data is touched**. |
| Branding, school years, terms | Last-known values are served from SORT's own database. |
| Login page | Shows an amber **"EnrollPro is offline"** notice explaining the situation. |

**The only thing an outage blocks is a *fresh* login.**

---

## 2. Recovery tools (in order of preference)

### Tool A — Offline PIN (normal, planned recovery)

Best when you saw the outage coming, or when an admin is already signed in and
can arm it.

**Before an outage — every user should do this once:**

1. Sign in normally (EnrollPro reachable).
2. Open the profile menu → **Offline PIN** (admin/MRF: the key icon in the
   sidebar footer).
3. Set a 6–8 digit PIN. It is stored only as a bcrypt hash; it is **not** your
   EnrollPro password and is ignored while EnrollPro is online.

**During an outage — an administrator arms it:**

Admin → Settings → **School & Sync** → **Sync & Integrations** →
*Break-glass offline sign-in* → choose 1/8/24/72 hours → **Arm offline sign-in**.

Then users sign in with their usual LRN / Employee ID and their **offline PIN**
in the password field. Their session is marked *Offline mode*.

**If a user forgot or never set a PIN**, an admin signed in with a break-glass
session can provision one for them:

```
POST /api/offline-auth/pin/:userId     { "pin": "482913" }
```

### Tool A2 — Bulk PIN assignment (nobody has PINs yet)

The chicken-and-egg case: an outage hits before anyone set a PIN, so nobody can
sign in to set one. With server/DB access, assign PINs to a whole cohort:

```powershell
# See who is affected, change nothing
npm --prefix server run assign:pins -- --role STUDENT --dry-run

# Unique random PIN per account, written to a distributable CSV
npm --prefix server run assign:pins -- --role STUDENT --out pins-students.csv

# Or one shared temporary PIN for the cohort (fastest to announce, weaker)
npm --prefix server run assign:pins -- --role TEACHER --pin 246810

# Staff only, or everyone
npm --prefix server run assign:pins -- --role TEACHER,MRF,ADMIN
npm --prefix server run assign:pins -- --all --out pins-all.csv

# A single person
npm --prefix server run assign:pins -- --identifier 1234501 --pin 482913
```

PINs are stored bcrypt-hashed and **cannot be read back** — keep the CSV safe,
distribute, then destroy it. Users sign in with their usual LRN / Employee ID
and the assigned PIN. Remember to arm the fallback first (Tool A).


### Tool B — Emergency session script (operator is locked out)
Use when **nobody** can sign in and you have server/DB access.

```powershell
# List eligible accounts (employee IDs visible)
npm --prefix server run emergency:session -- --list

# Mint a real 72h session for an admin account
npm --prefix server run emergency:session -- --id 1234501 --hours 24
```

Paste the printed snippet into the browser DevTools console on the SORT origin.
You are signed in. Once inside, arm the offline PIN fallback (Tool A) and
provision PINs for anyone who needs access.

Refuses non-provisioned, suspended, archived, and not-enrolled accounts. Every
mint writes an `OFFLINE_SESSION_MINTED` row to `audit_logs`.

### Tool C — Environment boot override (last resort)

When you cannot reach the UI at all, add to `server/.env` and restart:

```env
OFFLINE_AUTH_ENABLED="true"
OFFLINE_AUTH_HOURS="24"     # optional, 1-72, defaults to 72
```

The fallback arms itself at boot. The 72 h cap and auto-revert still apply.

---

## 3. Security model (why this is safe)

- **No EnrollPro password is ever stored.** `offline_pin_hash` is a separate,
  SORT-local bcrypt (cost 12) credential.
- **Offline auth must be explicitly armed** by an admin, and only runs while
  EnrollPro is genuinely unreachable. A definitive `401` from EnrollPro never
  falls through to the PIN.
- **Time-boxed**: maximum 72 hours, enforced on every login and refresh.
- **Auto-reverts**: a 5-minute scheduler disables the fallback after EnrollPro
  has answered successfully **twice in a row**.
- **Disabling revokes immediately**: every `BREAK_GLASS` session is deleted.
- **Break-glass sessions are limited**: they carry an `offline` claim, cannot
  set their own PIN, and stop refreshing once the window closes.
- **Brute force is bounded**: 5 failed PIN attempts lock that account out of
  the fallback for 15 minutes, on top of the normal login rate limiter.
- **Audited**: every attempt → `offline_auth_logs`; arm/disarm and admin PIN
  provisioning → `audit_logs`.

---

## 4. Sync safety during and after an outage

The sync engine will not damage the roster when EnrollPro misbehaves:

- A **fully unreachable** EnrollPro produces a `FAILED` run with zero writes.
- An HTTP **200 with an empty roster** is treated as **suspect**: reconciliation
  is withheld, the run is reported `PARTIAL`, and the log says
  `EMPTY_ROSTER_SUSPECTED`. Nothing is archived.
- Learner/faculty reconciliation is also withheld when the active school-year
  context is unavailable (their rosters are school-year scoped).
- Offline demo accounts (`OFFLINE_DEMO`) are never purged.

When an empty roster is genuinely expected (e.g. a brand-new school year),
override explicitly:

```powershell
npm --prefix server run sync:enrollpro -- --allow-empty
# or: POST /api/sync/enrollpro { "allowEmpty": true }
```

---

## 5. Verification

```powershell
npm --prefix server run test:sync-guard     # roster/purge guard unit tests
npm --prefix server run test:offline-auth-unit
npm --prefix server run test:offline-auth   # 23-check end-to-end suite
npm run verify                              # full gate
```

The offline smoke suite creates its own fixture account and always restores
state (fallback disabled, fixture removed, audit noise cleaned). If it reports
**PENDING (rate limited)**, a previous run inside 15 minutes exhausted the login
rate-limit budget — re-run after the window.

---

## 6. Quick troubleshooting

| Symptom | Cause | Action |
|---|---|---|
| Login returns `503 AUTH_SERVICE_UNREACHABLE` | Fallback not armed | Arm it (Tool A/B/C) |
| Login returns `401 OFFLINE_PIN_INVALID` | Fallback armed, but no/wrong PIN | Set the PIN while signed in, or admin-provision it |
| Login returns `401 OFFLINE_PIN_LOCKED` | 5 failed attempts | Wait 15 minutes |
| Login returns `401 OFFLINE_AUTH_DISABLED` | Window closed/expired | Re-arm if the outage continues |
| Session silently signed out | Refresh token definitively rejected | Sign in again once EnrollPro returns |
| Sync log says `SKIPPED_RECONCILIATION` | Empty/unscoped roster | Expected protection; use `--allow-empty` only if truly correct |
