# S.O.R.T. Admin Console — UI Polish & Modularization Plan

> **Scope**: Admin Console only — shell, all 12 nav destinations, 13 settings sub-tabs, map/blueprint editor
> **Depth**: Visual + structural (token hygiene, shared primitives, file-size compliance)
> **Status**: Planning complete — awaiting decision sign-off before implementation
> **Supersedes**: `UI_REFINEMENT_PLAN.md` (its remaining unshipped deltas are folded into Phase 2 below)
> **Constraint**: AGENTS.md — no source file may approach 1,000 LOC; strict design tokens; no emoji; lucide-react icons only

---

## 1. Executive Summary

The admin console is functionally rich but visually uneven. A code-level audit (not the stale
screenshots in `references/ADMIN PAGES/`, which predate the current white-shell design) found:

**Blockers**

| # | Issue | Evidence | Impact |
|---|-------|----------|--------|
| B1 | `AdminReportsTab.tsx` is 926 lines and climbing toward the 1,000 limit; `AdminUsersTab` 808, `AdminCollectionsTab` 736, `AdminDashboard` 652, `AdminImpactTab` 643, `AdminLedgerPage` 592 | line counts | AGENTS.md violation risk, 5 files |
| B2 | `--text-strong` resolves to neutral gray `#111827`, not brand evergreen `#00271D` | `src/index.css:37`, `src/hooks/useTheme.tsx:157` | ~1,079 usages render off-brand |
| B3 | `animate-fade-in` (86 uses) and `animate-scale-up` (2 uses) have no keyframes — every entrance animation silently does nothing | only `@keyframes sheet-up` exists, `src/index.css:177` | app feels static |
| B4 | Tenon/Korolev are never loaded (no files in `public/`, no `@font-face`) | `src/index.css:1` imports Plus Jakarta + JetBrains Mono only | all 82 `font-heading` usages fall back |
| B5 | `AdminCollectionsTab` contains unreachable UI: filter state (`:67-68`), `filteredReports` (`:175-186`), and 3 modals (`:568-733`) whose only setters are `null` calls | audit | dead code masking real UX gaps |

**Quality debt**

- 12 emoji in admin UI strings (policy: lucide only) — `AdminReportsTab:854-856`, `AdminPointsSystemTab:15-17,39`, `MRFMarketTab` is MRF, `AdminReportDetailModal:119-122`, `StationInspector:159`
- ~64 hardcoded bracket hex values, including approved indicator hues (`#FF5722`, `#10B981`, `#0091EA`) that should be tokenized
- 5 native `window.confirm` + 2 `alert` instead of styled modals — `AdminDashboard:75`, `AdminLedgerPage:150`, `AdminRewardsTab:52,74`, `CampusBlueprintEditor:182,188`
- 3 competing toast implementations (`AdminDashboard:235-240` pulses; `MRFDashboard:350`; settings tabs inline banners)
- 4 modal backdrop recipes (`bg-black/50`, `bg-black/60`, `bg-slate-900/40`, `bg-slate-900/50`); only 2 files route through `ModalPortal`
- Loading states: plain "Loading..." text (`AdminAuditLogsTab:120`, `AdminCampusNewsTab:145`) vs spinners vs spinner+label
- Dark-theme leftovers: `bg-[#0b141a]` advisory card (`AdminAuditLogsTab:152`), dark `.glass-panel` in `src/index.css:109-153` (used by `App.tsx:51`), dark scrollbar track
- Dead controls: no-op refresh button (`AdminLeaderboardTab:72-77`), non-interactive "View Bin Map" span (`AdminImpactTab:634-637`)
- Duplicated logic that must be shared: dispatch-MRF modal (Reports + Collections), dismiss/flag modal + auto-severity, status badges, timestamps, KPI cards, empty states, pagination

---

## 2. Scope & Boundaries

**In scope**

