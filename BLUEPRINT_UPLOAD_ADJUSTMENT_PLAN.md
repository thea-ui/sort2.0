# Blueprint Upload & Image Adjustment Plan

> **Status:** Implemented (2026-09-14). Decisions: remove preset bar + keep grid fallback; pan + zoom only. See §12 Implementation Status.
> **Scope:** Admin Settings → Locations → Campus Blueprint Editor. Remove the "Blueprint Canvas Preset" bar and add an upload → adjust → save workflow for the custom blueprint image.
> **Related:** `AGENTS.md` (design tokens, file-size limit), `src/services/locationStore.ts`.

---

## 0. TL;DR

Two changes:

1. **Remove the "Blueprint Canvas Preset" bar** (`BlueprintPresetBar.tsx`) — the row showing `DEFAULT · ARCHITECTURAL · AERIAL · Clear Custom Map` and "Custom Image Active".
2. **Add an image adjustment step after upload**: the admin pans/zooms the uploaded blueprint over the real pin canvas, then clicks **Save** to persist. Currently the image is persisted immediately and rendered `object-cover` with no control, so uploaded scans rarely align with the bin pins.

Because the blueprint is rendered in **6 different places**, the transform must be applied by a single shared component; otherwise the admin's saved alignment would not match what students/teachers/MRF see.

---

## 1. Current Implementation Map

| Concern | Location |
| --- | --- |
| Editor container / state / upload | `src/pages/admin/components/map/CampusBlueprintEditor.tsx` (`handleFileUpload` :112-130, `handleClearBlueprint` :132-137, `handleSelectPreset` :139-144, `blueprintUrl`/`selectedPreset` :52-55, preset bar render :288-293) |
| Preset bar (to remove) | `src/pages/admin/components/map/BlueprintPresetBar.tsx` (whole file) |
| Header upload button | `src/pages/admin/components/map/BlueprintHeader.tsx:56-61` |
| Editor canvas render | `src/pages/admin/components/map/BlueprintCanvas.tsx:92-118` (`<img object-cover opacity-80>`) |
| Storage keys | `src/services/locationStore.ts:5-6` (`sort_blueprint_url`, `sort_blueprint_preset`) |
| Other renderers of the blueprint | `CampusLiveMapView.tsx:180`, `TeacherLocationSelector.tsx:143`, `MRFDirectPickupTab.tsx:197-200`, `SubmitReportTab.tsx:429`, `BinMapTab.tsx:251-255` — all `<img className="absolute inset-0 w-full h-full object-cover opacity-75/80 pointer-events-none">` |

Storage today:
- `sort_blueprint_url` → base64 data URL (large; can overflow localStorage quota).
- `sort_blueprint_preset` → `'DEFAULT' | 'ARCHITECTURAL' | 'AERIAL'` (only `ARCHITECTURAL` is rendered; `AERIAL` falls through to the grid).

Pins are positioned with `left: x%`, `top: y%` (0–100) relative to the map container (`BlueprintCanvas.tsx:129`; `CampusBlueprintEditor.tsx:160-164`). **Alignment between the image and these percentages is exactly what the adjustment step must control.**

---

## 2. Requirements & Non-Goals

### Requirements
- Remove the preset canvas selector entirely from the editor.
- After choosing an image file, enter an **adjust mode** instead of saving immediately.
- Adjust mode supports **pan (drag)** and **zoom (wheel / slider / buttons)**, plus **Fit**, **Reset**, **Cancel**, and **Save**.
- Only on **Save** is the blueprint (image + transform) persisted and broadcast to all views.
- Admin can later **re-adjust**, **replace**, or **remove** the saved blueprint.
- Every blueprint renderer applies the same saved transform.

### Non-goals (v1)
- Rotating or cropping the image (can be a later iteration).
- Server-side upload/media storage — remains browser `localStorage` (per current architecture).
- Editing the preset vector maps (they are being removed).

---

## 3. Proposed UX

### 3.1 Editor toolbar (header)
`Upload Blueprint` opens the file picker. On file select, the editor enters **Adjust Mode** (no persistence yet). If a blueprint already exists, an `Adjust` action re-enters Adjust Mode, and a `Remove` action clears it.

### 3.2 Adjust Mode
- The map canvas shows the uploaded image **live** over the pin layer, dimmed pins, with a translucent grid to help alignment.
- Interaction:
  - **Drag** the image (pointer events; touch-friendly) to position it.
  - **Wheel / pinch** to zoom; a **Zoom slider** (−/＋) and percentage readout.
  - Buttons: `Fit`, `Reset`, `Cancel`, `Save Blueprint`.
