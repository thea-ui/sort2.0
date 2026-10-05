# DEFAULT BRANDING — IMPLEMENTATION LOG

Plan: `DEFAULT_BRANDING_PLAN.md` (owner decisions: "use recommended", 2026-09-28)
Scope delivered: Phases 1–5 (Phase 6 logo upload intentionally not started).
Verification: full `npm run verify` green (G9 below).

---

## Gate results

| Gate | Command / method | Result | Evidence |
|------|------------------|--------|----------|
| G0 Baseline | Existing suite green at plan time (`UI_POLISH_LOG.md` G5) | N/A (no pre-change run captured) | — |
| G1 Server contract | `npm --prefix server run test:branding` | PASS 11/11 → 14/14 after Phase 4 | B6–B11, B12–B14 |
| G2 Client unit | `npm run test:unit` | PASS 72/72 (8 files) | `theme.test.ts` 16, `brandIdentity.test.ts` 5 |
| G3 Static | `npm run lint` + `npm run build` + `npm --prefix server run build` | PASS, 0 errors (114 pre-existing warnings, one unused import cleaned) | builds listed in G9 |
| G4 Fresh runtime | Unit + Playwright stub; live endpoint read | PARTIAL (see deviations) | `/api/settings/public` returned `brandingSource:"tenant"` on the new code |
| G5 Tenant runtime | Playwright tenant test + live endpoint | PASS | `branding-default.spec.ts` "tenant branding" |
| G6 Failure drill | Playwright broken-logo abort route | PARTIAL (see deviations) | "broken tenant logo" test |
| G7 UI regression | `npx playwright test tests/ui/branding-default.spec.ts` | PASS 4/4 | fresh / tenant / broken logo / legacy cache |
| G8 Certificate | Branding suite B12–B14 | PASS | no HINIGARAN; tenant name/region/address/serial; shiftHex clamps |
| G9 Full verify | `npm run verify` | PASS end-to-end | lint 0 errors; build; 72 unit; server build; 15 atlas; 14 branding; 3 offline-auth; 23/23 auth; 21/21 atlas smoke; 31/31 audit; 41 passed / 2 skipped UI |

UI suite note: the previously tracked `base-map.spec.ts:87` flake did **not** reproduce in this run (all 43 specs listed, 2 pre-existing skips).

---

## Log checkpoints shipped

Server:
- `[Branding] Source: default (no tenant branding yet)` — one-time, first public fetch when unconfigured.
- `[Branding] Source: tenant name="..." logo=yes|no` — one-time, first public fetch when configured.
- `[Branding] Saved source=<tenant|default> fields=<keys>` — every `saveBranding` (admin save + sync).
- `[Branding] Synced from EnrollPro: ... (source=tenant|default)` — extended existing line.
- Existing failure lines unchanged: `[Branding] EnrollPro sync failed (keeping last-known branding)`, `[Branding] Logo download failed (keeping previous logo)`.

Client (dev-only, deduped):
- `[Theme] Applied source=... name="..." logo=tenant|default cache=hit|miss`.
- `[Theme] Refresh failed; keeping cached brand <err>`.

---

## Deviations from the plan (all additive, no scope removal)

1. **Legacy placeholder normalization added (B11).** Existing deployments may already have
   `'School Name'` persisted by the old admin save. `toPublicBranding`/`hasTenantIdentity`
   now treat that literal (case-insensitive, trimmed) as unset — no data migration needed.
2. **Live logo retry added.** `SortLogo` and `AppShell BrandTile` reset their image-failure
   state when `logoUrl` changes, so an SSE sync after a failed load retries instead of
   sticking on the fallback.
3. **`enrollproPublicUrl` default removed** (server + client). No reverse-navigation control
   exists yet; when one is added it must hide on empty (documented in README/POSTGRES_SETUP).
4. **Certificate branding is injectable.** `generateCertificatePDF(data, brandingOverride?)`
   loads `getPublicBranding()` by default; the pure `resolveCertificateHeader()` +
   `shiftHex()` cover tests without a DB. Serial prefix now derives from school initials
   (`SORT-BSNHS-...`), and the conferred line drops the location when unconfigured.
   Gold ornament shades are derived from the tenant gold (default output shifts by a few
   RGB units on decorative hairlines only; frame/ribbons/title follow tenant colors exactly).
5. **G4 empty-DB drill deferred to staging.** The live dev DB currently carries a real
   tenant (Hinigaran, EnrollPro-synced), so nulling it was not done locally. The default
   path is covered by B6/B7 unit tests and the Playwright default/broken-logo/cache tests;
   run `DEFAULT_BRANDING_PLAN.md` §8 on staging for the live drill.
6. **G6 server sync-failure drill deferred.** The failure path is unchanged code and its
   warning log already existed; the local DB row can override `ENROLLPRO_URL`, so a
   deterministic dead-host drill needs a staging DB. UI degradation is covered by G7.

---

## Incident 2026-09-28 — "Reset to SORT defaults" failed with Prisma validation