- `src/components/layout/DashboardLayout.tsx`, `DashboardNavContent.tsx`, `dashboardNav.ts`, `MobileBottomNav.tsx`, `MobileNavSheet.tsx` — admin-facing shell (shared with MRF; see D3)
- `src/pages/admin/AdminDashboard.tsx` and everything under `src/pages/admin/components/**` (tabs, settings sub-tabs, map, blueprint)
- `src/hooks/useTheme.tsx` — only the `--text-strong` decision (D1)
- `src/index.css` — motion keyframes, font-face hooks, token additions, dark leftovers
- Shared primitives created in `src/components/common/**` and `src/utils/**`

**Out of scope (flag only, do not touch this session)**

- Student, Teacher, MRF dashboards and public landing page (MRF shares the shell — coordinated per D3)
- Backend/API behavior. UI-only changes must not alter data flow
- `MRFDashboard.tsx` (1,217 lines) and `useMockData.tsx` (1,181 lines) already violate the 1,000-line rule; tracked as follow-up work, not part of this plan

---

## 3. Decision Points (sign-off required before Phase 1)

| ID | Decision | Options | Recommendation |
|----|----------|---------|----------------|
| **D1** | Text color token | **A)** Change `--text-strong` to `#00271D` in `index.css:37` + `useTheme.tsx:157`. **B)** Keep `#111827` for body, add `--text-brand` for headings/metrics. **C)** Leave as-is | **A** — AGENTS.md defines main text/headings as `#00271D`; opacity modifiers (`/40`–`/70`) already provide hierarchy. One change, app-wide brand restoration |
| **D2** | Tenon/Korolev fonts | **A)** Self-host licensed woff2 in `public/fonts/` + `@font-face`. **B)** Keep Plus Jakarta Sans as the documented fallback and add the `@font-face` hooks so licensed fonts can drop in later. **C)** Substitute Google fonts | **B** (unblock now, zero visual risk), upgrade to A when font files are supplied. Font stacks already list Plus Jakarta as fallback |
| **D3** | Shared shell changes | **A)** Apply shell fixes to both admin and MRF (consistency). **B)** Admin-only overrides (creates drift) | **A** — but every shell edit is listed explicitly in Phase 1 and smoke-tested against the MRF terminal |
| **D4** | Structural refactor depth | **A)** Full extraction per §7 (target ≤400 LOC/file). **B)** Minimum: get under 600 LOC, extract only shared primitives | **A**, phased — the extraction tables already exist and eliminate duplicated modals/badges |
| **D5** | Vibrant indicator hues | AGENTS.md assigns `#FF5722` (report/action), `#10B981` (impact), `#0091EA` (bin map), etc. They are currently bracket-hex and mixed with generic Tailwind blues | Tokenize the approved hues as CSS variables; use them **only** for their designated modules; everything else uses `--accent`/`--gold`/`--primary` + semantic rose/amber. No new hues |

---

## 4. Design Contract (single source of truth for every edit)

### 4.1 Surfaces

| Element | Recipe |
|---------|--------|
| Page section container | `bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm` |
| Content card / module | `bg-white/90 border border-white/80 rounded-2xl p-5 shadow-sm` |
| Inner list row | `bg-gray-50/80 hover:bg-white rounded-2xl border border-gray-100 transition-all` |
| Header bar | `bg-white/85 backdrop-blur-xl border-b border-[var(--primary)]/10` (keep) |
| Sidebar | `bg-white/90 backdrop-blur-xl border-r border-[var(--primary)]/10` (fix `/8` → `/10`) |

**Banned**: `bg-white/95` without blur, `bg-white` + `border-gray-200` on top-level cards, `bg-[#FFFFFF]/90`, slate palette, dark surfaces.

### 4.2 Radius hierarchy

- Nav capsule / tabs / pills / avatars: `rounded-full`
- Page containers & modals: `rounded-3xl`
- Cards & modules: `rounded-2xl`
- Buttons, inputs, badges, icon tiles: `rounded-xl`

### 4.3 Buttons

| Variant | Recipe |
|---------|--------|
| Primary | `bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white rounded-xl text-xs font-bold shadow-md shadow-[var(--accent)]/20` |
| Secondary | `bg-white border border-[var(--primary)]/10 hover:bg-[var(--primary)]/5 text-[var(--text-strong)] rounded-xl text-xs font-bold` |
| Destructive | `bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 rounded-xl text-xs font-bold` |
| Ghost / icon | `text-[var(--text-strong)]/50 hover:text-[var(--text-strong)] hover:bg-[var(--primary)]/5 rounded-xl p-2` |

