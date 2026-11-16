# PWA_PLAN.md — Installable SORT for Student, Teacher, Admin, and MRF

Status: **Implemented (Phases 0–4, 6) — Phase 5 shortcuts intentionally deferred**
Date: 2026-11-16
Scope owner: SORTv2
Mode: **Online-only** (no offline writes, no offline queue, no background sync)

### Implementation log (2026-11-16)

- Added `vite-plugin-pwa` 2.0 (generateSW, prompt updates) + generated icon set
  in `public/pwa/` from `public/sort-logo.svg`.
- Dynamic manifest + Apple icon routes:
  `GET /api/settings/public/manifest.webmanifest`,
  `GET /api/settings/public/apple-touch-icon.png`.
- Tenant install icons generated from the synced EnrollPro logo (`sharp`,
  `uploads/pwa/<logoHash>/`); default SORT icons remain the fallback.
- Install surfaces: student/teacher sidebar + mobile card/profile menu,
  Admin/MRF sidebar + More-sheet row. One visible control per viewport.
- Manual update prompt and offline banner mounted in `PwaRuntime`; service
  worker is production-only and deferred after first paint.
- Guards added: `npm run pwa:validate`, `npm run pwa:smoke`,
  `npm run test:pwa`, dev service-worker isolation spec.
- Verified locally: lint, build, 167 unit tests, 99 server tests, auth/ATLAS
  smokes, full UI suite, 34 PWA Playwright tests (4 desktop iOS-instruction
  tests skipped by design), and 5/5 `pwa:smoke` checks.
- Known limitation: tenant icons appear after the next EnrollPro branding sync;
  tenants whose logo synced before this change keep the default SORT install
  icons until then. Phase 5 shortcut deep links (`?tab=`) are not shipped.

---

## 0. Executive summary

Make SORT installable from the browser on every device for all four roles
(`STUDENT`, `TEACHER`, `ADMIN`, `MRF`), with tenant branding from the existing
EnrollPro sync, a controlled install entry point per role, and a safe update
flow.

What this plan builds:

1. A web app manifest generated from the live EnrollPro-synced branding
   (name, short name, theme color, tenant icons when available).
2. A Workbox service worker that precaches only the static app shell and
   navigation fallback. It never caches `/api` responses.
3. Install entry points in the correct place for each role and viewport:
   desktop sidebars, student/teacher profile menu + mobile home card,
   Admin/MRF mobile "More" sheet.
4. A manual "new version available" prompt and a global offline banner.
5. A gate system (build, unit, server, Playwright per role, deploy smoke,
   log checks) with anti-regression invariants enforced as tests.

Explicitly **not** built: offline report submission, IndexedDB outbox,
Background Sync, API response caching, push notifications, native wrappers.

Why this shape: the app is already a single-entry SPA with localStorage-backed
display and offline-auth fallbacks. We are adding **installability and shell
caching**, not a new offline data model. This keeps the change small and the
regression surface controlled.

---

## 1. Codebase scan findings (evidence for this plan)

These findings drive the design; they are not assumptions.

### 1.1 App shell and routing

- `src/App.tsx` is a single entry with lazy role dashboards selected from
  `currentUser.role` (`STUDENT`, `TEACHER`, `MRF`, `ADMIN`).
- `src/hooks/usePathRoute.ts` supports only `/`, `/admin`, `/mrf`,
  `/reports/print`. Dashboard tabs are React state, not URLs.
- Therefore a Workbox `navigateFallback: '/index.html'` is safe and preserves
  all deep links. No route-level SW rewrites are needed.
- `src/App.tsx` already has `ErrorBoundary` and `RouteFallback`; PWA code must
  never become a boot dependency.

### 1.2 Role shells and exact install insertion points

| Role | Shell | Desktop sidebar | Mobile navigation |
|---|---|---|---|
| `STUDENT` | `src/components/layout/StudentLayout.tsx` | custom `<aside>` footer (lines ~202–229, eco-points card) | 5-item bottom nav + header profile menu |
| `TEACHER` | same `StudentLayout` | same footer (Faculty card variant) | same bottom nav + profile menu |
| `ADMIN` | `src/components/layout/DashboardLayout.tsx` → `src/components/layout/AppShell.tsx` | `AppShell` sidebar footer (`ShellNavFooter`, lines ~483) | `MobileBottomNav` (4 items + More) + `MobileNavSheet` |
| `MRF` | same `DashboardLayout`/`AppShell` | same | same |

Important contracts already enforced by tests:

- Student/Teacher bottom nav has exactly 5 buttons; Admin/MRF has 4 + "More".
  `tests/ui/mobile-nav.spec.ts` asserts the bottom-bar and sheet behavior.
- Desktop sidebars collapse 280px ↔ 70px; install UI must support icon-only.
- `AppShell` is presentational; branding/auth wiring lives in
  `DashboardLayout`. A new optional render-prop slot is the least invasive way
  to add a role-wide sidebar action.

### 1.3 Branding pipeline (already exists, must be reused)

- Server: `server/src/services/enrollpro-branding.service.ts` fetches EnrollPro
  branding hourly, downloads the logo to `uploads/`, and persists fields via
  `branding.service.ts` (`PublicBranding` contract).
- Public API: `GET /api/settings/public` and SSE
  `GET /api/settings/public/stream` in `server/src/routes/settings.routes.ts`.
- Client: `src/hooks/useTheme.tsx` fetches, caches in
  `localStorage.sortv2_theme_cache`, applies CSS variables, updates
  `document.title`, and swaps the favicon.
- **Favicon caveat found during scan:** `setFavicon()` uses
  `document.querySelector("link[rel*='icon']")`. The selector also matches
  `rel="apple-touch-icon"`. If we add an apple-touch-icon before the favicon,
  theme updates can overwrite the apple icon. This must be fixed as part of
  Phase 1 and guarded by a test.
- `src/utils/brandIdentity.ts` is the single source for display name, acronym,
  logo source, and page title. Reuse it; do not add local fallbacks.

### 1.4 Existing "offline" behavior (not to be expanded)

- `src/hooks/useMockData.tsx` falls back to localStorage when the API is down
  and polls for reconciliation.
- Offline auth exists in `server/src/services/offline-auth.service.ts` and is
  surfaced by `src/hooks/useAuthState.ts`.
- Decision: leave these untouched. PWA must not add offline writes or claim
  offline data support. The offline banner is informational only.

### 1.5 Test architecture and gates today

- `package.json` `verify` = lint + build + unit + server build/services +
  auth smoke + atlas smoke/audit + `test:ui`.
- Playwright (`playwright.config.ts`): Chromium only, dev server at 5174,
  `seedSession(page, role)` helper mints sessions for all four roles via
  `scripts/e2e/token.mjs`; tests skip when credentials are unavailable.
- `tests/ui/regression.spec.ts` already enforces per-role console/pageerror
  cleanliness.
- `tests/ui/resource-guard.spec.ts` enforces API polling and localStorage
  write budgets; PWA registration must not violate these.
- Vitest is node-environment, frontend pure logic only
  (`src/**/*.test.{ts,tsx}`). Hooks with DOM must be split into pure helpers
  or tested in Playwright.
- Server service tests run with `node --import tsx --test` and auto-pick files
  matching `server/src/services/__tests__/*.test.ts`.

