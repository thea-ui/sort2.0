# S.O.R.T. Admin Console — UI Polish & SMART Parity Plan

> **Scope line (SMART handoff §1.5 protocol)**: `Scope: SORT/MRF — sections: §2.1–§2.5, §3, §4, §5.1–§5.2, §4.4, §6`
> **UI scope**: Admin Console only — shell, all 12 nav destinations, 13 settings sub-tabs, map/blueprint editor
> **Depth**: Visual + structural (token hygiene, shared primitives, SMART component architecture, file-size compliance)
> **Status**: **APPROVED FOR AUTONOMOUS EXECUTION** — D1 (derived text rule), D6 (frontend-only pattern port), D7 (DM Sans) resolved. All work is governed by the Anti-Regression Protocol (§13) and the Autonomous Execution Contract (§14). Progress is journaled to `UI_POLISH_LOG.md`.
> **Supersedes**: `UI_REFINEMENT_PLAN.md` (its remaining unshipped deltas are folded into Phase 2 below)
> **Constraints**: AGENTS.md — no source file may approach 1,000 LOC; strict brand tokens; no emoji; lucide-react only
> **Parity source**: `C:\Users\NACION\Downloads\SMART DESIGN HANDOFF TO ENROLLPRO, ATLAS, AIMS, and SORT.md` (1,158 lines). SMART's repo (`C:\Users\Sean\Desktop\SMART_FINAL_CAPSTONE`) is not available on this machine — the handoff doc is the contract.

---

## 1. Executive Summary

The admin console is functionally rich but structurally inconsistent and visually uneven. A code-level
audit (not the stale screenshots in `references/ADMIN PAGES/`, which predate the current white-shell
design) plus a full read of the SMART design handoff found:

**Blockers**

| # | Issue | Evidence | Impact |
|---|-------|----------|--------|
| B1 | `AdminReportsTab.tsx` is 926 lines and climbing toward the 1,000 limit; `AdminUsersTab` 808, `AdminCollectionsTab` 736, `AdminDashboard` 652, `AdminImpactTab` 643, `AdminLedgerPage` 592 | line counts | AGENTS.md violation risk, 5 files |
| B2 | `--text-strong` resolves to neutral gray `#111827`, not brand evergreen `#00271D` | `src/index.css:37`, `src/hooks/useTheme.tsx:157` | ~1,079 usages render off-brand |
| B3 | `animate-fade-in` (86 uses) and `animate-scale-up` (2 uses) have no keyframes — every entrance animation silently does nothing | only `@keyframes sheet-up` exists, `src/index.css:177` | app feels static |
| B4 | Tenon/Korolev are never loaded (no files in `public/`, no `@font-face`) | `src/index.css:1` imports Plus Jakarta + JetBrains Mono only | all 82 `font-heading` usages fall back |
| B5 | `AdminCollectionsTab` contains unreachable UI: filter state (`:67-68`), `filteredReports` (`:175-186`), and 3 modals (`:568-733`) whose only setters are `null` calls | audit | dead code masking real UX gaps |
| B6 | No SMART-parity infrastructure: no generic `DataTable`, no `PageHeader`/`SearchInput`/`StatCard`, no `AppModal`/`ConfirmDialog`, no toast library, no skeleton/empty/error state system | repo-wide | every admin tab hand-rolls tables, headers, modals, toasts — the root cause of the inconsistency |

**Quality debt**

- 12 emoji in admin UI strings (policy: lucide only) — `AdminReportsTab:854-856`, `AdminPointsSystemTab:15-17,39`, `AdminReportDetailModal:119-122`, `StationInspector:159`
- ~64 hardcoded bracket hex values, including approved indicator hues (`#FF5722`, `#10B981`, `#0091EA`) that should be tokenized
- 5 native `window.confirm` + 2 `alert` instead of styled modals — `AdminDashboard:75`, `AdminLedgerPage:150`, `AdminRewardsTab:52,74`, `CampusBlueprintEditor:182,188`
- 3 competing toast implementations (`AdminDashboard:235-240` pulses; `MRFDashboard:350`; settings tabs inline banners)
- 4 modal backdrop recipes (`bg-black/50`, `bg-black/60`, `bg-slate-900/40`, `bg-slate-900/50`); only 2 files route through `ModalPortal`
- Loading states: plain "Loading..." text (`AdminAuditLogsTab:120`, `AdminCampusNewsTab:145`) vs spinners vs spinner+label
- Dark-theme leftovers: `bg-[#0b141a]` advisory card (`AdminAuditLogsTab:152`), dark `.glass-panel` in `src/index.css:109-153` (used by `App.tsx:51`), dark scrollbar track
- Dead controls: no-op refresh button (`AdminLeaderboardTab:72-77`), non-interactive "View Bin Map" span (`AdminImpactTab:634-637`)
- Duplicated logic that must be shared: dispatch-MRF modal (Reports + Collections), dismiss/flag modal + auto-severity, status badges, timestamps, KPI cards, empty states, pagination

---

## 2. SMART Handoff Alignment (new parity target)

### 2.1 What the handoff requires of SORT/MRF

Per §1.5 routing, SORT/MRF implements **§2 (branding), §3 (tokens), §4 (component catalog), §5.1–§5.2 (SSO launch + header chrome), §4.4 (feedback), §6 (checklists)**.

| Handoff area | SORT status | Action |
|---|---|---|
| §2.1–§2.4 Branding pipeline (fetch → cache → apply → SSE → fallback) | **Implemented** — `src/hooks/useTheme.tsx` (366 lines) mirrors the contract: cache-first hydration, `/api/settings/public`, SSE with backoff, no-regress fallback | Compliance check only; add missing vars (`--primary-dark`, `--text-secondary`) if ported components consume them |
| §2.5 Provider copy | Equivalent exists; adapt per §2.3 variable mapping | Verify `--primary`, `--color-primary`, `--primary-foreground`, `--ring`, `--theme-primary` are all stamped (they are, `useTheme.tsx:160-198`) |
| §3 Tokens | SORT has its own brand tokens (AGENTS.md) — see §2.3 mapping | Adopt SMART **structure** (radius scale, elevation, z-index ladder, type scale); keep SORT brand values |
| §4 Component catalog | **Missing** | Port the table system, page scaffolding, modal language, feedback system (§5 below) |
| §5.1 SSO launch item | **Not implemented** (no `companion-sso` routes, no `IntegratedSystemsNav`) | **Out of scope for this UI polish session** — separate backend/architecture track; flagged in §11 |
| §5.2 Shared header contract | SORT shell is white/light, not SMART's `#fafafa`/slate chrome | Adopt the *structure* (page-title two-liner, notification bell, S.Y. badge, profile cluster) with SORT tokens |
| §6 Pre-Development deps | SORT has no shadcn/Base UI/CVA/Sonner/TanStack | **Decision D6** |
| §6 Visual QA | Not performed | Added to §10 verification |

### 2.2 SMART component catalog → SORT port list (the "how their table is set up" target)

**Table system** (`src/components/data-table/` in SMART, 8 files) — the single most important alignment:

| SMART file | Purpose / API to replicate |
|---|---|
| `DataTable.tsx` | Generic `<T>` table: card shell `p-0` + `overflow-x-auto`, header band + toolbar, loading/error/empty switching, pagination footer. Head `text-[11px] font-semibold uppercase tracking-wider`; cells `py-3.5 px-4 text-sm whitespace-nowrap`; rows `hover:bg-muted/50`; `cursor-pointer` when `onRowClick` |
| `types.ts` | `TableColumn<T> = { key, header, cell(row), className?, align?: 'left'\|'center'\|'right', skeleton?: SkeletonHint }`; `SkeletonHint = 'name'\|'pill'\|'badge'\|'number'\|'date'\|'avatar'`; `TableFilter = { label, value, onChange, options[] }` |
| `TableToolbar.tsx` | Search + filters + actions row; controlled or uncontrolled; `searchPlaceholder="Search..."` |
| `TablePagination.tsx` | Item-range text, "Rows per page:" select, first/prev/page-numbers/next/last; **hides when `totalRows <= 10`** |
| `TableStates.tsx` | `LoadingSkeleton` (6–10 hint-shaped rows, opacity 0.6), `EmptyState` (search-aware: `No results for "term"`, Inbox icon), `ErrorState` (destructive circle + Retry) — all render inside `<TableRow><TableCell colSpan>` |
| `usePagination.ts` | 1-based; `ROWS_PER_PAGE_OPTIONS = [10,25,50,100]`, default 10; clamps page; resets to page 1 on rows-per-page change; returns `slice` |
| `Dash.tsx` | Em-dash placeholder for empty cells |

**Page scaffolding** (`src/components/layout/`):

| SMART component | API / spec |
|---|---|
| `PageHeader` | `title`, `description?`, `actions?`, `badge?`, `className?`; title `text-2xl font-bold tracking-tight`, subtitle `text-sm text-muted-foreground`, description hidden below `sm` |
| `SearchInput` | `value`, `onChange(value)`, `placeholder="Search..."`, `inputClassName?`, `inputRef?`; input `pl-8 h-9 w-56 rounded-lg text-xs`, inset `Search` icon |
| `StatCard` | `label`, `value`, `numericValue?`, `icon?`, `iconClassName?`, `trend?: { value, direction: 'up'\|'down'\|'neutral', hint? }`, `className?`; `useCountUp(numericValue, 800ms)` respecting `prefers-reduced-motion` |
| `PageError` | `title`, `message`, `onRetry?`, `retryLabel="Try Again"`, `icon?`; canonical route-level error block |
| `NotificationBell` | hook-derived notifications, badge cap `9+`, empty state "You're all caught up", per-user localStorage dismissals (SORT already has a bell — align its states, not its data source) |

**Modal language** (`src/components/app-modal/` + `common/ConfirmDialog`):

- `AppModal`: `open`, `onOpenChange`, `icon`, `title`, `description?`, `size: sm|md|lg|xl`, `confirmLabel="Confirm"`, `onConfirm?`, `confirmDisabled?`, `destructive?`, `loading?`, `hideFooter?`, `children?`
- Helpers: `InfoCard` (tones primary/secondary/accent), `StatTile` (tones, `tabular-nums`), `AlertBanner` (danger/warning/info), `StepCards` (numbered 3-up), `ModalSection`
- `ConfirmDialog`: thin wrapper over `AppModal`, default icon `AlertTriangle` (destructive) / `CheckCircle2`

**Feedback** (§4.4): toast system (`Sonner` in SMART: `<Toaster richColors position="top-right" />`, default 4000 ms), skeleton loading, `PageError`/`ErrorState`, inline `aria-invalid` styling.

**Foundations**: z-index ladder (`-z-10` backdrop → `z-10` badges → `z-30` sticky header → `z-40` mobile backdrop → `z-50` sidebar/menus/dialogs → `z-[100]` blocking progress); radius scale; type scale (page title / card title / table header / stat).

### 2.3 SMART → SORT token adaptation (do not redefine the contract — record the adaptation)

| SMART token/class | SORT adaptation | Reason |
|---|---|---|
| `bg-primary` (buttons), `text-primary` (links) | `bg-[var(--accent)]`, `text-[var(--accent)]` | SORT uses `--primary` = evergreen `#00271D` (nav/chrome), `--accent` = `#00A77C` (actions/links) |
| `text-foreground` | `text-[var(--text-strong)]` (post-D1 `#00271D`) | AGENTS.md brand text |
| `text-muted-foreground` | `text-[var(--text-strong)]/50` | SORT uses opacity-derived hierarchy |
| `bg-muted/50` (hover surfaces) | `bg-[var(--primary)]/5` | No `--muted` token in SORT |
| `border-border` | `border-[var(--primary)]/10` | SORT border convention |
| `bg-card` | `bg-white/90 backdrop-blur-md border border-white/80` | SORT surface recipe |
| `rounded-xl` cards / `rounded-lg` buttons | `rounded-2xl`/`rounded-3xl` cards, `rounded-xl` controls | SORT's radius system is larger (AGENTS.md) — **deliberate deviation** |
| `font: DM Sans` | **Adopt DM Sans** — same Google Fonts import as SMART (D7 resolved); update AGENTS.md typography to match | User decision: align to SMART fonts |
| `--text-primary` (= contrast text on primary in SMART) | Do **not** set — SORT reserves `--text-primary` = main text | Naming collision; ported components must not consume SMART's `--text-primary` semantics |

### 2.4 Dynamic brand vs. text color (answers the D1 question)

SORT's brand is **tenant-dynamic**: `useTheme.tsx` receives `primaryColor` / `secondaryColor` / `accentColor` / `goldColor` from EnrollPro (`GET /api/settings/public` + SSE live stream) and stamps them as CSS variables, with the SORT defaults (`#00271D` / `#00A77C` / `#C69B26`) used before the network resolves. Buttons, links, active nav, rings, charts, and tints all follow tenant changes automatically.

**Text color is the exception.** `--text-strong` is hardcoded `#111827` in `src/index.css:37` and `src/hooks/useTheme.tsx:157` — it does **not** follow tenant branding. That was deliberate (see the comment at `useTheme.tsx:155-156`: brand color stays on surfaces, not on all copy).

D1 option A closes that gap safely:

```ts
'--text-strong': isLightColor(colors.primary) ? '#111827' : colors.primary,
```

- Default tenant (evergreen `#00271D`, dark) → text renders brand green
- Any dark tenant brand → text follows that brand
- Light tenant brand (e.g. yellow) → text falls back to neutral near-black, so copy stays readable

This mirrors SMART's own safety choice: SMART's `--foreground` is neutral near-black and tenant primary is reserved for surfaces/buttons/active states. Static `#00271D` remains in `index.css` so the pre-JS paint matches the default brand.

---

## 3. Scope & Boundaries

**In scope**

- `src/components/layout/DashboardLayout.tsx`, `DashboardNavContent.tsx`, `dashboardNav.ts`, `MobileBottomNav.tsx`, `MobileNavSheet.tsx` — admin-facing shell (shared with MRF; see D3)
- `src/pages/admin/AdminDashboard.tsx` and everything under `src/pages/admin/components/**`
- `src/hooks/useTheme.tsx` — `--text-strong` decision + §2.3 variable compliance check
- `src/index.css` — motion keyframes, DM Sans import (D7), token additions, dark leftovers
- New shared primitives under `src/components/data-table/**`, `src/components/layout/**`, `src/components/common/**`, `src/utils/**`