Every icon-only button gets `aria-label` and `title`.

### 4.4 Status pills & badges

`text-[10px] font-bold px-2.5 py-0.5 rounded-full border` with tinted backgrounds only:
accent → `bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20`;
gold → `bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--gold)]/25`;
neutral → `bg-[var(--primary)]/10 text-[var(--text-strong)] border-[var(--primary)]/25`;
danger → `bg-rose-50 text-rose-700 border-rose-200`; warning → `bg-amber-50 text-amber-700 border-amber-200`.

One `ReportStatusBadge` component replaces 4 inline implementations (see §7).

### 4.5 Tables

- Head: `border-b border-[var(--primary)]/10 text-[var(--text-strong)]/40 font-bold uppercase tracking-wider bg-[var(--primary)]/5` (replace `bg-gray-50/50`, `border/8`)
- Row hover: `hover:bg-[var(--accent)]/5`; dividers `divide-[var(--primary)]/5`
- No slate, no `#FAF8F5` zebra (see `LedgerSheetTable.tsx:139-230`)

### 4.6 Modals & dialogs

- Always rendered through `ModalPortal` (`src/components/common/ModalPortal.tsx`) — fixes stacking-context bugs
- Backdrop: `bg-[var(--primary)]/40 backdrop-blur-sm` (single recipe, replaces 4 variants)
- Panel: `bg-white rounded-3xl shadow-2xl border border-white/80`, header with title + `X` (aria-label), footer actions right-aligned
- `ConfirmDialog` replaces all `window.confirm`/`alert`; ESC + backdrop click close; focus trapped on open

### 4.7 Feedback states

| State | Component | Spec |
|-------|-----------|------|
| Toast | `Toast` + `useToast()` | top-right `top-20 right-6`, `rounded-2xl shadow-xl border`, success = accent icon, **no** `animate-pulse` |
| Loading | `LoadingState` | spinner + label inside `bg-white/90 rounded-3xl p-12`, replaces plain "Loading..." rows |
| Empty | `EmptyState` | icon tile + title + hint + optional action, centered |
| Error | `ErrorState` | rose tinted banner + Retry button (adds missing retry to `AdminRewardsTab:180-184`, `AdminAuditLogsTab:34-36`) |

### 4.8 Motion

```css
@keyframes fade-in  { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
@keyframes scale-up { from { opacity: 0; transform: scale(.97); }        to { opacity: 1; transform: none; } }
.animate-fade-in  { animation: fade-in .2s cubic-bezier(.16,1,.3,1); }
.animate-scale-up { animation: scale-up .18s cubic-bezier(.16,1,.3,1); }
@media (prefers-reduced-motion: reduce) { .animate-fade-in, .animate-scale-up { animation: none; } }
```

Hover/transition duration 150–200 ms; no competing `animate-pulse` + `animate-bounce`.

### 4.9 Typography

Tab header pattern (currently 5 variants):
badge `text-[10px] font-bold uppercase tracking-wider` → `h2 text-2xl font-extrabold tracking-tight text-[var(--text-strong)]` → subtitle `text-xs text-[var(--text-strong)]/50`.
Metric value `text-3xl font-extrabold tracking-tight`; metric label `text-[11px] font-bold uppercase tracking-wider opacity-60`.

---

## 5. Shared Primitives To Create (Phase 1)