### 1.6 Deployment reality

- `server/docs/DEPLOYMENT.md` and `ecosystem.config.cjs`: the frontend `dist/`
  is served by a reverse proxy/static host; Express serves only `/api`,
  `/uploads`, `/health`.
- HTTPS is available via the Tailscale host already allowed in
  `vite.config.ts`. Service workers require HTTPS (or localhost).
- Consequence: `/sw.js` and `/pwa/*` come from the static host; the manifest can
  come from Express through the existing `/api` proxy. The static host must be
  configured with correct cache headers (section 10).

### 1.7 Constraints from AGENTS.md

- No source file may approach 1,000 lines. New PWA files must stay small and
  focused (file inventory in Appendix A).
- Use design tokens only. No new hues. Gold stays reserved for recognition.
  Offline uses universal warning amber; update/install use tenant accent.
- Verify before declaring done: lint, build, unit, server, Playwright.

---

## 2. Decisions (proposed — sign-off requested)

| ID | Decision | Recommendation | Alternative |
|---|---|---|---|
| D1 | Manifest source | Server route `GET /api/settings/public/manifest.webmanifest` built from `PublicBranding`; plugin `manifest: false` | Static build-time manifest (no tenant name) |
| D2 | Icons | Generate a default SORT icon set from `public/sort-logo.svg`; always valid fallback | Use only `SORT_LOGO.png` (no maskable safe zone) |
| D3 | Tenant icons | Phase 4: server generates 192/512/maskable/apple icons from the synced logo using `sharp`; manifest uses them when present | Default SORT icon forever (name/theme still tenant-driven) |
| D4 | Theme color | Tenant primary color, clamped to `#00271D` when too light; same rule in manifest and `<meta name="theme-color">` | Fixed `#00271D` always |
| D5 | Install CTA visibility | Only when actionable: Chromium prompt available, or iOS Safari instructions. Hidden when installed/standalone/unsupported | Always show, with generic instructions |
| D6 | Update behavior | `registerType: 'prompt'`; user clicks "Refresh"; never auto-reload | Silent auto-update (rejected: forms/data loss) |

Open questions are collected in Appendix D.

---

## 3. Architecture

### 3.1 Runtime pieces

```
index.html
  ├─ <link rel="manifest" href="/api/settings/public/manifest.webmanifest">
  ├─ theme-color / apple-touch-icon / apple-mobile-web-app-* meta
  └─ inline early capture of beforeinstallprompt (tiny, additive)

main.tsx
  └─ PwaInstallProvider
       ├─ state: event captured / installed / dismissed
       └─ hook: usePwaInstall() consumed by all install surfaces

App.tsx
  ├─ OfflineBanner          (fixed, warning amber, online-only copy)
  ├─ PwaUpdatePrompt        (manual refresh only)
  └─ existing app tree

src/pwa/registerServiceWorker.ts
  └─ registers /sw.js after first paint, production only
     (requestIdleCallback → setTimeout fallback)

Service worker (generated by Workbox)
  ├─ precache: index.html, hashed JS/CSS, fonts, SVG/PNG icons, SORT logo
  ├─ navigation fallback: /index.html (denylist /api, /uploads, /health)
  ├─ runtime cache: GET /uploads/* only (StaleWhileRevalidate, capped)
  └─ no /api/* routes, no non-GET handling, no background sync
```

### 3.2 Manifest contract

Route: `GET /api/settings/public/manifest.webmanifest`
Implementation: `server/src/services/pwa-manifest.service.ts` (pure builder) +
thin handler in `server/src/routes/settings.routes.ts`.

Response example (default branding):

```json
{
  "id": "/",
  "name": "S.O.R.T.",
  "short_name": "SORT",
  "description": "Smart Operational Recovery & Tracking",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "display_override": ["standalone", "minimal-ui"],
  "orientation": "any",
  "background_color": "#F9F3F0",
  "theme_color": "#00271D",
  "lang": "en",
  "dir": "ltr",
  "categories": ["education", "productivity"],
  "prefer_related_applications": false,
  "icons": [
    { "src": "/pwa/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/pwa/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/pwa/icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/pwa/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Field rules:

| Field | Rule |
|---|---|
| `id` | Constant `"/"`. Never changes per tenant; changing it creates a new install identity. |
| `name` | `branding.schoolName` trimmed, else `"S.O.R.T."`. Max 60 chars in builder. |
| `short_name` | `branding.schoolAcronym` trimmed, else `"SORT"`. Max 12 chars. |
| `theme_color` | `resolveManifestThemeColor(branding.primaryColor)` (D4). 6-digit hex only; invalid input → `#00271D`. |
| `background_color` | Always `#F9F3F0` (brand background token). |
| `start_url`, `scope` | Always `"/"`. Manifest is served from `/api/...`, so omitting these would create the wrong scope. |
| `icons` | Always at least one 192 and one 512 icon. Tenant icons (Phase 4) replace the default set only when files exist; maskable entries are always kept. |
| Privacy | Never include `schoolId`, `address`, `schoolHeadName`, `enrollproPublicUrl`, or integration URLs. Name/acronym/colors only. |

Caching: `Content-Type: application/manifest+json`,
`Cache-Control: public, max-age=60, stale-while-revalidate=300`.
Never respond 500 for a branding/DB failure: return the default SORT manifest
with HTTP 200 and log a throttled `[PWA] manifest fallback:` warning.

### 3.3 Icons

Default set (committed generated assets in `public/pwa/`):

- `icon-192.png` (192×192, purpose any)
- `icon-512.png` (512×512, purpose any)
- `icon-maskable-192.png` (192×192, purpose maskable, 40% safe padding)
- `icon-maskable-512.png` (512×512, purpose maskable, 40% safe padding)
- `apple-touch-icon.png` (180×180, opaque background)

Generation: `@vite-pwa/assets-generator` (dev dependency) from the existing
`public/sort-logo.svg` (512 viewBox), via `pwa-assets.config.ts`. Normalize
output filenames to the fixed names above; validate dimensions in the build
gate. Do not overwrite `public/SORT_LOGO.png` (in-app logo) or change
`public/favicon.svg`.

Phase 4 tenant icons (recommended, separable): add `sharp` to the **server**
only. When EnrollPro logo sync succeeds, generate
`uploads/pwa/<logoHash>/icon-192.png`, `icon-512.png`,
`icon-maskable-512.png`, `apple-touch-icon.png`. Manifest points to those
`/uploads/pwa/...` URLs when present. Failures fall back silently to the
default set; branding sync must still succeed. Content-hashed directory avoids
stale browser caches (same technique as the existing logo hash).

### 3.4 Service worker

Plugin: `vite-plugin-pwa` with `generateSW` (declarative Workbox config; no
custom SW file needed). Verify the current release supports Vite 8 before
implementation; fallback is `workbox-build` invoked from a small build script
with the same config (same output contract).

Config summary (`vite.config.ts`):

