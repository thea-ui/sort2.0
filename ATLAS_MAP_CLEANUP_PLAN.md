# ATLAS MAP CLEANUP — REMOVE CAMPUS MAP PAGE · FIX ADJUST-ZOOM · ATLAS ROOMS IN SETTINGS (GATED)

> STATUS: **IMPLEMENTED (2026-09-19)** — all gates G0-G4 closed; evidence in §7. Follows the autonomous protocol in `ATLAS_MAP_INTEGRATION_PLAN.md` §12.

---

## 1. INTENT (OWNER REQUEST)

1. **Remove the Campus Map page** — the standalone view is no longer needed; the **Live Bin Map** already renders the ATLAS base for all roles.
2. **Fix "can't zoom out"** in Settings → Locations (reported live).
3. **The room list in Settings must reflect the real rooms** — it currently shows 23 legacy room presets that teachers no longer see (the teacher picker now uses ATLAS rooms).

---

## 2. VERIFIED FINDINGS

### 2.1 Campus Map page scope (safe to remove)

The standalone page is `src/components/atlas/CampusMapView.tsx`. It is the **only** consumer of 5 sibling components (`AtlasCampusCanvas`, `AtlasBuildingPanel`, `AtlasMapLegend`, `AtlasSkeleton`, `AtlasFreshnessBadge` — verified by repo-wide grep). Nav + render branches:

| Role | Nav item | Render branch |
|---|---|---|
| Student/Teacher | `StudentLayout.tsx:29` (`campus-map`) | `StudentDashboard.tsx:237`, `TeacherDashboard.tsx:360` |
| MRF | `DashboardLayout.tsx:49` (`campus-map`) | `MRFDashboard.tsx:734` |
| Admin | `DashboardLayout.tsx:71` (`admin-campus-map`) | `AdminDashboard.tsx:412` |

Tests referencing it: `tests/ui/atlas-map.spec.ts` (6 tests), `tests/ui/regression.spec.ts` (expects the nav on every role), `tests/ui/settings-map.spec.ts` (one "admin sees sync button on Campus Map tab" test). The **manual sync button stays** in Settings → Locations (`CampusBlueprintEditor`), so admin capability is preserved.

Server endpoints stay: `/api/atlas/map`, `/campus-image`, `/sync`, `/status` still power the base map, the sync button, and the smoke/audit suites.

### 2.2 Why zoom-out "does nothing" in Settings (`CampusBlueprintEditor.tsx`)

Two compounding causes:

1. **The transform is applied to a layer that isn't visible.** The editor's zoom/pan (`draftTransform`, wheel handler at `CampusBlueprintEditor.tsx:243-253`, slider in `BlueprintAdjustControls.tsx`) only affects the **fallback blueprint image**. Since the unification, the visible base is ATLAS (`CampusMapFrame` renders ATLAS whenever the mirror has buildings), so wheel/slider changes are invisible — including zoom-out. The badge still promises "SCROLL TO ZOOM", so it reads as broken.
2. **The wheel listener sits on the fitted content box** (after the G3 refactor `mapContainerRef` = frame content). With ATLAS letterboxing, scrolling over the dark canvas margins hits no listener — a dead zone that did not exist before.

### 2.3 Rooms shown in Settings (`RoomLocationsManager.tsx`, `CampusBlueprintEditor.tsx`)

- Settings reads `getStoredRoomLocations()` (localStorage legacy presets, 23 seeded defaults). 
- The teacher asset picker reads **ATLAS rooms first** (`TeacherSubmitReportTab` → `useAtlasMap` → `atlasRoomToLocationString`), falling back to the legacy list only when ATLAS is empty.
- Result: admins manage a list teachers never see. The fix is to show the ATLAS rooms (read-only, grouped by building) and demote the legacy list to a clearly-labelled fallback.

---

## 3. CHANGES

### A. Remove the Campus Map page

- Delete nav items + render branches (6 files listed in §2.1); delete `CampusMapView.tsx` and the 5 now-unused atlas-tab components.
- Keep `AtlasBaseMap`, `CampusMapFrame`, `AtlasSyncButton`, `atlasRoomMeta`, `useAtlasMap` (all still used).
- Settings header keeps the sync button; optionally add the freshness badge (`AtlasFreshnessBadge`) next to it so admins still see "Updated Xm ago" — recommended, tiny, and reuses the existing component.
- Tests: delete `atlas-map.spec.ts`; update `regression.spec.ts` to assert the Campus Map nav is **absent** for all four roles while existing tabs stay green; drop the Campus Map tab case from `settings-map.spec.ts`. `live-atlas.spec.ts` (Bin Map) stays.

### B. Fix adjust/zoom in Settings