| New file | Replaces | Consumed by |
|----------|----------|-------------|
| `src/components/common/Toast.tsx` + `src/hooks/useToast.tsx` | 3 toast systems | AdminDashboard, MRFDashboard (shared), all settings tabs |
| `src/components/common/ModalShell.tsx` | 4 backdrop recipes | all admin modals |
| `src/components/common/ConfirmDialog.tsx` | 5 `window.confirm` + 2 `alert` | AdminDashboard, AdminLedgerPage, AdminRewardsTab, CampusBlueprintEditor |
| `src/components/common/ReportStatusBadge.tsx` | 4 inline badge renderers | Reports, Collections, Detail modal, Ledger |
| `src/components/common/LoadingState.tsx` / `EmptyState.tsx` / `ErrorState.tsx` | 6+ ad-hoc blocks | all tabs |
| `src/components/common/StatCard.tsx` | KPI card markup | Collections, Ledger, Rewards, Overview |
| `src/components/common/DataTable.tsx` (promote `LedgerSheetTable` pagination) | pagination bars | Ledger, Rewards catalog, Users table |
| `src/pages/admin/components/reports/DispatchMrfModal.tsx` | duplicated dispatch forms (`AdminReportsTab:731-804`, `AdminCollectionsTab:601-673`) | Reports, Collections |
| `src/pages/admin/components/reports/DismissReportModal.tsx` + `computeOffenseSeverity()` util | duplicated dismiss logic (`AdminReportsTab:273-303,806-922`, `AdminCollectionsTab:208-226,675-733`) | Reports, Collections |
| `src/utils/dateFormat.ts` | 4 timestamp helpers | Reports, Collections, Detail modal, Ledger |
| `src/utils/reportQueueUtils.ts` | `getTimeMs` ×3 (`AdminReportsTab:95-112`, `MRFDashboard:136-153`, `ReportHistoryTab:99-116`) | Reports, MRF, Student history |

---

## 6. Workstreams

### WS1 — Foundations (Phase 1)

- [ ] D1: set `--text-strong` to `#00271D` in `src/index.css:37` and `src/hooks/useTheme.tsx:157`
- [ ] Add `fade-in` / `scale-up` keyframes + reduced-motion guard (`src/index.css`)
- [ ] Add `@font-face` hooks for Tenon/Korolev per D2; correct the `font-heading` fallback story
- [ ] Tokenize approved indicator hues (`--action: #FF5722`, `--impact: #10B981`, `--bin-map: #0091EA`) per D5
- [ ] Create all primitives in §5 with unit tests where pure (`dateFormat`, `computeOffenseSeverity`)
- [ ] Remove dark leftovers: `.glass-panel`/`.glass-input` (or repoint to light), dark scrollbar track, `App.tsx:51` usage
- [ ] Add `aria-label`/`title` to all icon-only buttons; toast container gets `aria-live="polite"`

### WS2 — Shell & Navigation (Phase 1, D3)

- [ ] Header: unify surfaces (`DashboardLayout.tsx:65` `bg-white/85` — keep, verify MRF), notification dropdown radius `rounded-xl` → `rounded-2xl` (`:88`), replace `bg-gray-50`/`border-gray-100` internals with token tints
- [ ] Sidebar: `/8` → `/10` (`:182,186`), slate removal (`:152`), logo size consistency, footer `text-gray-400` → token (`DashboardNavContent.tsx:207`)
- [ ] Mobile: delete duplicated bottom nav in `StudentLayout` (out of scope — flag), verify `MobileBottomNav`/`MobileNavSheet` radii + backdrops
- [ ] Standardize page padding/scroll behavior across admin tabs (currently `space-y-6` vs `space-y-4` mix)
- [ ] Verify nav registry: `dashboardNav.ts` ADMIN sections match rendered tabs; remove unused `NavItem.roles` or enforce it

### WS3 — Overview & Analytics (Phase 2)

- [ ] Extract inline views from `AdminDashboard.tsx` (652): `admin/overview/AdminOverviewTab.tsx` (`:244-373`), `admin/warnings/AdminWarningsTab.tsx` (`:434-565`), `admin/sync/AdminSyncLogsTab.tsx` (`:578-648`) → shell drops to ~120 lines
- [ ] Overview: replace `bg-gray-200/80` tracks and `text-gray-900` (`:329,356`) with tokens; unify 3 quick-stat cards with `StatCard`; fix `hover:border-emerald-300` → `hover:border-[var(--accent)]/40`
- [ ] `AdminImpactTab.tsx` (643) — remaining deltas from `UI_REFINEMENT_PLAN.md`:
  - [ ] `#FF5722` → `--action` token (`:269,576`)
  - [ ] inline `height:'140px'` (`:548,555`) → Tailwind `h-35`-equivalent fixed bar track
  - [ ] non-interactive "View Bin Map" span (`:634-637`) → real button wired to `setActiveTab('admin-bin-map')` (needs prop pass-through from `AdminDashboard`)
  - [ ] prune unused imports (`Target`, `ArrowUpRight`, `TrendingUp`, `Clock`, `AlertTriangle`, `Check`, `X`, `RefreshCw`)
  - [ ] extract `ImpactKpiRow`, `GradeParticipationCard`, `WasteCompositionCard`, `MonthlyVolumeChart`, `HotspotsCard` into `admin/impact/` (file ≤400)
