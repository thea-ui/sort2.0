# SORTv2 Database Documentation

Generated from `server/prisma/schema.prisma` on 2026-11-16.

This reference covers **46 tables** and **15 enums**. It excludes Prisma's internal `_prisma_migrations` table.

## Table of Contents

- [SchoolYear](#1-schoolyear) - `school_years`
- [User](#2-user) - `users`
- [Report](#3-report) - `reports`
- [WasteBin](#4-wastebin) - `waste_bins`
- [Offense](#5-offense) - `offenses`
- [PointHistory](#6-pointhistory) - `point_histories`
- [Challenge](#7-challenge) - `challenges`
- [UserChallengeProgress](#8-userchallengeprogress) - `user_challenge_progress`
- [ChallengeContribution](#9-challengecontribution) - `challenge_contributions`
- [RateLimitCounter](#10-ratelimitcounter) - `rate_limit_counters`
- [SystemSetting](#11-systemsetting) - `system_settings`
- [CalendarEvent](#12-calendarevent) - `calendar_events`
- [SyncLog](#13-synclog) - `sync_logs`
- [AssetCategory](#14-assetcategory) - `asset_categories`
- [ItemPreset](#15-itempreset) - `item_presets`
- [CampusLocation](#16-campuslocation) - `campus_locations`
- [RoomLocation](#17-roomlocation) - `room_locations`
- [WasteType](#18-wastetype) - `waste_types`
- [UrgencyLevel](#19-urgencylevel) - `urgency_levels`
- [AssetCondition](#20-assetcondition) - `asset_conditions`
- [PointRule](#21-pointrule) - `point_rules`
- [MaterialPointRule](#22-materialpointrule) - `material_point_rules`
- [AcademicQuarter](#23-academicquarter) - `academic_quarters`
- [RecycleMarketStock](#24-recyclemarketstock) - `recycle_market_stocks`
- [RecycleSaleTransaction](#25-recyclesaletransaction) - `recycle_sale_transactions`
- [UserSession](#26-usersession) - `user_sessions`
- [TermCalendar](#27-termcalendar) - `term_calendars`
- [EnrollmentSyncLog](#28-enrollmentsynclog) - `enrollment_sync_logs`
- [AuditLog](#29-auditlog) - `audit_logs`
- [CampusNews](#30-campusnews) - `campus_news`
- [MarketStockSnapshot](#31-marketstocksnapshot) - `market_stock_snapshots`
- [UserPointSnapshot](#32-userpointsnapshot) - `user_point_snapshots`
- [MrfAssetRecord](#33-mrfassetrecord) - `mrf_asset_records`
- [AssetScrapStock](#34-assetscrapstock) - `asset_scrap_stocks`
- [AssetScrapItem](#35-assetscrapitem) - `asset_scrap_items`
- [AssetScrapSaleTransaction](#36-assetscrapsaletransaction) - `asset_scrap_sale_transactions`
- [AssetScrapStockSnapshot](#37-assetscrapstocksnapshot) - `asset_scrap_stock_snapshots`
- [Certificate](#38-certificate) - `certificates`
- [AtlasMapSnapshot](#39-atlasmapsnapshot) - `atlas_map_snapshots`
- [AtlasBuilding](#40-atlasbuilding) - `atlas_buildings`
- [AtlasRoom](#41-atlasroom) - `atlas_rooms`
- [AtlasSyncLog](#42-atlassynclog) - `atlas_sync_logs`
- [WalkInTurnover](#43-walkinturnover) - `walk_in_turnovers`
- [WalkInTurnoverItem](#44-walkinturnoveritem) - `walk_in_turnover_items`
- [Reward](#45-reward) - `rewards`
- [RewardClaim](#46-rewardclaim) - `reward_claims`
- [Enums](#enums)

## 1. SchoolYear

**Table:** `school_years`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `enrollproId` | `enrollpro_id` | Int? | Unique |  |
| `label` | `label` | String |  | "2026-2027" |
| `startDate` | `start_date` | DateTime |  |  |
| `endDate` | `end_date` | DateTime |  |  |
| `isActive` | `is_active` | Boolean | Default: true |  |
| `isArchived` | `is_archived` | Boolean | Default: false |  |
| `archivedAt` | `archived_at` | DateTime? |  |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |

**Relations**

- `reports`: `Report` (many)
- `pointHistories`: `PointHistory` (many)
- `offenses`: `Offense` (many)
- `challenges`: `Challenge` (many)
- `saleTransactions`: `RecycleSaleTransaction` (many)
- `assetRecords`: `MrfAssetRecord` (many)
- `assetScrapSaleTransactions`: `AssetScrapSaleTransaction` (many)
- `assetScrapStockSnapshots`: `AssetScrapStockSnapshot` (many)
- `assetScrapItems`: `AssetScrapItem` (many)
- `auditLogs`: `AuditLog` (many)
- `marketStockSnapshots`: `MarketStockSnapshot` (many)
- `pointSnapshots`: `UserPointSnapshot` (many)
- `walkInTurnovers`: `WalkInTurnover` (many)
- `rewardClaims`: `RewardClaim` (many)

## 2. User

**Table:** `users`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `name` | `name` | String |  |  |
| `email` | `email` | String | Unique |  |
| `passwordHash` | `password_hash` | String? |  |  |
| `employeeId` | `employee_id` | String | Unique |  |
| `role` | `role` | Role (enum) | Default: STUDENT |  |
| `points` | `points` | Int | Default: 0 |  |
| `warningsCount` | `warnings_count` | Int | Default: 0 |  |
| `accountStatus` | `account_status` | AccountStatus (enum) | Default: ACTIVE |  |
| `suspendedUntil` | `suspended_until` | DateTime? |  |  |
| `classroomSection` | `classroom_section` | String? |  |  |
| `certificates` | `certificates` | String[] | Default: [] |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |
| `updatedAt` | `updated_at` | DateTime | Auto-updated |  |
| `syncSource` | `sync_source` | SyncSource (enum) | Default: LOCAL | EnrollPro sync fields |
| `enrollproId` | `enrollpro_id` | String? | Unique |  |
| `enrollproLrn` | `enrollpro_lrn` | String? | Unique |  |
| `gradeLevel` | `grade_level` | String? |  |  |
| `sectionName` | `section_name` | String? |  |  |
| `academicProgram` | `academic_program` | String? |  |  |
| `schoolYearId` | `school_year_id` | Int? |  |  |
| `schoolYearLabel` | `school_year_label` | String? |  |  |
| `isTemporarilyEnrolled` | `is_temporarily_enrolled` | Boolean? | Default: false |  |
| `enrollmentStatus` | `enrollment_status` | String? |  |  |
| `portalAccountActive` | `portal_account_active` | Boolean? | Default: true |  |
| `archivedAt` | `archived_at` | DateTime? |  |  |
| `passwordCachedAt` | `password_cached_at` | DateTime? |  | Offline login cache: bcrypt hash of the last password EnrollPro verified, accepted ONLY while EnrollPro is unreachable. Null means no offline login. |
| `passwordVerifiedAt` | `password_verified_at` | DateTime? |  | Local-first login: the last time EnrollPro itself confirmed the password. A cached hash without this timestamp must never take the local fast path. |
| `passwordChangeRequired` | `password_change_required` | Boolean | Default: false | EnrollPro default-password flags. They disable the local-first fast path so the next login is checked with EnrollPro again. |
| `passwordResetRequired` | `password_reset_required` | Boolean | Default: false |  |

**Relations**

- `reports`: `Report` (many) - "ReportedBy"
- `assignedReports`: `Report` (many) - "AssignedToMRF"
- `offenses`: `Offense` (many)
- `pointHistories`: `PointHistory` (many)
- `pointSnapshots`: `UserPointSnapshot` (many)
- `sessions`: `UserSession` (many)
- `challengeProgress`: `UserChallengeProgress` (many)
- `challengeContributions`: `ChallengeContribution` (many)
- `certificatesIssued`: `Certificate` (many)
- `walkIns`: `WalkInTurnover` (many) - "WalkInStudent"
- `walkInsRecorded`: `WalkInTurnover` (many) - "WalkInRecorder"
- `rewardClaims`: `RewardClaim` (many)
- `rewardReleases`: `RewardClaim` (many) - "RewardReleasedBy"

**Indexes and constraints**

- `@@index([enrollproId])`
- `@@index([syncSource])`
- `@@index([role])`
- `@@index([points])`

## 3. Report

**Table:** `reports`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `title` | `title` | String |  |  |
| `description` | `description` | String |  |  |
| `status` | `status` | ReportStatus (enum) | Default: PENDING |  |
| `urgency` | `urgency` | Urgency (enum) | Default: MEDIUM |  |
| `category` | `category` | WasteCategory (enum) | Default: NON_BIODEGRADABLE |  |
| `lat` | `lat` | Float |  |  |
| `lng` | `lng` | Float |  |  |
| `locationName` | `location_name` | String |  |  |
| `locationKey` | `location_key` | String |  |  |
| `reporterId` | `reporter_id` | String | FK |  |
| `pointsAwarded` | `points_awarded` | Int | Default: 0 |  |
| `rankPointsAwarded` | `rank_points_awarded` | Int | Default: 0 | Breakdown of pointsAwarded: top-3 rank bonus + student material bonus. |
| `materialPointsAwarded` | `material_points_awarded` | Int | Default: 0 |  |
| `materialPointsBreakdown` | `material_points_breakdown` | Json? |  | Per-material awarded points, e.g. {"pet_plastic":2,"cardboard":2}. |
| `pointsAwardedAt` | `points_awarded_at` | DateTime? |  |  |
| `imageUrl` | `image_url` | String? [Text] |  |  |
| `photoPath` | `photo_path` | String? |  | File-backed photo evidence (relative to server/uploads). New uploads are written to disk; legacy base64 rows keep image_url until the backfill runs. |
| `weightCollected` | `weight_collected` | Float? |  |  |
| `isVerified` | `is_verified` | Boolean | Default: false |  |
| `reportType` | `report_type` | ReportType (enum) | Default: WASTE |  |
| `assignedMrfId` | `assigned_mrf_id` | String? | FK |  |
| `reporterRank` | `reporter_rank` | Int? |  |  |
| `completedAt` | `completed_at` | DateTime? |  |  |
| `materials` | `materials` | String[] | Default: [] | Recyclable material breakdown chosen by the student at report time. |
| `otherMaterialLabel` | `other_material_label` | String? |  |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |
| `updatedAt` | `updated_at` | DateTime | Auto-updated |  |
| `schoolYearId` | `school_year_id` | String? | FK |  |

**Relations**

- `schoolYear`: `SchoolYear` (optional) - fields: [schoolYearId], references: [id], onDelete: SetNull
- `reporter`: `User` (one) - "ReportedBy", fields: [reporterId], references: [id], onDelete: Cascade
- `assignedMrf`: `User` (optional) - "AssignedToMRF", fields: [assignedMrfId], references: [id], onDelete: SetNull
- `pointHistories`: `PointHistory` (many)
- `challengeContributions`: `ChallengeContribution` (many)

**Indexes and constraints**

- `@@index([reporterId])`
- `@@index([status])`
- `@@index([category])`
- `@@index([schoolYearId])`
- `@@index([schoolYearId, createdAt])`
- `@@index([locationKey, category, schoolYearId])`
- `@@index([assignedMrfId])`

## 4. WasteBin

**Table:** `waste_bins`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `name` | `name` | String |  |  |
| `locationName` | `location_name` | String |  |  |
| `fillLevel` | `fill_level` | Int | Default: 0 |  |
| `type` | `type` | WasteCategory (enum) | Default: NON_BIODEGRADABLE |  |
| `lat` | `lat` | Float |  |  |
| `lng` | `lng` | Float |  |  |
| `activeDispatch` | `active_dispatch` | Boolean | Default: false |  |
| `lastEmptied` | `last_emptied` | DateTime? |  |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |
| `updatedAt` | `updated_at` | DateTime | Auto-updated |  |

## 5. Offense

**Table:** `offenses`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `userId` | `user_id` | String | FK |  |
| `description` | `description` | String |  |  |
| `severity` | `severity` | Severity (enum) | Default: WARNING |  |
| `expiresAt` | `expires_at` | DateTime? |  |  |
| `schoolYearId` | `school_year_id` | String? | FK |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |

**Relations**

- `schoolYear`: `SchoolYear` (optional) - fields: [schoolYearId], references: [id], onDelete: SetNull
- `user`: `User` (one) - fields: [userId], references: [id], onDelete: Cascade

**Indexes and constraints**

- `@@index([userId])`
- `@@index([schoolYearId])`

## 6. PointHistory

**Table:** `point_histories`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `userId` | `user_id` | String | FK |  |
| `amount` | `amount` | Int |  |  |
| `reason` | `reason` | String |  |  |
| `reportId` | `report_id` | String? | FK; Unique |  |
| `challengeId` | `challenge_id` | String? | FK |  |
| `walkInTurnoverId` | `walk_in_turnover_id` | String? | FK; Unique |  |
| `rewardClaimId` | `reward_claim_id` | String? | FK; Unique |  |
| `schoolYearId` | `school_year_id` | String? | FK |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |

**Relations**

- `user`: `User` (one) - fields: [userId], references: [id], onDelete: Cascade
- `challenge`: `Challenge` (optional) - fields: [challengeId], references: [id], onDelete: SetNull
- `report`: `Report` (optional) - fields: [reportId], references: [id], onDelete: SetNull
- `walkInTurnover`: `WalkInTurnover` (optional) - fields: [walkInTurnoverId], references: [id], onDelete: SetNull
- `rewardClaim`: `RewardClaim` (optional) - fields: [rewardClaimId], references: [id], onDelete: SetNull
- `schoolYear`: `SchoolYear` (optional) - fields: [schoolYearId], references: [id], onDelete: SetNull

**Indexes and constraints**

- `@@index([userId])`
- `@@index([schoolYearId])`
- `@@index([challengeId])`

## 7. Challenge

**Table:** `challenges`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `code` | `code` | String |  |  |
| `title` | `title` | String |  |  |
| `description` | `description` | String |  |  |
| `challengeType` | `challenge_type` | ChallengeType (enum) | Default: REPORT_COUNT |  |
| `pointsAwarded` | `points_awarded` | Int |  |  |
| `target` | `target` | Int |  |  |
| `isActive` | `is_active` | Boolean | Default: true |  |
| `iconName` | `icon_name` | String |  |  |
| `quarterCode` | `quarter_code` | String | Default: "GLOBAL" | Academic term this challenge instance belongs to. "GLOBAL" = unscoped/legacy. |
| `schoolYearId` | `school_year_id` | String? | FK | School year this instance belongs to. Null = global/legacy (pre-scoping). |
| `startDate` | `start_date` | DateTime? |  |  |
| `endDate` | `end_date` | DateTime? |  |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |

**Relations**

- `schoolYear`: `SchoolYear` (optional) - fields: [schoolYearId], references: [id], onDelete: SetNull
- `progressRecords`: `UserChallengeProgress` (many)
- `contributions`: `ChallengeContribution` (many)
- `pointHistories`: `PointHistory` (many)

**Indexes and constraints**

- `@@unique([code, quarterCode, schoolYearId])`
- `@@index([quarterCode])`
- `@@index([schoolYearId])`

## 8. UserChallengeProgress

**Table:** `user_challenge_progress`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `userId` | `user_id` | String | FK |  |
| `challengeId` | `challenge_id` | String | FK |  |
| `currentCount` | `current_count` | Int | Default: 0 |  |
| `completedAt` | `completed_at` | DateTime? |  |  |
| `rewardedAt` | `rewarded_at` | DateTime? |  |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |
| `updatedAt` | `updated_at` | DateTime | Auto-updated |  |

**Relations**

- `user`: `User` (one) - fields: [userId], references: [id], onDelete: Cascade
- `challenge`: `Challenge` (one) - fields: [challengeId], references: [id], onDelete: Cascade

**Indexes and constraints**

- `@@unique([userId, challengeId])`
- `@@index([challengeId])`

## 9. ChallengeContribution

**Table:** `challenge_contributions`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `userId` | `user_id` | String | FK |  |
| `challengeId` | `challenge_id` | String | FK |  |
| `reportId` | `report_id` | String | FK |  |
| `value` | `value` | Float | Default: 1 |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |

**Relations**

- `user`: `User` (one) - fields: [userId], references: [id], onDelete: Cascade
- `challenge`: `Challenge` (one) - fields: [challengeId], references: [id], onDelete: Cascade
- `report`: `Report` (one) - fields: [reportId], references: [id], onDelete: Cascade

**Indexes and constraints**

- `@@unique([userId, challengeId, reportId])`
- `@@index([challengeId])`
- `@@index([reportId])`

## 10. RateLimitCounter

**Table:** `rate_limit_counters`

Shared express-rate-limit counters (login / ATLAS sync / walk-in). Using the database instead of the default in-memory store keeps limits honest when the API runs as more than one process.

**Primary key:** `key`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `key` | `key` | String | PK |  |
| `totalHits` | `total_hits` | Int | Default: 0 |  |
| `resetAt` | `reset_at` | DateTime |  |  |

**Indexes and constraints**

- `@@index([resetAt])`

## 11. SystemSetting

**Table:** `system_settings`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: "default_setting" |  |
| `pointsPerReport` | `points_per_report` | Int | Default: 50 |  |
| `pointsPerKgRecyclable` | `points_per_kg_recyclable` | Int | Default: 10 |  |
| `warningThreshold` | `warning_threshold` | Int | Default: 3 |  |
| `certificatePointThreshold` | `certificate_point_threshold` | Int | Default: 500 |  |
| `certificateGraceDays` | `certificate_grace_days` | Int | Default: 3 |  |
| `certificateMilestoneName` | `certificate_milestone_name` | String | Default: "Eco-Milestone Certificate" |  |
| `certificateChampionName` | `certificate_champion_name` | String | Default: "Eco-Champion Certificate" |  |
| `certificateLeaderName` | `certificate_leader_name` | String | Default: "Eco-Leader Certificate" |  |
| `certificateAdvocateName` | `certificate_advocate_name` | String | Default: "Eco-Advocate Certificate" |  |
| `quarterGateActive` | `quarter_gate_active` | Boolean | Default: false |  |
| `smartSyncEnabled` | `smart_sync_enabled` | Boolean | Default: true |  |
| `syncMode` | `sync_mode` | String | Default: "MANUAL" |  |
| `syncIntervalMinutes` | `sync_interval_minutes` | Int | Default: 60 |  |
| `atlasSyncMode` | `atlas_sync_mode` | String | Default: "AUTO" |  |
| `atlasSyncIntervalMinutes` | `atlas_sync_interval_minutes` | Int | Default: 15 |  |
| `blueprintPreset` | `blueprint_preset` | String | Default: "DEFAULT" |  |
| `blueprintUrl` | `blueprint_url` | String? |  |  |
| `maxUnverifiedReports` | `max_unverified_reports` | Int | Default: 3 |  |
| `dismissPointPenalty` | `dismiss_point_penalty` | Int | Default: 10 |  |
| `falseReportPointPenalty` | `false_report_point_penalty` | Int | Default: 50 |  |
| `warningAutoDeductAmount` | `warning_auto_deduct_amount` | Int | Default: 10 |  |
| `suspensionDurationHours` | `suspension_duration_hours` | Int | Default: 24 |  |
| `rewardsReservePercent` | `rewards_reserve_percent` | Int | Default: 20 |  |
| `defaultVendorName` | `default_vendor_name` | String | Default: "GreenCycle Recycling Vendor" |  |
| `binResetEnabled` | `bin_reset_enabled` | Boolean | Default: true |  |
| `binResetTime` | `bin_reset_time` | String | Default: "18:00" |  |
| `walkInPointsPer500ml` | `walk_in_points_per_500ml` | Int | Default: 1 |  |
| `walkInEnabled` | `walk_in_enabled` | Boolean | Default: true |  |
| `schoolName` | `school_name` | String? |  | Tenant branding (consumed by the client ThemeProvider via /api/settings/public) null = unconfigured; the client renders the SORT default identity. |
| `schoolAcronym` | `school_acronym` | String? |  |  |
| `schoolId` | `school_id` | String? |  |  |
| `division` | `division` | String? |  |  |
| `region` | `region` | String? |  |  |
| `address` | `address` | String? |  |  |
| `schoolHeadName` | `school_head_name` | String? |  |  |
| `primaryColor` | `primary_color` | String | Default: "#00271D" |  |
| `secondaryColor` | `secondary_color` | String | Default: "#00A77C" |  |
| `accentColor` | `accent_color` | String | Default: "#00A77C" |  |
| `goldColor` | `gold_color` | String | Default: "#C69B26" |  |
| `logoUrl` | `logo_url` | String? |  |  |
| `enrollproPublicUrl` | `enrollpro_public_url` | String? |  |  |
| `enrollproUrl` | `enrollpro_url` | String? |  |  |
| `enrollproBrandingSyncedAt` | `enrollpro_branding_synced_at` | DateTime? |  |  |
| `offlineAuthCacheEnabled` | `offline_auth_cache_enabled` | Boolean | Default: true | Offline password-cache auth: allow sign-in against the last EnrollPro-verified password hash while EnrollPro is unreachable, capped by this freshness window. |
| `offlineAuthCacheMaxDays` | `offline_auth_cache_max_days` | Int | Default: 30 |  |
| `updatedAt` | `updated_at` | DateTime | Auto-updated |  |

## 12. CalendarEvent

**Table:** `calendar_events`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `title` | `title` | String |  |  |
| `date` | `date` | String |  |  |
| `type` | `type` | EventType (enum) | Default: EVENT |  |
| `description` | `description` | String |  |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |

## 13. SyncLog

**Table:** `sync_logs`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `system` | `system` | String |  |  |
| `status` | `status` | SyncStatus (enum) | Default: SUCCESS |  |
| `recordsSynced` | `records_synced` | Int | Default: 0 |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |

## 14. AssetCategory

**Table:** `asset_categories`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `name` | `name` | String |  |  |
| `code` | `code` | String | Unique |  |
| `enabled` | `enabled` | Boolean | Default: true |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |
| `updatedAt` | `updated_at` | DateTime | Auto-updated |  |

**Relations**

- `presets`: `ItemPreset` (many)

## 15. ItemPreset

**Table:** `item_presets`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `categoryId` | `category_id` | String | FK |  |
| `name` | `name` | String |  |  |
| `enabled` | `enabled` | Boolean | Default: true |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |
| `updatedAt` | `updated_at` | DateTime | Auto-updated |  |

**Relations**

- `category`: `AssetCategory` (one) - fields: [categoryId], references: [id], onDelete: Cascade

**Indexes and constraints**

- `@@index([categoryId])`

## 16. CampusLocation

**Table:** `campus_locations`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `code` | `code` | String | Unique |  |
| `name` | `name` | String |  |  |
| `status` | `status` | String | Default: "Available" |  |
| `x` | `x` | Float |  |  |
| `y` | `y` | Float |  |  |
| `streams` | `streams` | Json |  |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |
| `updatedAt` | `updated_at` | DateTime | Auto-updated |  |

## 17. RoomLocation

**Table:** `room_locations`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `name` | `name` | String | Unique |  |
| `building` | `building` | String? |  |  |
| `enabled` | `enabled` | Boolean | Default: true |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |
| `updatedAt` | `updated_at` | DateTime | Auto-updated |  |

## 18. WasteType

**Table:** `waste_types`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `name` | `name` | String |  |  |
| `code` | `code` | String | Unique |  |
| `description` | `description` | String |  |  |
| `hexColor` | `hex_color` | String |  |  |
| `enabled` | `enabled` | Boolean | Default: true |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |
| `updatedAt` | `updated_at` | DateTime | Auto-updated |  |

## 19. UrgencyLevel

**Table:** `urgency_levels`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `level` | `level` | String |  |  |
| `code` | `code` | String | Unique |  |
| `slaHours` | `sla_hours` | Int |  |  |
| `description` | `description` | String |  |  |
| `badgeStyle` | `badge_style` | String |  |  |
| `enabled` | `enabled` | Boolean | Default: true |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |
| `updatedAt` | `updated_at` | DateTime | Auto-updated |  |

## 20. AssetCondition

**Table:** `asset_conditions`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `name` | `name` | String |  |  |
| `code` | `code` | String | Unique |  |
| `description` | `description` | String |  |  |
| `badgeStyle` | `badge_style` | String |  |  |
| `enabled` | `enabled` | Boolean | Default: true |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |
| `updatedAt` | `updated_at` | DateTime | Auto-updated |  |

## 21. PointRule

**Table:** `point_rules`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `rank` | `rank` | Int | Unique |  |
| `title` | `title` | String |  |  |
| `pointsAwarded` | `points_awarded` | Int |  |  |
| `description` | `description` | String |  |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |
| `updatedAt` | `updated_at` | DateTime | Auto-updated |  |

## 22. MaterialPointRule

**Table:** `material_point_rules`

Per-material bonus points for recyclable reports. Students pick the materials on the report; a single material earns its rule's points, while a mixed selection (2+ materials) always earns exactly 1 point.

**Primary key:** `code`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `code` | `code` | String | PK |  |
| `label` | `label` | String |  |  |
| `points` | `points` | Int | Default: 2 |  |
| `updatedAt` | `updated_at` | DateTime | Auto-updated |  |

## 23. AcademicQuarter

**Table:** `academic_quarters`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `quarterName` | `quarter_name` | String |  |  |
| `quarterCode` | `quarter_code` | String | Unique |  |
| `startDate` | `start_date` | String |  |  |
| `endDate` | `end_date` | String |  |  |
| `isActive` | `is_active` | Boolean | Default: false |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |
| `updatedAt` | `updated_at` | DateTime | Auto-updated |  |

## 24. RecycleMarketStock

**Table:** `recycle_market_stocks`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `categoryCode` | `category_code` | String | Unique |  |
| `categoryName` | `category_name` | String |  |  |
| `shortName` | `short_name` | String |  |  |
| `thresholdLimitKg` | `threshold_limit_kg` | Float |  |  |
| `marketPricePerKg` | `market_price_per_kg` | Float |  |  |
| `accumulatedKg` | `accumulated_kg` | Float | Default: 0.0 |  |
| `isApprovedForSale` | `is_approved_for_sale` | Boolean | Default: false |  |
| `approvedAt` | `approved_at` | DateTime? |  |  |
| `approvalReference` | `approval_reference` | String? |  |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |
| `updatedAt` | `updated_at` | DateTime | Auto-updated |  |

## 25. RecycleSaleTransaction

**Table:** `recycle_sale_transactions`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `categoryCode` | `category_code` | String |  |  |
| `categoryName` | `category_name` | String |  |  |
| `weightKg` | `weight_kg` | Float |  |  |
| `marketPriceKg` | `market_price_kg` | Float |  |  |
| `totalRevenue` | `total_revenue` | Float |  |  |
| `buyerName` | `buyer_name` | String |  |  |
| `schoolYearId` | `school_year_id` | String? | FK |  |
| `soldAt` | `sold_at` | DateTime | Default: now() |  |

**Relations**

- `schoolYear`: `SchoolYear` (optional) - fields: [schoolYearId], references: [id], onDelete: SetNull

**Indexes and constraints**

- `@@index([schoolYearId])`

## 26. UserSession

**Table:** `user_sessions`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `userId` | `user_id` | String | FK |  |
| `refreshToken` | `refresh_token` | String | Unique |  |
| `deviceInfo` | `device_info` | String? |  |  |
| `ipAddress` | `ip_address` | String? |  |  |
| `expiresAt` | `expires_at` | DateTime |  |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |

**Relations**

- `user`: `User` (one) - fields: [userId], references: [id], onDelete: Cascade

**Indexes and constraints**

- `@@index([userId])`
- `@@index([refreshToken])`
- `@@index([expiresAt])`

## 27. TermCalendar

**Table:** `term_calendars`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `enrollproId` | `enrollpro_id` | Int | Unique |  |
| `termName` | `term_name` | String |  |  |
| `termCode` | `term_code` | String |  |  |
| `startDate` | `start_date` | DateTime |  |  |
| `endDate` | `end_date` | DateTime |  |  |
| `schoolYearId` | `school_year_id` | Int |  |  |
| `schoolYearLabel` | `school_year_label` | String |  |  |
| `isActive` | `is_active` | Boolean | Default: false |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |
| `updatedAt` | `updated_at` | DateTime | Auto-updated |  |

**Indexes and constraints**

- `@@index([schoolYearId])`

## 28. EnrollmentSyncLog

**Table:** `enrollment_sync_logs`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `syncType` | `sync_type` | String |  |  |
| `status` | `status` | SyncStatus (enum) | Default: SUCCESS |  |
| `recordsPulled` | `records_pulled` | Int | Default: 0 |  |
| `recordsCreated` | `records_created` | Int | Default: 0 |  |
| `recordsUpdated` | `records_updated` | Int | Default: 0 |  |
| `recordsDeleted` | `records_deleted` | Int | Default: 0 |  |
| `errorMessage` | `error_message` | String? |  |  |
| `message` | `message` | String? |  |  |
| `schoolYearId` | `school_year_id` | Int? |  |  |
| `schoolYearLabel` | `school_year_label` | String? |  |  |
| `durationMs` | `duration_ms` | Int? |  |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |

**Indexes and constraints**

- `@@index([createdAt])`

## 29. AuditLog

**Table:** `audit_logs`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `actorName` | `actor_name` | String |  |  |
| `actorRole` | `actor_role` | String |  |  |
| `actionType` | `action_type` | String |  |  |
| `details` | `details` | String |  |  |
| `ipAddress` | `ip_address` | String? |  |  |
| `schoolYearId` | `school_year_id` | String? | FK |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |

**Relations**

- `schoolYear`: `SchoolYear` (optional) - fields: [schoolYearId], references: [id], onDelete: SetNull

**Indexes and constraints**

- `@@index([createdAt])`
- `@@index([actionType])`
- `@@index([schoolYearId])`

## 30. CampusNews

**Table:** `campus_news`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `title` | `title` | String |  |  |
| `body` | `body` | String |  |  |
| `tag` | `tag` | String |  |  |
| `tagColor` | `tag_color` | String |  |  |
| `iconColor` | `icon_color` | String |  |  |
| `isPublished` | `is_published` | Boolean | Default: true |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |
| `updatedAt` | `updated_at` | DateTime | Auto-updated |  |

**Indexes and constraints**

- `@@index([isPublished])`
- `@@index([createdAt])`

## 31. MarketStockSnapshot

**Table:** `market_stock_snapshots`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `schoolYearId` | `school_year_id` | String | FK |  |
| `categoryCode` | `category_code` | String |  |  |
| `categoryName` | `category_name` | String |  |  |
| `closingKg` | `closing_kg` | Float |  |  |
| `openingKg` | `opening_kg` | Float | Default: 0 |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |

**Relations**

- `schoolYear`: `SchoolYear` (one) - fields: [schoolYearId], references: [id]

**Indexes and constraints**

- `@@unique([schoolYearId, categoryCode])`

## 32. UserPointSnapshot

**Table:** `user_point_snapshots`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `schoolYearId` | `school_year_id` | String | FK |  |
| `userId` | `user_id` | String | FK |  |
| `closingPoints` | `closing_points` | Int |  |  |
| `rank` | `rank` | Int? |  |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |

**Relations**

- `schoolYear`: `SchoolYear` (one) - fields: [schoolYearId], references: [id]
- `user`: `User` (one) - fields: [userId], references: [id]

**Indexes and constraints**

- `@@unique([schoolYearId, userId])`

## 33. MrfAssetRecord

**Table:** `mrf_asset_records`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `assetName` | `asset_name` | String |  |  |
| `category` | `category` | String |  | Furniture, Electronics, Fixtures, Equipment, Other |
| `action` | `action` | String |  | RECOVERED, REPAIRED, DISPOSED |
| `disposition` | `disposition` | String? |  | Specific outcome label, e.g. "Repaired at MRF Workshop" |
| `quantity` | `quantity` | Float | Default: 1 |  |
| `unit` | `unit` | String | Default: "pcs" |  |
| `condition` | `condition` | String? |  | GOOD, FAIR, NEEDS_REPAIR, DISPOSED |
| `sourceReportId` | `source_report_id` | String? |  |  |
| `locationName` | `location_name` | String? |  |  |
| `notes` | `notes` | String? |  |  |
| `performedBy` | `performed_by` | String? |  |  |
| `schoolYearId` | `school_year_id` | String? | FK |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |

**Relations**

- `schoolYear`: `SchoolYear` (optional) - fields: [schoolYearId], references: [id], onDelete: SetNull

**Indexes and constraints**

- `@@index([schoolYearId])`
- `@@index([action])`
- `@@index([sourceReportId])`

## 34. AssetScrapStock

**Table:** `asset_scrap_stocks`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `materialCode` | `material_code` | String | Unique |  |
| `materialName` | `material_name` | String |  |  |
| `thresholdLimitKg` | `threshold_limit_kg` | Float |  |  |
| `marketPricePerKg` | `market_price_per_kg` | Float |  |  |
| `accumulatedKg` | `accumulated_kg` | Float | Default: 0.0 |  |
| `isApprovedForSale` | `is_approved_for_sale` | Boolean | Default: false |  |
| `approvalReference` | `approval_reference` | String? |  |  |
| `approvedAt` | `approved_at` | DateTime? |  |  |
| `hazmat` | `hazmat` | Boolean | Default: false |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |
| `updatedAt` | `updated_at` | DateTime | Auto-updated |  |

## 35. AssetScrapItem

**Table:** `asset_scrap_items`

Per-item scrap records. An item enters as AWAITING_WEIGHT when an asset is declared unserviceable but cannot be weighed yet (mirrors the residual "unweighed batch" concept), then moves IN_STOCK once weighed, SOLD when its batch is sold, or DISPOSED when routed to an accredited handler.

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `materialCode` | `material_code` | String |  |  |
| `materialName` | `material_name` | String |  |  |
| `weightKg` | `weight_kg` | Float? |  |  |
| `status` | `status` | String | Default: "AWAITING_WEIGHT" |  |
| `description` | `description` | String? |  |  |
| `sourceAssetId` | `source_asset_id` | String? |  |  |
| `sourceReportId` | `source_report_id` | String? |  |  |
| `weighedBy` | `weighed_by` | String? |  |  |
| `weighedAt` | `weighed_at` | DateTime? |  |  |
| `saleTransactionId` | `sale_transaction_id` | String? |  |  |
| `disposedBy` | `disposed_by` | String? |  |  |
| `disposedAt` | `disposed_at` | DateTime? |  |  |
| `disposalReference` | `disposal_reference` | String? |  |  |
| `schoolYearId` | `school_year_id` | String? | FK |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |
| `updatedAt` | `updated_at` | DateTime | Auto-updated |  |

**Relations**

- `schoolYear`: `SchoolYear` (optional) - fields: [schoolYearId], references: [id], onDelete: SetNull

**Indexes and constraints**

- `@@index([materialCode])`
- `@@index([status])`
- `@@index([sourceAssetId])`
- `@@index([sourceReportId])`
- `@@index([schoolYearId])`

## 36. AssetScrapSaleTransaction

**Table:** `asset_scrap_sale_transactions`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `materialCode` | `material_code` | String |  |  |
| `materialName` | `material_name` | String |  |  |
| `weightKg` | `weight_kg` | Float |  |  |
| `marketPriceKg` | `market_price_kg` | Float |  |  |
| `totalRevenue` | `total_revenue` | Float |  |  |
| `buyerName` | `buyer_name` | String |  |  |
| `approvalReference` | `approval_reference` | String? |  |  |
| `schoolYearId` | `school_year_id` | String? | FK |  |
| `soldAt` | `sold_at` | DateTime | Default: now() |  |

**Relations**

- `schoolYear`: `SchoolYear` (optional) - fields: [schoolYearId], references: [id], onDelete: SetNull

**Indexes and constraints**

- `@@index([schoolYearId])`

## 37. AssetScrapStockSnapshot

**Table:** `asset_scrap_stock_snapshots`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `schoolYearId` | `school_year_id` | String | FK |  |
| `materialCode` | `material_code` | String |  |  |
| `materialName` | `material_name` | String |  |  |
| `closingKg` | `closing_kg` | Float |  |  |
| `openingKg` | `opening_kg` | Float | Default: 0 |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |

**Relations**

- `schoolYear`: `SchoolYear` (one) - fields: [schoolYearId], references: [id]

**Indexes and constraints**

- `@@unique([schoolYearId, materialCode])`

## 38. Certificate

**Table:** `certificates`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `userId` | `user_id` | String | FK |  |
| `serial` | `serial` | String | Unique |  |
| `type` | `type` | CertificateType (enum) |  |  |
| `tier` | `tier` | CertificateTier (enum) |  |  |
| `name` | `name` | String |  |  |
| `rankAtIssue` | `rank_at_issue` | Int? |  |  |
| `pointsAtIssue` | `points_at_issue` | Int |  |  |
| `termCode` | `term_code` | String? |  |  |
| `termName` | `term_name` | String? |  |  |
| `schoolYearId` | `school_year_id` | String? |  |  |
| `schoolYearLabel` | `school_year_label` | String? |  |  |
| `issuedAt` | `issued_at` | DateTime | Default: now() |  |
| `issuedBy` | `issued_by` | String? |  |  |
| `templateVersion` | `template_version` | String | Default: "v1" |  |

**Relations**

- `user`: `User` (one) - fields: [userId], references: [id], onDelete: Cascade

**Indexes and constraints**

- `@@index([userId])`
- `@@index([schoolYearId, termCode])`
- `@@index([type])`

## 39. AtlasMapSnapshot

**Table:** `atlas_map_snapshots`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `schoolId` | `school_id` | Int | Unique |  |
| `etag` | `etag` | String? |  |  |
| `contentHash` | `content_hash` | String |  |  |
| `buildingCount` | `building_count` | Int | Default: 0 |  |
| `roomCount` | `room_count` | Int | Default: 0 |  |
| `campusImageUrl` | `campus_image_url` | String? |  |  |
| `campusImagePath` | `campus_image_path` | String? |  |  |
| `campusImageHash` | `campus_image_hash` | String? |  |  |
| `fetchedAt` | `fetched_at` | DateTime | Default: now() |  |
| `changedAt` | `changed_at` | DateTime? |  |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |
| `updatedAt` | `updated_at` | DateTime | Auto-updated |  |

## 40. AtlasBuilding

**Table:** `atlas_buildings`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `atlasId` | `atlas_id` | Int | Unique |  |
| `schoolId` | `school_id` | Int |  |  |
| `name` | `name` | String |  |  |
| `shortCode` | `short_code` | String? |  |  |
| `x` | `x` | Float |  |  |
| `y` | `y` | Float |  |  |
| `width` | `width` | Float |  |  |
| `height` | `height` | Float |  |  |
| `color` | `color` | String? |  |  |
| `rotation` | `rotation` | Float | Default: 0 |  |
| `floorCount` | `floor_count` | Int | Default: 1 |  |
| `isTeachingBuilding` | `is_teaching_building` | Boolean | Default: true |  |
| `gradeScope` | `gradeScope` | Json? |  |  |
| `isActive` | `is_active` | Boolean | Default: true |  |
| `atlasUpdatedAt` | `atlas_updated_at` | DateTime? |  |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |
| `updatedAt` | `updated_at` | DateTime | Auto-updated |  |

**Relations**

- `rooms`: `AtlasRoom` (many)

**Indexes and constraints**

- `@@index([schoolId, isActive])`

## 41. AtlasRoom

**Table:** `atlas_rooms`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `atlasId` | `atlas_id` | Int | Unique |  |
| `atlasBuildingId` | `atlas_building_id` | String | FK |  |
| `name` | `name` | String |  |  |
| `floor` | `floor` | Int | Default: 1 |  |
| `type` | `type` | String |  |  |
| `capacity` | `capacity` | Int? |  |  |
| `isTeachingSpace` | `is_teaching_space` | Boolean | Default: false |  |
| `isSharedFacility` | `is_shared_facility` | Boolean | Default: false |  |
| `floorPosition` | `floor_position` | Int? |  |  |
| `features` | `features` | Json? |  |  |
| `isActive` | `is_active` | Boolean | Default: true |  |
| `atlasUpdatedAt` | `atlas_updated_at` | DateTime? |  |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |
| `updatedAt` | `updated_at` | DateTime | Auto-updated |  |

**Relations**

- `building`: `AtlasBuilding` (one) - fields: [atlasBuildingId], references: [id], onDelete: Cascade

**Indexes and constraints**

- `@@index([atlasBuildingId, isActive])`

## 42. AtlasSyncLog

**Table:** `atlas_sync_logs`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `schoolId` | `school_id` | Int |  |  |
| `status` | `status` | SyncStatus (enum) |  |  |
| `unchanged` | `unchanged` | Boolean | Default: false |  |
| `buildingsSeen` | `buildings_seen` | Int | Default: 0 |  |
| `roomsSeen` | `rooms_seen` | Int | Default: 0 |  |
| `inserted` | `inserted` | Int | Default: 0 |  |
| `updated` | `updated` | Int | Default: 0 |  |
| `deactivated` | `deactivated` | Int | Default: 0 |  |
| `imageChanged` | `image_changed` | Boolean | Default: false |  |
| `errorMessage` | `error_message` | String? |  |  |
| `durationMs` | `duration_ms` | Int |  |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |

**Indexes and constraints**

- `@@index([schoolId, createdAt])`

## 43. WalkInTurnover

**Table:** `walk_in_turnovers`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `studentId` | `student_id` | String | FK |  |
| `recordedById` | `recorded_by_id` | String? | FK |  |
| `recordedByName` | `recorded_by_name` | String |  |  |
| `material` | `material` | String | Default: "pet_plastic" | pet_plastic \| aluminum_cans \| cardboard |
| `totalMl` | `total_ml` | Int |  |  |
| `totalBottles` | `total_bottles` | Int |  |  |
| `totalGrams` | `total_grams` | Int |  |  |
| `pointsAwarded` | `points_awarded` | Int |  |  |
| `ratePer500ml` | `rate_per_500ml` | Int |  |  |
| `notes` | `notes` | String? |  |  |
| `idempotencyKey` | `idempotency_key` | String | Unique |  |
| `schoolYearId` | `school_year_id` | String | FK |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |

**Relations**

- `student`: `User` (one) - "WalkInStudent", fields: [studentId], references: [id], onDelete: Cascade
- `recordedBy`: `User` (optional) - "WalkInRecorder", fields: [recordedById], references: [id], onDelete: SetNull
- `schoolYear`: `SchoolYear` (one) - fields: [schoolYearId], references: [id]
- `items`: `WalkInTurnoverItem` (many)
- `pointHistory`: `PointHistory` (optional)
- `rewardClaims`: `RewardClaim` (many)

**Indexes and constraints**

- `@@index([studentId, schoolYearId])`
- `@@index([studentId, createdAt])`
- `@@index([recordedById])`
- `@@index([createdAt])`

## 44. WalkInTurnoverItem

**Table:** `walk_in_turnover_items`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `turnoverId` | `turnover_id` | String | FK |  |
| `bottleMl` | `bottle_ml` | Int |  |  |
| `quantity` | `quantity` | Int |  |  |
| `grams` | `grams` | Int |  |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |

**Relations**

- `turnover`: `WalkInTurnover` (one) - fields: [turnoverId], references: [id], onDelete: Cascade

**Indexes and constraints**

- `@@index([turnoverId])`

## 45. Reward

**Table:** `rewards`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `code` | `code` | String | Unique |  |
| `title` | `title` | String |  |  |
| `description` | `description` | String |  |  |
| `iconName` | `icon_name` | String |  |  |
| `rewardType` | `reward_type` | RewardType (enum) | Default: PHYSICAL |  |
| `requiredGrams` | `required_grams` | Int |  |  |
| `pointsValue` | `points_value` | Int | Default: 0 |  |
| `stock` | `stock` | Int? |  |  |
| `isActive` | `is_active` | Boolean | Default: true |  |
| `sortOrder` | `sort_order` | Int | Default: 0 |  |
| `createdAt` | `created_at` | DateTime | Default: now() |  |
| `updatedAt` | `updated_at` | DateTime | Auto-updated |  |

**Relations**

- `claims`: `RewardClaim` (many)

**Indexes and constraints**

- `@@index([isActive, requiredGrams])`

## 46. RewardClaim

**Table:** `reward_claims`

**Primary key:** `id`

| Field | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `id` | `id` | String | PK; Default: uuid() |  |
| `userId` | `user_id` | String | FK |  |
| `rewardId` | `reward_id` | String | FK |  |
| `turnoverId` | `turnover_id` | String? | FK |  |
| `status` | `status` | RewardClaimStatus (enum) | Default: UNLOCKED |  |
| `claimCode` | `claim_code` | String | Unique |  |
| `gramsAtUnlock` | `grams_at_unlock` | Int |  |  |
| `unlockedAt` | `unlocked_at` | DateTime | Default: now() |  |
| `requestedAt` | `requested_at` | DateTime? |  |  |
| `releasedAt` | `released_at` | DateTime? |  |  |
| `releasedById` | `released_by_id` | String? | FK |  |
| `schoolYearId` | `school_year_id` | String | FK |  |
| `notes` | `notes` | String? |  |  |

**Relations**

- `user`: `User` (one) - fields: [userId], references: [id], onDelete: Cascade
- `reward`: `Reward` (one) - fields: [rewardId], references: [id], onDelete: Cascade
- `turnover`: `WalkInTurnover` (optional) - fields: [turnoverId], references: [id], onDelete: SetNull
- `releasedBy`: `User` (optional) - "RewardReleasedBy", fields: [releasedById], references: [id], onDelete: SetNull
- `schoolYear`: `SchoolYear` (one) - fields: [schoolYearId], references: [id]
- `pointHistory`: `PointHistory` (optional)

**Indexes and constraints**

- `@@unique([userId, rewardId, schoolYearId])`
- `@@index([status, unlockedAt])`
- `@@index([userId])`
- `@@index([rewardId])`

## Enums

### Role

`STUDENT`, `TEACHER`, `MRF`, `ADMIN`

### SyncSource

`LOCAL`, `ENROLLPRO`

### ReportStatus

`PENDING`, `DISPATCHED`, `COLLECTED`, `RESOLVED`, `DISMISSED`, `EXPIRED`

### WasteCategory

`RECYCLABLE`, `BIODEGRADABLE`, `NON_BIODEGRADABLE`

### Urgency

`LOW`, `MEDIUM`, `HIGH`

### ReportType

`WASTE`, `ASSET`

### Severity

`WARNING`, `DEDUCT`, `SUSPENSION`

### AccountStatus

`ACTIVE`, `SUSPENDED`

### EventType

`COLLECTION`, `EVENT`, `MAINTENANCE`

### SyncStatus

`SUCCESS`, `FAILED`, `PARTIAL`

### ChallengeType

`REPORT_COUNT`, `WEIGHT_COLLECTED`

### CertificateType

`MILESTONE`, `RANK`

### CertificateTier

`MILESTONE`, `CHAMPION`, `LEADER`, `ADVOCATE`

### RewardType

`POINTS`, `PHYSICAL`

### RewardClaimStatus

`UNLOCKED`, `REQUESTED`, `RELEASED`, `CANCELLED`