| Option | Value |
|---|---|
| `registerType` | `'prompt'` |
| `injectRegister` | `false` (manual registration in `src/pwa/registerServiceWorker.ts`) |
| `manifest` | `false` (dynamic API manifest is the only manifest link) |
| `workbox.globPatterns` | `**/*.{js,css,html,svg,png,ico,woff2}` |
| `workbox.maximumFileSizeToCacheInBytes` | `3 * 1024 * 1024` |
| `workbox.cleanupOutdatedCaches` | `true` |
| `workbox.skipWaiting` / `clientsClaim` | `false` / `false` |
| `workbox.navigateFallback` | `'/index.html'` |
| `workbox.navigateFallbackDenylist` | `[/^\/api\//, /^\/uploads\//, /^\/health/]` |
| `workbox.runtimeCaching` | one route: same-origin `GET /uploads/*` → `StaleWhileRevalidate`, cache `sort-uploads`, `maxEntries: 60`, `maxAgeSeconds: 604800` |
| `devOptions.enabled` | `false` (manual testing uses `vite preview`) |

Hard rules:

- No route matches `/api/*`. No non-GET strategy. No Background Sync. No
  navigation preload (Safari support/benefit is poor).
- `/api/reports/:id/photo` is authenticated and must never be cached.
- Registration code is production-only (`import.meta.env.PROD`) and wrapped in
  try/catch; failures log `console.warn('[PWA] ...')` and never throw.
- Registration is deferred until after first paint:
  `requestIdleCallback(register, { timeout: 2000 })`, fallback
  `setTimeout(register, 1500)`. Never top-level await.
- Manual `registerSW({ onNeedRefresh, onOfflineReady, onRegisteredSW, onRegisterError })`.
  `onOfflineReady` does **not** show a toast (online-only product); only
  `onNeedRefresh` surfaces the update prompt.
- In dev and test, the service worker must not register at all.

### 3.5 HTML head changes (`index.html`)

Add, in this order, and keep the existing theme pre-hydration script:

- `<link rel="manifest" href="/api/settings/public/manifest.webmanifest">`
- `<meta name="theme-color" content="#00271D">`
- `<meta name="mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-status-bar-style" content="default">`
- `<meta name="apple-mobile-web-app-title" content="SORT">`
- `<link rel="apple-touch-icon" href="/pwa/apple-touch-icon.png">`
- Update viewport to `width=device-width, initial-scale=1.0, viewport-fit=cover`
  (the app already uses `env(safe-area-inset-*)`; without `cover` those values
  are 0 on iOS. Manual iPhone check required, see gate G6.)

Extend the existing inline boot script with a tiny early capture:

```js
window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
  window.__sortPwaInstallEvent = e;
  window.dispatchEvent(new CustomEvent('sort:pwa-install-available'));
});
```

Keep it dependency-free and wrapped in try/catch. The React provider also
attaches a normal listener for events fired after boot.

Client metadata updates in `src/hooks/useTheme.tsx` `applyBrowserMetadata()`:

- set/create exactly one `<meta name="theme-color">` using the same
  `resolveManifestThemeColor` rule (shared pure helper in `src/pwa/themeColor.ts`;
  mirrored server implementation in `pwa-manifest.service.ts` and tested on
  both sides);
- set `apple-mobile-web-app-title` to the brand acronym (≤ 12 chars);
- fix `setFavicon` to select `link[rel='icon']` (not `rel*='icon'`) so it never
  overwrites the apple-touch icon;
- do not change `document.title` or existing favicon fallback behavior.

### 3.6 Client modules (new)

All install surfaces consume one hook. State is not duplicated per component.

```
src/pwa/
  installMode.ts           pure resolver: installed | prompt | ios-manual |
                           ios-other-browser | unsupported
  PwaInstallProvider.tsx   listens early event + appinstalled; exposes state
  usePwaInstall.ts         hook consumed by surfaces
  themeColor.ts            resolveManifestThemeColor(primaryColor)
  registerServiceWorker.ts production-only deferred registration
  useSwUpdate.ts           needRefresh flag + user-triggered updateSW
  useOnlineStatus.ts       navigator.onLine + online/offline events
  PwaRuntime.tsx           mounts update prompt + offline banner
  global.d.ts              window.__sortPwaInstallEvent typing
src/components/pwa/
  InstallAppButton.tsx         sidebar pill (+ collapsed icon-only)
  InstallAppMenuItem.tsx       menu row (profile menu, More sheet)
  InstallAppCard.tsx           mobile home card, dismissible per user
  InstallInstructionsDialog.tsx iOS Add to Home Screen steps
  OfflineBanner.tsx            fixed warning pill
  PwaUpdatePrompt.tsx          fixed refresh prompt
```

Install-mode matrix (pure function, unit-tested):

| Input | Result |
|---|---|
| `matchMedia('(display-mode: standalone)').matches` or `navigator.standalone` | `installed` |
| `beforeinstallprompt` event captured | `prompt` |
| iOS/iPadOS + Safari + not standalone | `ios-manual` |
| iOS/iPadOS + Chrome/Firefox/Edge iOS | `ios-other-browser` |
| everything else | `unsupported` |

CTA rules:

- `installed` and `unsupported`: render nothing.
- `prompt`: button calls `prompt()` inside the click handler, awaits
  `userChoice`, and hides on `accepted`; on `dismissed`, hide for this session
  (Chrome may refire the event later; `appinstalled` always wins).
- `ios-manual`: opens `InstallInstructionsDialog` with Share → Add to Home
  Screen steps.
- `ios-other-browser`: opens the same dialog with a "Open this page in Safari"
  note (iOS cannot install from third-party browsers).
- Desktop Firefox/older browsers: no CTA (no dead buttons).

### 3.7 Offline behavior (deliberately minimal)

- `OfflineBanner`: fixed, warning-amber, `role="status"`, `print-hide`,
  bottom placement above the mobile bottom nav; text:
  "You're offline. SORT needs a connection to load and submit changes."
  Hidden while online. No layout shift (fixed overlay, safe-area aware).
- No offline data promises, no queue, no retry engine. Existing
  `useMockData`/offline-auth behavior is unchanged.
- Workbox may still serve the cached shell on a cold offline reload; that is
  an artifact of installability, not a supported offline workflow. A
  representative Playwright test asserts the shell loads and the banner shows;
  no write path is tested offline.

### 3.8 Update behavior

- `registerType: 'prompt'`; new SW waits.
- `PwaUpdatePrompt` appears only when `onNeedRefresh` fires. Copy:
  "A new version of SORT is available." Actions: "Refresh" (calls
  `updateServiceWorker(true)`) and "Later" (dismisses for the session).
- Never call `updateServiceWorker` or `location.reload()` outside the user's
  Refresh click. No automatic reload on tab focus or interval.
- If a future "unsaved form" flag exists, Refresh can be disabled while dirty;
  current scope relies on manual intent only.

---

## 4. Install surfaces per role (exact placement)

The same control must never appear twice in one viewport. One visible install
entry point maximum per role per breakpoint.

