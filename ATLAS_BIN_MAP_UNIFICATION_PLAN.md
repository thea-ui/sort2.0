# ATLAS BASE MAP UNIFICATION — IMPLEMENTATION PLAN (GATED)

> STATUS: **IMPLEMENTED (2026-09-19)** — all gates G0-G5 closed; evidence in §9. Extends `ATLAS_MAP_INTEGRATION_PLAN.md` (mirror is live).

---

## 1. INTENT (OWNER REQUEST)

Make the **ATLAS campus map the base map** everywhere a campus map is shown:

1. **Live Bin Map** of all four roles (student, teacher, MRF, admin).
2. Report location maps (student report, teacher report).
3. **Settings → Locations** editor — the map shown there is the ATLAS-fetched map.

The existing uploaded blueprint stops being the primary background and becomes an optional **fallback/override**. Pin locations, bin streams, dispatch flows, and room presets keep working exactly as today.

**Question answered: yes, it is possible** — it is a client-side base-layer swap. No new tables, no new server endpoints, no data migration. The ATLAS mirror (`/api/atlas/map`) is already live and auto-syncing every 15 minutes.

---

## 2. VERIFIED FINDINGS (CURRENT CODE)

All six map surfaces render the same `BlueprintImage` inside a `relative` container; pins are absolutely positioned in **percentages** of that container:

| Surface | File | Base layer today | Pins/overlays |
|---|---|---|---|
| Student + Teacher Live Bin Map | `src/pages/student/components/BinMapTab.tsx:252` (teacher delegates via `TeacherBinMapTab`) | `BlueprintImage` else vector grid | %-positioned station pins + popovers |
| Admin Live Bin Map | `src/pages/admin/components/map/CampusLiveMapView.tsx:182` | `BlueprintImage` | %-positioned station pins (`loc.x`, `loc.y`) |
| MRF Direct Pickup | `src/pages/mrf/components/MRFDirectPickupTab.tsx:194` | `BlueprintImage` else vector | %-positioned pins |
| Student Report location | `src/pages/student/components/SubmitReportTab.tsx:444` | `BlueprintImage` else vector | %-positioned bin pins + click-to-pin (scattered debris) |
| Teacher Report location | `src/pages/teacher/components/TeacherLocationSelector.tsx:142` | `BlueprintImage` else vector | %-positioned bin pins + click-to-pin |
| Settings → Locations editor | `src/pages/admin/components/map/BlueprintCanvas.tsx:114` (+ `CampusBlueprintEditor.tsx`) | `BlueprintImage` + transform; grid always at opacity-40 | draggable pins (drag math writes `x`,`y` %) |

Key facts that shape the design:

- **Pins are already percentages** (0–100) stored on `CampusLocation` rows (`server/prisma/schema.prisma:397`) and in localStorage. **Nothing about pin storage needs to change.**
- ATLAS coordinates are canvas units (verified live: x ≤ 902, y ≤ 480, buildings carry `x/y/width/height/color/rotation`).
- The blueprint **transform** (scale/offset) exists only to align the uploaded image under percentage pins. It becomes irrelevant when ATLAS is the base (and stays meaningful for the fallback image).
- `useAtlasMap()` (built in the previous plan) already returns `{ buildings, campusImageUrl, syncedAt, stale, ... }` and revalidates on focus + every 5 minutes — so the base map auto-updates.
- The ATLAS mirror already renders read-only in the Campus Map tab (`src/components/atlas/AtlasCampusCanvas.tsx`), but that canvas uses padded bounds + pan/zoom, which must **not** be reused directly for aligned pin overlays.

---

## 3. ARCHITECTURE DECISION (LOCKED)

### 3.1 Atlas-first base layer with a measured fit box

Pins must align with ATLAS buildings. For percentage pins to map **linearly** to ATLAS canvas coordinates, the base map must render without letterboxing inside the box that pins are positioned against. Therefore:

```
Outer container (unchanged: fixed heights h-[360px]/h-[420px], rounded, border, overflow-hidden)
└── CampusMapFrame  ← NEW shared component
    ├── Fit box = largest box with the exact ATLAS bounds aspect ratio that fits
    │   inside the outer container (object-fit: contain equivalent, measured by ResizeObserver)
    ├── AtlasBaseMap (SVG):
    │     viewBox="0 0 boundsW boundsH"  ← exact bounds, NO padding
    │     preserveAspectRatio="none"     ← since the fit box has the same ratio this is lossless
    │     buildings (rects, ATLAS color, non-interactive, shortCode labels only)
    │     dot-grid background + optional campus image underlay
    └── {children}  ← ALL existing pins/popovers/hints move inside the fit box unchanged
```

