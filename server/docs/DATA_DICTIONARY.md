# SORTv2 Database Data Dictionary

A Data Dictionary provides comprehensive descriptions of the data elements, structures, types, constraints, and relationships within the **SORTv2 (Smart Operations & Resource Tracking)** database system. This reference assists developers, database administrators, and academic evaluators in understanding the logical and physical data model supporting school environmental reporting, automated gamification, SIS synchronization, and MRF inventory operations.

---

### Database Conventions & Technology Stack
- **Database Engine:** PostgreSQL 15+
- **ORM / Schema Manager:** Prisma ORM 6
- **Primary Keys:** Universal Unique Identifiers (`UUIDv4`, `varchar(36)`), preventing sequential enumeration security exploits.
- **Foreign Keys:** Pluralized snake_case table references with singular identifier column naming convention (e.g., `user_id`, `school_year_id`, `reporter_id`).
- **Timestamp Standard:** ISO 8601 UTC timestamps with microsecond precision (`TIMESTAMP(3)`).

---

## Table 5: User (`users`)
Stores user profiles for all platform actors across campus roles (Student, Teacher, MRF Personnel, System Administrator). Handles SIS synchronization with EnrollPro, authentication credentials, and live gamification balances.

| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 36 (UUID, PK) | Unique identifier for the user account |
| `name` | `VARCHAR` | 255 | Full legal name of the user (e.g., "CASTILLO, ERIKA AQUINO") |
| `email` | `VARCHAR` | 255 (Unique) | School or personal contact email address used for login |
| `password_hash` | `TEXT` | Nullable | Cryptographic hash of the user password (bcrypt, 10 salt rounds) |
| `employee_id` | `VARCHAR` | 100 (Unique) | Unique campus identifier (DepEd LRN for students, Employee No. for staff) |
| `role` | `ENUM` | `Role` | Access permission tier (`STUDENT`, `TEACHER`, `MRF`, `ADMIN`) |
| `points` | `INTEGER` | Default: 0 | Current spendable / redeemable gamification points balance |
| `warnings_count` | `INTEGER` | Default: 0 | Cumulative active disciplinary warnings issued |
| `account_status` | `ENUM` | `AccountStatus` | Account standing (`ACTIVE`, `SUSPENDED`) |
| `suspended_until` | `TIMESTAMP` | Nullable | Timestamp until which account access is restricted |
| `classroom_section` | `VARCHAR` | 100, Nullable | Assigned advisory classroom or homeroom section |
| `certificates` | `TEXT[]` | Array | Array of earned achievement certificate template keys |
| `sync_source` | `ENUM` | `SyncSource` | Origin of user profile (`LOCAL`, `ENROLLPRO`) |
| `enrollpro_id` | `VARCHAR` | 100, Unique, Nullable | Remote primary key in EnrollPro SIS database |
| `enrollpro_lrn` | `VARCHAR` | 12, Unique, Nullable | Official 12-digit DepEd Learner Reference Number |
| `grade_level` | `VARCHAR` | 50, Nullable | Educational grade level (e.g., "Grade 10", "Faculty") |
| `section_name` | `VARCHAR` | 100, Nullable | Section designation name from official enrollment register |
| `academic_program` | `VARCHAR` | 100, Nullable | Academic curriculum track or department (e.g., "Junior High School", "TVL-ICT") |
| `school_year_id` | `INTEGER` | Nullable | Current active school year foreign identifier from EnrollPro |
| `school_year_label` | `VARCHAR` | 50, Nullable | Text label of active school year (e.g., "2026-2027") |
| `is_temporarily_enrolled` | `BOOLEAN` | Default: false | Flag indicating probationary or incomplete document enrollment |
| `enrollment_status` | `VARCHAR` | 50, Nullable | Current SIS standing (e.g., "Enrolled", "Transferred Out") |
| `portal_account_active` | `BOOLEAN` | Default: true | Flag controlling student portal login eligibility |
| `archived_at` | `TIMESTAMP` | Nullable | Timestamp when record was archived during academic rollover |
| `created_at` | `TIMESTAMP` | Default: `now()` | Record creation timestamp |
| `updated_at` | `TIMESTAMP` | Auto-updated | Record last modification timestamp |

*Table 5 serves as the central identity registry for SORTv2. It seamlessly mirrors SIS student enrollment data from EnrollPro while preserving local authentication tokens, gamified eco-points, and behavioral warning histories.*

---

## Table 6: Report (`reports`)
Functions as the core incident registry for environmental waste issues and damaged campus assets. Tracks coordinates, photographic proof, triage status, and assigned cleanup personnel.

| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 36 (UUID, PK) | Unique report identifier |
| `title` | `VARCHAR` | 255 | Headline summary of the waste or asset report |
| `description` | `TEXT` | - | Detailed contextual notes describing the incident |
| `status` | `ENUM` | `ReportStatus` | Workflow lifecycle state (`PENDING`, `DISPATCHED`, `COLLECTED`, `RESOLVED`, `DISMISSED`) |
| `urgency` | `ENUM` | `Urgency` | Priority assessment (`LOW`, `MEDIUM`, `HIGH`) |
| `category` | `ENUM` | `WasteCategory` | Waste classification (`RECYCLABLE`, `BIODEGRADABLE`, `NON_BIODEGRADABLE`, `HAZARDOUS`) |
| `lat` | `DOUBLE PRECISION` | - | Geographic latitude coordinate of incident site |
| `lng` | `DOUBLE PRECISION` | - | Geographic longitude coordinate of incident site |
| `location_name` | `VARCHAR` | 255 | Human-readable campus site (e.g., "Science Building 2nd Floor") |
| `location_key` | `VARCHAR` | 100 | Standardized location identifier for aggregation and hotspot analytics |
| `reporter_id` | `VARCHAR` | 36 (FK -> `users.id`) | Foreign key identifying the student or teacher who filed the report |
| `points_awarded` | `INTEGER` | Default: 0 | Total gamification points granted upon successful resolution |
| `points_awarded_at`| `TIMESTAMP` | Nullable | Timestamp when incentive points were credited to reporter |
| `image_url` | `TEXT` | Nullable | URL or Base64 storage pointer of uploaded photographic evidence |
| `weight_collected` | `DOUBLE PRECISION` | Nullable | Measured weight in kilograms (kg) of waste recovered |
| `is_verified` | `BOOLEAN` | Default: false | Verification status confirmed by MRF personnel or admin |
| `report_type` | `ENUM` | `ReportType` | Incident classification (`WASTE`, `ASSET`) |
| `assigned_mrf_id` | `VARCHAR` | 36 (FK -> `users.id`, Nullable) | Foreign key identifying MRF staff member assigned to resolve |
| `reporter_rank` | `INTEGER` | Nullable | Campus leaderboard rank of the reporter at time of submission |
| `school_year_id` | `VARCHAR` | 36 (FK -> `school_years.id`, Nullable) | Academic school year during which the incident occurred |
| `completed_at` | `TIMESTAMP` | Nullable | Timestamp of cleanup verification and ticket closure |
| `created_at` | `TIMESTAMP` | Default: `now()` | Timestamp when the report was submitted |
| `updated_at` | `TIMESTAMP` | Auto-updated | Timestamp of last report status update |

*Table 6 captures the complete lifecycle of campus environmental issues. Linking physical coordinates with measured collected kilograms (`weight_collected`) enables quantitative reporting on campus waste diversion and carbon footprint reduction.*

---

## Table 7: CampusNews (`campus_news`)
Manages announcements, sustainability drives, and environmental bulletins broadcast across the campus web and mobile dashboards.

| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 36 (UUID, PK) | Unique news bulletin identifier |
| `title` | `VARCHAR` | 255 | Headline title of the announcement |
| `body` | `TEXT` | - | Comprehensive text content or announcement details |
| `tag` | `VARCHAR` | 50 | Category badge label (e.g., "Clean Up", "Drive", "Advisory") |
| `tag_color` | `VARCHAR` | 50 | CSS/Tailwind accent badge color class for category tag |
| `icon_color` | `VARCHAR` | 50 | UI icon palette color styling |
| `is_published` | `BOOLEAN` | Default: true | Visibility toggle controlling public display to students |
| `created_at` | `TIMESTAMP` | Default: `now()` | Announcement publication timestamp |
| `updated_at` | `TIMESTAMP` | Auto-updated | Timestamp of last bulletin revision |

*Table 7 keeps the student body informed on upcoming collection dates, campus eco-drives, and zero-waste policy directives.*

---

## Table 8: AssetCategory (`asset_categories`)
Defines standardized campus property categories for reporting damaged or unserviceable school assets (e.g., Furniture, IT Equipment, Electrical Fixtures).

| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 36 (UUID, PK) | Unique category identifier |
| `name` | `VARCHAR` | 100 | Display name of the asset category |
| `code` | `VARCHAR` | 50 (Unique) | System key code (e.g., "FURNITURE", "ELECTRONICS") |
| `enabled` | `BOOLEAN` | Default: true | Active status toggle for form dropdowns |
| `created_at` | `TIMESTAMP` | Default: `now()` | Record creation timestamp |
| `updated_at` | `TIMESTAMP` | Auto-updated | Last updated timestamp |

*Table 8 provides high-level categorization to route school facility repairs to appropriate custodial and maintenance staff.*

---

## Table 9: ItemPreset (`item_presets`)
Stores specific asset items under an `AssetCategory` to accelerate reporting through standardized tap-to-select interface chips.

| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 36 (UUID, PK) | Unique item preset identifier |
| `category_id` | `VARCHAR` | 36 (FK -> `asset_categories.id`) | Foreign key linking item to its parent asset category |
| `name` | `VARCHAR` | 100 | Specific asset name (e.g., "Armchair", "Ceiling Fan", "Fluorescent Bulb") |
| `enabled` | `BOOLEAN` | Default: true | Active status toggle for student submission view |
| `created_at` | `TIMESTAMP` | Default: `now()` | Record creation timestamp |
| `updated_at` | `TIMESTAMP` | Auto-updated | Last updated timestamp |

*Table 9 standardizes equipment vocabulary, preventing duplicate user-entered synonyms for common school furnishings.*

---

## Table 10: CampusLocation (`campus_locations`) & RoomLocation (`room_locations`)
Manages geographical map coordinate markers, waste collection hubs, and indoor facilities across the campus blueprint.