**Out of scope (flag only)**

- Student, Teacher, MRF dashboards and public landing page (MRF shares the shell — coordinated per D3)
- Backend/API behavior; UI-only changes must not alter data flow
- **SMART §5.1 SSO integration** (companion-sso Flow A/B, `IntegratedSystemsNav`) — SORT has none; this is a separate backend/architecture session
- `MRFDashboard.tsx` (1,217 lines) and `useMockData.tsx` (1,181 lines) already violate the 1,000-line rule; follow-up work
- Non-admin adoption of the new table/scaffolding primitives (Student/Teacher/MRF) — future session, but primitives are built generic

---

## 4. Decision Points (sign-off required before Phase 1)

| ID | Decision | Options | Recommendation |
|----|----------|---------|----------------|
| **D1** | Text color token (brand is dynamic — see §2.4) — **RESOLVED: A (derived rule)** | **A) Derived**: `isLightColor(primary) ? '#111827' : primary`; static default `#00271D` in `index.css` for pre-JS paint. Reversible in one line (`useTheme.tsx:157`). Alternatives B–D remain documented | Adopted under the autonomy contract (§14) — brand-aligned for dark tenant brands, readable by construction for light ones |
| **D2** | ~~Tenon/Korolev fonts~~ | **Superseded by D7** — SORT adopts DM Sans from Google Fonts (same import SMART uses); no licensed font files needed | Resolved |
| **D3** | Shared shell changes | **A)** Apply to both admin and MRF. **B)** Admin-only overrides (drift) | **A** — every shell edit listed and MRF smoke-tested |
| **D4** | Structural refactor depth | **A)** Full extraction per §8 (target ≤400 LOC). **B)** Minimum under 600 LOC | **A**, phased |
| **D5** | Vibrant indicator hues | Tokenize approved hues (`#FF5722`, `#10B981`, `#0091EA`) as CSS vars; use only for designated modules | As stated |
| **D6** | **SMART stack adoption** — **RESOLVED: B (pattern port)** | **B) Pattern port**: rebuild SMART's component architecture (`DataTable`/`PageHeader`/`SearchInput`/`StatCard`/`AppModal`/`ConfirmDialog`/`TableStates`) in SORT's existing React + Tailwind 4 + lucide stack. **Frontend-only — zero backend/API/database/data-flow changes; no new dependencies except optionally `sonner` (frontend-only toast library, removable).** **A) Full port** (shadcn/Base UI/CVA/TanStack) and **C) Minimal** remain documented as alternatives | Resolved — chosen to guarantee no regression |
| **D7** | **Typography** — **RESOLVED: A (adopt DM Sans)** | **A) Adopt DM Sans** using SMART's exact Google Fonts import. This overrides AGENTS.md's Tenon/Korolev, so `AGENTS.md` (typography section), `tailwind.config.js`, and `src/index.css` font stacks must be updated to record the deviation | Resolved — aligns with SMART per user decision |

---

## 5. Design Contract (single source of truth for every edit)

### 5.1 Surfaces

| Element | Recipe |
|---------|--------|
| Page section container | `bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm` |
| Content card / module | `bg-white/90 border border-white/80 rounded-2xl p-5 shadow-sm` |
| Inner list row | `bg-gray-50/80 hover:bg-white rounded-2xl border border-gray-100 transition-all` |
| Header bar | `bg-white/85 backdrop-blur-xl border-b border-[var(--primary)]/10` (keep) |
| Sidebar | `bg-white/90 backdrop-blur-xl border-r border-[var(--primary)]/10` (fix `/8` → `/10`) |
| Table shell (SMART pattern) | Card with `p-0` + `overflow-x-auto`, `rounded-3xl` (SORT radius) |

**Banned**: `bg-white/95` without blur, `bg-white` + `border-gray-200` on top-level cards, `bg-[#FFFFFF]/90`, slate palette, dark surfaces.

### 5.2 Radius hierarchy (SORT values, SMART structure)

- Nav capsule / tabs / pills / avatars: `rounded-full`
- Page containers & modals: `rounded-3xl`
- Cards, modules, table shells: `rounded-2xl`
- Buttons, inputs, badges, icon tiles: `rounded-xl`

### 5.3 Buttons

| Variant | Recipe |
|---------|--------|
| Primary | `bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white rounded-xl text-xs font-bold shadow-md shadow-[var(--accent)]/20` |
| Secondary | `bg-white border border-[var(--primary)]/10 hover:bg-[var(--primary)]/5 text-[var(--text-strong)] rounded-xl text-xs font-bold` |
| Destructive | `bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 rounded-xl text-xs font-bold` |
| Ghost / icon | `text-[var(--text-strong)]/50 hover:text-[var(--text-strong)] hover:bg-[var(--primary)]/5 rounded-xl p-2` |

Every icon-only button gets `aria-label` + `title`. Hover `hover:bg-*/80`, focus `ring` visible, disabled `opacity-50`.

### 5.4 Status pills & badges

`text-[10px] font-bold px-2.5 py-0.5 rounded-full border` with tinted backgrounds only:
accent → `bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20`;
gold → `bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--gold)]/25`;
neutral → `bg-[var(--primary)]/10 text-[var(--text-strong)] border-[var(--primary)]/25`;
danger → `bg-rose-50 text-rose-700 border-rose-200`; warning → `bg-amber-50 text-amber-700 border-amber-200`.

One `ReportStatusBadge` component replaces 4 inline implementations.

### 5.5 Tables (SMART `DataTable` architecture — primary parity deliverable)

**Structure**: one generic `DataTable<T>` used by Ledger, Users, Audit Logs, Rewards catalog, and any list view.

| Part | Spec (SORT-adapted) |
|---|---|
| Wrapper | `bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl shadow-sm overflow-hidden`, inner `overflow-x-auto` |
| Header band | `flex flex-col lg:flex-row` title/description + `TableToolbar` (search + filters + actions) |
| Head row | `text-[11px] font-semibold uppercase tracking-wider text-[var(--text-strong)]/40 bg-[var(--primary)]/5 border-b border-[var(--primary)]/10` |
| Body rows | cells `py-3.5 px-4 text-sm whitespace-nowrap`; `hover:bg-[var(--accent)]/5`; `divide-[var(--primary)]/5`; `cursor-pointer` only when `onRowClick` |
| Alignment | `align: 'left' \| 'center' \| 'right'` per column |
| Empty cell | `<Dash />` — `text-[var(--text-strong)]/30` |
| Loading | `LoadingSkeleton` — 6–10 rows, hint-shaped per column (`name/pill/badge/number/date/avatar`), opacity 0.6 |
| Empty | search-aware title `No results for "<term>"`, icon tile, hint, optional action |
| Error | rose tinted circle + message + Retry button (`onRetry`) |
| Pagination | `usePagination` 1-based; rows-per-page `[10,25,50,100]` default 10; first/prev/numbers/next/last with `sr-only` labels; **hidden when `totalRows <= 10`** |

