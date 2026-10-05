# DEFAULT BRANDING PLAN — Fresh-Deployment Identity for SORTv2

Status: IMPLEMENTED (Phases 1–5; staging runtime drills G4/G6 deferred — see `DEFAULT_BRANDING_LOG.md`)
Owner: Frontend + Server
Goal: A fresh deployment with an empty database renders a complete, intentional SORT
identity everywhere — never a blank logo area, never a fake/placeholder school name,
never another school's name on certificates — while tenant branding (EnrollPro sync or
Admin override) cleanly takes over the moment it exists.

Related docs: `UI_POLISH_PLAN.md` §2 (branding pipeline), `AI_HANDOFF_MRF_MASTER.md` Part 1 §5,
`ENROLLPRO_STRICT_MIRROR_SYNC_PLAN.md`, `UI_POLISH_LOG.md` (log convention).

---

## 0. Confirmed current behavior (so the plan is grounded)

- **EnrollPro → SORT logo flow exists and works.** The scheduler
  (`server/src/services/branding-sync-scheduler.service.ts`) calls
  `syncEnrollProBranding()` on boot and hourly. It fetches EnrollPro `/settings/public`,
  resolves colors from the palette (`pickColorsFromPalette`), downloads the logo into
  SORT's own `uploads/logo-enrollpro-sync.<ext>` (`enrollpro-branding.service.ts:107-134`),
  mounts it at `/uploads` (`server/src/index.ts:81`), persists the row via `saveBranding`,
  and broadcasts over SSE. So: **YES — a logo uploaded in EnrollPro reflects here**, after
  the first successful sync (boot or "Pull from EnrollPro").
- **The public contract** is `GET /api/settings/public` → `{ settings: PublicBranding }`
  (`server/src/routes/settings.routes.ts:25-33`), cache-first hydrated by
  `src/hooks/useTheme.tsx` and live-updated via `GET /api/settings/public/stream`.
- **"No branding yet" is currently represented inconsistently** — see the gap inventory in §3.

---

## 1. Target behavior (definition of done)

1. Fresh DB + unreachable EnrollPro + no admin edits = **SORT default branding**:
   - Wordmark/name: `S.O.R.T.` (sidebar, landing header, login mobile header, footer).
   - Logo: bundled `/SORT_LOGO.png` everywhere a logo slot exists; Lucide icon only as a
     deliberate compact fallback (collapsed sidebar).
   - Favicon: `/SORT_LOGO.png`; document title: existing `FALLBACK_TITLE`
     (`S.O.R.T. — Smart Operational Recovery & Tracking`).
   - Palette: evergreen defaults `#00271D` / `#00A77C` / `#C69B26`.
   - Optional identity rows (address, division, region, school head) render **nothing**,
     not empty shells.
2. First successful EnrollPro sync or admin save **atomically replaces** every default,
   live via SSE, with no flash of wrong branding and no stale cache.
3. A broken tenant logo URL degrades to the SORT default in the image slot, the sidebar
   tile, **and the favicon** (today the favicon stays broken).
4. Certificates never print a hardcoded school name; they use the resolved branding, with
   a neutral default header when unconfigured.
5. `enrollproPublicUrl` never defaults to a dev hub in production output.

---

## 2. Branding precedence model (single source of truth)

Resolution order, applied identically on server and client:

| Rank | Source | Where stored | Wins when |
|------|--------|--------------|-----------|
| 1 | Admin override | `system_settings` branding columns (rows written by `PATCH /api/settings`) | Field is non-empty |
| 2 | EnrollPro sync | Same row, written by `saveBranding` (colors, name, head, schoolId, region, division, logo) | Field non-empty |
| 3 | SORT defaults | Code constants (`BRANDING_DEFAULTS` on server, `defaultColors`/`DEFAULT_THEME_STATE` on client) + bundled assets | Field is empty/null |