- [ ] `AdminAnalyticsEquationsCard.tsx` (278) — token pass for gray/amber accents

### WS4 — Reports (Phase 2/3, structural)

- [ ] Split `AdminReportsTab.tsx` (926) per §7 table: utils, header, category pills, bulk bar, location group card, queue row, dispatch modal, dismiss modal, `useReportQueue` → target ~180 lines
- [ ] Deduplicate the asset-detection expression (`:188-193, 567-572, 646-651`) into one helper
- [ ] Unify row badges with `ReportStatusBadge`; replace blue "Dispatch Collector" fill with primary/secondary button recipe (`:520-530`)
- [ ] Backdrop → `ModalShell`; add ESC/backdrop close to both modals
- [ ] `AdminReportDetailModal.tsx` (382): extract `ScatteredDebrisMiniMap.tsx` (`:41-54, 204-265`), replace hardcoded SVG grays (`:217-239`) with token tints; use `PhotoLightbox` (already does); unify status pills
- [ ] `AdminBinMapTab.tsx` + `map/CampusLiveMapView.tsx`: replace `text-[#0091EA]` with `--bin-map` token (`:53`), unify legend/marker recipe

### WS5 — Collections & Ledger (Phase 3, structural)

- [ ] **Purge dead code in `AdminCollectionsTab.tsx` (736)**: filter state (`:67-68`), `filteredReports` (`:175-186`), 3 unreachable modals (`:568-733`) — audit confirms setters only ever called with `null`
- [ ] Extract `CollectionsKpiGrid.tsx`, `RecyclablesSummaryGrid.tsx`, `useCollectionsMetrics.ts`; reuse `DispatchMrfModal`/`DismissReportModal`; drop 7 unused icon imports + `isReportDoneAndExpired`
- [ ] `AdminLedgerPage.tsx` (592): extract `ledgerSheets.tsx` (`:185-268`), `LedgerToolbar.tsx` (`:319-422`), `LedgerKpiStrip.tsx`, `LedgerRowDetailDrawer.tsx` (`:526-576`), `ledgerCells.tsx` (`:53-76`), `exportLedgerCsv.ts` (`:279-304`)
- [ ] `LedgerSheetTable.tsx` (353): remove slate + `#FAF8F5` palette (`:139-230`), promote pagination to `DataTable`
- [ ] Replace `window.confirm` in Ledger (`:150`) with `ConfirmDialog`

### WS6 — People & Content (Phase 3)

- [ ] `AdminUsersTab.tsx` (808) split per §7: `userRoleConfig.ts`, `UsersHeader`, `UsersToolbar`, `UsersTableView`, `UsersGroupedView`, `UserProfileInspectorModal`, `useUserDirectory` → target ~150
- [ ] Replace `ASC ↑`/`DESC ↓` text glyphs (`:384,411,417`) with `ArrowUp`/`ArrowDown` icons; route inspector modal through `ModalShell`
- [ ] `AdminLeaderboardTab.tsx`: wire dead refresh button (`:72-77`) to recompute or remove; podium colors → gold/accent/primary tokens; `bg-gray-100` rank pill → `--primary` tint
- [ ] `AdminRewardsTab.tsx`: `window.confirm` → `ConfirmDialog` (`:52,74`); `bg-white/95` → `bg-white/90 backdrop-blur-md` (`:150`); loading card → `LoadingState`; error banner gets Retry
- [ ] `AdminAuditLogsTab.tsx`: remove `bg-[#0b141a]` dark advisory (`:152`) → light amber advisory; `Loading...` row → `LoadingState`; add retry on fetch failure; table head tokens
- [ ] `AdminCampusNewsTab.tsx`: loading state (`:145`), backdrops (`:181,225`) → `ModalShell`; empty state → `EmptyState`
- [ ] `RewardCatalogTable.tsx` / `RewardClaimQueue.tsx`: `bg-white/95` → standard recipe; `#8a6b12`/`#b0881e` hover hex → `gold-dark` token