1. `CampusMapFrame` gets a `forceBlueprint?: boolean` prop: when true, it renders the fallback/blueprint layer even if ATLAS is available.
2. The editor passes `forceBlueprint={isAdjusting}` → entering "Adjust" shows the image you are actually adjusting; wheel, drag, slider, and zoom-out become visible and correct.
3. A one-line banner while adjusting: "Adjusting the fallback background — ATLAS stays the live base after saving."
4. Move the wheel listener to the **outer canvas** element (new ref) so scroll-to-zoom works over the entire canvas area, not just the fitted box.
5. Cancel/Save exits adjust mode → ATLAS base returns; changes apply to the fallback only (unchanged contract).

### C. ATLAS rooms in Settings

- Primary panel: **ATLAS rooms** (read-only) grouped per building with floor/type/capacity badges, count, and a "Synced from ATLAS" source badge; searchable.
- The existing manual list moves into a collapsible **"Fallback room presets"** section with its current Add/Edit/Delete behavior; it is only used by the teacher picker when ATLAS is empty.
- When the mirror is empty, the panel falls back to today's manual list (no blank state).

---

## 4. GATES

> Universal rule: each gate ends with `npm run verify` green. Current baseline: unit 10, server 15, auth 23, atlas 21, audit 31, UI 30.

### G0 — Baseline
- Run `npm run verify`; record green baseline. Rollback: n/a.

### G1 — Remove the Campus Map page
- Apply §3A code/test changes.
- **Anti-regression:** all four role shells render with **no** Campus Map nav; Bin Map still renders the ATLAS base (`base-map.spec.ts` untouched and green); Settings sync button still present; no console errors.
- Exit: `npm run verify` green (UI count drops by the removed specs). Rollback: revert the deletion commit.

### G2 — Adjust-zoom fix
- Apply §3B.
- **Tests (`settings-map.spec.ts` additions):**
  - With ATLAS mocked + a blueprint set + "Adjust" active: the blueprint image is visible (not ATLAS), and wheel/`Zoom out` changes the displayed % (assert it decreases from 100%).
  - Wheel over the canvas margin (outside the fitted box) still zooms (regression for the dead zone).
  - Cancel/Save returns to the ATLAS base.
- Exit: verify green. Rollback: revert the two files.

### G3 — ATLAS rooms in Settings
- Apply §3C.
- **Tests:**
  - With ATLAS mocked: ATLAS room names (fixture) render with building grouping; legacy presets are hidden behind the fallback section.
  - With empty mirror: fallback presets render and remain editable (no regression to Add/Edit/Delete).
  - Teacher picker spec (`atlas-picker.spec.ts`) unchanged and green.
- Exit: verify green. Rollback: revert the panel changes.

### G4 — Final
- Fresh backend + web boot, full `npm run verify`.
- Per-role sweep: no Campus Map nav anywhere; Live Bin Maps, report maps, and Settings all render the ATLAS base; sync button works; file-size + secret audit; update README (page removed) and flip this STATUS to IMPLEMENTED with evidence.

---

## 5. ANTI-REGRESSION MATRIX

| Protected behavior | Test | Gate |
|---|---|---|
| No Campus Map nav for any role; no dead links | `regression.spec.ts` (updated) | G1 |
| Live Bin Map ATLAS base + pins + fallbacks | `base-map.spec.ts` (unchanged) | G1 |
| Admin sync button still available in Settings | `settings-map.spec.ts` | G1 |
| Adjust mode shows the adjusted image; zoom out works; margin scroll works | new settings specs | G2 |
| ATLAS base returns after adjust cancel/save | new settings spec | G2 |
| Settings rooms mirror ATLAS; fallback editable when empty | new settings specs | G3 |
| Teacher picker unchanged | `atlas-picker.spec.ts` | G3 |
| API boundaries/payloads untouched | auth-smoke, atlas-smoke, atlas-audit | every gate |

## 6. OPEN DECISIONS (RESOLVED)

1. **Legacy room presets**: kept as a collapsible "Fallback room presets" section (owner-confirmed default).
2. **Freshness badge in Settings header**: added next to the sync button.
3. **Zoom behavior in Settings**: adjust-only fix (the ATLAS base already auto-fits the whole campus).

---

## 7. IMPLEMENTATION EVIDENCE (2026-09-19)

### What shipped