| Role | Viewport | Surface | File(s) |
|---|---|---|---|
| `STUDENT` | Desktop ≥ 1024 | Sidebar pill above the eco-points card; icon-only button when collapsed | `src/components/layout/StudentLayout.tsx` |
| `STUDENT` | Mobile < 1024 | "Install app" item in the profile menu (topbar avatar) + dismissible card on Home | `src/components/common/ProfileMenu.tsx`, `src/pages/student/components/OverviewTab.tsx` |
| `TEACHER` | Desktop ≥ 1024 | Same sidebar pill above the Faculty card | `src/components/layout/StudentLayout.tsx` |
| `TEACHER` | Mobile < 1024 | Same profile-menu item + Home card | same as Student |
| `ADMIN` | Desktop ≥ 1024 | Sidebar action above the user footer, via new `AppShell` render-prop slot | `src/components/layout/AppShell.tsx`, `src/components/layout/DashboardLayout.tsx` |
| `ADMIN` | Mobile < 1024 | "Install app" row in the More sheet footer, above the user row | `src/components/layout/DashboardLayout.tsx` (composes `MobileNavSheet` footer) |
| `MRF` | Desktop / tablet ≥ 1024 | Same sidebar slot (tablet terminal) | same |
| `MRF` | Mobile < 1024 | Same More-sheet row | same |

Placement rules:

- Do **not** add an item to `StudentLayout`'s bottom nav (already 5 items) or
  `MobileBottomNav` (tests assert the 4 + More contract). This is a hard
  anti-regression rule.
- Student/Teacher mobile discoverability: profile-menu item is always available;
  `InstallAppCard` is shown only on the Home tab, `lg:hidden`, once per user
  until dismissed. Dismissal key:
  `sortv2_pwa_install_card_dismissed_v1_<userId>`, written through the existing
  best-effort storage helpers.
- Sidebar CTA is not dismissible (it is removed on install). Collapsed mode
  renders a 40×40 icon button with `aria-label="Install SORT app"` and a
  tooltip, matching the existing collapsed footer geometry.
- No install CTA on the public landing or login screens in this scope. Users
  install after authentication, where role context exists and the API is known
  to be reachable. Revisit only if product asks for pre-login installs.
- All controls are `<button type="button">` with explicit `aria-label`; the
  instructions dialog uses the existing `Dialog`/`AppModal` primitives and
  returns focus to the invoking control on close.

Design tokens for new UI:

- Sidebar pill/menu row: white surface, `border-[#00271D]/10`,
  `text-[var(--text-strong)]`, hover `bg-[var(--accent)]/5`,
  `rounded-xl`/`rounded-full`; icon tile `bg-[var(--accent)]/10
  text-[var(--accent)]`.
- Home card: white `rounded-2xl`, accent tint tile, dismiss `X` button.
- Update prompt: white surface, accent action button, `rounded-2xl`, shadow,
  bottom offset above mobile nav using `env(safe-area-inset-bottom)`.
- Offline banner: universal warning amber only (`--warning`), never tenant
  accent or gold.

---

## 5. Phase plan with gates

Every phase ends at a gate. A gate is a hard stop: no phase starts until the
previous gate is green. "Green" means the commands exit 0, the log checks are
clean, and the stated evidence is attached to the phase log.

### Phase 0 — Baseline and compatibility

Deliverables:

- Confirm `vite-plugin-pwa` (or chosen Workbox tooling) supports the installed
  Vite 8 / Node versions; pin the version.
- Record baseline: `npm run verify` result, `dist/` total size, existing
  service-worker registrations (expected: none), and current Lighthouse/DevTools
  manifest state (expected: no manifest).
- Create `PWA_PLAN.md` phase log entries (this document is the source of truth).

Gate G0:

```
npm run verify
```

Pass: existing suite green before any PWA change. Store the baseline output.
Failure: stop and fix the baseline first; do not build on red.

### Phase 1 — Manifest, branding endpoint, icons, head metadata

Deliverables:

- `public/pwa/*` generated icons + `pwa-assets.config.ts` +
  `scripts/pwa/generate-icons` usage documented.
- `server/src/services/pwa-manifest.service.ts` (pure builder + theme-color
  resolver).
- `GET /api/settings/public/manifest.webmanifest` in
  `server/src/routes/settings.routes.ts` with fallback manifest and throttled
  warning.
- `server/src/services/__tests__/pwa-manifest.test.ts`.
- `index.html` head changes (manifest link, theme-color, apple meta, apple
  touch icon, viewport-fit=cover, early install event capture).
- `src/hooks/useTheme.tsx`: fix favicon selector; update theme-color and
  apple title metadata; add `src/pwa/themeColor.ts` + unit tests.

Gate G1 (fast feedback):

```
npm run lint
npm run test:unit
npm --prefix server run test:services
npm --prefix server run build
```

Manual checks:

- `GET /api/settings/public/manifest.webmanifest` returns valid JSON with the
  default branding when the DB is unavailable (simulate by stopping DB or use
  the unit-tested fallback builder).
- DevTools → Application → Manifest parses with no errors; icons render.
- Existing branding tests still pass:
  `npx playwright test tests/ui/branding-default.spec.ts`.
- Specifically verify the apple-touch-icon is **not** overwritten when tenant
  branding applies.

Gate G1 log checks:

- Server log contains at most one `[Branding] Source:` line per boot.
- No `[PWA] manifest fallback` during a healthy request.
- Browser console: no new errors on landing or any role.

### Phase 2 — Service worker, update prompt, offline banner

Deliverables:

- `vite.config.ts` Workbox config (section 3.4).
- `src/pwa/registerServiceWorker.ts`, `useSwUpdate.ts`, `useOnlineStatus.ts`,
  `PwaRuntime.tsx`.
- `src/components/pwa/PwaUpdatePrompt.tsx`, `OfflineBanner.tsx`.
- Mount `PwaRuntime` in `src/App.tsx`; register from `src/main.tsx`
  (production-only, deferred).
- `scripts/pwa/validate-dist.mjs` + `npm run pwa:validate`.
- Root `public/sw.js` is generated at build, never committed.

Gate G2:

```
npm run build
npm run pwa:validate
```

Validator asserts:

- `dist/sw.js` exists, is ≤ 250 KB, and its precache list includes
  `index.html` plus the main JS/CSS entries.
- No `/api/` or `report/photo` URL appears in precache/runtime config.
- `dist/index.html` contains the manifest link, theme-color meta,
  apple-touch-icon, apple meta tags, and `viewport-fit=cover`.
- Icon files exist with exact PNG dimensions (parse the IHDR chunk in Node):
  192, 512, maskable 192, maskable 512, apple 180.
- Precache total ≤ 4 MB (adjust only with a recorded reason).
- `sw.js` has no `skipWaiting` auto-call in generated output.

Gate G2 manual:

- Serve with `npm run preview`; DevTools → Application:
  - service worker activated, scope `/`;
  - Cache Storage contains only the Workbox precache and (after visiting a
    tenant logo) `sort-uploads`;
  - no `/api` requests in any cache;
  - offline reload shows the cached shell plus the offline banner;
  - no "new version" prompt on a fresh install.

### Phase 3 — Install entry points for all four roles

Deliverables:

- `src/pwa/installMode.ts`, `PwaInstallProvider.tsx`, `usePwaInstall.ts`,
  `global.d.ts`.
- `src/components/pwa/InstallAppButton.tsx`,
  `InstallAppMenuItem.tsx`, `InstallAppCard.tsx`,
  `InstallInstructionsDialog.tsx`.
- `StudentLayout` sidebar pill + ProfileMenu item + Home card.
- `AppShell` new optional render-prop prop
  `sidebarFooterActions?: (opts: { collapsed: boolean }) => React.ReactNode`;
  `DashboardLayout` passes the install button.