Rules:
- **Field-level resolution** (a tenant may have a name but no logo → name + SORT logo).
- "Empty" means `null`, `undefined`, or whitespace-only — never the string `"School Name"`.
- One new server-computed flag `brandingSource: 'tenant' | 'default'` (true when *no*
  meaningful identity fields exist) so Admin UI can say "Using SORT defaults" and the
  client can log its source. `isDefaultBranding: boolean` is the back-compat alias if the
  string union feels heavy; pick one in Phase 1.

---

## 3. Gap / bug inventory (candidates for regression)

Severity: S1 = visible wrong data, S2 = inconsistent UI, S3 = hygiene.

| # | Sev | Finding | Location |
|---|-----|---------|----------|
| B1 | S1 | `BRANDING_DEFAULTS.schoolName = 'School Name'` is returned as real data. Fresh deploy shows "School Name" as the school, and title becomes "School Name \| SORT". | `server/src/services/branding.service.ts:12,111` |
| B2 | S1 | Admin save force-writes `'School Name'` when the field is cleared, so "unconfigured" is impossible to represent. | `AdminBrandingTab.tsx:158` |
| B3 | S1 | Certificate PDF hardcodes `HINIGARAN NATIONAL HIGH SCHOOL` and brand hexes — a fresh deploy prints the wrong school. | `server/src/services/certificate-pdf.service.ts:213` (+ `:142-143,160,177,187,190,221,234-246`) |
| B4 | S2 | Three different "no logo" fallbacks: bundled PNG (`SortLogo`), Lucide icon (`AppShell BrandTile`), and nothing in the favicon path. | `SortLogo.tsx:26`, `AppShell.tsx:90-99`, `useTheme.tsx:216-226` |
| B5 | S2 | Broken tenant logo → favicon stays broken forever (no onerror/reset). | `useTheme.tsx:216-226` |
| B6 | S2 | Client pre-fetch state (`schoolName: ''`) differs from server default (`'School Name'`) → flash/reflow on every load. | `useTheme.tsx:48-60` vs `branding.service.ts:12` |
| B7 | S2 | Landing/login show mixed fallbacks: PortalLogin desktop panel `schoolName || 'SORT'` but mobile line renders empty `<p>{schoolName}</p>`. | `PortalLogin.tsx:126,179` |
| B8 | S2 | `enrollproPublicUrl` defaults to a dev hub on both server and client, even in production. | `branding.service.ts:99`, `useTheme.tsx:59` |
| B9 | S3 | Theme cache is a raw `JSON.parse` cast with no version/shape validation → stale placeholder data survives deploys. | `useTheme.tsx:231-238` |
| B10 | S3 | Silent failures: `refresh()` and SSE errors are swallowed; no way to tell default vs tenant during deployment triage. | `useTheme.tsx:313-317,343-350` |
| B11 | S3 | Admin form has no "Clear / Reset to SORT defaults" action and does not display which fields are synced vs manually set; `secondaryColor` is silently pinned to accent. | `AdminBrandingTab.tsx:147-178` |
| B12 | S3 | Asset duplication/unclear canonical default: `public/SORT_LOGO.png`, `public/sort-logo.svg`, `public/favicon.svg`, root `SORT_LOGO.png`, stale `dist/`. | `index.html:5`, `public/`, repo root |
| B13 | S3 | When EnrollPro removes a logo, the old downloaded file remains and `logoUrl` is never cleared (the "never blank" policy cannot distinguish "no logo" from "download failed"). | `enrollpro-branding.service.ts:179-186` |
| B14 | S3 | `useMockData.tsx` ships a second set of branding defaults (`'School Name'`, null origin) that can disagree with `useTheme`. | `useMockData.tsx:72-83` |

---

## 4. Default branding spec (the contract to implement)