No slate, no `#FAF8F5` zebra (see `LedgerSheetTable.tsx:139-230` — replaced, not patched).

### 5.6 Modals & dialogs (SMART `AppModal` language)

- Always rendered through `ModalPortal` (`src/components/common/ModalPortal.tsx`) — fixes stacking-context bugs
- Backdrop: `bg-[var(--primary)]/40 backdrop-blur-sm` (single recipe, replaces 4 variants)
- Panel: `bg-white rounded-3xl shadow-2xl border border-white/80`; sizes `sm|md|lg|xl` via max-width
- Structure: icon tile + title + description, body, footer with cancel/confirm; `destructive` variant for deletes
- `ConfirmDialog` (thin wrapper) replaces all `window.confirm`/`alert`; `AlertBanner` for inline danger/warning/info
- ESC + backdrop click close; focus trapped on open; `loading` state disables confirm

### 5.7 Feedback states

| State | Component | Spec |
|-------|-----------|------|
| Toast | `Toast` + `useToast()` (Sonner-compatible API: `success`/`error`/`info`) | top-right, `rounded-2xl shadow-xl border`, success = accent icon, default 4000 ms, **no** `animate-pulse`, `aria-live` |
| Loading (page) | `PageLoader` / `LoadingState` | spinner + label, consistent across all tabs |
| Loading (table) | `LoadingSkeleton` | hint-shaped rows per §5.5 |
| Empty | `EmptyState` | icon tile + title + hint + optional action |
| Error (page) | `PageError` | title + message + Retry (adds missing retry to `AdminRewardsTab:180-184`, `AdminAuditLogsTab:34-36`) |
| Error (table) | `ErrorState` | inside the table body with Retry |

### 5.8 Motion

```css
@keyframes fade-in  { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
@keyframes scale-up { from { opacity: 0; transform: scale(.97); }        to { opacity: 1; transform: none; } }
.animate-fade-in  { animation: fade-in .2s cubic-bezier(.16,1,.3,1); }
.animate-scale-up { animation: scale-up .18s cubic-bezier(.16,1,.3,1); }
@media (prefers-reduced-motion: reduce) { .animate-fade-in, .animate-scale-up { animation: none; } }
```

Hover/transition 150–200 ms; no competing `animate-pulse` + `animate-bounce`. `StatCard` count-up respects reduced motion.

### 5.9 Typography

Adopt SMART's application type scale and DM Sans (D7 resolved):

| Role | Spec |
|---|---|
| Page title (`PageHeader`) | `text-2xl font-bold tracking-tight text-[var(--text-strong)]` |
| Page subtitle | `text-sm text-[var(--text-strong)]/50` |
| Card/section title | `text-base font-semibold text-[var(--text-strong)]` |
| Card description | `text-xs tracking-wide font-medium uppercase text-[var(--text-strong)]/50` |
| Table header | `text-[11px] font-semibold uppercase tracking-wider text-[var(--text-strong)]/40` |
| Table cell | `text-sm text-[var(--text-strong)]` |
| Stat label / value | `text-xs font-medium text-[var(--text-strong)]/50` / `text-2xl font-bold text-[var(--text-strong)]` |

Tab header pattern (currently 5 variants) = `PageHeader` + badge, everywhere.

### 5.10 Z-index ladder (SMART §3.3)

`-z-10` backdrop → `z-10` in-card badges → `z-30` sticky header → `z-40` mobile backdrop → `z-50` sidebar/menus/dialogs → `z-[100]` blocking progress. Collapse today's `z-[60]`, `z-[120]`, `z-[9999]` into this ladder.

---

## 6. Shared Primitives To Create (Phase 1)

| New file | SMART counterpart | Replaces | Consumed by |
|----------|-------------------|----------|-------------|
| `src/components/data-table/DataTable.tsx` | `DataTable.tsx` | 4+ hand-rolled tables | Ledger, Users, Audit Logs, Rewards catalog, Collections |
| `src/components/data-table/types.ts` | `types.ts` | inline column configs | same |
| `src/components/data-table/TableToolbar.tsx` | `TableToolbar.tsx` | 5+ ad-hoc search/filter bars | same |
| `src/components/data-table/TablePagination.tsx` | `TablePagination.tsx` | `LedgerSheetTable:250-350` | same |
| `src/components/data-table/TableStates.tsx` | `TableStates.tsx` | 6+ loading/empty/error blocks | same |
| `src/components/data-table/usePagination.ts` | `usePagination.ts` | `LedgerSheetTable:52-124` | same |
| `src/components/data-table/Dash.tsx` | `Dash.tsx` | `—` text placeholders | same |
| `src/components/layout/PageHeader.tsx` | `PageHeader.tsx` | 5 header variants | every admin tab |
| `src/components/layout/SearchInput.tsx` | `SearchInput.tsx` | 6+ search inputs | every admin tab |
| `src/components/layout/StatCard.tsx` | `StatCard.tsx` | Collections KPI grid, Ledger KPI strip, Rewards stats, Overview quick stats | all |
| `src/components/layout/PageError.tsx` | `PageError.tsx` | inline error banners | all |
| `src/components/common/AppModal.tsx` (+ `AlertBanner`, `InfoCard`, `StatTile`, `ModalSection`) | `app-modal/index.tsx` | 4 backdrop recipes | all admin modals |
| `src/components/common/ConfirmDialog.tsx` | `common/ConfirmDialog.tsx` | 5 `window.confirm` + 2 `alert` | Dashboard, Ledger, Rewards, BlueprintEditor |
| `src/components/common/Toast.tsx` + `src/hooks/useToast.tsx` | Sonner `<Toaster>` | 3 toast systems | AdminDashboard, MRFDashboard (shared), all settings tabs |
| `src/components/common/ReportStatusBadge.tsx` | — (SORT-specific) | 4 inline badge renderers | Reports, Collections, Detail modal, Ledger |
| `src/components/common/LoadingState.tsx` / `EmptyState.tsx` / `ErrorState.tsx` | `TableStates` + `PageError` | 6+ ad-hoc blocks | all tabs |
| `src/pages/admin/components/reports/DispatchMrfModal.tsx` | `AppModal` consumer | duplicated dispatch forms (`AdminReportsTab:731-804`, `AdminCollectionsTab:601-673`) | Reports, Collections |
| `src/pages/admin/components/reports/DismissReportModal.tsx` + `computeOffenseSeverity()` | `AppModal` consumer | duplicated dismiss logic (`AdminReportsTab:273-303,806-922`, `AdminCollectionsTab:208-226,675-733`) | Reports, Collections |
| `src/utils/dateFormat.ts` | — | 4 timestamp helpers | Reports, Collections, Detail modal, Ledger |
| `src/utils/reportQueueUtils.ts` | — | `getTimeMs` ×3 | Reports, MRF, Student history |

---

## 7. Workstreams

### WS1 — Foundations (Phase 1)