### 10A: CampusLocation (`campus_locations`)
| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 36 (UUID, PK) | Unique location identifier |
| `code` | `VARCHAR` | 50 (Unique) | Standard alphanumeric site code (e.g., "BIN-LOC-01") |
| `name` | `VARCHAR` | 255 | Campus site name (e.g., "Gymnasium North Gate") |
| `status` | `VARCHAR` | 50 (Default: "Available") | Operational status of the station |
| `x` | `DOUBLE PRECISION` | - | Normalized X coordinate percentage on campus blueprint |
| `y` | `DOUBLE PRECISION` | - | Normalized Y coordinate percentage on campus blueprint |
| `streams` | `JSON` | - | Supported waste stream bins present (Biodegradable, Recyclable, etc.) |
| `created_at` | `TIMESTAMP` | Default: `now()` | Registration timestamp |
| `updated_at` | `TIMESTAMP` | Auto-updated | Last location update timestamp |

### 10B: RoomLocation (`room_locations`)
| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 36 (UUID, PK) | Unique room identifier |
| `name` | `VARCHAR` | 100 (Unique) | Room name or number (e.g., "Room 204", "Science Lab A") |
| `building` | `VARCHAR` | 100, Nullable | Building name housing the room |
| `enabled` | `BOOLEAN` | Default: true | Active toggle for room selector |
| `created_at` | `TIMESTAMP` | Default: `now()` | Registration timestamp |
| `updated_at` | `TIMESTAMP` | Auto-updated | Last modification timestamp |

*Tables 10A and 10B govern campus spatial geometry, enabling interactive heatmap visualizers and routing drivers.*

---

## Table 11: SystemSetting (`system_settings`)
Houses global administrative configuration constants, point multiplier formulas, disciplinary policies, and operational thresholds.

| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 50 (PK, Default: "default_setting") | Singleton setting identifier |
| `points_per_report` | `INTEGER` | Default: 50 | Baseline eco-points awarded per verified report |
| `points_per_kg_recyclable` | `INTEGER` | Default: 10 | Bonus points awarded per kilogram of recyclable waste collected |
| `warning_threshold` | `INTEGER` | Default: 3 | Warning count before automated account suspension |
| `certificate_point_threshold` | `INTEGER` | Default: 500 | Points required to unlock high-tier certificates |
| `quarter_gate_active` | `BOOLEAN` | Default: false | Restricts reporting to active academic quarter windows |
| `smart_sync_enabled` | `BOOLEAN` | Default: true | Enables automatic background synchronization with EnrollPro |
| `blueprint_preset` | `VARCHAR` | 50, Default: "DEFAULT" | Active campus layout graphic schema preset |
| `blueprint_url` | `TEXT` | Nullable | Static vector or raster URL of campus layout map |
| `max_unverified_reports`| `INTEGER` | Default: 3 | Max pending reports allowed per user to prevent spam |
| `dismiss_point_penalty` | `INTEGER` | Default: 10 | Point deduction assessed for rejected non-valid reports |
| `false_report_point_penalty` | `INTEGER` | Default: 50 | Point penalty applied for verified fraudulent reports |
| `warning_auto_deduct_amount` | `INTEGER` | Default: 10 | Points deducted automatically on formal disciplinary warning |
| `suspension_duration_hours` | `INTEGER` | Default: 24 | Standard lockout duration in hours for suspended users |
| `rewards_reserve_percent` | `INTEGER` | Default: 20 | Percentage of recycling revenue allocated to student prize pool |
| `default_vendor_name` | `VARCHAR` | 255 | Default registered recycling contractor buyer |
| `bin_reset_enabled` | `BOOLEAN` | Default: true | Automated daily schedule resetting bin capacity status |
| `bin_reset_time` | `VARCHAR` | 10, Default: "18:00" | Scheduled 24-hour time of daily bin capacity reset |
| `updated_at` | `TIMESTAMP` | Auto-updated | Timestamp when system policies were last adjusted |

*Table 11 centralizes administrative switches, allowing system coordinators to tune gamification mechanics dynamically without code recompilation.*

---

## Table 12: WasteType (`waste_types`)
Stores environmental taxonomy for waste categorization, including color-coded signage standards and sorting instructions.

| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 36 (UUID, PK) | Unique waste type identifier |
| `name` | `VARCHAR` | 100 | Category label (e.g., "Recyclable Plastics", "Biodegradable") |
| `code` | `VARCHAR` | 50 (Unique) | System key code (e.g., "RECYCLABLE", "HAZARDOUS") |
| `description` | `TEXT` | - | Sorting guidance guidelines for students |
| `hex_color` | `VARCHAR` | 20 | Official HEX color code used for UI tags and campus signage |
| `enabled` | `BOOLEAN` | Default: true | Visibility flag in selection interfaces |
| `created_at` | `TIMESTAMP` | Default: `now()` | Record creation timestamp |
| `updated_at` | `TIMESTAMP` | Auto-updated | Last updated timestamp |

*Table 12 enforces DepEd and RA 9003 environmental compliance guidelines by strictly standardizing waste classifications.*

---

## Table 13: UrgencyLevel (`urgency_levels`)
Defines severity levels, triage urgency, and Service Level Agreement (SLA) response deadlines for custodial dispatches.

| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 36 (UUID, PK) | Unique urgency level identifier |
| `level` | `VARCHAR` | 50 | Display level name (e.g., "Low", "Medium", "High", "Critical") |
| `code` | `VARCHAR` | 50 (Unique) | Enumerated key code |
| `sla_hours` | `INTEGER` | Default: 24 | Target turnaround hours allowed before ticket escalates |
| `description` | `TEXT` | - | Criteria determining when this priority level applies |
| `badge_style` | `VARCHAR` | 100 | Tailwind CSS class defining badge styling |
| `enabled` | `BOOLEAN` | Default: true | Active toggle |
| `created_at` | `TIMESTAMP` | Default: `now()` | Record creation timestamp |
| `updated_at` | `TIMESTAMP` | Auto-updated | Last update timestamp |

*Table 13 ensures custodial staff address health and safety hazards (e.g., toxic waste, shattered glass) before routine cleanups.*

---

## Table 14: AssetCondition (`asset_conditions`)
Defines standardized quality assessment states for campus assets and furniture recovered during operations.

| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 36 (UUID, PK) | Unique condition code identifier |
| `name` | `VARCHAR` | 50 | Condition name (e.g., "Serviceable", "Damaged", "Unrepairable") |
| `code` | `VARCHAR` | 50 (Unique) | Unique condition key code |
| `description` | `TEXT` | - | Visual and structural criteria defining the condition |
| `badge_style` | `VARCHAR` | 100 | UI badge styling class |
| `enabled` | `BOOLEAN` | Default: true | Active status toggle |
| `created_at` | `TIMESTAMP` | Default: `now()` | Creation timestamp |
| `updated_at` | `TIMESTAMP` | Auto-updated | Last updated timestamp |

*Table 14 feeds MRF asset recovery pipelines, classifying whether recovered school property can be refurbished or condemned.*

---

## Table 15: PointHistory (`point_histories`)
Maintains an immutable financial-grade ledger of all point credits, reward redemptions, challenge awards, and penalty deductions.

| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 36 (UUID, PK) | Unique ledger transaction identifier |
| `user_id` | `VARCHAR` | 36 (FK -> `users.id`) | Foreign key identifying account receiving point transaction |
| `amount` | `INTEGER` | Signed | Points credited (positive) or deducted (negative) |
| `reason` | `VARCHAR` | 255 | Human-readable explanation (e.g., "Verified Waste Report #R-102") |
| `report_id` | `VARCHAR` | 36 (FK -> `reports.id`, Unique, Nullable) | Associated report generating the award |
| `challenge_id` | `VARCHAR` | 36 (FK -> `challenges.id`, Nullable) | Associated challenge completed |
| `school_year_id` | `VARCHAR` | 36 (FK -> `school_years.id`, Nullable) | Academic year when points were earned |
| `created_at` | `TIMESTAMP` | Default: `now()` | Transaction timestamp |

*Table 15 guarantees auditability for gamification mechanics. Because points translate to certificates and honors, every point variance is verifiable.*

---

## Table 16: SchoolYear (`school_years`)
Manages academic calendar cycles, annual rollover state machines, historical data partitions, and year-end inventory freeze points.

| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 36 (UUID, PK) | Unique school year record identifier |
| `enrollpro_id` | `INTEGER` | Unique, Nullable | Remote school year key mapped from EnrollPro SIS |
| `label` | `VARCHAR` | 50 | Academic year display title (e.g., "2026-2027") |
| `start_date` | `TIMESTAMP` | - | Official start date of academic term |
| `end_date` | `TIMESTAMP` | - | Official graduation / conclusion date of academic term |
| `is_active` | `BOOLEAN` | Default: true | Current active year toggle (only one record active at a time) |
| `is_archived` | `BOOLEAN` | Default: false | Flag indicating year has completed final ledger rollover |
| `archived_at` | `TIMESTAMP` | Nullable | Exact timestamp of historical freeze and archive execution |
| `created_at` | `TIMESTAMP` | Default: `now()` | School year initialization timestamp |

*Table 16 orchestrates annual academic rollovers, ensuring graduating student points snapshot properly while starting incoming cohorts fresh.*

---

## Table 17: WasteBin (`waste_bins`)
Maintains real-time operational status, geolocation coordinates, and volumetric fill percentages for waste receptacles installed campus-wide.

| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 36 (UUID, PK) | Unique waste bin receptacle identifier |
| `name` | `VARCHAR` | 100 | Display name of bin unit (e.g., "Receptacle Gate 3 - Recyclable") |
| `location_name` | `VARCHAR` | 255 | Campus station landmark |
| `fill_level` | `INTEGER` | 0 - 100 (%) | Current estimated or sensor-measured capacity fill percentage |
| `type` | `ENUM` | `WasteCategory` | Waste stream accepted (`RECYCLABLE`, `BIODEGRADABLE`, etc.) |
| `lat` | `DOUBLE PRECISION` | - | Latitude coordinate for map rendering |
| `lng` | `DOUBLE PRECISION` | - | Longitude coordinate for map rendering |
| `active_dispatch`| `BOOLEAN` | Default: false | Flag indicating an active MRF dispatch is currently underway |
| `last_emptied` | `TIMESTAMP` | Nullable | Timestamp when receptacle was last serviced and cleared |
| `created_at` | `TIMESTAMP` | Default: `now()` | Receptacle setup timestamp |
| `updated_at` | `TIMESTAMP` | Auto-updated | Receptacle status update timestamp |