```
DEFAULT_IDENTITY = {
  schoolName:       null,                      // displayed as S.O.R.T.
  schoolAcronym:    null,
  schoolId:         null,
  division:         null,
  region:           null,
  address:          null,
  schoolHeadName:   null,
  logoUrl:          null,                      // UI resolves to /SORT_LOGO.png
  primaryColor:     '#00271D',
  secondaryColor:   '#00A77C',
  accentColor:      '#00A77C',
  goldColor:        '#C69B26',
  currentSchoolYear: <unchanged>,
  enrollproPublicUrl: '',                      // hidden when empty
  brandingSource:   'default',
}
```

Display resolution (shared pure function, §5.3):

| Slot | Tenant value | Default value |
|------|--------------|---------------|
| Sidebar / login / landing name | `schoolName` | `S.O.R.T.` |
| Compact acronym / initials | `schoolAcronym` → `schoolName` initials | `SORT` |
| Logo image | `logoUrl` (with onerror) | `/SORT_LOGO.png` |
| Sidebar collapsed tile | `logoUrl` (with onerror) | `/SORT_LOGO.png` (keep current icon tile as the code fallback if the PNG itself fails) |
| Favicon | `logoUrl` | `/SORT_LOGO.png` |
| Title | `<schoolName> \| SORT` | `S.O.R.T. — Smart Operational Recovery & Tracking` |
| Address block on login | rendered only if non-empty | hidden |
| Certificate header | `schoolName` + division/region | `S.O.R.T.` + no address line |

Canonical bundled asset: `public/SORT_LOGO.png` (already used by `index.html` and `SortLogo`).
`sort-logo.svg` / `favicon.svg` remain unused; either wire `favicon.svg` as the favicon or
delete in a hygiene pass (do not do both).

---

## 5. Implementation workstreams

### Phase 0 — Baseline + decisions (0.5 day)
- Capture baseline evidence (see Gate G0): screenshots of landing, admin login, dashboard
  sidebar with an emptied `system_settings` branding row; save console/server logs.
- Confirm the four open decisions in §10.
- Create `DEFAULT_BRANDING_LOG.md` (copy the gate table from §6) to record every gate result.
- Add the canonical favicon file decision to the log.

### Phase 1 — Server contract (0.5–1 day)
Files: `server/src/services/branding.service.ts`, `server/src/routes/settings.routes.ts`,
`server/src/services/enrollpro-branding.service.ts`, `branding-sync-scheduler.service.ts`.

1. Change `BRANDING_DEFAULTS.schoolName` to `null`; make `PublicBranding.schoolName: string | null`.
2. `toPublicBranding()` returns `null` for every empty identity text field (no placeholder).
3. Add `brandingSource: 'tenant' | 'default'` computed from the row (tenant = any of
   schoolName/logoUrl/schoolAcronym/schoolId non-empty).
4. `enrollproPublicUrl`: default `''` instead of the dev hub. Keep env fallback
   (`ENROLLPRO_PUBLIC_URL`) but only when explicitly set; reverse-navigation callers must
   hide the control when empty.
5. Log hooks (see §7):
   - `saveBranding()` logs `[Branding] Saved source=<tenant|default> fields=<keys>`.
   - `syncEnrollProBranding()` success already logs; add the resolved source to it.
   - Add a one-time boot/status log line (dedupe with a module flag) on the first
     `getPublicBranding()` call: `[Branding] Source: default (no tenant branding yet)` or
     `[Branding] Source: tenant name="..." logo=yes|no`.
6. Keep `sanitizeBrandingPatch` behavior (`'' → null`); add an explicit regression test.
7. Tests (`server/src/services/__tests__/branding.test.ts`):
   - `toPublicBranding(null)` → nulls + defaults + `brandingSource: 'default'`.
   - Whitespace-only fields → nulls.
   - Row with only a logo → `tenant`, name still null.
   - `getEnrollProPublicUrl(undefined)` → `''` (no dev URL) — assert code, not env.
   - Sanitize: `schoolName: ''` → `null`.