- `Save` persists `{ url, transform }` and dispatches the existing `storage` / `sort_locations_updated` events so all consumers refresh.
- `Cancel` restores the previously saved image/transform (or nothing if first upload).
- Escape = Cancel; Enter = Save (when focus allows).

### 3.3 Removed elements
- The entire `BlueprintPresetBar` ("Blueprint Canvas Preset:", `DEFAULT`, `ARCHITECTURAL`, `AERIAL`, `Clear Custom Map`).
- `selectedPreset` state and `handleSelectPreset` in the editor.
- `BlueprintPresetBar` import/render.

> **Decision D1:** "Remove the blueprint canvas" is interpreted as removing the **preset bar** (preset selection + clear). Whether to also delete the `ARCHITECTURAL`/`AERIAL` vector fallbacks is an open question (§10). Recommended: keep the neutral **grid** fallback only, delete the `ARCHITECTURAL` vector, and treat "no custom image" as an empty grid.

---

## 4. Data Model

Add a transform record alongside the URL.

```ts
// locationStore.ts
export const STORAGE_KEY_BLUEPRINT_TRANSFORM = 'sort_blueprint_transform'; // JSON

export interface BlueprintTransform {
  scale: number;    // 1 = fit; range e.g. 0.25 – 4
  offsetX: number;  // percent of container width, e.g. -50..50
  offsetY: number;  // percent of container height, e.g. -50..50
}

export const DEFAULT_BLUEPRINT_TRANSFORM: BlueprintTransform = { scale: 1, offsetX: 0, offsetY: 0 };
```

- `offsetX/offsetY` are stored as **percent of the container**, so the same values reproduce the alignment in every renderer regardless of its pixel size.
- Rendering:
  ```html
  <img
    src={url}
    style={{
      transform: `translate(${offsetX}%, ${offsetY}%) scale(${scale})`,
      transformOrigin: 'center center',
    }}
    class="absolute inset-0 w-full h-full object-cover opacity-75 pointer-events-none"
  />
  ```
  Since the `<img>` is `w-full h-full` of the container, percentage translation is relative to the container — consistent everywhere.

### Back-compat
- If `sort_blueprint_transform` is absent, use `DEFAULT_BLUEPRINT_TRANSFORM` → identical look to today (`object-cover`, centered, scale 1).
- Legacy `sort_blueprint_preset` is ignored after the preset bar is removed (optionally cleaned up).

---

## 5. Shared Component Design

Create `src/components/map/BlueprintImage.tsx` (or `src/pages/admin/components/map/BlueprintImage.tsx`) used by all renderers:

```tsx
interface BlueprintImageProps {
  url: string | null;
  transform?: BlueprintTransform | null;
  className?: string;        // opacity/rounding per caller
  readTransformFromStorage?: boolean; // default true for consumers
}
```

Responsibilities:
- Read `sort_blueprint_url` + `sort_blueprint_transform` (unless props are passed directly by the editor during adjust mode).
- Render the transformed `<img>`, or `null` when no URL.
- Keep `pointer-events-none` so pins remain interactive.

This guarantees Students/Teachers/MRF/Admin see exactly the alignment the admin saved.

### Consumers to switch
| File | Change |
| --- | --- |
| `BlueprintCanvas.tsx:92-93` | Editor canvas → `BlueprintImage` (accepts live transform during adjust) |
| `CampusLiveMapView.tsx:180` | Replace inline `<img>` |
| `TeacherLocationSelector.tsx:143` | Replace inline `<img>` |
| `MRFDirectPickupTab.tsx:197-200` | Replace inline `<img>` |
| `SubmitReportTab.tsx:429` | Replace inline `<img>` |
| `BinMapTab.tsx:251-255` | Replace inline `<img>` |

Each consumer also subscribes to `storage` + a new `sort_blueprint_updated` custom event to refresh transform changes.

---

## 6. Adjustment Editor Design

New component `BlueprintAdjustControls.tsx` (or fold into the editor to respect the 1,000-line rule):

- State: `draftTransform`, `isAdjusting`, `pendingUrl`.
- Pointer handling: `onPointerDown/Move/Up` on the canvas; convert pixel deltas to `%` of the container and add to `offsetX/offsetY`.
- Zoom: wheel `deltaY` → `scale * (1 ± step)`, clamped `[0.25, 4]`; slider mirrors `scale`.
- `Fit`: set `scale = 1`, `offset = 0`.
- `Reset`: `DEFAULT_BLUEPRINT_TRANSFORM` (does not remove the image).
- `Save`: `localStorage.setItem(url/transform)`; dispatch events; exit adjust mode; toast "Blueprint saved".
- `Cancel`: discard `pendingUrl`/`draftTransform`.
- `Remove`: clear URL + transform; dispatch events.