- `DashboardLayout` More-sheet footer composes install row + user footer.
- Unit tests: `src/pwa/__tests__/installMode.test.ts`,
  `themeColor.test.ts`, card-dismissal helper test.
- `tests/ui/service-worker-absent.spec.ts` (dev isolation guard).

Gate G3:

```
npm run lint
npm run test:unit
npm run test:ui
```

Manual checks per role (desktop and phone): exactly one install entry point
visible, no bottom-nav changes, no layout shift, keyboard focus visible,
dialog traps focus, Escape closes and restores focus.

Gate G3 log checks: all four roles render with zero console errors and zero
unhandled page errors (the existing regression gate plus the new matrix).

### Phase 4 — Tenant-branded install identity (recommended, separable)

Deliverables:

- Add `sharp` to `server/package.json` only.
- Generate icons after a successful logo sync under
  `uploads/pwa/<logoHash>/`; clean stale hashed folders.
- Extend `PublicBranding`/manifest builder with optional icon URLs (internal
  field, not exposed on `/api/settings/public` if avoidable).
- Dynamic `apple-touch-icon` update in `applyBrowserMetadata` when tenant icons
  exist.
- Server tests for icon generation (small PNG fixture), hash rotation, failure
  fallback.

Gate G4:

```
npm --prefix server run test:services
npm run test:unit
npm run build
npm run pwa:validate
```

Plus Playwright PWA manifest test asserts tenant icon URLs when the tenant logo
is present, default icons otherwise, and that icon responses are PNG and
fetchable.

Manual: install on a real Android device; confirm the launcher icon shows the
school logo and long-press label matches the school name/short name.

### Phase 5 — Install shortcuts (optional, only after G6 is green)

Scope: manifest `shortcuts` for "Report waste" and "Bin Map", requiring a safe
`?tab=` initial-tab resolver with a per-role allowlist, validated against the
role's own nav ids. Do not implement if the risk is not justified: install can
ship without shortcuts.

Gate G5 (if implemented): unit tests for the allowlist + Playwright tests that
invalid `?tab=` falls back to Overview and never bypasses role navigation.

### Phase 6 — Release validation

Deliverables:

- `scripts/pwa/smoke.mjs` + `npm run pwa:smoke`.
- Proxy/static-host cache header configuration documented and applied.
- Manual device matrix completed (Android Chrome, iPhone Safari, desktop
  Chrome/Edge; MRF tablet).

Gate G6 (staging/production over HTTPS):

```
PWA_BASE_URL=https://<staging-host> npm run pwa:smoke
```

Smoke asserts: manifest 200 + schema + icons fetch 200 with PNG signature and
dimensions, `/sw.js` 200 + no-cache header, `/` contains the manifest link,
and no 5xx responses. Then run the manual install checklist (Appendix C) and
the log checklist (section 7.4).

---

## 6. Master gate table

| Gate | Command | Blocks | Pass criteria | Evidence |
|---|---|---|---|---|
| G0 | `npm run verify` | All phases | Baseline green | Saved output + dist size |
| G1 | `npm run lint`; `npm run test:unit`; `npm --prefix server run test:services`; `npm --prefix server run build` | Phase 2 | Manifest builder/theme tests pass; branding specs pass | Test output |
| G2 | `npm run build`; `npm run pwa:validate` | Phase 3 | SW + icons + head contract valid | Validator table |
| G3 | `npm run test:ui` + new PWA suite (Phase 3 subset) | Phase 4 | All roles, both viewports, console clean | Playwright report |
| G4 | `npm --prefix server run test:services`; `npm run build`; `npm run pwa:validate` | Phase 5 | Tenant icons + fallback green | Test output |
| G5 | `npm run test:pwa` (only if shortcuts shipped) | Phase 6 | Shortcut allowlist tests green | Playwright report |
| G6 | `npm run test:pwa`; `PWA_BASE_URL=... npm run pwa:smoke` | Release | Full PWA suite + smoke green over HTTPS | Report + smoke table |
| G7 | Log checks (section 7.4) | Release | No unhandled server errors; no unexpected `[PWA]` warnings | Log excerpt |
| G8 | Manual device matrix (Appendix C) | Release | Install + update works on Android/iOS/desktop/tablet | Signed checklist |

Package script additions (Appendix B) keep `npm run verify` as the single CI
entry point; `test:pwa` runs after the existing UI suite.

---

## 7. Error and log checks

### 7.1 Browser console/pageerror gate (every PWA test)

Helper: `tests/pwa/helpers/errors.ts` attaches:

- `page.on('console')` where `type() === 'error'`;
- `page.on('pageerror')`;
- `page.on('requestfailed')`;
- `page.on('response')` for same-origin `status >= 500`.

Allowlist (exact, keep tiny):

- favicon requests (existing note in `regression.spec.ts`);
- React DevTools download message;
- aborted SSE connections when a test intentionally navigates/closes
  (`net::ERR_ABORTED` on `/api/settings/public/stream`);
- `blob:`/`data:` media abort if proven unrelated.

Anything else fails the test with the collected messages printed. Do not
"fix" a gate by widening the allowlist without a written reason in the phase
log.

### 7.2 Network-specific gates

Fail when:

- `/sw.js` or `/api/settings/public/manifest.webmanifest` is non-200 or
  unreachable during the positive flow;
- any manifest icon URL is non-200, not `image/png`, or has the wrong
  dimensions;
- any same-origin `/api/*` response is 5xx during the seeded positive flows;
- any request to `/api/*` is served from Cache Storage (inspect
  `caches.keys()` and cache contents).

### 7.3 Service worker checks

In Playwright, per role where relevant:

- `navigator.serviceWorker.ready` resolves and
  `navigator.serviceWorker.controller?.scriptURL` ends with `/sw.js`.
- Registration scope is `/`.
- `caches.keys()` contains the Workbox precache (and optionally
  `sort-uploads`); no key contains `api`.
- The precached shell is fetchable offline (representative test).
- Update prompt is not visible on a fresh install and no automatic reload
  occurs (main-frame navigation count stays 1 after load).

### 7.4 Server log checks (release gate)

Run after the deployment smoke:

Windows PowerShell (current dev box):

```powershell
pm2 logs sort-api --lines 300 --nostream | Select-String -Pattern "\[Server\]|\[PWA\]|\[Branding\]"
pm2 logs sort-worker --lines 300 --nostream | Select-String -Pattern "\[Server\]|\[Branding\]"
```

Linux (staging/production host):

```bash
pm2 logs sort-api --lines 300 --nostream | grep -E "\[Server\]|\[PWA\]|\[Branding\]"
pm2 logs sort-worker --lines 300 --nostream | grep -E "\[Server\]|\[Branding\]"
```

Pass:

- no `[Server] Unhandled error` or `Uncaught Exception` lines;
- at most one informational `[Branding] Source:` line per process boot;
- no repeated `[PWA] manifest fallback` warnings (one transient warning during
  a DB restart is acceptable and must be noted);
- no `EADDRINUSE`, no scheduler overlap errors introduced by the deploy.

Failure protocol: keep the previous build, capture logs, and roll back the
frontend. Never silence the log line to pass the gate.

---

## 8. Playwright test plan (per role)

New config: `playwright.pwa.config.ts`.