### Phase 2 — Client identity resolver + cache safety (1 day)
Files: new `src/utils/brandIdentity.ts`, `src/hooks/useTheme.tsx`, `index.html`.

1. New pure module `brandIdentity.ts`:
   - `resolveBrandIdentity(state): { displayName, acronym, logoSrc, isDefault, title }`.
   - `DEFAULT_BRAND_LOGO = '/SORT_LOGO.png'`; title fallback moved here (or imported).
   - Unit-testable with zero DOM.
2. `useTheme.tsx`:
   - `DEFAULT_THEME_STATE.schoolName = ''` (keep) and `enrollproPublicUrl = ''`.
   - Bump cache key to `sortv2_theme_cache_v2`; run cached payload through
     `normalizeBranding` on load (kills stale `'School Name'`).
   - `applyBrowserMetadata`: always set a favicon (tenant logo or default), reset to the
     default on `error`, and derive `type` from the extension (png default).
   - Dev-only, deduped log per commit: `[Theme] Applied source=... name=... logo=yes|no`.
   - Optional: expose `source`/`lastFetchOk` on the context (used by Admin UI and gates),
     additive only — no consumer breakage.
3. Align `useMockData.tsx` branding defaults with the server contract (nulls).
4. Tests (`src/utils/__tests__/theme.test.ts` + new `brandIdentity.test.ts`):
   - default identity resolution, tenant identity resolution, title fallback,
     favicon URL resolution + fallback, cache v2 normalization.

### Phase 3 — Surface adoption (1 day)
Adopt `resolveBrandIdentity` in: `SortLogo.tsx`, `AppShell.tsx` (`BrandTile`),
`DashboardLayout.tsx` (remove local `|| 'S.O.R.T.'`), `PortalLogin.tsx` (fix empty mobile
`<p>`, render address only when present), `LandingHeader.tsx`, `LandingFooter.tsx`.
- `BrandTile` default becomes the bundled PNG; the Lucide icon remains the on-error fallback.
- `SortLogo` image onerror already handled; route it through the resolver so the alt text
  is correct for the default brand.
- `AdminBrandingTab.tsx`:
  - Show a "Using SORT defaults" banner with `brandingSource`.
  - Add "Reset to SORT defaults" (confirm dialog) which PATCHes nulls for identity fields.
  - Stop substituting `'School Name'` on save.
  - Add `secondaryColor` field or document the intentional pin to accent.

### Phase 4 — Certificate branding (0.5 day)
File: `server/src/services/certificate-pdf.service.ts` (+ 3 call sites:
`certificate.routes.ts:150`, `user.routes.ts:413,471`).
- Extend `CertificateData` with optional branding (schoolName, region, division) **or**
  load `getPublicBranding()` inside `generateCertificatePDF` (preferred: call sites stay
  unchanged; make it injectable for tests).
- Replace hardcoded `HINIGARAN NATIONAL HIGH SCHOOL` with the resolved name; default to
  `S.O.R.T.` when `brandingSource === 'default'`.
- Replace hardcoded brand hexes with the resolved colors where they are branding
  (frame/banner), keeping gold ornament constants if the design requires.
- Test: generated PDF text buffer does **not** contain `HINIGARAN`; contains configured
  name; contains `S.O.R.T.` when unconfigured. (PDF text extraction: assert on the raw
  generated buffer via the same text-drawing inputs, or stub the branding and snapshot the
  header strings by exposing a small pure `resolveCertificateHeader(branding)` helper —
  implement the helper to keep the test dependency-free.)

### Phase 5 — Fresh-deploy verification + docs (0.5 day)
- Run the §8 simulation runbook end-to-end.
- Document `ENROLLPRO_PUBLIC_URL`/`ENROLLPRO_URL` in `POSTGRES_SETUP.md` or the deploy notes.
- Update `UI_POLISH_PLAN.md` §2 status and append the results to `DEFAULT_BRANDING_LOG.md`
  and `UI_POLISH_LOG.md`.