- [x] D1: implement the derived text rule in `src/hooks/useTheme.tsx:157` (`isLightColor(primary) ? '#111827' : primary`) and set the static pre-paint default to `#00271D` in `src/index.css:37`
- [x] Add `fade-in` / `scale-up` keyframes + reduced-motion guard (`src/index.css`)
- [x] D7: import DM Sans exactly as SMART does (`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');`); update `--font-body`/`--font-heading` stacks in `src/index.css` + `tailwind.config.js`; update the AGENTS.md typography section
- [x] Tokenize approved indicator hues (`--action: #FF5722`, `--impact: #10B981`, `--bin-map: #0091EA`) per D5
- [ ] SMART §2.3 compliance: add missing runtime vars consumed by ported components (`--primary-dark`, `--text-secondary`) to `useTheme.tsx`
- [x] Create all primitives in §6 with unit tests where pure (`dateFormat`, `computeOffenseSeverity`, `usePagination`)
- [ ] Remove dark leftovers: `.glass-panel`/`.glass-input`, dark scrollbar track, `App.tsx:51` usage
- [ ] Adopt the z-index ladder (§5.10); collapse `z-[60]`, `z-[120]`, `z-[9999]`
- [ ] Add `aria-label`/`title` to all icon-only buttons; toast container `aria-live="polite"`

### WS2 — Shell & Navigation (Phase 1, D3)

- [ ] Header: unify surfaces (`DashboardLayout.tsx:65` `bg-white/85` — keep, verify MRF), notification dropdown radius `rounded-xl` → `rounded-2xl` (`:88`), replace `bg-gray-50`/`border-gray-100` internals with token tints
- [ ] Align bell states with SMART's `NotificationBell`: badge cap `9+`, empty state "You're all caught up" (data source stays SORT's `useMockData` notifications)
- [ ] Sidebar: `/8` → `/10` (`:182,186`), slate removal (`:152`), logo size consistency, footer `text-gray-400` → token (`DashboardNavContent.tsx:207`)
- [ ] Mobile: verify `MobileBottomNav`/`MobileNavSheet` radii + backdrops against the z-ladder
- [ ] Standardize page padding/scroll behavior across admin tabs (`space-y-6` everywhere per SMART §3.4)
- [ ] Verify nav registry: `dashboardNav.ts` ADMIN sections match rendered tabs; remove unused `NavItem.roles` or enforce it

### WS3 — Overview & Analytics (Phase 2)

- [x] Extract inline views from `AdminDashboard.tsx` (652): `admin/overview/AdminOverviewTab.tsx` (`:244-373`), `admin/warnings/AdminWarningsTab.tsx` (`:434-565`), `admin/sync/AdminSyncLogsTab.tsx` (`:578-648`) → shell drops to ~120 lines
- [ ] Overview: replace `bg-gray-200/80` tracks and `text-gray-900` (`:329,356`) with tokens; convert the 3 quick-stat cards to `StatCard`; adopt `PageHeader`
- [ ] `AdminImpactTab.tsx` (643) — remaining deltas from `UI_REFINEMENT_PLAN.md`:
  - [ ] `#FF5722` → `--action` token (`:269,576`)
  - [ ] inline `height:'140px'` (`:548,555`) → Tailwind fixed bar track
  - [ ] non-interactive "View Bin Map" span (`:634-637`) → real button wired to `setActiveTab('admin-bin-map')` (needs prop pass-through)
  - [ ] prune unused imports (`Target`, `ArrowUpRight`, `TrendingUp`, `Clock`, `AlertTriangle`, `Check`, `X`, `RefreshCw`)
  - [ ] extract `ImpactKpiRow`, `GradeParticipationCard`, `WasteCompositionCard`, `MonthlyVolumeChart`, `HotspotsCard` into `admin/impact/` (file ≤400)
- [ ] `AdminAnalyticsEquationsCard.tsx` (278) — token pass for gray/amber accents

### WS4 — Reports (Phase 2/3, structural)

- [x] Split `AdminReportsTab.tsx` (926 → **133**) per §8 table; extracted `reports/` (hook + 7 components + `DispatchMrfModal`/`DismissReportModal`); queue utils moved to `src/utils/reportQueueUtils.ts` (reused by MRF/Student later); dead Refresh/Clear All buttons removed; global toast adopted
- [x] Deduplicate the asset-detection expression (`:188-193, 567-572, 646-651`) into one helper
- [ ] Unify row badges with `ReportStatusBadge`; replace blue "Dispatch Collector" fill with primary/secondary button recipe (`:520-530`)
- [x] Backdrop → `AppModal`; add ESC/backdrop close to both modals
- [ ] `AdminReportDetailModal.tsx` (382): extract `ScatteredDebrisMiniMap.tsx` (`:41-54, 204-265`), replace hardcoded SVG grays (`:217-239`) with token tints; unify status pills
- [ ] `AdminBinMapTab.tsx` + `map/CampusLiveMapView.tsx`: replace `text-[#0091EA]` with `--bin-map` token (`:53`), unify legend/marker recipe

### WS5 — Collections & Ledger (Phase 3, structural)

- [x] **Purged + split `AdminCollectionsTab.tsx` (736 -> 70)** (audit B5): dead filter state, dead `filteredReports`, 3 unreachable modals + handlers/props removed; extracted `collections/` (`useCollectionsMetrics` + `CollectionsKpiGrid` + `RecyclablesSummaryGrid`). Gap logged: no dispatch/dismiss entry points remain in Collections (backlog)
- [x] Extract `CollectionsKpiGrid.tsx` (use `StatCard`), `RecyclablesSummaryGrid.tsx`, `useCollectionsMetrics.ts`; reuse `DispatchMrfModal`/`DismissReportModal`; drop 7 unused icon imports + `isReportDoneAndExpired`
- [x] `AdminLedgerPage.tsx` (592): extract `ledgerSheets.tsx` (`:185-268`), `LedgerToolbar.tsx` (`:319-422`), `LedgerKpiStrip.tsx` (use `StatCard`), `LedgerRowDetailDrawer.tsx` (`:526-576`), `ledgerCells.tsx` (`:53-76`), `exportLedgerCsv.ts` (`:279-304`)
- [x] **Ledger on the generic `DataTable`**: `AdminLedgerPage` (592 -> 305) extracted to `ledger/` (formatters, status badge, cells, sheets, toolbar, KPI strip, drawer, CSV export); sorting + footer totals + `minWidth` added to `DataTable`; `window.confirm` -> `ConfirmDialog`. **Deviation:** `LedgerSheetTable.tsx` kept (not deleted) because MRF pages (`MRFAssetLedgerPage`, `MRFHistoryTab`) still consume it - delete when MRF migrates (backlog)
- [x] Replace `window.confirm` in Ledger (`:150`) with `ConfirmDialog`

### WS6 — People & Content (Phase 3)