- `testDir: './tests/pwa'`
- `webServer`: `npm run preview -- --port 4173 --strictPort`, URL
  `http://127.0.0.1:4173` (the suite builds first), `reuseExistingServer` only
  outside CI.
- Projects: `pwa-desktop` (Desktop Chrome, 1440×900) and `pwa-mobile`
  (Pixel 7, 393×851).
- `workers: 1` (shared backend), retries 0, trace/screenshot on failure.
- Reuse `tests/ui/helpers/session.ts` `seedSession(page, role)`.
- Add `PWA_REQUIRE_ROLES=1` in release/CI runs: if any role cannot be seeded,
  fail instead of skipping. Silent skips are not allowed for role coverage on
  release gates.

### 8.1 Files

| File | Purpose |
|---|---|
| `tests/pwa/helpers/errors.ts` | Console/pageerror/requestfailed/5xx collector and assertion |
| `tests/pwa/helpers/pwa.ts` | `waitForServiceWorker`, manifest fetch/validate, icon dimension check, cache inspection, install-event stub |
| `tests/pwa/helpers/roles.ts` | Role list, expected mobile entry point, expected bottom-nav contract |
| `tests/pwa/install-entrypoints.spec.ts` | Per-role placement and interaction, desktop + mobile |
| `tests/pwa/shell.spec.ts` | Per-role SW registration, manifest, caches, console gate |
| `tests/pwa/guard.spec.ts` | Failure paths, no API caching, offline banner, deep links, uniqueness |
| `tests/ui/service-worker-absent.spec.ts` | Dev/test isolation guard (runs in existing dev suite) |

### 8.2 Matrix

| Scenario | STUDENT | TEACHER | ADMIN | MRF |
|---|---|---|---|---|
| Desktop sidebar CTA visible | Yes | Yes | Yes | Yes |
| Sidebar collapsed → icon-only CTA, aria-label | Yes | Yes | Yes | Yes |
| Mobile entry point | Profile menu + Home card | Profile menu + Home card | More sheet row | More sheet row |
| Bottom nav unchanged (5 items incl. More) | Yes | Yes | Yes | Yes |
| Max 1 visible install entry per viewport | Yes | Yes | Yes | Yes |
| Standalone/installed → all CTAs hidden | Yes | Yes | Yes | Yes |
| Prompt stub → click calls `prompt()` | Yes | Yes | Yes | Yes |
| Dismissed prompt hidden for session | Yes | Yes | Yes | Yes |
| iOS UA → instructions dialog (Share → Add to Home Screen) | Yes | Yes | Yes | Yes |
| SW ready + controller `/sw.js`, scope `/` | Yes | Yes | Yes | Yes |
| Manifest valid, name/branding, icons 200 | Yes | Yes | Yes | Yes |
| No `/api` entries in Cache Storage | Yes | Yes | Yes | Yes |
| Console/pageerror/5xx gate clean | Yes | Yes | Yes | Yes |
| MRF tablet 1024×768 sidebar CTA | n/a | n/a | n/a | Yes |

Additional guard scenarios (single role sufficient, run in `guard.spec.ts`):

- Registration/manifest failure path: abort `/sw.js` and the manifest request;
  the app still renders the role shell, and only expected `[PWA]` warnings
  appear (no errors, no white screen).
- Service worker installed but API offline: `context.setOffline(true)` then
  `page.reload()`; shell renders, offline banner visible and announced; no
  write flow attempted.
- Deep links `/admin`, `/mrf`, `/reports/print` load through the navigation
  fallback (online and after SW is active).
- Forced update prompt is user-triggered only (no auto reload: one main-frame
  navigation).
- Install event already installed (`matchMedia` stub) hides every CTA,
  including after resize.

### 8.3 Install prompt stubbing (deterministic in Chromium)

Real `beforeinstallprompt` cannot be synthesized by the browser in tests, so:

1. `page.addInitScript` sets a helper that dispatches a synthetic
   `beforeinstallprompt` event after boot with a `prompt()` that records
   `window.__pwaPromptCalled = true` and resolves `userChoice` with
   `{ outcome: 'accepted' }` or `'dismissed'` per test.
2. The provider must consume the event and update state; the test clicks the
   role's surface and asserts the flag + UI state.
3. A separate init script overrides
   `window.matchMedia('(display-mode: standalone)')` to match, asserting CTAs
   are hidden.

iOS instructions are tested by overriding `navigator.userAgent` to an
iPhone Safari string (plus `navigator.standalone = false`) before boot; the
same test asserts the dialog content and focus return. A real WebKit project
is optional pre-release (requires `npx playwright install webkit`) and is not
part of the default gate to keep CI lean.

### 8.4 Screenshots/artifacts

Playwright keeps traces/screenshots on failure under `test-results/`. Add a
manual screenshot of the install entry point for each role/viewport to the
phase log (the repo already stores reference PNGs at the root for UI work).

---

## 9. Highest-priority anti-regression invariants

These are non-negotiable. Each invariant has an enforcement test or gate.
If a change violates one, the change is wrong, not the invariant.

| ID | Invariant | Enforced by |
|---|---|---|
| A1 | PWA never blocks app boot. Any SW/manifest/install API failure leaves the app fully usable with at most a `console.warn('[PWA] ...')`. No top-level await, no unhandled rejection. | `guard.spec.ts` failure-path test; lint; code review |
| A2 | The service worker never caches `/api/*` (including auth and report photos), never handles non-GET, never queues writes, never registers Background Sync. | `pwa:validate` (precache scan), `shell.spec.ts` cache inspection, `guard.spec.ts` |
| A3 | SW scope and manifest scope stay `/`; `start_url` stays `/`; navigation fallback denylist covers `/api`, `/uploads`, `/health`. | `shell.spec.ts` (scope, start_url), `pwa:validate` |
| A4 | Existing routes and navigation contracts do not change: `/admin`, `/mrf`, `/reports/print`, 5-item student bottom nav, 4+More admin/MRF nav, sidebar widths 280/70. | existing `tests/ui/mobile-nav.spec.ts`, `regression.spec.ts` + PWA matrix |
| A5 | No automatic reload or forced SW activation. Updates require a user click; forms are never discarded implicitly. | `shell.spec.ts` navigation count, `useSwUpdate` unit test, code review |
| A6 | At most one visible install control per role per viewport; none when installed/standalone/unsupported; none inside the bottom nav; no layout shift; desktop collapse shows an accessible icon-only control. | `install-entrypoints.spec.ts` |
| A7 | Branding can never regress: manifest falls back to SORT defaults on API/DB failure; ThemeProvider cache/title/favicon behavior is unchanged; apple-touch-icon is never overwritten by the favicon updater. | `pwa-manifest` server tests, existing `branding-default.spec.ts`, new apple-touch assertion |
| A8 | Performance budgets stay within existing guard: registration is deferred after first paint and does not add idle polling, localStorage writes, or API requests. | `tests/ui/resource-guard.spec.ts`, `shell.spec.ts` timing assertion |
| A9 | Test isolation: no SW in dev or existing Playwright runs; Vitest stays node-only; new PWA tests use the preview server on a separate port. | `tests/ui/service-worker-absent.spec.ts`, config review |
| A10 | Security/privacy: manifest exposes only name, acronym, colors, and icon URLs. No school ID, address, head name, integration URLs, or secrets. | server unit test asserting absent keys; smoke schema check |
| A11 | Accessibility: all install controls are labelled buttons, the instructions dialog traps focus and restores it, banners use `role="status"`, keyboard operation works. | Playwright a11y assertions + manual check |
| A12 | File-size and design rules from AGENTS.md hold: every new file is small and single-purpose; only approved tokens are used; gold is not used for install/offline UI. | lint review + file inventory check |
| A13 | Tenant-wide behavior stays consistent: all four roles get the PWA; no role-only manifest or scope; install is client-side only and never requires a new server permission. | role matrix |
| A14 | Deployment cannot serve a stale SW or stale shell: `sw.js` and `index.html` are no-cache; hashed assets are immutable; update prompt drives activation. | proxy config review + Gate G6 manual |