### Phase 6 — Optional (explicitly out of scope until requested)
- Admin logo upload endpoint (multipart) writing to `uploads/`, with size/type validation
  and a delete-previous hook; would add a dependency (e.g. `multer`) — needs approval.
- Clearing the EnrollPro logo when upstream removes it (distinguish "no logo" vs
  "download failed" via `logoPresent: false`).

---

## 6. Gates (run in order; record results in DEFAULT_BRANDING_LOG.md)

| Gate | When | Command | Pass criteria | Log evidence |
|------|------|---------|---------------|--------------|
| G0 Baseline | before edits | `npm run verify` + manual screenshots with emptied branding row | all pass; baseline captured | baseline file list in log |
| G1 Server contract | after Phase 1 | `npm --prefix server run test:branding` | new + existing tests green | test output saved |
| G2 Client unit | after Phase 2 | `npm run test:unit` | `theme.test.ts` + `brandIdentity.test.ts` green | test output saved |
| G3 Static | after each phase | `npm run lint` && `npm run build` && `npm --prefix server run build` | zero errors | command output |
| G4 Fresh runtime | after Phase 2 | §8 runbook: empty DB, no EnrollPro | API returns nulls + `brandingSource:"default"`; console shows `[Branding] Source: default`; UI shows SORT logo/name/title/favicon | server console line + curl output + screenshot |
| G5 Tenant runtime | after Phase 3 | seed via `PATCH /api/settings` (admin token) | SSE updates live, name/logo/colors swap, favicon + title update, `brandingSource:"tenant"` | SSE frame + screenshot |
| G6 Failure drill | after Phase 3 | point `ENROLLPRO_URL` at an unreachable host; run Pull | old branding kept; warning log; no broken images | `[Branding] EnrollPro sync failed (keeping last-known branding)`; broken-logo URL drill shows favicon fallback |
| G7 UI regression | after Phase 3 | `npx playwright test tests/ui/regression.spec.ts tests/ui/mobile-nav.spec.ts` + new `tests/ui/branding-default.spec.ts` (routes via `page.route` to serve default/tenant/broken-logo payloads) | default SORT wordmark; tenant wordmark; broken logo → fallback in img slot AND favicon | Playwright report |
| G8 Certificate | after Phase 4 | `npm --prefix server run build` + the Phase 4 test | no `HINIGARAN`; configured name present; SORT default present | test output |
| G9 Full verify | end | `npm run verify` | end-to-end green (lint, build, unit, server build, atlas, branding, offline-auth, auth smoke, atlas smoke/audit, UI) | full output archived |

G4–G6 are the "logs catch the bugs" gates: each has a named console line and an API
assertion, so a silent fallback failure cannot slip through.

---

## 7. Log checkpoint catalog

Server (`console`):
- `[Branding] Source: default (no tenant branding yet)` — first public fetch when unconfigured.
- `[Branding] Source: tenant name="<name>" logo=yes|no` — first public fetch when configured.
- `[Branding] Saved source=<tenant|default> fields=<comma-keys>` — every `saveBranding`.
- `[Branding] Synced from EnrollPro: <p>/<s>/<a>[ + logo]` — existing, keep.
- `[Branding] EnrollPro sync failed (keeping last-known branding): <err>` — existing, keep.
- `[Branding] Logo download failed (keeping previous logo): <err>` — existing, keep.
- Audit log row `BRANDING_SYNC` — existing, keep; extend to manual saves
  (`settings.routes.ts` PATCH) with `BRANDING_UPDATED` naming.

Client (dev-only, deduped, never in production build output):
- `[Theme] Applied source=default|tenant name="..." logo=yes|no cache=hit|miss`.
- A failed `refresh()` in dev: `[Theme] Refresh failed; keeping cached brand (<status>)`.

Rule: no secrets, no full payloads; names only.

---