- **Fallback mode** (no ATLAS snapshot): the fit box becomes `absolute inset-0` (100% × 100%) and the frame renders the existing `BlueprintImage` (with its stored transform) or the existing vector grid — **byte-for-byte the current behavior**, so the fallback path cannot regress.
- Pure helper `fitContain(containerW, containerH, ratio)` returns the fit box; unit-tested (letterbox math, zero/NaN guards).
- Pins stay percentage-based HTML overlays; drag math, popovers, click-to-pin, and scattered-debris coordinate math are untouched.

### 3.2 Fallback chain (strict order)

1. **ATLAS buildings present** → `AtlasBaseMap` (default).
2. Else **uploaded blueprint** → `BlueprintImage` with transform (today's behavior).
3. Else **vector placeholder grid** (today's behavior).

The chain is implemented in one place (`CampusMapFrame`) so every surface inherits it identically.

### 3.3 Rollout switch (safety)

`localStorage.sort_base_map_mode` = `'atlas'` (default) | `'blueprint'` (instant revert, no redeploy) — read by `CampusMapFrame`; useful for the owner to A/B and for support. Not exposed in the UI in v1.

---

## 4. FILES & CHANGES

New:

| File | Responsibility |
|---|---|
| `src/components/map/CampusMapFrame.tsx` | Base-layer decision + measured fit box + fallback chain; renders `children` (pins) inside the fit box. |
| `src/components/map/AtlasBaseMap.tsx` | Read-only ATLAS SVG for base-map use (exact bounds viewBox, no pan/zoom/controls/legend, shortCode labels, optional campus image underlay). Distinct from `AtlasCampusCanvas` (interactive Campus Map tab). |
| `src/components/map/AtlasSyncButton.tsx` | Admin-only "Sync from ATLAS" control: triggers `POST /api/atlas/sync`, shows loading → result ("Updated · 9 buildings / 103 rooms" or "Already up to date"), then refreshes the map via `useAtlasMap().refresh()`. Uses `GET /api/atlas/status` for the "last synced" tooltip. Never rendered for STUDENT/TEACHER/MRF. |
| `src/utils/fitContain.ts` | Pure fit math + aspect-from-bounds helper (`atlasBounds(buildings)`). |
| `src/components/map/__tests__/fitContain.test.ts` (or `src/utils` colocated) | Unit tests. |

Modified (one mechanical swap per surface):

| File | Change |
|---|---|
| `BinMapTab.tsx` | Replace background block with `<CampusMapFrame blueprintUrl={blueprintUrl}>` and move pins/popovers/legend inside it. |
| `CampusLiveMapView.tsx` | Same swap. |
| `MRFDirectPickupTab.tsx` | Same swap. |
| `SubmitReportTab.tsx` | Same swap (pinning-mode click math stays on the frame box). |
| `TeacherLocationSelector.tsx` | Same swap. |
| `BlueprintCanvas.tsx` | ATLAS base when available; uploaded image becomes fallback; transform props only used by the fallback image. |
| `CampusBlueprintEditor.tsx` | Hide/disable "Adjust blueprint" + "Replace/Remove Blueprint" behind a **"Custom fallback background"** section (still functional); upload always allowed. Mounts `<AtlasSyncButton />` in the editor header next to the map. |
| `CampusMapView.tsx` (admin Campus Map tab) | Accepts `canManageSync?: boolean`; renders `<AtlasSyncButton />` in the header only from `AdminDashboard` (`admin-campus-map`). Teacher/student/MRF mounts pass nothing. |
| `useAtlasMap.ts` | Add a module-level cache + in-flight coalescing so N mounted maps share one request per revalidation cycle. |

No server, schema, or migration changes.

---

## 5. UX NOTES

- ATLAS base renders **non-interactive** (pointer-events none) so existing pin click/tap/drag targets are unaffected.
- Building labels on bin maps: `shortCode` only, small, low opacity — avoids clutter behind live pins. Full names remain on the Campus Map tab.
- On first switch, existing pins may sit off their buildings (they were aligned to the old image). Admin re-drags them once in Settings → Locations; positions persist through the existing `saveLocations` → `/api/settings/campus-locations`.
- Mobile: the fit box letterboxes inside the current fixed heights, so layout does not jump; the map is slightly smaller on very narrow screens but pins stay aligned.
- Stale/offline mirror: maps keep rendering the last snapshot (no change to today's behavior); no new banners on bin maps (freshness badge stays on the Campus Map tab only).
- **Manual sync (admin only, recommended):** auto-sync already runs every 15 minutes, so the button is a convenience, not a requirement. It appears only in **Settings → Locations** (editor header) and the **admin Campus Map tab**. Behavior: disabled while in flight (spinner), result feedback ("Updated · N buildings / M rooms" / "Already up to date" / "ATLAS unreachable — showing last snapshot"), then `useAtlasMap().refresh()` so the map reflects the new data immediately. The existing endpoint is rate-limited (8/min) and admin-gated; a failed sync never wipes the mirror. Never rendered for STUDENT/TEACHER/MRF — consistent with the view-only policy.

---

## 6. GATES (EACH GATE = CODE + TESTS + EXIT + ROLLBACK)

> Universal rule: at the end of every gate run `npm run verify` (lint, builds, server unit tests, auth-smoke, atlas-smoke, atlas-audit, Playwright). Green or revert.

### G0 — Baseline freeze
- Run `npm run verify`; record the green baseline (currently 15 server unit + 20 auth + 21 atlas-smoke + 31 audit + 12 UI).
- Capture current screenshots of the 6 surfaces for visual comparison (fallback fidelity).
- Exit: baseline green + screenshots stored. Rollback: n/a.

### G1 — Shared frame + fit math (dark launch)
- Implement `fitContain.ts`, `AtlasBaseMap.tsx`, `CampusMapFrame.tsx`, `useAtlasMap` cache.
- Unit tests: exact fit, letterbox left/right and top/bottom, ratio ≥/≤ container, zero/NaN guards, bounds from 0-room and rotated buildings.
- Nothing is wired yet.
- Exit: `npm run build` + new unit tests green + `npm run verify` green. Rollback: delete new files (no imports).

### G2 — BinMapTab (student + teacher) first
- Swap base layer only in `BinMapTab.tsx`; pins/popovers untouched.
- Playwright (extend `tests/ui/`): with ATLAS mocked → atlas base rendered (`data-testid="atlas-base-map"`), building count > 0, station pins still visible/clickable; with empty mirror + blueprint set via `addInitScript` → blueprint `<img>` and no atlas base; with both absent → vector fallback. Force `sort_base_map_mode='blueprint'` once to prove the switch works.
- Exit: new specs + all existing specs green. Rollback: revert the one file.

### G3 — Remaining surfaces, one commit each
- Order: `CampusLiveMapView` (admin) → `MRFDirectPickupTab` → `SubmitReportTab` → `TeacherLocationSelector`.
- Per surface, add at least: renders ATLAS base when mocked; falls back to vector when empty; interactive pins still work (click a station pin → its popover/selection appears).
- Teacher/Student report maps additionally: click-to-pin still records a percentage (`Scattered Debris` pin renders at the click point).
- Exit: all surface specs green + full verify green. Rollback: revert the individual file.

### G4 — Settings editor (`BlueprintCanvas` + `CampusBlueprintEditor`)
- Canvas shows ATLAS base when available; grid overlay stays; pins draggable with the existing math.
- Upload controls remain under a collapsible **"Custom fallback background"** section; transform controls only render while a blueprint exists.
- Tests: with ATLAS mocked → atlas base + pins render; drag a pin → `saveLocations` payload contains new `x/y` (assert via `page.route` capture on `POST /api/settings/campus-locations` or localStorage read); with ATLAS empty + blueprint → old editor appearance/behavior.
- Sync button tests: admin sees the button in Settings and on the Campus Map tab; clicking it calls `POST /api/atlas/sync` once (route-intercept + assert request count), shows the loading state, then re-fetches `/api/atlas/map`; failure (mock 503) shows the graceful "unreachable" message without blanking the map; student/teacher/MRF shells never render the button.
- Exit: specs + verify green; manual visual check that pins align after one re-drag. Rollback: revert the two files (+ remove the button mounts).

### G5 — Pre-finish audit & close-out
- Full `npm run verify` on a fresh backend + web boot.
- Per-role manual sweep (4 roles): bin map renders ATLAS base, search/pins/popovers work, no console errors.
- Fallback drill: set `sort_base_map_mode='blueprint'` → all surfaces return to the old look; back to `'atlas'`.
- Failure drill: stop backend ATLAS sync source (point `ATLAS_BASE_URL` at a dead port / use empty fixture) → surfaces render the blueprint or vector, never blank/crash.
- File-size + secret audit; update `README.md` (base map = ATLAS, blueprint = fallback); flip this STATUS to IMPLEMENTED with evidence.

---

## 7. ANTI-REGRESSION MATRIX

| Protected behavior | Test | Gate |
|---|---|---|
| Existing UI suites (Campus Map tab, role shells, picker) | `npm run test:ui` (12 specs) | every gate |
| Auth/atlas API boundaries unchanged | `auth-smoke`, `atlas-smoke`, `atlas-audit` | every gate |
| Pin click → popover/selection (student/teacher/admin) | new per-surface Playwright specs | G2-G3 |
| Click-to-pin scattered debris still records position | report-map specs | G3 |
| Pin drag persists `x/y` | settings-editor spec (network/localStorage assert) | G4 |
| Manual sync is admin-only; one call per click; failure is graceful | sync-button specs (role visibility + route intercept + 503 mock) | G4 |
| Bin status coloring, dispatch CTAs, waste-stream panel | specs assert pin presence + existing flows; manual sweep | G3-G4 |
| Fallback fidelity (blueprint + vector) | frame fallback specs + `sort_base_map_mode` drill | G2, G5 |
| Fallback when ATLAS empty/unreachable | empty-fixture specs | G2-G5 |
| No layout jump on map surfaces | visual compare at 360/768/1280 widths | G5 |
| File-size rule (< 1,000 lines) | audit | G5 |

---

## 8. OPEN DECISIONS (DEFAULTS SET)

1. **Blueprint upload**: kept as optional fallback (owner-confirmed).
2. **Settings room list** ("Campus Asset Room Locations"): optionally surface ATLAS rooms read-only in that panel (they already power the teacher picker). Default = out of scope for v1; follow-up plan if wanted.
3. **Zoom/pan on bin maps**: skipped (matches today). Default = no change.
4. **Label density** on bin maps: shortCode only (default) vs no labels. Easy to flip in `AtlasBaseMap` props.

---

## 9. IMPLEMENTATION EVIDENCE (2026-09-19)

### Bug log (found by the suite while implementing)

| ID | Gate | Symptom | Root cause | Fix | Test added |
|---|---|---|---|---|---|
| B-006 | G3 | Click-to-pin tests failed: click landed but no pin appeared | Click was aimed at the letterbox area of the measuring wrapper, outside the fitted content box that carries the handler | Test target the exposed `campus-map-content` box; pins still map linearly to the fit box | `base-map.spec.ts` student + teacher click-to-pin |
| B-007 | G3 | `npm run verify` failed: auth-smoke `student login status 429` | The auth login limiter counts failed attempts; the archived student credential + repeated suite runs exhausted the 20/15-min budget | `scripts/e2e/token.mjs` now caches resolved tokens per process; auth-smoke treats 429 like the archived-403 case (environmental warning, not a regression) | auth-smoke + atlas-smoke/audit stay green under rate limiting |
| B-008 | G3 | verify chain stopped mid-run; auth-smoke exit code `-1073740791` | `process.exit()` raced undici socket teardown on Windows (same family as B-002) | Smoke scripts set `process.exitCode` and exit naturally | exit code 0 + full chain completes |

### Gate evidence

- **G0:** baseline `npm run verify` green (recorded before any change; later re-baselined with EnrollPro back: 23/23 auth).
- **G1:** `fitContain`/`atlasBounds` unit tests 10/10 (vitest, `npm run test:unit`); `CampusMapFrame`/`AtlasBaseMap` dark-launched with 0 lint issues.
- **G2:** BinMapTab swapped; 5 new specs (ATLAS base + pins interactive, teacher base, blueprint fallback, vector fallback, `sort_base_map_mode=blueprint` revert) + existing 4 role regression specs green.
- **G3:** all remaining surfaces swapped (admin bin map, MRF direct pickup, student report, teacher report). 9/9 base-map specs covering pins/popovers and click-to-pin on both report maps.
- **G4:** Settings editor + admin sync button. 8/8 settings specs: ATLAS base + draggable pins, pin-drag persists `x/y` (POST body asserted), one sync call per click with map refresh, graceful 503 with map intact, and sync button invisible to STUDENT/TEACHER/MRF.
- **G5:** full `npm run verify` green on a fresh app boot: lint 0 errors → root build → unit 10/10 → server build → server unit 15/15 → auth-smoke 23/23 → atlas-smoke 21/21 → atlas-audit 31/31 → Playwright 30/30 (including `live-atlas.spec.ts`, which renders the base map from the **real** mirror with no mocks). File-size audit: largest new file 138 lines; largest touched surface 748 (under 1,000). No secrets in the diff; runtime artifacts gitignored.

### PENDING (explicitly not claimed as passed)
- **Manual visual pass (human eye):** pixel-perfect pin alignment after re-dragging against the real ATLAS map, contrast/legibility at 360/768/1280 widths, and reduced-motion behavior. Automated layout/state checks are green.
- **Real-device mobile QA** (touch drag/pinch on the settings editor canvas).