Image hygiene (recommended, addresses the localStorage quota risk):
- Downscale on upload via an offscreen `<canvas>` to max ~1920px on the longest edge and export as WebP/JPEG (quality ~0.85) before storing.
- Guard: if the resulting data URL exceeds ~4.5 MB, warn and refuse, suggesting a smaller image.

---

## 7. Phased Implementation

### Phase 1 — Storage & shared component
1. Add `STORAGE_KEY_BLUEPRINT_TRANSFORM`, `BlueprintTransform`, `DEFAULT_BLUEPRINT_TRANSFORM`, and `getBlueprintTransform()/saveBlueprintTransform()` to `locationStore.ts`.
2. Add `BlueprintImage.tsx`.
3. Migrate the 5 non-editor renderers to `BlueprintImage` (no behaviour change with default transform).

### Phase 2 — Remove the preset bar
4. Delete `BlueprintPresetBar.tsx`.
5. Remove its import/render and `selectedPreset`/`handleSelectPreset` from `CampusBlueprintEditor.tsx`.
6. Remove `blueprintPreset` state from `CampusLiveMapView`, `MRFDirectPickupTab`, `SubmitReportTab`, `BinMapTab`, `TeacherLocationSelector`; delete the `ARCHITECTURAL`/`AERIAL` branches per decision D1; keep the grid fallback.
7. Stop writing `sort_blueprint_preset` (leave any legacy value ignored).

### Phase 3 — Adjust mode
8. Rework `handleFileUpload` to stage the file (`pendingUrl`) and enter adjust mode; do not persist yet.
9. Build `BlueprintAdjustControls`; wire pan/zoom/fit/reset/save/cancel.
10. Add `Adjust` / `Remove` actions in the header/editor for an existing blueprint.
11. Persist on Save; broadcast `storage` + `sort_blueprint_updated`.

### Phase 4 — Verification
12. Builds + lint; manual QA across all 6 surfaces (see §9).

---

## 8. Bug & Regression Register

| ID | Risk | Mitigation |
| --- | --- | --- |
| B1 | Saved alignment differs across surfaces (different container sizes) | Percent-based transform + single shared `BlueprintImage` |
| B2 | `object-cover` crops differently at different aspect ratios | Document; optionally add a per-view `objectFit` prop defaulting to `cover` |
| B3 | localStorage quota exceeded by large images | Downscale/compress on upload; size guard |
| B4 | Legacy blueprints have no transform | Default transform reproduces current look |
| B5 | Removing presets breaks no-image fallback | Keep grid fallback |
| B6 | `storage` event doesn't fire in the same tab | Dispatch custom `sort_blueprint_updated` (existing pattern: `sort_locations_updated`) |
| B7 | Pin dragging vs image panning conflict | Adjust mode disables pin editing; pins render dimmed and non-interactive during adjust |
| B8 | Editor file > 1,000 lines | Extract controls into `BlueprintAdjustControls.tsx` |
| B9 | Touch devices | Use Pointer Events; optional pinch-zoom |
| B10 | `AERIAL` preset was a no-op (fell to grid) | Confirms presets can be removed with no functional loss |

---

## 9. Test & Acceptance Matrix

- [ ] Editor has **no** "Blueprint Canvas Preset" bar; no `DEFAULT`/`ARCHITECTURAL`/`AERIAL`/`Clear Custom Map`.
- [ ] Selecting an image enters Adjust Mode and does **not** persist until Save.
- [ ] Drag pans; wheel + slider zoom; `Fit`/`Reset` behave; `Cancel` discards; `Save` persists.
- [ ] After Save, the same alignment appears in: editor canvas, admin live bin map, student Bin Map, student Submit Report map, teacher location selector, MRF direct pickup map.
- [ ] Re-adjust adjusts the existing image; Remove clears it everywhere.
- [ ] Legacy install (url present, no transform) renders centered `object-cover` (unchanged).
- [ ] Pins remain clickable/draggable outside adjust mode.
- [ ] Large image triggers downscale and never breaks storage.
- [ ] Builds (`npm run build`, `npm --prefix server run build`) and `npm run lint` pass.

---

## 10. Decisions Required