---

## 10. Deployment, proxy, and cache headers

The frontend is served by the reverse proxy/static host. Required behavior:

| Path | Header | Reason |
|---|---|---|
| `/sw.js` | `Cache-Control: no-cache` (or `max-age=0, must-revalidate`) | Browsers must check for SW updates on navigation; a cached SW can freeze the app on an old shell. |
| `/index.html` and SPA fallback | `Cache-Control: no-cache` | The shell references hashed assets; stale HTML pairs with deleted assets after deploy. |
| `/assets/*` | `Cache-Control: public, max-age=31536000, immutable` | Vite content-hashed filenames. |
| `/pwa/*` | `Cache-Control: public, max-age=86400` (icons are stable names; bump only with a rebuild) | In-app/install icons. |
| `/api/settings/public/manifest.webmanifest` | `public, max-age=60, stale-while-revalidate=300` set by Express | Branding changes should appear without long cache pinning. |
| `/uploads/*` | Existing Express `maxAge: '1h'`; SW runtime cache caps entries | Tenant logo and generated icons use content-hashed paths. |

Proxy notes:

- The existing `/api` proxy must stay in place; the manifest is fetched
  same-origin through it. No new proxy rule is required for `/api`.
- SPA fallback (`try_files $uri /index.html`) must never swallow real files:
  `/sw.js`, `/manifest`-related API paths, `/uploads`, and `/pwa/*` must be
  served directly.
- HTTPS is required for installability. Tailscale HTTPS works; plain
  `http://<LAN-IP>` will not register a service worker (except `localhost`).
- Provide an nginx/Caddy snippet in the deployment runbook update as part of
  Phase 6. Do not change proxy behavior silently.

Rollback:

- Rebuild and deploy the previous `dist/` (SW clients will see no new update
  and stay on the last known good build until the next update prompt).
- Emergency kill switch (only if a bad SW ships): deploy an empty `/sw.js`
  that calls `self.skipWaiting()` and `self.registration.unregister()` in
  `activate`, plus remove the manifest link. Document the exact procedure in
  the runbook; do not commit the kill-switch file by default.

---

## 11. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `vite-plugin-pwa` incompatible with Vite 8 | Blocks Phases 2–3 | Verify at G0; fallback to `workbox-build` script with identical output contract; keep config isolated in `vite.config.ts` |
| Dynamic manifest unavailable when API is down | Install prompt unavailable; manifest fetch fails | Server route always returns default SORT manifest (200) on failure; app is online-only anyway; smoke test covers |
| Chrome caches a stale manifest for an old tenant name | Wrong installed name/icon | `max-age=60` + revalidation; icons content-hashed in Phase 4; document reinstall behavior for renamed schools |
| iOS ignores manifest icons/name updates | Old home-screen label/icon persists | Expected iOS behavior; instructions note re-add after major rebrand; apple-touch-icon updated in Phase 4 |
| Tenant logo is unsuitable as an icon (aspect ratio, transparency, tiny) | Ugly launcher icon | Phase 4 generates padded maskable variants with background; if generation fails, default SORT icons are used; validate logo bytes before processing |
| `sharp` binary/deployment issues | Phase 4 failure | Isolate behind a feature check; sync continues; manifest falls back; tests run with a fixture |
| SW caches stale shell after deploy | Users see old UI | `registerType: 'prompt'`, `cleanupOutdatedCaches`, no-cache `/sw.js` and HTML; manual update test in gate |
| Install CTA duplication/clutter | UX regression, failed anti-regression gate | Single provider state + per-surface tests; max-one-visible assertion |
| Offline banner mistaken for offline support | Wrong product promise | Copy explicitly says a connection is required; no offline write tests or claims |
| Playwright credentials missing → silent skips | False green on role coverage | `PWA_REQUIRE_ROLES=1` on release gates fails instead of skipping |
| Adding apple-touch-icon before favicon breaks theme updates | Wrong icon, existing branding test failure | Fix selector to `link[rel='icon']`, add regression assertion |
| `viewport-fit=cover` changes iOS spacing | Visual regression on notched devices | Manual iPhone screenshot in G1/G6; existing safe-area paddings start working as intended |
| Precache size grows (logo/photos) | Slow first load | Budget 4 MB in validator; never precache `/uploads` or map imagery; report any increase |
| Service worker interferes with existing dev tests | Flaky/red `test:ui` | `devOptions.enabled: false`, production-only registration, dev isolation guard test |

---

## 12. Definition of done

All must be true before this plan is marked complete:

- [ ] All four roles (`STUDENT`, `TEACHER`, `ADMIN`, `MRF`) have exactly one
      discoverable install entry point on desktop and mobile, and the entry
      point is hidden when installed/standalone/unsupported.
- [ ] Bottom navigation contracts are unchanged; sidebar collapse works with
      the install control.
- [ ] Manifest is served from the API, reflects EnrollPro-synced branding, and
      always falls back to valid SORT defaults.
- [ ] Default icons pass dimension checks; Phase 4 tenant icons work or are
      explicitly deferred with sign-off.
- [ ] Service worker precaches the shell, uses navigation fallback, caches no
      API responses, and never queues writes.
- [ ] Update prompt is manual only; no automatic reload.
- [ ] Offline banner is visible/announced when offline and adds no offline
      data claims.
- [ ] `npm run verify` is green (including the new PWA gate).
- [ ] `npm run test:pwa` is green for every role on desktop and mobile with
      zero console/page errors and zero API 5xx.
- [ ] `PWA_BASE_URL=... npm run pwa:smoke` is green over HTTPS.
- [ ] Server logs show no unhandled errors and no unexpected PWA/branding
      warnings after deploy.
- [ ] Manual install works on Android Chrome, iPhone Safari, desktop
      Chrome/Edge, and the MRF tablet.
- [ ] No file approaches 1,000 lines; design tokens respected.

---

## Appendix A — File inventory

New files (expected):