### WS7 — Settings & Map (Phase 4)

- [ ] `AdminSettingsTab.tsx` (469): extract `AdminItemPresetsTab.tsx` (state `:116-245` + UI `:271-415`), `presetDefaults.ts` (`:34-98`), `AdminDangerZoneTab.tsx` (`:437-466`); remove 9 unused icon imports + dead `smartSync` (`:114`) → ~100 lines
- [ ] Settings sub-tabs pass: unify toast usage (Challenges `:96`, Branding `:205-216`, Sync `:172`) to `useToast`; unify loading (Sync `:160-165`, Challenges `:85-91`, Branding `:196-199`) to `LoadingState`; fix gold hover hex (`AdminCertificateTab:150`); remove emoji from `AdminPointsSystemTab:15-17,39`; remove `localhost:5000` fetch from `AdminAcademicCalendarTab:55`
- [ ] `CampusBlueprintEditor.tsx` (510): extract `blueprintUtils.ts` (`:31-67`), `useBlueprintEditor.ts` (`:103-113,169-261`), `useBinLocationEditor.ts` (`:72-98,149-162,263-366`), `useRoomLocations.ts` (`:115-147`); replace `alert` (`:182,188`) with toast; local toast → shared `Toast`
- [ ] Map component sweep: `StationInspector.tsx` emoji (`:159`) → lucide; `AdminReportDetailModal`/`CampusLiveMapView` SVG grays → tokens; `StationModals`/`RoomModals` backdrop + radius consistency
- [ ] `AdminBrandingTab.tsx` (355): verify swatch/input recipes match §4; this tab defines tenant colors — add a note that token edits must not break tenant theming (test with a non-default tenant color)

### WS8 — Cleanup Sweep (Phase 5)

- [ ] Zero emoji in admin UI strings (grep gate)
- [ ] Zero bracket-hex outside token definitions (grep gate)
- [ ] Zero `window.confirm`/`window.prompt`/`alert` in admin (grep gate)
- [ ] Zero `bg-white/95`, `bg-gray-50/50`, `border-gray-200`, `text-gray-*`, `bg-slate-*` in admin files (grep gate, allow-list documented)
- [ ] All overlays through `ModalPortal`; all modals ESC-closable
- [ ] Remove `AdminAnalyticsEquationsCard` if unused after WS3 (verify imports)
- [ ] Delete unreachable components/functions found during splits

---

## 7. Structural Refactor Map (extraction tables)

### AdminReportsTab.tsx (926 → ~180)
| New file | Lines | Contents |
|---|---|---|
| `reports/reportQueueUtils.ts` | 27-44, 95-112 | TZ const, `isSameLocalDay`, `getTimeMs` |
| `reports/ReportsHeader.tsx` | 321-349 | header banner + refresh/clear |
| `reports/ReportsCategoryPills.tsx` | 351-412 | category pills + search/status |
| `reports/ReportsBulkActionBar.tsx` | 414-450 | select-all + verify-selected |
| `reports/ReportLocationGroupCard.tsx` | 461-716 | group header + nested list |
| `reports/ReportQueueRow.tsx` | 566-629, 645-708 | active/completed row variants |
| `reports/DispatchMrfModal.tsx` | 731-804 | shared MRF picker |
| `reports/DismissReportModal.tsx` | 806-922, 273-303 | false-report + severity |
| `reports/useReportQueue.ts` | 69-176, 179-249 | state, handlers, filters |

