# EMEMS Tenant Reset Plan

> **STATUS: PLANNED — NOT EXECUTED.**
> The scripts described here are implemented but inert. Nothing touches the database
> until the EnrollPro team gives the go signal and the operator runs the commands below.

## 1. Objective

SORT currently holds **Hinigaran** data (users, reports, points, ledger, MRF records,
branding, ATLAS map). On Wednesday we present to **Emems**. Emems must never see any
Hinigaran record, history, snapshot, log, or branding.

**EnrollPro side (confirmed):** it is the **same EnrollPro instance/endpoint/secret** —
no `.env` or settings changes on our side. The EnrollPro team will change the branding
and wipe their seeded data, then re-seed for **EMEMS**. Our go signal is issued after
that re-seed completes, so our sync pulls EMEMS identities, school year, terms, and
branding. After the go signal:

1. Erase every tenant-scoped row and historical artifact from the SORT database.
2. Purge tenant media files (EnrollPro logo, ATLAS campus image).
3. Re-pull Emems identities + school year + terms from EnrollPro.
4. Re-seed the platform catalogs to a deterministic factory state.

## 2. Locked Decisions

| Decision | Choice |
| --- | --- |
| Wipe scope | **Full factory reset** (users, history, logs, snapshots, ledger, demo bins/map rows, branding) |
| Pre-wipe backup | **None** (accepted risk: Hinigaran data becomes unrecoverable) |
| Execution | **One command orchestrator** after go signal |
| Timing | No execution until the user explicitly gives the go signal (after EnrollPro re-seeds EMEMS) |
| EnrollPro side | Same instance/endpoint/secret; they switch branding and re-seed for EMEMS |

## 3. Why This Is Safe (no regression)

Every table we delete is recreated by an existing, idempotent pipeline:

| Wiped data | Recreated by |
| --- | --- |
| Users, enrollment identity | `npm run sync:enrollpro` (`runEnrollProSync`) |
| School years (`school_years`) | `ensureSchoolYear()` / `syncTermCalendar()` during sync |
| Terms + academic quarters | `syncTermCalendar()` during sync |
| Point/report/offense/challenge history | Empty by design after reset (fresh tenant) |
| Challenges (term-scoped) | `npm run db:seed` (runs **after** sync so it binds to Emems' active term) |
| Walk-in reward catalog | `npm run db:seed` → `seedWalkInRewards` (create-only upsert) |
| Bins, campus/room locations, categories, presets, waste types, urgency levels, asset conditions, point rules | `npm run db:seed` (guarded by `count === 0`) |
| Recycle market stocks | `npm run db:seed` upsert (back to 0 kg) |
| Asset scrap stocks | Deleted; lazily re-created on first `GET /api/asset-scrap/stocks` from `DEFAULT_SCRAP_STOCKS` |
| Branding (school name, colors, logo) | `npm run branding:sync` → `syncEnrollProBranding()` |
| ATLAS campus map | Optional `npm run sync:atlas` (only if Emems has ATLAS) |

`system_settings` row is **updated in place** (never deleted), so integration URLs,
sync cadence, thresholds, and EnrollPro config survive. Only tenant-branding fields
are reset (see §5).

## 4. What Gets Wiped (exact FK-safe order)

Deleted inside a single atomic transaction (`wipe-tenant-data.ts`), children first:

1. `challenge_contributions`
2. `user_challenge_progress`
3. `point_histories`
4. `certificates`
5. `reward_claims`
6. `walk_in_turnover_items`
7. `walk_in_turnovers`
8. `mrf_asset_records`
9. `asset_scrap_items`
10. `recycle_sale_transactions`
11. `asset_scrap_sale_transactions`
12. `market_stock_snapshots`
13. `asset_scrap_stock_snapshots`
14. `user_point_snapshots`
15. `reports`
16. `offenses`
17. `audit_logs`
18. `enrollment_sync_logs`
19. `sync_logs`
20. `atlas_sync_logs`
21. `atlas_rooms`
22. `atlas_buildings`
23. `atlas_map_snapshots`
24. `campus_news`
25. `calendar_events`
26. `user_sessions`
27. `users`
28. `school_years`
29. `term_calendars`
30. `academic_quarters`
31. `challenges`
32. `rewards`
33. `waste_bins`
34. `campus_locations`
35. `room_locations`
36. `item_presets`
37. `asset_categories`
38. `waste_types`
39. `urgency_levels`
40. `asset_conditions`
41. `point_rules`
42. `recycle_market_stocks`
43. `asset_scrap_stocks`
44. `notifications` (raw delete, `try/catch` — legacy/optional table)

Ordering constraints that matter:
- `user_point_snapshots`, `market_stock_snapshots`, `asset_scrap_stock_snapshots`,
  `reward_claims`, and `walk_in_turnovers` hold **required** school-year FKs with no
  cascade — they must be deleted before `school_years`.
- `point_histories` reference `reward_claims` / `walk_in_turnovers` / `reports` —
  deleted first.
- `user_sessions`, `certificates`, `offenses`, `user_challenge_progress`,
  `challenge_contributions` all cascade from `users`, but are deleted explicitly so
  the report shows real counts.

## 5. What Gets Reset In Place

`system_settings` (`id = 'default_setting'`), branding-only fields:

| Field | Reset to |
| --- | --- |
| `school_name`, `school_acronym`, `school_id`, `division`, `region`, `address`, `school_head_name` | `NULL` |
| `logo_url` | `NULL` |
| `primary_color` | `#00271D` |
| `secondary_color`, `accent_color` | `#00A77C` |
| `gold_color` | `#C69B26` |
| `blueprint_preset` / `blueprint_url` | `DEFAULT` / `NULL` |
| `enrollpro_branding_synced_at` | `NULL` |

Kept intentionally (no regression): `enrollpro_url`, `enrollpro_public_url`,
`atlas_sync_mode`, `atlas_sync_interval_minutes`, sync settings, point/threshold
values, certificate names, `offline_auth_cache_*`, `default_vendor_name`.

## 6. What Gets Purged On Disk

| Path | Action |
| --- | --- |
| `server/uploads/*` | Delete all files (EnrollPro-synced logo). Directory kept. |
| `server/assets/atlas/*` | Delete all files (ATLAS campus image). Directory kept if present. |

`server/assets/fonts/*` is **never touched** (certificate PDF fonts).

## 7. Orchestrator Sequence (`reset-tenant.ts`)

```
[0/5] Preflight
      - Verify --confirm=WIPE-EMEMS
      - Resolve EnrollPro base (system_settings.enrollpro_url, else ENROLLPRO_URL/ENROLLPRO_BASE_URL)
      - GET {base}/integration/v1/health — abort unless reachable (--force overrides)
      - GET {base}/settings/public — print school branding; operator MUST confirm it shows EMEMS
      - Warn if ENROLLPRO_SYNC_SECRET is empty
[1/5] Wipe        npm run db:wipe-tenant -- --confirm=WIPE-EMEMS   (atomic)
[2/5] Sync        npm run sync:enrollpro
                  exit 0 = SUCCESS, exit 2 = PARTIAL (warn + continue), exit 1 = abort
[3/5] Seed        npm run db:seed                                (binds challenges to active term)
[4/5] Branding    npm run branding:sync                          (non-fatal warning on failure)
[5/5] Verify      counts + active school year + branding summary, then prints DONE
```

Optional: `--with-atlas` appends `npm run sync:atlas` after branding.

Order rationale: `sync` must run **before** `seed` so `syncTermCalendar()` has created
Emems' `academic_quarters`; `db:seed` then creates challenges already scoped to the
active term instead of the legacy `GLOBAL` scope.

## 8. Command Reference

```powershell
# From the repo:
cd server

# Rehearsal (READ-ONLY: counts only, no writes, no deletes, no spawns beyond preflight)
npm run db:reset-tenant -- --confirm=WIPE-EMEMS --dry-run

# Wipe only (still requires guards; does not sync/seed)
npm run db:wipe-tenant -- --confirm=WIPE-EMEMS --dry-run
npm run db:wipe-tenant -- --confirm=WIPE-EMEMS

# Full reset after go signal:
npm run db:reset-tenant -- --confirm=WIPE-EMEMS

# Full reset including ATLAS re-sync (only if Emems has an ATLAS map + ATLAS_SCHOOL_ID set):
npm run db:reset-tenant -- --confirm=WIPE-EMEMS --with-atlas
```

Flags: `--confirm=WIPE-EMEMS` (required), `--dry-run`, `--force` (bypass backend-running
and EnrollPro-preflight aborts), `--allow-remote` (only if the database is not on
localhost — must be intentional), `--with-atlas`, `--skip-branding`.

Exit codes: `0` success, `1` aborted by a guard/step failure.

## 9. Pre-Flight Checklist (before running the real reset)

- [ ] EnrollPro team confirmed the **go signal**: branding switched and EMEMS data re-seeded.
- [ ] Preflight shows EnrollPro school branding = **EMEMS** (printed before the wipe starts).
- [ ] No `.env` changes needed — same EnrollPro instance, endpoint, and `ENROLLPRO_SYNC_SECRET`.
- [ ] Backend server **stopped** (`Ctrl+C` the `npm run dev` process). The wipe guards
      against a live backend via `GET /health`, but schedulers (bin reset, sync, ATLAS,
      branding) must not be writing mid-wipe.
- [ ] `DATABASE_URL` points to the local SORT database (guarded; `--allow-remote` if not).
- [ ] Team acknowledges: **no backup is taken — Hinigaran data is permanently deleted.**
- [ ] If Emems has ATLAS: `ATLAS_SCHOOL_ID` in `server/.env` updated; otherwise skip `--with-atlas`.
- [ ] Everyone knows all current logins/sessions will be invalidated after the wipe.

## 10. Verification Checklist (after the real run)

Database (printed automatically by the orchestrator, all history must be `0`):

- [ ] `users` > 0 (only `syncSource = ENROLLPRO`), `reports` = 0, `point_histories` = 0
- [ ] `school_years`: exactly one active, label = Emems school year
- [ ] `term_calendars` = 3, `academic_quarters` = 3, challenges scoped to active term
- [ ] `recycle_market_stocks.accumulated_kg` all `0`
- [ ] `system_settings.school_name` = Emems, logo = new file, colors = Emems palette

Manual:

- [ ] `server/uploads/` contains only the freshly synced Emems logo (no Hinigaran logo)
- [ ] Admin login works; student login works; leaderboard/reports start empty
- [ ] MRF asset-scrap stock page loads and lazily re-creates default materials
- [ ] Hard-refresh all demo browsers once (localStorage still holds old tokens/branding)
- [ ] No "Hinigaran" string visible anywhere in the UI

## 11. Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| Accidental run | Hard `--confirm=WIPE-EMEMS` phrase; orchestrator refuses without it |
| Wipe while server is running | `/health` probe aborts unless `--force`; runbook says stop the backend |
| Wrong database (remote/prod) | Non-local `DATABASE_URL` refused unless `--allow-remote` |
| Stale/incorrect EnrollPro data | Preflight pings EnrollPro and prints its school branding for operator confirmation before any deletion |
| Partial DB wipe | All deletes run in one transaction; files purged only after commit |
| Sync fails after wipe | DB stays clean; re-run `npm run sync:enrollpro` when EnrollPro is up |
| Partial sync (exit 2) | Warning + continue; history stays empty, re-sync later |
| Challenge scope regression | Seed runs after sync; active quarter exists at seed time |
| Lost Hinigaran data | Accepted by decision — unrecoverable by design |

## 12. Files (implemented, inert)

| File | Purpose |
| --- | --- |
| `server/src/scripts/wipe-tenant-data.ts` | Guarded, dry-runnable, atomic tenant wipe + file purge |
| `server/src/scripts/reset-tenant.ts` | One-command orchestrator: preflight → wipe → sync → seed → branding → verify |
| `server/src/scripts/sync-branding.ts` | Standalone EnrollPro branding pull (also `npm run branding:sync`) |
| `server/package.json` | Adds `db:wipe-tenant`, `db:reset-tenant`, `branding:sync` scripts |