| File | Approx. lines | Purpose |
|---|---|---|
| `PWA_PLAN.md` | this doc | Source of truth |
| `pwa-assets.config.ts` | 30 | Icon generation preset |
| `public/pwa/icon-192.png` etc. | binary | Default install icons |
| `src/pwa/installMode.ts` | 90 | Pure install-mode resolver |
| `src/pwa/themeColor.ts` | 40 | Theme-color clamp rule |
| `src/pwa/PwaInstallProvider.tsx` | 150 | Install event state provider |
| `src/pwa/usePwaInstall.ts` | 40 | Context hook |
| `src/pwa/registerServiceWorker.ts` | 70 | Deferred production registration |
| `src/pwa/useSwUpdate.ts` | 90 | Update prompt state |
| `src/pwa/useOnlineStatus.ts` | 40 | Online/offline events |
| `src/pwa/PwaRuntime.tsx` | 50 | Mounts banner + update prompt |
| `src/pwa/global.d.ts` | 20 | Window event typing |
| `src/components/pwa/InstallAppButton.tsx` | 110 | Sidebar pill / collapsed icon |
| `src/components/pwa/InstallAppMenuItem.tsx` | 80 | Menu row |
| `src/components/pwa/InstallAppCard.tsx` | 100 | Mobile home card |
| `src/components/pwa/InstallInstructionsDialog.tsx` | 130 | iOS instructions |
| `src/components/pwa/OfflineBanner.tsx` | 60 | Offline notice |
| `src/components/pwa/PwaUpdatePrompt.tsx` | 110 | Update prompt |
| `src/pwa/__tests__/installMode.test.ts` | 90 | Mode matrix |
| `src/pwa/__tests__/themeColor.test.ts` | 60 | Color clamp |
| `server/src/services/pwa-manifest.service.ts` | 190 | Manifest builder + fallback |
| `server/src/services/__tests__/pwa-manifest.test.ts` | 160 | Builder/privacy tests |
| `scripts/pwa/validate-dist.mjs` | 190 | Build gate |
| `scripts/pwa/smoke.mjs` | 170 | Deploy smoke |
| `playwright.pwa.config.ts` | 50 | Preview-based suite |
| `tests/pwa/helpers/errors.ts` | 90 | Error gates |
| `tests/pwa/helpers/pwa.ts` | 130 | SW/manifest/cache helpers |
| `tests/pwa/helpers/roles.ts` | 40 | Role matrix constants |
| `tests/pwa/install-entrypoints.spec.ts` | 220 | Per-role install UI |
| `tests/pwa/shell.spec.ts` | 200 | Per-role SW/manifest/caches |
| `tests/pwa/guard.spec.ts` | 220 | Failure paths and invariants |
| `tests/ui/service-worker-absent.spec.ts` | 50 | Dev isolation guard |

Modified files:

| File | Change |
|---|---|
| `index.html` | Manifest link, meta tags, apple icon, viewport-fit, early install capture |
| `vite.config.ts` | `VitePWA` plugin config (generateSW) |
| `package.json` | Dependencies + `pwa:validate`, `pwa:smoke`, `test:pwa`, `test:pwa:serve` scripts |
| `src/main.tsx` | Wrap app with `PwaInstallProvider`; register SW after render |
| `src/App.tsx` | Mount `PwaRuntime` (update prompt + offline banner) |
| `src/hooks/useTheme.tsx` | Fix favicon selector; theme-color/apple title metadata |
| `src/components/layout/StudentLayout.tsx` | Sidebar install pill; pass install handler to ProfileMenu |
| `src/components/layout/AppShell.tsx` | `sidebarFooterActions` render prop |
| `src/components/layout/DashboardLayout.tsx` | Sidebar action + More-sheet install row |
| `src/components/common/ProfileMenu.tsx` | Optional install item |
| `src/pages/student/components/OverviewTab.tsx` | Mobile-only install card |
| `server/src/routes/settings.routes.ts` | Manifest route |
| `server/src/services/enrollpro-branding.service.ts` | Phase 4 icon generation hook only |
| `server/docs/DEPLOYMENT.md` | Cache headers + PWA release checklist |
| `package.json` (`verify`) | Append `test:pwa` after `test:ui` |

Not modified: `public/SORT_LOGO.png`, `public/favicon.svg`,
`src/components/layout/MobileBottomNav.tsx`, bottom-nav item lists,
`src/hooks/useMockData.tsx`, auth/offline-auth services.

---

## Appendix B — Commands and package scripts

Add to `package.json`:

```json
{
  "scripts": {
    "pwa:validate": "node scripts/pwa/validate-dist.mjs",
    "pwa:smoke": "node scripts/pwa/smoke.mjs",
    "test:pwa": "npm run build && npm run test:pwa:serve",
    "test:pwa:serve": "playwright test -c playwright.pwa.config.ts"
  }
}
```

Update `verify` to append `npm run test:pwa` after `npm run test:ui`.

Developer commands:

```bash
npm run dev                 # no service worker
npm run build               # generates dist/sw.js and precache
npm run preview             # manual PWA testing at http://localhost:5174
npm run pwa:validate        # static PWA contract checks
npm run test:pwa            # Playwright PWA matrix (desktop + mobile)
PWA_BASE_URL=https://host npm run pwa:smoke   # deploy smoke
```

PowerShell equivalents work unchanged; environment variables use
`$env:PWA_BASE_URL = "https://host"; npm run pwa:smoke`.

---

## Appendix C — Manual device checklist (release gate)

For each device, use a real account per role when possible:

Android Chrome (phone):

- [ ] Open over HTTPS, sign in as `STUDENT`; install CTA visible (profile
      menu and Home card; card dismisses and stays dismissed after reload).
- [ ] Install; icon appears on launcher with the expected SORT/tenant icon;
      standalone opens to `/`, no browser chrome.
- [ ] Sign in as `TEACHER`; same behavior.
- [ ] Sign in as `ADMIN`; sidebar CTA on desktop-sized viewport; More-sheet row
      on phone; install.
- [ ] Sign in as `MRF`; same.
- [ ] After a new deploy: update prompt appears, "Later" keeps the old build,
      "Refresh" loads the new build.

iPhone Safari:

- [ ] Sign in as `STUDENT`; profile menu shows instructions; Share → Add to
      Home Screen works.
- [ ] Home-screen name and apple-touch-icon match expected branding.
- [ ] Standalone launch shows no install CTAs.
- [ ] Notched-device layout: header, bottom nav, and dialog respect safe areas.

Desktop Chrome/Edge:

- [ ] Install icon in the address bar works; installed window opens at `/`.
- [ ] Per role: sidebar CTA appears once, collapsed sidebar shows the
      icon-only control, no duplicate CTAs.
- [ ] Firefox: no dead install button (CTA hidden).

MRF tablet (1024×768):

- [ ] Sidebar CTA visible above the user footer; More sheet row on narrow
      layout; install works.

Offline sanity:

- [ ] With the app installed and previously loaded, toggle airplane mode and
      reload: shell renders, offline banner is announced, no write action is
      attempted or queued.

---

## Appendix D — Open decisions needing sign-off

1. **D1 manifest source** — dynamic API route vs build-time static manifest.
   Recommended: dynamic (tenant branding), with default fallback.
2. **D3 tenant install icons** — approve `sharp` on the server for Phase 4, or
   ship with default SORT icons while keeping tenant name/theme.
3. **D4 theme color** — tenant primary with luminance clamp vs fixed
   `#00271D`. Recommended: clamp.
4. **Install card visibility** — Student/Teacher Home card on mobile: approve
   dismissible per-user card in addition to the profile-menu item, or keep only
   the menu item.
5. **Phase 5 shortcuts** — approve adding `?tab=` deep-link support for
   manifest shortcuts, or omit shortcuts for v1.
6. **Public landing CTA** — confirm no install CTA before login (current plan)
   or add one later for kiosk/desktop onboarding.