### AdminUsersTab.tsx (808 → ~150)
| New file | Lines | Contents |
|---|---|---|
| `users/userRoleConfig.ts` | 36-110 | ROLE_ORDER/CONFIG/PERMISSIONS |
| `users/UsersHeader.tsx` | 236-282 | title + view switcher |
| `users/UsersToolbar.tsx` | 284-388 | role pills + search/sort/status |
| `users/UsersTableView.tsx` | 400-541 | table |
| `users/UsersGroupedView.tsx` | 543-629 | grouped cards |
| `users/UserProfileInspectorModal.tsx` | 631-802 | inspector |
| `users/useUserDirectory.ts` | 119-217 | filter/sort/group |

### AdminCollectionsTab.tsx (736 → ~120, after dead-code purge)
`collectionsConfig.ts` (`:44-55, 118-172, 282-340`), `CollectionsKpiGrid.tsx` (`:380-416`), `RecyclablesSummaryGrid.tsx` (`:418-565`), `useCollectionsMetrics.ts` (`:81-115`).

### AdminLedgerPage.tsx (592 → ~150)
`ledgerFormatters.ts` (`:32-36`), `LedgerStatusBadge.tsx` (`:38-51`), `ledgerCells.tsx` (`:53-76`), `ledgerSheets.tsx` (`:185-268`), `LedgerToolbar.tsx` (`:319-422`), `LedgerKpiStrip.tsx` (`:306-315, 444-453`), `LedgerRowDetailDrawer.tsx` (`:526-576`), `exportLedgerCsv.ts` (`:279-304`).

### AdminSettingsTab.tsx (469 → ~100)
`presetDefaults.ts` (`:34-98`), `AdminItemPresetsTab.tsx` (`:116-245, 271-415`), `AdminDangerZoneTab.tsx` (`:437-466`).

### AdminDashboard.tsx (652 → ~120)
`AdminOverviewTab.tsx` (`:244-373`), `AdminWarningsTab.tsx` (`:434-565`), `AdminSyncLogsTab.tsx` (`:578-648`).

### AdminImpactTab.tsx (643 → ~400)
`impact/ImpactKpiRow.tsx` (`:264-354`), `impact/GradeParticipationCard.tsx` (`:356-433`), `impact/WasteCompositionCard.tsx` (`:435-508`), `impact/MonthlyVolumeChart.tsx` (`:510-569`), `impact/HotspotsCard.tsx` (`:571-639`).

### AdminReportDetailModal.tsx (382 → ~250)
`reports/ScatteredDebrisMiniMap.tsx` (`:41-54, 204-265`); optional header/reporter/actions extraction if it grows.

---

## 8. Phased Execution & Gates

| Phase | Workstreams | Exit gate |
|-------|-------------|-----------|
| **0 — Baseline** | Capture admin screenshots per tab; record line counts; run `scripts/color-audit.mjs` and save report | Baseline artifacts stored |
| **1 — Foundations** | WS1, WS2 | `npm run lint` + `npm run build` pass; shell smoke-tested on Admin **and** MRF |
| **2 — Core tabs** | WS3, WS4 | Impact/Overview/Reports pixel-reviewed; `AdminReportsTab` ≤400 LOC; no regression in report verify/dispatch/reject flows |
| **3 — Ops tabs** | WS5, WS6 | Collections dead code gone; Ledger/Users ≤400 LOC; rewards release/cancel flows re-tested |
| **4 — Settings & Map** | WS7 | All 13 settings sub-tabs render; blueprint edit/save + map flows re-tested |
| **5 — Cleanup & verify** | WS8 + §9 | All grep gates clean; color-audit delta documented; `npm run verify` (or documented subset) green |

Recommended order inside each phase: **primitives → structural split → visual polish** so polish is applied once to final component boundaries.

---

## 9. Verification & Acceptance Criteria

**Commands**
- `npm run lint` (oxlint) — zero new warnings
- `npm run build` — zero TS/bundle errors
- `npm run test:unit` — existing vitest suites pass
- `npm run test:ui` — Playwright admin flows (reports verify/dispatch, rewards, mobile nav)
- `node scripts/color-audit.mjs` — run with dev server + API up; off-brand counts must not increase, and approved `#0091EA` Bin Map usage must be whitelisted/documented
- File-size gate: no admin source file > 600 LOC (target), hard ceiling 1,000 (AGENTS.md)