- **Campus Map page removed:** nav items + render branches deleted for all four roles; `CampusMapView.tsx` and its 4 exclusive components (`AtlasCampusCanvas`, `AtlasBuildingPanel`, `AtlasMapLegend`, `AtlasSkeleton`) deleted. `AtlasFreshnessBadge` kept and moved into the Settings header next to the sync button. All `/api/atlas/*` endpoints remain (they power the base map, sync button, and smoke/audit suites).
- **Zoom fix:** `CampusMapFrame.forceBlueprint` — entering "Adjust" now renders the fallback blueprint being adjusted (ATLAS returns on save/cancel); the wheel listener moved to the outer canvas (`blueprint-canvas`) so letterbox margins zoom too; the adjust banner explains ATLAS stays the live base.
- **ATLAS rooms in Settings:** new `AtlasRoomDirectory` (grouped by building/floor, type + capacity badges, search, "Synced from ATLAS" badge) becomes the primary list; legacy presets moved into a collapsed `Fallback room presets` details section (Add/Edit/Delete unchanged), used only when the mirror is empty.

### Bug log

| ID | Gate | Symptom | Root cause | Fix | Test added |
|---|---|---|---|---|---|
| B-009 | G3 | `pin drag persists x/y` spec failed: page ended in Edit mode but no save POST | Drag targeted coordinates below the 720px test viewport (the settings page got taller), so the synthetic mouse events hit nothing | Spec scrolls the pin into view before dragging (`scrollIntoViewIfNeeded`) | spec now viewport-independent |
| B-010 | follow-up | Old blueprint flashed for ~1s when switching into a map page | `CampusMapFrame` rendered the fallback layer while the first ATLAS payload was still in flight | Frame renders a neutral pending surface until the first response resolves; hook initializes from the module cache and `primeAtlasMapCache()` warms it right after sign-in. First fix attempt returned before a hook (Rules of Hooks violation → error boundary) — corrected by keeping the early return after all hooks | `base-map.spec.ts`: delayed-mirror test (pending shown, fallback never rendered, ATLAS arrives) + cached-revisit test (instant ATLAS, no pending/fallback) |
| B-011 | follow-up | Settings header UI crushed: title wrapped one word per line, buttons pressed against the edge | Freshness badge + sync button widened a `shrink-0` action row, so the title column collapsed | Status badge moved into the stat-chip row (`statusControl`), action row wraps and gets its own line below 2xl, title column gets `flex-1`/`max-w-xl` | `settings-map.spec.ts` layout guard: title width > 180px and zero horizontal page overflow at 1280px; visually confirmed at 1280/390 |
| B-012 | follow-up | Station popover clipped: the last waste-category row was cut off at the map's bottom edge | The map container still had `overflow-hidden` (legacy corner clipping); the popover flip threshold (55%) also opened downward too often | Base-layer clipping now lives in `CampusMapFrame`, so `overflow-hidden` was removed from the 5 map containers; popover flip threshold tightened to 40% so tall popovers (up to 4 streams) open above the pin | `base-map.spec.ts` asserts the container's computed `overflow` is not hidden; visually confirmed with a 4-stream station at y=42% |
| B-013 | follow-up | Report detail modal rendered under the app header (top cut off) and its backdrop never dimmed the header/sidebar | The dashboard content wrapper is `relative z-10`; every `fixed z-50` modal inside it is trapped in that stacking context and loses to the header (`z-40`) | New `ModalPortal` (portals to `document.body`); applied to `AdminReportDetailModal` and the dispatch/reject modals on the Reports screen. Other admin modals share the same legacy pattern and can adopt `ModalPortal` incrementally | `modal-layering.spec.ts`: overlay is topmost in the header strip (`elementFromPoint`), panel fully within the viewport, close still works |

### Follow-up UX changes (same day)
- Pin drags and bin-stream toggles in Settings save **silently** (success toasts removed — the pin/dropdown is the feedback); other toasts untouched. Covered by the pin-drag spec asserting no toast.

### Gate evidence

- **G0:** baseline note — prior full verify green (unit 10, server 15, auth 23, atlas 21, audit 31, UI 30).
- **G1:** page removed; affected specs 20/20 (regression ×4 now assert the nav is absent and Bin Map still renders the ATLAS base; settings ×8; base-map ×8); full `npm run verify` green with 23 UI specs.
- **G2:** adjust/zoom spec green (fallback visible while adjusting, 100% → 90% via button, wheel-over-margin zooms, Cancel restores ATLAS); settings suite 8/8.
- **G3:** settings suite 10/10 — ATLAS room directory renders fixture rooms with fallback collapsed; empty mirror keeps the editable preset list; freshness badge + sync button verified; role visibility unchanged.
- **G4:** fresh backend + web boot, full `npm run verify` green: lint 0 errors → root build → unit 10/10 → server build → server unit 15/15 → auth-smoke 23/23 → atlas-smoke 21/21 → atlas-audit (all pass) → Playwright 28/28 (incl. the two flash-prevention specs). File-size + secret audit clean; README updated (page removed, Settings rooms/sync documented).

### PENDING (not claimed)
- Human visual pass: confirm the adjusted fallback alignment and contrast at 360/768/1280 widths; touch drag/pinch on the settings canvas on a real device.