*Table 17 powers predictive collection routes, highlighting overflowing bins on the custodian dashboard before litter scatters.*

---

## Table 18: Offense (`offenses`)
Logs disciplinary infractions, false reporting incidents, and littering violations to uphold community accountability.

| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 36 (UUID, PK) | Unique offense record identifier |
| `user_id` | `VARCHAR` | 36 (FK -> `users.id`) | Offending student or personnel account |
| `description` | `TEXT` | - | Case details describing the violation or false report |
| `severity` | `ENUM` | `Severity` | Penalty category (`WARNING`, `DEDUCT`, `SUSPENSION`) |
| `expires_at` | `TIMESTAMP` | Nullable | Expiration date of disciplinary sanction |
| `school_year_id` | `VARCHAR` | 36 (FK -> `school_years.id`, Nullable) | Academic year when offense occurred |
| `created_at` | `TIMESTAMP` | Default: `now()` | Incident booking timestamp |

*Table 18 deters platform abuse, ensuring gamified point incentives are earned legitimately through honest environmental reporting.*

---

## Table 19: Challenge (`challenges`)
Manages gamified campus environmental challenges, cooperative recycling quests, and time-bounded sustainability drives.

| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 36 (UUID, PK) | Unique challenge identifier |
| `code` | `VARCHAR` | 50 (Unique) | Alphanumeric challenge reference code |
| `title` | `VARCHAR` | 255 | Quest headline (e.g., "Plastic Vanguard Quest") |
| `description` | `TEXT` | - | Instructions and rules to qualify for challenge reward |
| `challenge_type` | `ENUM` | `ChallengeType` | Metric evaluated (`REPORT_COUNT`, `WEIGHT_COLLECTED`, `HAZARDOUS_REPORT`) |
| `points_awarded`| `INTEGER` | - | Bonus points granted to users upon quest completion |
| `target` | `INTEGER` | - | Numerical threshold required to fulfill the challenge |
| `is_active` | `BOOLEAN` | Default: true | Quest activation status |
| `icon_name` | `VARCHAR` | 100 | Lucide icon symbol representation identifier |
| `start_date` | `TIMESTAMP` | Nullable | Quest launch window start |
| `end_date` | `TIMESTAMP` | Nullable | Quest deadline completion timestamp |
| `created_at` | `TIMESTAMP` | Default: `now()` | Creation timestamp |

*Table 19 sparks friendly competition and cooperative teamwork among homeroom sections to clean up campus grounds.*

---

## Table 20: UserChallengeProgress (`user_challenge_progress`)
Tracks each student's progress and completion milestone for active challenges.

| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 36 (UUID, PK) | Progress record identifier |
| `user_id` | `VARCHAR` | 36 (FK -> `users.id`) | Student participating in challenge |
| `challenge_id` | `VARCHAR` | 36 (FK -> `challenges.id`) | Active challenge being tackled |
| `current_count` | `INTEGER` | Default: 0 | Current accumulated tally toward target threshold |
| `completed_at` | `TIMESTAMP` | Nullable | Timestamp when target criteria was accomplished |
| `rewarded_at` | `TIMESTAMP` | Nullable | Timestamp when bonus points were credited |
| `created_at` | `TIMESTAMP` | Default: `now()` | Participation start timestamp |
| `updated_at` | `TIMESTAMP` | Auto-updated | Last progress increment timestamp |

*Table 20 ensures accurate tracking so students are fairly rewarded immediately upon hitting challenge goals.*

---

## Table 21: ChallengeContribution (`challenge_contributions`)
Maps verified reports to participating challenge quests, preventing double-counting while preserving an audit link.

| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 36 (UUID, PK) | Unique contribution identifier |
| `user_id` | `VARCHAR` | 36 (FK -> `users.id`) | Contributing student |
| `challenge_id` | `VARCHAR` | 36 (FK -> `challenges.id`) | Associated quest receiving contribution |
| `report_id` | `VARCHAR` | 36 (FK -> `reports.id`) | Specific verified environmental report submitted |
| `value` | `DOUBLE PRECISION` | Default: 1.0 | Metric weight contributed (e.g., 1 report or 3.5 kg) |
| `created_at` | `TIMESTAMP` | Default: `now()` | Timestamp of contribution recording |

---

## Table 22: RecycleMarketStock (`recycle_market_stocks`)
Monitors the MRF's stored inventory of sorted recyclables, accumulation towards sale thresholds, and prevailing market prices.

| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 36 (UUID, PK) | Unique commodity stock identifier |
| `category_code` | `VARCHAR` | 50 (Unique) | Commodity key (e.g., "PET_BOTTLES", "CORRUGATED_CARDBOARD") |
| `category_name` | `VARCHAR` | 100 | Display name of the material |
| `short_name` | `VARCHAR` | 50 | Abbreviated label for cards and chips |
| `threshold_limit_kg` | `DOUBLE PRECISION` | - | Minimum inventory in kg required before triggering commercial sale |
| `market_price_per_kg` | `DOUBLE PRECISION` | - | Contracted salvage value price per kilogram (PHP) |
| `accumulated_kg` | `DOUBLE PRECISION` | Default: 0.0 | Current physical weight on hand in MRF warehouse |
| `is_approved_for_sale`| `BOOLEAN` | Default: false | Administrative authorization flag to proceed with vendor sale |
| `approved_at` | `TIMESTAMP` | Nullable | Authorization timestamp |
| `created_at` | `TIMESTAMP` | Default: `now()` | Initialization timestamp |
| `updated_at` | `TIMESTAMP` | Auto-updated | Balance update timestamp |

*Table 22 turns waste management into a circular economy, tracking when enough recyclable plastic or metal has accumulated to sell to authorized recyclers.*

---

## Table 23: RecycleSaleTransaction (`recycle_sale_transactions`)
Records sales transactions when sorted materials from the MRF are sold to recycling vendors, funding sustainability drives and rewards.

| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 36 (UUID, PK) | Official transaction sales receipt identifier |
| `category_code` | `VARCHAR` | 50 | Material category sold |
| `category_name` | `VARCHAR` | 100 | Material display name |
| `weight_kg` | `DOUBLE PRECISION` | - | Total bulk weight in kg sold to vendor |
| `market_price_kg`| `DOUBLE PRECISION` | - | Unit price per kilogram at point of sale (PHP) |
| `total_revenue` | `DOUBLE PRECISION` | - | Total financial proceeds generated (`weight_kg * market_price_kg`) |
| `buyer_name` | `VARCHAR` | 255 | Corporate name of purchasing scrap or recycling partner |
| `school_year_id` | `VARCHAR` | 36 (FK -> `school_years.id`, Nullable) | Academic year when sale was completed |
| `sold_at` | `TIMESTAMP` | Default: `now()` | Sales execution timestamp |

*Table 23 guarantees transparency for all revenue generated from campus recyclables, ensuring funds are properly audited.*

---

## Table 24: MrfInventoryItem (`mrf_inventory_items`)
Tracks custodial equipment, tools, and personal protective gear (PPE) managed by the Material Recovery Facility.

| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 36 (UUID, PK) | Unique inventory item identifier |
| `name` | `VARCHAR` | 150 | Tool or supply name (e.g., "Heavy Duty Sorting Gloves") |
| `category` | `VARCHAR` | 50 | Classification (`EQUIPMENT`, `SUPPLY`, `RECOVERED_MATERIAL`, `TOOL`) |
| `description` | `TEXT` | Nullable | Technical specs or storage location |
| `unit` | `VARCHAR` | 20 | Measurement unit (e.g., "pcs", "kg", "rolls", "liters") |
| `quantity` | `DOUBLE PRECISION` | Default: 0 | Current on-hand quantity |
| `min_threshold` | `DOUBLE PRECISION` | Nullable | Reorder alert threshold |
| `condition` | `VARCHAR` | Default: "GOOD" | Current state (`GOOD`, `FAIR`, `NEEDS_REPAIR`, `DISPOSED`) |
| `is_persistent` | `BOOLEAN` | Default: false | Durable asset preserved across school year rollovers |
| `created_at` | `TIMESTAMP` | Default: `now()` | Registration timestamp |
| `updated_at` | `TIMESTAMP` | Auto-updated | Last stock update timestamp |

---

## Table 25: MrfInventoryTransaction (`mrf_inventory_transactions`)
Audits all material movements into and out of the MRF custodial toolroom.

| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 36 (UUID, PK) | Unique transaction record identifier |
| `item_id` | `VARCHAR` | 36 (FK -> `mrf_inventory_items.id`) | Foreign key linking affected tool or supply item |
| `school_year_id` | `VARCHAR` | 36 (FK -> `school_years.id`) | Academic year when stock movement occurred |
| `type` | `VARCHAR` | 50 | Type (`STOCK_IN`, `STOCK_OUT`, `ADJUSTMENT`, `ROLLOVER_OPENING`, `ROLLOVER_CLOSING`) |
| `quantity` | `DOUBLE PRECISION` | - | Units moved |
| `notes` | `TEXT` | Nullable | Justification or receiving staff remarks |
| `performed_by` | `VARCHAR` | 255, Nullable | Custodial officer in charge |
| `created_at` | `TIMESTAMP` | Default: `now()` | Movement timestamp |

---

## Table 26: MrfAssetRecord (`mrf_asset_records`)
Catalogs recovered, repaired, or repurposed school property rescued from waste streams (e.g., repaired armchairs, salvageable electronic components).

| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 36 (UUID, PK) | Unique asset record identifier |
| `asset_name` | `VARCHAR` | 255 | Name of salvaged or restored asset |
| `category` | `VARCHAR` | 100 | Category (`Furniture`, `Electronics`, `Fixtures`, `Equipment`, `Other`) |
| `action` | `VARCHAR` | 50 | Lifecycle action (`RECOVERED`, `REPAIRED`, `DISPOSED`) |
| `quantity` | `DOUBLE PRECISION` | Default: 1.0 | Number of units processed |
| `unit` | `VARCHAR` | 20, Default: "pcs" | Unit designation |
| `condition` | `VARCHAR` | Nullable | Restored condition grade |
| `source_report_id`| `VARCHAR` | 100, Nullable | Original waste ticket whence item was rescued |
| `location_name` | `VARCHAR` | 255, Nullable | Target classroom or storage location |
| `notes` | `TEXT` | Nullable | Repair technician notes |
| `performed_by` | `VARCHAR` | 255, Nullable | Staff member who executed the salvage |
| `school_year_id` | `VARCHAR` | 36 (FK -> `school_years.id`, Nullable) | Academic year when asset was recovered |
| `created_at` | `TIMESTAMP` | Default: `now()` | Record creation timestamp |

*Table 26 proves the school's circular economy metrics by showing how many damaged desks and computers were repaired instead of trashed.*

---

## Table 27: PointRule (`point_rules`)
Maintains tier milestones and criteria for student rank progressions and graduation honor points.

| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 36 (UUID, PK) | Unique rule identifier |
| `rank` | `INTEGER` | Unique | Rank tier ordinal (1 = Bronze, 2 = Silver, etc.) |
| `title` | `VARCHAR` | 100 | Distinction title (e.g., "Eco-Citizen", "Sustainability Champion") |
| `points_awarded`| `INTEGER` | - | Milestone points required or awarded |
| `description` | `TEXT` | - | Criteria and ecological duties associated with rank |
| `created_at` | `TIMESTAMP` | Default: `now()` | Creation timestamp |
| `updated_at` | `TIMESTAMP` | Auto-updated | Revision timestamp |

---

## Table 28: AcademicQuarter (`academic_quarters`)
Defines grading quarters (Q1, Q2, Q3, Q4) used for resetting seasonal leaderboards and evaluating student honors.

| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 36 (UUID, PK) | Unique quarter identifier |
| `quarter_name` | `VARCHAR` | 100 | Display name (e.g., "1st Grading Quarter") |
| `quarter_code` | `VARCHAR` | 50 (Unique) | System key (e.g., "Q1", "Q2", "Q3", "Q4") |
| `start_date` | `VARCHAR` | 50 | Term calendar start date |
| `end_date` | `VARCHAR` | 50 | Term calendar end date |
| `is_active` | `BOOLEAN` | Default: false | Active quarter indicator flag |
| `created_at` | `TIMESTAMP` | Default: `now()` | Creation timestamp |
| `updated_at` | `TIMESTAMP` | Auto-updated | Revision timestamp |

---

## Table 29: UserPointSnapshot (`user_point_snapshots`)
Stores permanent historical snapshots of student point balances and ranks at the close of an academic school year.

| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 36 (UUID, PK) | Snapshot record identifier |
| `school_year_id` | `VARCHAR` | 36 (FK -> `school_years.id`) | Academic year being closed |
| `user_id` | `VARCHAR` | 36 (FK -> `users.id`) | Student whose balance is captured |
| `closing_points` | `INTEGER` | - | Final accumulated point total at year end |
| `rank` | `INTEGER` | Nullable | Final campus rank achieved for the academic year |
| `created_at` | `TIMESTAMP` | Default: `now()` | Snapshot creation timestamp |

---

## Table 30: MarketStockSnapshot (`market_stock_snapshots`)
Stores opening and closing balances of recyclable commodity stockpiles across academic year boundaries.

| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 36 (UUID, PK) | Stock snapshot identifier |
| `school_year_id` | `VARCHAR` | 36 (FK -> `school_years.id`) | Closed academic year reference |
| `category_code` | `VARCHAR` | 50 | Commodity category key code |
| `category_name` | `VARCHAR` | 100 | Display name of recyclable stock |
| `closing_kg` | `DOUBLE PRECISION` | - | Final inventory weight in kg on closing day |
| `opening_kg` | `DOUBLE PRECISION` | Default: 0.0 | Carried-forward opening inventory weight for next year |
| `created_at` | `TIMESTAMP` | Default: `now()` | Snapshot timestamp |

---

## Table 31: UserSession (`user_sessions`)
Manages cryptographic refresh tokens, device footprints, and active session states for secure student and faculty logins.

| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 36 (UUID, PK) | Unique session session identifier |
| `user_id` | `VARCHAR` | 36 (FK -> `users.id`) | Account holding active session |
| `refresh_token` | `VARCHAR` | 255 (Unique) | Secure cryptographic refresh token string |
| `device_info` | `VARCHAR` | 255, Nullable | Browser user-agent and OS footprint |
| `ip_address` | `VARCHAR` | 50, Nullable | Origin IP address of client connection |
| `expires_at` | `TIMESTAMP` | - | Session token expiration timestamp |
| `created_at` | `TIMESTAMP` | Default: `now()` | Login session creation timestamp |

---

## Table 32: TermCalendar (`term_calendars`)
Stores calendar terms synchronized directly from EnrollPro SIS for synchronized academic scheduling.

| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 36 (UUID, PK) | Unique term calendar identifier |
| `enrollpro_id` | `INTEGER` | Unique | Remote identifier in EnrollPro database |
| `term_name` | `VARCHAR` | 100 | Term label (e.g., "Semester 1", "Quarter 2") |
| `term_code` | `VARCHAR` | 50 | Term system code |
| `start_date` | `TIMESTAMP` | - | Official start date |
| `end_date` | `TIMESTAMP` | - | Official end date |
| `school_year_id` | `INTEGER` | - | Associated EnrollPro school year identifier |
| `school_year_label`| `VARCHAR` | 50 | Display label for school year |
| `is_active` | `BOOLEAN` | Default: false | Active term indicator |
| `created_at` | `TIMESTAMP` | Default: `now()` | Registration timestamp |
| `updated_at` | `TIMESTAMP` | Auto-updated | Last modification timestamp |

---

## Table 33: EnrollmentSyncLog (`enrollment_sync_logs`)
Maintains an audit ledger of each automated student synchronization cycle with EnrollPro SIS.

| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 36 (UUID, PK) | Unique sync log identifier |
| `sync_type` | `VARCHAR` | 50 | Scope (`FULL_SYNC`, `STUDENT_DELTA`, `SECTION_SYNC`) |
| `status` | `ENUM` | `SyncStatus` | Execution outcome (`SUCCESS`, `FAILED`, `PARTIAL`) |
| `records_pulled` | `INTEGER` | Default: 0 | Total student records retrieved from EnrollPro API |
| `records_created` | `INTEGER` | Default: 0 | New user accounts created in SORTv2 |
| `records_updated` | `INTEGER` | Default: 0 | Existing student profiles updated with grade/section changes |
| `records_deleted` | `INTEGER` | Default: 0 | Inactive or un-enrolled students archived |
| `error_message` | `TEXT` | Nullable | Error stack trace if connection or schema failed |
| `message` | `TEXT` | Nullable | Summary message of synchronization run |
| `school_year_id` | `INTEGER` | Nullable | School year processed |
| `school_year_label`| `VARCHAR` | 50, Nullable | Text label of processed school year |
| `duration_ms` | `INTEGER` | Nullable | Total execution duration in milliseconds |
| `created_at` | `TIMESTAMP` | Default: `now()` | Timestamp when sync completed |

---

## Table 34: AuditLog (`audit_logs`)
Captures tamper-resistant activity logs of administrative actions, user permissions changes, and critical rollovers.

| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 36 (UUID, PK) | Unique audit entry identifier |
| `actor_name` | `VARCHAR` | 255 | Name of user or system service performing the action |
| `actor_role` | `VARCHAR` | 50 | Role permissions of actor at time of event |
| `action_type` | `VARCHAR` | 100 | Action key (e.g., `USER_SUSPENDED`, `LEDGER_ROLLOVER`, `POINT_ADJUSTMENT`) |
| `details` | `TEXT` | - | JSON or plaintext breakdown of state changes before and after |
| `ip_address` | `VARCHAR` | 50, Nullable | Network IP of actor |
| `school_year_id` | `VARCHAR` | 36 (FK -> `school_years.id`, Nullable) | Academic year when event took place |
| `created_at` | `TIMESTAMP` | Default: `now()` | Exact timestamp of audit event |

---

## Table 35: CalendarEvent (`calendar_events`) & SyncLog (`sync_logs`)
Manages scheduled campus clean-up drives, recurring MRF maintenance routines, and legacy system sync milestones.

### 35A: CalendarEvent (`calendar_events`)
| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 36 (UUID, PK) | Unique event identifier |
| `title` | `VARCHAR` | 255 | Headline event title (e.g., "Campus Tree Planting & Cleanup Drive") |
| `date` | `VARCHAR` | 50 | Formatted calendar date string |
| `type` | `ENUM` | `EventType` | Event category (`COLLECTION`, `EVENT`, `MAINTENANCE`) |
| `description` | `TEXT` | - | Event objectives and participant guidance |
| `created_at` | `TIMESTAMP` | Default: `now()` | Event creation timestamp |

### 35B: SyncLog (`sync_logs`)
| Field Name | Data Type | Length / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | 36 (UUID, PK) | Unique log identifier |
| `system` | `VARCHAR` | 100 | Remote subsystem name |
| `status` | `ENUM` | `SyncStatus` | Sync status (`SUCCESS`, `FAILED`, `PARTIAL`) |
| `records_synced` | `INTEGER` | Default: 0 | Number of records processed |
| `created_at` | `TIMESTAMP` | Default: `now()` | Log timestamp |

---

## Entity Relationship Overview (Database Relational Map)
1. **`users` 1-to-Many `reports`**: Users create incident reports (`ReportedBy`) or resolve them as MRF crew (`AssignedToMRF`).
2. **`users` 1-to-Many `point_histories`**: Every point transaction credits or debits a user's balance.
3. **`users` 1-to-Many `offenses`**: Disciplinary infractions and warnings are tracked under a student's profile.
4. **`challenges` 1-to-Many `user_challenge_progress`**: Tracks individual and cooperative progress toward sustainability quotas.
5. **`school_years` 1-to-Many `reports`, `point_histories`, `offenses`, `recycle_sale_transactions`**: All operational data links directly to an academic year, allowing clean annual rollovers and archival queries.
6. **`mrf_inventory_items` 1-to-Many `mrf_inventory_transactions`**: Real-time custodial ledger recording all tool receipts, checkouts, and adjustments.