1. **D1 — scope of "remove the blueprint canvas":** remove only the preset bar and keep the neutral grid fallback (recommended), or also delete the `ARCHITECTURAL`/`AERIAL` vector artwork?
2. **D2 — transform model:** `{ scale, offsetX, offsetY }` only (recommended) vs. also `rotation`?
3. **D3 — image fitting:** keep `object-cover` (recommended) vs. switch to `object-fill` (stretch) for exact edge alignment?
4. **D4 — compression:** downscale/re-encode uploads (recommended) or store the raw file as today?
5. **D5 — persistence target:** browser `localStorage` (current) — confirm no backend media storage is desired yet.
6. **D6 — remove actions:** place `Adjust`/`Remove` in the editor header, or inside a small "Blueprint" card where the preset bar used to be?

---

## 11. File Change Summary

| File | Change |
| --- | --- |
| `src/services/locationStore.ts` | Add transform key, type, default, getters/setters |
| `src/components/map/BlueprintImage.tsx` (new) | Shared transformed blueprint renderer |
| `src/pages/admin/components/map/BlueprintAdjustControls.tsx` (new) | Pan/zoom/fit/reset/save/cancel UI |
| `src/pages/admin/components/map/BlueprintPresetBar.tsx` | **Delete** |
| `src/pages/admin/components/map/CampusBlueprintEditor.tsx` | Remove preset state/bar; add adjust mode, save/remove, image downscale |
| `src/pages/admin/components/map/BlueprintCanvas.tsx` | Use `BlueprintImage`; dim/disable pins during adjust |
| `src/pages/admin/components/map/BlueprintHeader.tsx` | Upload triggers adjust mode; add Adjust/Remove actions |
| `src/pages/admin/components/map/CampusLiveMapView.tsx` | Use `BlueprintImage`; drop preset branch |
| `src/pages/student/components/BinMapTab.tsx` | Use `BlueprintImage`; drop preset branch |
| `src/pages/student/components/SubmitReportTab.tsx` | Use `BlueprintImage`; drop preset branch |
| `src/pages/teacher/components/TeacherLocationSelector.tsx` | Use `BlueprintImage`; drop preset branch |
| `src/pages/mrf/components/MRFDirectPickupTab.tsx` | Use `BlueprintImage`; drop preset branch |

---

## 12. Implementation Status (2026-09-14)

**Delivered**
- `locationStore.ts`: added `STORAGE_KEY_BLUEPRINT_TRANSFORM`, `BlueprintTransform`, `DEFAULT_BLUEPRINT_TRANSFORM`, `getStoredBlueprintUrl()`, `getBlueprintTransform()`, `saveBlueprint()`, `clearBlueprint()`, `broadcastBlueprintUpdate()` + the `sort_blueprint_updated` event.
- New `src/components/map/BlueprintImage.tsx`: shared transformed renderer; reads storage + subscribes when props are omitted; applies `translate(offsetX%, offsetY%) scale(scale)`.
- New `src/pages/admin/components/map/BlueprintAdjustControls.tsx`: pan/zoom hint, zoom slider + in/out, Reset, Fit, Cancel, Save.
- `CampusBlueprintEditor.tsx`: upload now downscales the image, stages it, and enters adjust mode; drag-to-pan and wheel/scroll zoom; Save persists URL + transform; Replace/Adjust/Remove actions. The instant-persist upload and `selectedPreset` were removed.
- `BlueprintHeader.tsx`: shows Replace/Adjust/Remove when a blueprint exists; hides bin actions while adjusting.
- `BlueprintCanvas.tsx`: uses `BlueprintImage` with live draft transform; pins dimmed/non-interactive during adjust.
- `BlueprintPresetBar.tsx`: **deleted**.
- Consumers migrated to `BlueprintImage` and preset branches removed: `CampusLiveMapView`, `BinMapTab`, `SubmitReportTab`, `TeacherLocationSelector` (+ `TeacherSubmitReportTab`), `MRFDirectPickupTab`.

**Verified**
- Preset bar is gone; grid fallback still renders when no image.
- Upload → adjust → Save flow works; nothing persists until Save.
- Pan + zoom confirmed (result `{scale:1.2, offsetX:24, offsetY:9.6}`), and the identical transform renders on the admin Bin Map surface.
- Legacy installs (URL without transform) render centered `object-cover` (unchanged).
- `npm run build` and `npm run lint` (0 errors) pass.

**Deferred**
- Rotation/cropping (non-goals for v1).
- Server-side media storage (still `localStorage`).
- The legacy `sort_blueprint_preset` key is still removed on `clearBlueprint()` for cleanup but is otherwise ignored.
