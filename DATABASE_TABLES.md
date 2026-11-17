# SORTv2 Database Tables

Source of truth: `server/prisma/schema.prisma` (last synced 2026-11-16).

For the full field-level reference, see [docs/DATABASE_DOCUMENTATION.md](docs/DATABASE_DOCUMENTATION.md).

- **46 domain tables** total.
- `_prisma_migrations` is excluded; it is Prisma's internal migration bookkeeping table.
- Your current draft (Tables 5-48) covers **44** of these; the missing ones are flagged below.

## Table Inventory

| # | Model | Database Table | Primary Key |
|---|---|---|---|
| 1 | SchoolYear | `school_years` | `id` |
| 2 | User | `users` | `id` |
| 3 | Report | `reports` | `id` |
| 4 | WasteBin | `waste_bins` | `id` |
| 5 | Offense | `offenses` | `id` |
| 6 | PointHistory | `point_histories` | `id` |
| 7 | Challenge | `challenges` | `id` |
| 8 | UserChallengeProgress | `user_challenge_progress` | `id` |
| 9 | ChallengeContribution | `challenge_contributions` | `id` |
| 10 | RateLimitCounter | `rate_limit_counters` | `key` |
| 11 | SystemSetting | `system_settings` | `id` |
| 12 | CalendarEvent | `calendar_events` | `id` |
| 13 | SyncLog | `sync_logs` | `id` |
| 14 | AssetCategory | `asset_categories` | `id` |
| 15 | ItemPreset | `item_presets` | `id` |
| 16 | CampusLocation | `campus_locations` | `id` |
| 17 | RoomLocation | `room_locations` | `id` |
| 18 | WasteType | `waste_types` | `id` |
| 19 | UrgencyLevel | `urgency_levels` | `id` |
| 20 | AssetCondition | `asset_conditions` | `id` |
| 21 | PointRule | `point_rules` | `id` |
| 22 | MaterialPointRule | `material_point_rules` | `code` |
| 23 | AcademicQuarter | `academic_quarters` | `id` |
| 24 | RecycleMarketStock | `recycle_market_stocks` | `id` |
| 25 | RecycleSaleTransaction | `recycle_sale_transactions` | `id` |
| 26 | UserSession | `user_sessions` | `id` |
| 27 | TermCalendar | `term_calendars` | `id` |
| 28 | EnrollmentSyncLog | `enrollment_sync_logs` | `id` |
| 29 | AuditLog | `audit_logs` | `id` |
| 30 | CampusNews | `campus_news` | `id` |
| 31 | MarketStockSnapshot | `market_stock_snapshots` | `id` |
| 32 | UserPointSnapshot | `user_point_snapshots` | `id` |
| 33 | MrfAssetRecord | `mrf_asset_records` | `id` |
| 34 | AssetScrapStock | `asset_scrap_stocks` | `id` |
| 35 | AssetScrapItem | `asset_scrap_items` | `id` |
| 36 | AssetScrapSaleTransaction | `asset_scrap_sale_transactions` | `id` |
| 37 | AssetScrapStockSnapshot | `asset_scrap_stock_snapshots` | `id` |
| 38 | Certificate | `certificates` | `id` |
| 39 | AtlasMapSnapshot | `atlas_map_snapshots` | `id` |
| 40 | AtlasBuilding | `atlas_buildings` | `id` |
| 41 | AtlasRoom | `atlas_rooms` | `id` |
| 42 | AtlasSyncLog | `atlas_sync_logs` | `id` |
| 43 | WalkInTurnover | `walk_in_turnovers` | `id` |
| 44 | WalkInTurnoverItem | `walk_in_turnover_items` | `id` |
| 45 | Reward | `rewards` | `id` |
| 46 | RewardClaim | `reward_claims` | `id` |

## Missing From the Current Draft

### Table 49: MaterialPointRule (`material_point_rules`)

Admin-configurable per-material bonus points for recyclable reports.

| Field Name | Data Type | Notes |
|---|---|---|
| `code` | varchar | Primary key (`pet_plastic`, `cardboard`, `aluminum_cans`, `glass`, `others`) |
| `label` | varchar | Display label |
| `points` | integer | Points awarded (default 2; Mixed/Others is fixed at 1) |
| `updatedAt` | timestamp | Last modification timestamp |

### Table 50: RateLimitCounter (`rate_limit_counters`)

Internal API rate-limiting table; may be omitted from the user-facing ERD.

| Field Name | Data Type | Notes |
|---|---|---|
| `key` | varchar | Primary key |
| `totalHits` | integer | Request count (default 0) |
| `resetAt` | timestamp | Window reset time (indexed) |

## Field Additions Missing From Existing Draft Tables

### Report (`reports`)

| Field Name | DB Column | Data Type | Purpose |
|---|---|---|---|
| `rankPointsAwarded` | `rank_points_awarded` | integer | Top-3 reporter bonus portion |
| `materialPointsAwarded` | `material_points_awarded` | integer | Material bonus portion |
| `materialPointsBreakdown` | `material_points_breakdown` | json | Per-material awarded points |
| `materials` | `materials` | string[] | Materials ticked by the student |
| `otherMaterialLabel` | `other_material_label` | varchar | Free-text label for Mixed/Others |
| `photoPath` | `photo_path` | text | File-backed photo evidence path (already in schema; not in draft) |

### WalkInTurnover (`walk_in_turnovers`)

| Field Name | DB Column | Data Type | Purpose |
|---|---|---|---|
| `material` | `material` | varchar | Accepted material (`pet_plastic`, `aluminum_cans`, `cardboard`) |

### SystemSetting (`system_settings`)

| Field Name | DB Column | Data Type |
|---|---|---|
| `offlineAuthCacheEnabled` | `offline_auth_cache_enabled` | boolean |
| `offlineAuthCacheMaxDays` | `offline_auth_cache_max_days` | integer |

### User (`users`)

| Field Name | DB Column | Data Type |
|---|---|---|
| `passwordCachedAt` | `password_cached_at` | timestamp |
| `passwordVerifiedAt` | `password_verified_at` | timestamp |
| `passwordChangeRequired` | `password_change_required` | boolean |
| `passwordResetRequired` | `password_reset_required` | boolean |

### RecycleMarketStock (`recycle_market_stocks`)

| Field Name | DB Column | Data Type |
|---|---|---|
| `approvalReference` | `approval_reference` | varchar |

## Description Updates

- **RecycleMarketStock.marketPricePerKg** and **RecycleSaleTransaction.marketPriceKg**: the sale price per kilogram is now entered by MRF at sale time; the stock-level `marketPricePerKg` is reference-only/legacy.
- **WalkInTurnover**: Walk-in turnover now supports materials beyond bottles; `totalMl` / `totalBottles` are zero for weighed cardboard entries (weight stored in `totalGrams`).