- [x] `AdminUsersTab.tsx` (808 -> 84) split per §8: `users/userRoleConfig.ts`, `UsersHeader`, `UsersToolbar`, `UsersTableView` (DataTable), `UsersGroupedView`, `UserProfileInspectorModal` (AppModal), `useUserDirectory`. Deviation: page-level sort controls removed in favor of DataTable header sorting; toolbar kept as a standalone card (TableToolbar is DataTable-internal)
- [x] Replace `ASC ↑`/`DESC ↓` text glyphs (`:384,411,417`) with `ArrowUp`/`ArrowDown` icons; route inspector modal through `AppModal`
- [x] `AdminLeaderboardTab.tsx`: wire dead refresh button (`:72-77`) to recompute or remove; podium colors → gold/accent/primary tokens; adopt `PageHeader`
- [x] `AdminRewardsTab.tsx`: `window.confirm` → `ConfirmDialog` (`:52,74`); `bg-white/95` → standard recipe (`:150`); loading card → `LoadingState`; error banner → `PageError` with Retry
- [x] `AdminAuditLogsTab.tsx`: remove `bg-[#0b141a]` dark advisory (`:152`) → `AlertBanner` (warning); `Loading...` row → `DataTable` `LoadingSkeleton`; add retry on fetch failure
- [ ] `AdminCampusNewsTab.tsx`: loading state (`:145`), backdrops (`:181,225`) → `AppModal`; empty state → `EmptyState`
- [ ] `RewardCatalogTable.tsx` / `RewardClaimQueue.tsx`: convert to `DataTable`; `bg-white/95` → standard recipe; `#8a6b12`/`#b0881e` hover hex → `gold-dark` token

### WS7 — Settings & Map (Phase 4)

- [x] `AdminSettingsTab.tsx` (469 -> 60): extracted `AdminItemPresetsTab.tsx` (AppModal modals), `presetDefaults.ts`, `AdminDangerZoneTab.tsx`; removed dead `smartSync` + ~12 unused icon imports
- [x] Settings sub-tabs pass DONE: Challenges/Branding/Sync local toasts -> global `useToast`; loading blocks -> `LoadingState`; gold hover hex fixed; PointsSystem emoji removed; raw `localhost:5000` fetches (calendar terms, sync status) -> `apiService.syncAcademicTerms()`/`apiService.getSyncStatus()`
- [x] `CampusBlueprintEditor.tsx` (510): extract `blueprintUtils.ts` (`:31-67`), `useBlueprintEditor.ts` (`:103-113,169-261`), `useBinLocationEditor.ts` (`:72-98,149-162,263-366`), `useRoomLocations.ts` (`:115-147`); replace `alert` (`:182,188`) with `ConfirmDialog`/toast
- [~] Map component sweep: StationInspector emoji, AdminReportDetailModal emoji, CampusLiveMapView indicator hexes, StationModals/RoomModals -> AppModal ALL DONE; REMAINING: hardcoded SVG grays in `AdminReportDetailModal:217-239`/`CampusLiveMapView:177-203`, `AdminBinMapTab` legend check
- [ ] `AdminBrandingTab.tsx` (355): verify swatch/input recipes; test with a non-default tenant color to prove token edits don't break theming

### WS8 — Cleanup Sweep (Phase 5)

- [x] Zero emoji in admin UI strings (grep gate) - verified via Node sweep (only typographic arrows remain in prose)
- [ ] Zero bracket-hex outside token definitions (grep gate)
- [x] Zero `window.confirm`/`window.prompt`/`alert` in admin (grep gate)
- [ ] Zero `bg-white/95`, `bg-gray-50/50`, `border-gray-200`, `text-gray-*`, `bg-slate-*` in admin files (grep gate, allow-list documented)
- [ ] All overlays through `ModalPortal` + `AppModal`; all modals ESC-closable
- [ ] Remove `AdminAnalyticsEquationsCard` if unused after WS3 (verify imports)
- [ ] Delete unreachable components/functions found during splits

### WS9 — SMART Parity Verification (Phase 5)

- [ ] Side-by-side screenshot comparison with SMART (one dashboard, one data-table page, one modal, one ledger/table view) — use the handoff's catalog specs as the reference since SMART's repo isn't local
- [ ] Verify `DataTable` contract: `TableColumn<T>` API, skeleton hints, search-aware empty state, pagination hidden ≤10 rows, `Dash` placeholder
- [ ] Verify brand cascade through interactive states: default, hover, focus (`ring`), active, disabled, `aria-invalid`
- [ ] Test two tenant brandings via `AdminBrandingTab` (light primary → `#1f2937` contrast branch; dark primary → `#ffffff`)
- [ ] Verify `--chart-1` follows brand in any chart using it
- [ ] Record all deviations from the SMART contract (D6/D7 + token mapping §2.3) in the PR description per handoff Appendix B.6

---

## 8. Structural Refactor Map (extraction tables)

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
| `users/UsersHeader.tsx` | 236-282 | title + view switcher (→ `PageHeader`) |
| `users/UsersToolbar.tsx` | 284-388 | role pills + search/sort/status (→ `TableToolbar`) |
| `users/UsersTableView.tsx` | 400-541 | table (→ `DataTable`) |
| `users/UsersGroupedView.tsx` | 543-629 | grouped cards |
| `users/UserProfileInspectorModal.tsx` | 631-802 | inspector (→ `AppModal`) |
| `users/useUserDirectory.ts` | 119-217 | filter/sort/group |

### AdminCollectionsTab.tsx (736 → ~120, after dead-code purge)
`collectionsConfig.ts` (`:44-55, 118-172, 282-340`), `CollectionsKpiGrid.tsx` (`:380-416`, `StatCard`), `RecyclablesSummaryGrid.tsx` (`:418-565`), `useCollectionsMetrics.ts` (`:81-115`).

### AdminLedgerPage.tsx (592 -> 305)
`ledgerFormatters.ts` (`:32-36`), `LedgerStatusBadge.tsx` (`:38-51`), `ledgerCells.tsx` (`:53-76`), `ledgerSheets.tsx` (`:185-268` → `TableColumn<T>[]`), `LedgerToolbar.tsx` (`:319-422`), `LedgerKpiStrip.tsx` (`:306-315, 444-453`), `LedgerRowDetailDrawer.tsx` (`:526-576`), `exportLedgerCsv.ts` (`:279-304`). `LedgerSheetTable.tsx` deleted (replaced by `DataTable`).

### AdminSettingsTab.tsx (469 → ~100)
`presetDefaults.ts` (`:34-98`), `AdminItemPresetsTab.tsx` (`:116-245, 271-415`), `AdminDangerZoneTab.tsx` (`:437-466`).

### AdminDashboard.tsx (652 → ~120)
`AdminOverviewTab.tsx` (`:244-373`), `AdminWarningsTab.tsx` (`:434-565`), `AdminSyncLogsTab.tsx` (`:578-648`).

### AdminImpactTab.tsx (643 → ~400)
`impact/ImpactKpiRow.tsx` (`:264-354`), `impact/GradeParticipationCard.tsx` (`:356-433`), `impact/WasteCompositionCard.tsx` (`:435-508`), `impact/MonthlyVolumeChart.tsx` (`:510-569`), `impact/HotspotsCard.tsx` (`:571-639`).

### AdminReportDetailModal.tsx (382 → ~250)
`reports/ScatteredDebrisMiniMap.tsx` (`:41-54, 204-265`); optional header/reporter/actions extraction.

---

## 9. Phased Execution & Gates