## 8. Fresh-deployment simulation runbook (Gate G4/G5/G6)

1. Back up: `copy server/prisma/dev.db`-equivalent is not applicable (Postgres) — instead
   snapshot the branding row: `SELECT * FROM system_settings WHERE id='default_setting';`
   and save branding-relevant columns.
2. Null the branding columns (schoolName, schoolAcronym, schoolId, division, region,
   address, schoolHeadName, logoUrl, enrollproPublicUrl) — keep operational settings.
3. Start server (`npm --prefix server run dev`) with `ENROLLPRO_URL` pointing at a dead
   host/port to simulate "no EnrollPro".
4. Assert in order:
   - Console: `[Branding] Source: default (no tenant branding yet)` (once).
   - `curl http://localhost:5000/api/settings/public` → schoolName null, logoUrl null,
     `brandingSource:"default"`, colors = defaults.
   - `npm run dev` UI: sidebar shows SORT logo + `S.O.R.T.`; landing/login/footer same;
     tab title = fallback; favicon = SORT mark; no empty `<p>` on login mobile; no dev URL
     rendered anywhere.
   - LocalStorage `sortv2_theme_cache` (old key) must be ignored; new `_v2` key populated.
5. Gate G5: PATCH a synthetic tenant (`schoolName:"Test NHS"`, `primaryColor:"#861313"`,
   `logoUrl` = a tiny valid data URL or `/SORT_LOGO.png` temporarily), assert SSE live
   update, then PATCH nulls back and assert the default identity returns (proves both
   directions).
6. Gate G6: with tenant branding set, break `logoUrl` via PATCH to
   `/uploads/does-not-exist.png`; assert img falls back to SORT mark and the favicon
   resets (hard reload).
7. Restore snapshot; confirm the original tenant branding returns live.

---

## 9. Regression risk matrix

| Risk | Mitigation | Gate |
|------|------------|------|
| Payload shape change (`schoolName: null`) breaks a consumer | `readString` already null-safe on client; grep all `schoolName` consumers before Phase 1; type-check at G3 | G1–G3 |
| Stale localStorage placeholder survives the fix | cache key v2 + normalize on load | G4 |
| Certificate output changes break a snapshot/format test | pure header resolver + explicit tests; visual check one PDF | G8 |
| Favicon mutation conflicts with `index.html` link | explicit default assignment + onerror reset; test both states | G2, G7 |
| Admin save nulls break the settings PATCH | `sanitizeBrandingPatch` already maps `'' → null`; add upsert test | G1 |
| Sync flashes defaults over tenant on cold boot | cache-first paint + "never regress to defaults on fetch failure" already in place; keep and test | G6 |
| EnrollPro logo file missing after container rebuild (`uploads/` volume) | document volume persistence; on missing file the UI falls back gracefully | G4/G7 |
| StrictMode double effects double logging/hydration | dev log dedupe per commit; refresh is idempotent | G2 |
| Losing last-known branding on sync failure | invariant unchanged: no patch on failure | G6 |

Rollback: all phases are additive to a single settings row. Revert = restore the saved
branding columns (step 1 of §8) and `git revert` the phase commits; cache key bump makes
client recovery automatic. No migration is required (unless Phase 6 is approved).

---

## 10. Open decisions (need confirmation before Phase 1)

1. Default display name: `S.O.R.T.` (recommended) vs "SORT" vs "Smart Operational Recovery
   & Tracking".
2. Favicon default: keep `SORT_LOGO.png` (recommended, zero churn) vs switch to
   `favicon.svg`.
3. Certificate header when unconfigured: `S.O.R.T.` alone (recommended) vs
   "Republic of the Philippines / Department of Education" generic header only.
4. `enrollproPublicUrl` empty default: hide any "back to EnrollPro" control (recommended)
   vs show it disabled.
5. Should the admin "Reset to SORT defaults" be included in this pass (recommended) or
   deferred to the optional upload work?