**Symptom:** clicking Reset in Admin → Branding returned
`Invalid prisma.systemSetting.upsert() invocation ... Expected String, provided null`.

**Root cause:** `system_settings.school_name` was `String @default("School Name")` — non-nullable —
while the reset intentionally sends `schoolName: null` (the new "unconfigured" contract).

**Fix:**
- Schema: `schoolName String?` (default removed) — `server/prisma/schema.prisma:377`.
- New migration `20260928100000_branding_nullable_school_name` (DROP NOT NULL + DROP DEFAULT),
  applied with `prisma migrate deploy` (production-safe) and client regenerated.
- Verified with a transaction-rollback drill: null write succeeded and the original value
  (`HINIGARAN NATIONAL HIGH SCHOOL`) was restored — no data changed.
- Server restarted; boot logs show the new checkpoints and EnrollPro re-synced tenant branding.

**Operational warning:** `npx prisma migrate dev` currently detects drift — a migration
(`20260920160000_kilo_leaderboard`) exists in the dev DB but is missing from
`server/prisma/migrations/`. It offers to **reset the database**. Do NOT accept. Use
`npx prisma migrate deploy` (after adding the missing migration folder) until the history is
reconciled.

**Note:** EnrollPro branding sync runs on boot and hourly, so a local reset is overwritten by
the next successful sync. To keep SORT defaults, clear/omit branding upstream in EnrollPro.

---

## Incident 2026-09-28 — Pulled logo did not change (stale image cache)

**Symptom:** after pulling new school branding from EnrollPro, name/colors/ID updated but the
logo stayed the old one.

**Root cause:** EnrollPro serves logos from a stable URL
(`/uploads/a7ee6572-....png`) whose bytes are replaced in place. SORT downloaded the new bytes
(log showed `+ logo`, file mtime updated) but saved them to a **fixed filename**
`logo-enrollpro-sync.png`, so the public URL never changed. `/uploads` is served with
`Cache-Control: max-age=1h` (`server/src/index.ts:81`), so the browser kept showing the old
image for the unchanged URL.

**Fix (`server/src/services/enrollpro-branding.service.ts`):**
- Content-addressed filenames: `logo-enrollpro-sync-<sha1-10>.<ext>` — new bytes => new URL.
- Unchanged bytes => no rewrite (same URL, cache stays valid).
- Stale synced logo files (legacy fixed name + older hashes) are deleted after a successful
  download; only `logo-enrollpro-sync*` files are touched.
- Empty payload rejected; SSRF guard and content-type checks unchanged.
- Test B15 covers deterministic, content-sensitive filenames.

**Verification:** server build + branding suite 15/15; `tsx watch` reloaded, boot sync wrote
`logo-enrollpro-sync-3d17b73c96.png`, deleted the legacy file, and the live
`/api/settings/public` now returns the hashed URL with the new school/palette.

---

## Files changed

Server:
- `server/prisma/schema.prisma` + `server/prisma/migrations/20260928100000_branding_nullable_school_name/`
  — `school_name` nullable, placeholder default removed.
- `server/src/services/branding.service.ts` — null defaults, `brandingSource`, legacy
  placeholder filter, empty `enrollproPublicUrl`, source/save logs.
- `server/src/services/enrollpro-branding.service.ts` — source in sync log, unused import
  removed, content-addressed logo filenames + stale-file cleanup.
- `server/src/services/certificate-pdf.service.ts` — branding-driven header/colors/serial.
- `server/src/services/__tests__/branding.test.ts` — B6–B14.

Client:
- `src/utils/brandIdentity.ts` — NEW resolver + default identity constants.
- `src/hooks/useTheme.tsx` — cache v2 + coercion, favicon probe/fallback, `brandingSource`,
  dev logs, empty origin default.
- `src/components/common/SortLogo.tsx`, `src/components/layout/AppShell.tsx`,
  `src/components/layout/DashboardLayout.tsx`, `src/components/auth/PortalLogin.tsx` —
  resolver adoption + retry on logo change.
- `src/pages/admin/components/settings/AdminBrandingTab.tsx` — "Using SORT defaults"
  banner, reset-to-defaults action, null-on-clear save, preview fallback.
- `src/hooks/useMockData.tsx`, `src/types/index.ts` — defaults/type aligned to null contract.
- `src/utils/__tests__/brandIdentity.test.ts` — NEW; `src/utils/__tests__/theme.test.ts` extended.
- `tests/ui/branding-default.spec.ts` — NEW (4 specs).

Docs:
- `README.md`, `POSTGRES_SETUP.md` — `ENROLLPRO_PUBLIC_URL` documented.
- `DEFAULT_BRANDING_PLAN.md` — status flipped.

---

## Remaining / follow-ups

- [ ] Run plan §8 fresh-deploy drill on staging (empty branding row + dead EnrollPro) and
      attach the `[Branding] Source: default` console capture here.
- [ ] Phase 6 (optional): admin logo upload endpoint (needs approval + dependency).
- [ ] When a "back to EnrollPro" control is built, hide it when `enrollproPublicUrl === ''`.