| Phase | Workstreams | Exit gate |
|-------|-------------|-----------|
| **0 — Baseline** | Capture admin screenshots per tab; record line counts; run `scripts/color-audit.mjs` | Baseline artifacts stored |
| **1 — Foundations & SMART primitives** | WS1, WS2 | All §6 primitives exist with tests; `npm run lint` + `npm run build` pass; shell smoke-tested on Admin **and** MRF |
| **2 — Core tabs** | WS3, WS4 | Impact/Overview/Reports pixel-reviewed; `AdminReportsTab` ≤400 LOC; report verify/dispatch/reject flows regression-free |
| **3 — Ops tabs** | WS5, WS6 | Collections dead code gone; Ledger on `DataTable`; Users ≤400 LOC; rewards release/cancel re-tested |
| **4 — Settings & Map** | WS7 | All 13 settings sub-tabs render; blueprint edit/save + map flows re-tested |
| **5 — Cleanup & SMART parity QA** | WS8, WS9 + §10 | All grep gates clean; SMART parity checklist passed; deviations recorded |

Recommended order inside each phase: **primitives → structural split → visual polish** so polish is applied once to final component boundaries.

---

## 10. Verification & Acceptance Criteria

**Commands**
- `npm run lint` (oxlint) — zero new warnings
- `npm run build` — zero TS/bundle errors
- `npm run test:unit` — existing vitest suites pass (+ new tests for `usePagination`, `dateFormat`, `computeOffenseSeverity`)
- `npm run test:ui` — Playwright admin flows (reports verify/dispatch, rewards, mobile nav)
- `node scripts/color-audit.mjs` — off-brand counts must not increase; approved `#0091EA` Bin Map usage whitelisted/documented
- File-size gate: no admin source file > 600 LOC (target), hard ceiling 1,000 (AGENTS.md)

**Grep gates (admin files)**
```
rg "🎉|⚠️|💰|🚫|🔥|🏗️|✕|✓|⏳" src/pages/admin src/components/layout
rg "#[0-9a-fA-F]{6}" src/pages/admin --glob '!**/AdminBrandingTab.tsx'   # only token defs allowed
rg "window\.(confirm|prompt)|[^.]\balert\(" src/pages/admin
rg "bg-white/95|text-gray-|bg-slate-|border-gray-200" src/pages/admin
```

**SMART Visual QA (handoff §6, manual)**
- Side-by-side comparison with the SMART catalog for: one dashboard, one data-table page, one modal, one ledger/table view
- Interactive states: default, hover, focus ring, active, disabled, `aria-invalid`
- Two tenant brandings exercised through `AdminBrandingTab` (light + dark primary)
- `--chart-1` follows brand; pixel-grid/backdrop tint follows primary
- Reduced-motion emulation: no entrance animation, no layout shift
- Every modal: opens via portal, ESC/backdrop close, focus visible
- Toasts: consistent position, no pulse, `aria-live`

**Acceptance**
1. Text color follows the derived brand rule (D1): brand green by default, tenant brand when dark, neutral when light; DM Sans loaded and applied (D7); AGENTS.md typography updated
2. Entrance motion exists and respects reduced motion
3. `DataTable` powers Ledger, Users, Audit Logs, Rewards catalog with toolbar/pagination/states per §5.5
4. `PageHeader`/`SearchInput`/`StatCard` used by every admin tab; no bespoke header/search/stat markup remains
5. All admin overlays use `AppModal`/`ModalPortal`; all destructive actions use `ConfirmDialog`
6. No admin file approaches 1,000 LOC; the five largest admin files ≤ 400 LOC
7. Zero emoji, zero native dialogs, zero off-token gray/slate surfaces in admin
8. No functional regression in verify → dispatch → collect → reward flows

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Global `--text-strong` change alters every dashboard | D1 covers app-wide impact; smoke-test student/teacher/MRF after Phase 1 (read-only) |
| Shell edits affect MRF terminal | D3; MRF smoke checklist in Phase 1 gate |
| SMART parity drift — porting SMART's known violations (raw zinc/blue select, gray tooltip, slate chrome, `.dark` `--accent` double-declaration) | Handoff Appendix B.7 explicitly bans copying drift; §2.3 adaptation table applied; no SMART primitive copied verbatim |
| New primitive APIs adopted inconsistently (two table implementations again) | `DataTable` is the only table; delete `LedgerSheetTable` in the same PR that introduces it |
| Large splits introduce regressions in complex flows (batch verify, dismiss auto-offense) | Extract pure logic first + unit tests; re-run Playwright UI suite per phase |
| Tenant theming broken by token edits | Test `AdminBrandingTab` with a non-default tenant color before/after; tokens are runtime CSS variables — never hardcode over them |
| Dead-code purge in Collections removes something reachable via a path missed by static analysis | Runtime-verify: load Collections, attempt every interaction; purge as its own commit |
| `animate-fade-in` addition changes perceived layout on 86 elements | 200 ms transform-only animation; reduced-motion guard; verify no scrollbar flash |
| Full SMART stack adoption (D6-A) balloons scope | Default to D6-B pattern port; revisit only if SORT later adopts shadcn/Base UI ecosystem-wide |

---

## 12. Open Questions

1. **SMART repo access** — the handoff's source of truth is `C:\Users\Sean\Desktop\SMART_FINAL_CAPSTONE`, not on this machine. Can a copy be provided, or do we build strictly from the doc? (Affects WS9 side-by-side QA.)
2. Is `AdminAnalyticsEquationsCard` still rendered anywhere? Confirm before deleting.
3. Should the mobile bottom nav remain admin-only 4 items, or surface "Collections" instead of "Users"?
4. Is `scripts/color-audit.mjs` the official regression gate, or is screenshot review sufficient?
5. When should SMART §5.1 SSO (`companion-sso`, `IntegratedSystemsNav`) be scheduled? It is required by the handoff but out of scope for UI polish.

---

## 13. Anti-Regression Protocol

> Every change passes through the gate ladder below. A failing gate **stops forward work** — fix or revert before continuing.

### 13.1 Gate ladder

| Gate | When | Action | Must pass |
|------|------|--------|-----------|
| **G0 — Baseline** | Before the first edit | Record `npm run lint`, `npm run build`, `npm run test:unit` results; file-size snapshot of admin files; screenshots if servers available | Baseline stored in `UI_POLISH_LOG.md` |
| **G1 — Per edit batch** (≤5 files) | After each batch | `npm run lint` + `npm run build` (`tsc -b && vite build`) | Zero new lint warnings, zero TS/bundle errors |
| **G2 — Per workstream** | End of each WS item | `npm run test:unit` (+ new unit tests for extracted pure logic) | All unit tests green |
| **G3 — Per phase** | Phase exit | `npm run test:ui` (Playwright; backend assumed on `:5000`, Vite auto-started on `:5174` by `playwright.config.ts`) + phase-specific specs | All specs green; failures triaged |
| **G4 — Phase exit** | Phase exit | G1–G3 + `node scripts/color-audit.mjs` (when servers up) + before/after screenshots + line-count gate | Off-brand counts not increased; no admin file > 600 LOC (hard ceiling 1,000) |
| **G5 — Final** | Phase 5 | Full `npm run verify` where the environment allows; every skipped check documented with reason | Documented pass/defer matrix |