**Grep gates (admin files)**
```
rg "🎉|⚠️|💰|🚫|🔥|🏗️|✕|✓|⏳" src/pages/admin src/components/layout
rg "#[0-9a-fA-F]{6}" src/pages/admin --glob '!**/AdminBrandingTab.tsx'   # only token defs allowed
rg "window\.(confirm|prompt)|[^.]\balert\(" src/pages/admin
rg "bg-white/95|text-gray-|bg-slate-|border-gray-200" src/pages/admin
```

**Visual QA (manual, per tab)**
- Screenshot before/after at 1440×900 and 390×844
- Cards equal height in KPI rows; consistent radius per §4.2
- Every modal: opens via portal, ESC/backdrop close, focus visible
- Toasts: no pulse, consistent position, `aria-live`
- Reduced-motion emulation: no entrance animation, no layout shift

**Acceptance**
1. Brand text renders `#00271D`; heading font behavior documented per D2
2. Entrance motion exists and respects reduced motion
3. All admin overlays use one shell; all destructive actions use `ConfirmDialog`
4. No admin file approaches 1,000 LOC; the five largest admin files ≤ 400 LOC
5. Zero emoji, zero native dialogs, zero off-token gray/slate surfaces in admin
6. No functional regression in verify → dispatch → collect → reward flows

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Global `--text-strong` change alters every dashboard | Decision D1 explicitly covers app-wide impact; smoke-test student/teacher/MRF after Phase 1 (read-only) |
| Shell edits affect MRF terminal | D3; MRF smoke checklist in Phase 1 gate |
| Large splits introduce regressions in complex flows (batch verify, dismiss auto-offense) | Extract pure logic first + add unit tests for `computeOffenseSeverity`, filters; re-run Playwright UI suite per phase |
| Tenant theming broken by token edits | Test `AdminBrandingTab` with a non-default tenant color before/after; tokens are runtime CSS variables — never hardcode over them |
| Dead-code purge in Collections removes something reachable via a path missed by static analysis | Verify with runtime: load Collections, attempt every interaction; keep purge as its own commit |
| `animate-fade-in` addition changes perceived layout on 86 elements | Short 200 ms transform-only animation; reduced-motion guard; verify no scrollbar flash |

---

## 11. Open Questions

1. Do licensed Tenon/Korolev woff2 files exist anywhere (design team / brand kit)? (D2)
2. Is `AdminAnalyticsEquationsCard` still rendered anywhere? Audit says it exists but did not confirm a consumer — confirm before deleting.
3. Should the mobile bottom nav remain admin-only 4 items, or surface "Collections" instead of "Users"? (out of polish scope, noted)
4. Is `scripts/color-audit.mjs` the official regression gate for this effort, or is screenshot review sufficient?

---

## Appendix A — Known Off-Token Inventory (admin)

- Hardcoded approved hues: `#FF5722` (`AdminImpactTab:269,576`, `CampusLiveMapView:52`), `#10B981` (`AdminImpactTab:105`), `#0091EA` (`CampusLiveMapView:53`)
- Gold hover hex: `#b38a20` (`AdminCertificateTab:150`), `#8a6b12` (`RewardClaimQueue:13`), `#b0881e` (`MRFMarketTab:122`, MRF)
- Ledger off-white: `#FAF8F5` (`LedgerSheetTable:139,142,227,230`)
- Dark surface: `#0b141a` (`AdminAuditLogsTab:152`)
- Map canvas grays: `#f8fafc`, `#E2E8F0`, `#cbd5e1`, `#475569` (`AdminReportDetailModal:217-239`, `CampusLiveMapView:177-203`)
- Opacity non-standard: `border-[var(--primary)]/8` (`DashboardLayout:65,168,182,186`, tables)
- Inline styles to remove: `height:'140px'` (`AdminImpactTab:548,555`), login gradients (`AdminLogin:47,61,113`)

## Appendix B — Audit Method

Code-level audit (grep + full-file reads of all admin entry points), structural analysis of the 8 largest admin files, `scripts/color-audit.mjs` review, and comparison against `AGENTS.md` design tokens. The screenshots in `references/ADMIN PAGES/` predate the current shell (dark navy sidebar, blue dispatch buttons) and were treated as historical, not current-state evidence.