**Failure policy:** max 2 fix attempts per failure; if still red, log the exact command + error + hypothesis and halt that workstream per §14 stop conditions. Never bypass a gate (no `--no-verify`, no skipped tests without a logged reason).

### 13.2 Logging (catch bugs early)

- **Progress journal**: `UI_POLISH_LOG.md` at repo root — append-only, newest entry on top. Each entry: timestamp, workstream/phase, files touched, gate results, errors with exact messages, decisions made, next step.
- **Runtime logs**: Playwright captures browser console errors and writes traces/screenshots to `test-results/` on failure. Dev-server output is kept in the existing `tmp-*.log` files; any error observed there is copied into the journal.
- **No silent catches**: any error encountered (build, test, runtime) is recorded with the exact command and message before attempting a fix.
- **Phase status block**: each phase entry ends with `Gate status / Files changed / Open risks / Deferred checks`.

### 13.3 Playwright verification plan

**Existing specs that must stay green** (in `tests/ui/`): `regression.spec.ts`, `photo-evidence.spec.ts`, `mobile-nav.spec.ts`, `base-map.spec.ts`, `settings-map.spec.ts`, `atlas-picker.spec.ts`, `live-atlas.spec.ts`, `modal-layering.spec.ts`.

**New specs to add** (built with the primitives, Phase 1–3):

| Spec | Covers |
|------|--------|
| `admin-tables.spec.ts` | `DataTable`: toolbar search, filter, pagination hidden at ≤10 rows / visible above, empty state, row click |
| `admin-modals.spec.ts` | `AppModal`/`ConfirmDialog`: open, ESC close, backdrop close, destructive confirm path |
| `admin-smoke.spec.ts` | Every admin nav destination renders with zero console errors (extends the `color-audit.mjs` click-through pattern) |

**Evidence**: traces + screenshots on failure (`playwright.config.ts` already sets `trace: retain-on-failure`, `screenshot: only-on-failure`); phase before/after screenshots saved to `test-results/ui-polish/`.

**Preconditions**: backend on `:5000` (Postgres) and the dev server. If the backend is unavailable, G3 is marked **deferred** in the journal; G1/G2 still run, and Playwright is executed at the next opportunity.

### 13.4 Rollback & checkpoints

- One workstream per change set; never mix a structural refactor with a behavior change in the same step.
- Every phase must end in a clean, buildable state. If not, revert that phase's files to the last green state.
- **No git commits** while running autonomously (per §14). Changes stay in the working tree for review.
- Each journal entry lists the files touched so a phase can be reverted with `git checkout -- <files>`.

---

## 14. Autonomous Execution Contract

> The user may leave the machine unattended. This contract defines exactly what the agent may do alone, what it must never do, and what evidence it leaves behind.

### 14.1 Authority (while unattended)

- Execute Phases 0–5 in order, within the scope of §3.
- Adopt the documented recommendations for D1–D7 without waiting; log every decision in `UI_POLISH_LOG.md`.
- Create/modify frontend files: primitives, components, hooks, utils, styles, tests, and plan/log docs.
- Run: `npm run lint`, `npm run build`, `npm run test:unit`, `npm run test:ui`, `npm run dev`, read-only API/health checks, `scripts/color-audit.mjs`.
- Delete code only when the audit confirms it is unreachable (e.g. Collections dead code), and record the evidence.
- Fix forward within the gates (§13).

### 14.2 Hard boundaries (never, regardless of convenience)

- **No backend work**: no changes to `server/**`, API contracts, Prisma schema/migrations/seeds, or database contents.
- **No destructive data operations** and no mutation of user/business data.
- **No git writes**: no commit, push, force-push, tag, branch, or config changes.
- **No out-of-scope screens**: Student/Teacher/MRF pages stay untouched except the shared shell per D3.
- **No secrets/licensed assets**: never add credentials, tokens, or paid assets; no new dependencies except the optional `sonner` (frontend-only, logged).
- **No gate bypassing** and no file growth toward the 1,000-line limit.

### 14.3 Stop conditions (log + halt that workstream, continue elsewhere if possible)

- A gate fails and remains red after 2 fix attempts.
- A change needs a product decision outside D1–D7.
- A destructive or ambiguous action would be required.
- The environment (Postgres/API) blocks G3+ — continue G1/G2 work and mark G3 deferred.
- Any file would exceed 1,000 LOC.

### 14.4 Evidence left for review

1. `UI_POLISH_LOG.md` — journal, newest first, with a top "Current status" block (done / in progress / deferred / needs decision).
2. `test-results/ui-polish/` — phase screenshots (before/after) when servers are available.
3. Gate outputs quoted in the journal (lint/build/unit/Playwright summaries).
4. Final summary listing: files created, files modified, files deleted, decisions taken, checks deferred.

### 14.5 Resume protocol

A future session (or the user) starts by reading `UI_POLISH_LOG.md`, then §9 phase status here, and continues from the first incomplete workstream.

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

Code-level audit (grep + full-file reads of all admin entry points), structural analysis of the 8 largest admin files, `scripts/color-audit.mjs` review, comparison against `AGENTS.md` design tokens, and a full read of the SMART handoff (1,158 lines). The screenshots in `references/ADMIN PAGES/` predate the current shell and were treated as historical.

## Appendix C — SMART Handoff Compliance Matrix (SORT)

| Handoff item | Status | Where |
|---|---|---|
| §2.1–§2.4 branding pipeline | Compliant | `src/hooks/useTheme.tsx` — cache-first, `/api/settings/public`, SSE backoff, no-regress fallback |
| §2.3 variable mapping | Mostly compliant | Sets `--primary`, `--color-primary`, `--primary-foreground`, `--color-primary-foreground`, `--ring`, `--color-ring`, `--theme-primary`, RGB triplets, `--chart-1`; missing `--primary-dark`, `--text-secondary` (add if needed) |
| §2.5 provider copy | Adapted | SORT implementation is equivalent; no rewrite planned |
| §3 tokens | Adapted | SORT brand tokens (tenant-dynamic); adopt SMART structure (radius/z-index/type scale) and DM Sans (D7); AGENTS.md typography to be updated |
| §4.1 shadcn primitives (18) | Missing | Covered by D6; pattern port creates equivalents only where needed |
| §4.2 layout components | Missing | `PageHeader`, `SearchInput`, `StatCard`, `PageError` in WS1 |
| §4.3 data-table system (8 files) | Missing | Full port in WS1/§6 — primary parity deliverable |
| §4.3 app-modal language | Missing | `AppModal` + helpers + `ConfirmDialog` in WS1 |
| §4.4 feedback (Sonner, skeleton, states) | Missing | `Toast`, `LoadingSkeleton`, `EmptyState`, `ErrorState` in WS1 |
| §5.1 SSO launch item | Not implemented | Out of scope — separate track (Open Question 6) |
| §5.2 header contract | Adapted | WS2 aligns structure with SORT tokens |
| §6 checklists | In progress | This plan covers Pre-Development (D6/D7), Component Parity (WS1–WS7), Visual QA (WS9); Branding + SSO items tracked separately |
