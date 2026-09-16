-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'TEACHER', 'MRF', 'ADMIN');

-- CreateEnum
CREATE TYPE "SyncSource" AS ENUM ('LOCAL', 'ENROLLPRO');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'DISPATCHED', 'COLLECTED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "WasteCategory" AS ENUM ('RECYCLABLE', 'BIODEGRADABLE', 'NON_BIODEGRADABLE', 'HAZARDOUS');

-- CreateEnum
CREATE TYPE "Urgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('WASTE', 'ASSET');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('WARNING', 'DEDUCT', 'SUSPENSION');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('COLLECTION', 'EVENT', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('SUCCESS', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "ChallengeType" AS ENUM ('REPORT_COUNT', 'WEIGHT_COLLECTED', 'HAZARDOUS_REPORT');

-- CreateTable
CREATE TABLE "school_years" (
    "id" TEXT NOT NULL,
    "enrollpro_id" INTEGER,
    "label" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "employee_id" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "points" INTEGER NOT NULL DEFAULT 0,
    "warnings_count" INTEGER NOT NULL DEFAULT 0,
    "account_status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "suspended_until" TIMESTAMP(3),
    "classroom_section" TEXT,
    "certificates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "sync_source" "SyncSource" NOT NULL DEFAULT 'LOCAL',
    "enrollpro_id" TEXT,
    "enrollpro_lrn" TEXT,
    "grade_level" TEXT,
    "section_name" TEXT,
    "academic_program" TEXT,
    "school_year_id" INTEGER,
    "school_year_label" TEXT,
    "is_temporarily_enrolled" BOOLEAN DEFAULT false,
    "enrollment_status" TEXT,
    "portal_account_active" BOOLEAN DEFAULT true,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "urgency" "Urgency" NOT NULL DEFAULT 'MEDIUM',
    "category" "WasteCategory" NOT NULL DEFAULT 'NON_BIODEGRADABLE',
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "location_name" TEXT NOT NULL,
    "location_key" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "points_awarded" INTEGER NOT NULL DEFAULT 0,
    "points_awarded_at" TIMESTAMP(3),
    "image_url" TEXT,
    "weight_collected" DOUBLE PRECISION,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "report_type" "ReportType" NOT NULL DEFAULT 'WASTE',
    "assigned_mrf_id" TEXT,
    "reporter_rank" INTEGER,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "school_year_id" TEXT,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waste_bins" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location_name" TEXT NOT NULL,
    "fill_level" INTEGER NOT NULL DEFAULT 0,
    "type" "WasteCategory" NOT NULL DEFAULT 'NON_BIODEGRADABLE',
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "active_dispatch" BOOLEAN NOT NULL DEFAULT false,
    "last_emptied" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waste_bins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offenses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "Severity" NOT NULL DEFAULT 'WARNING',
    "expires_at" TIMESTAMP(3),
    "school_year_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_histories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "report_id" TEXT,
    "challenge_id" TEXT,
    "school_year_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenges" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "challenge_type" "ChallengeType" NOT NULL DEFAULT 'REPORT_COUNT',
    "points_awarded" INTEGER NOT NULL,
    "target" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "icon_name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_challenge_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "challenge_id" TEXT NOT NULL,
    "current_count" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "rewarded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_challenge_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_contributions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "challenge_id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenge_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL DEFAULT 'default_setting',
    "points_per_report" INTEGER NOT NULL DEFAULT 50,
    "points_per_kg_recyclable" INTEGER NOT NULL DEFAULT 10,
    "warning_threshold" INTEGER NOT NULL DEFAULT 3,
    "certificate_point_threshold" INTEGER NOT NULL DEFAULT 500,
    "quarter_gate_active" BOOLEAN NOT NULL DEFAULT false,
    "smart_sync_enabled" BOOLEAN NOT NULL DEFAULT true,
    "blueprint_preset" TEXT NOT NULL DEFAULT 'DEFAULT',
    "blueprint_url" TEXT,
    "max_unverified_reports" INTEGER NOT NULL DEFAULT 3,
    "dismiss_point_penalty" INTEGER NOT NULL DEFAULT 10,
    "false_report_point_penalty" INTEGER NOT NULL DEFAULT 50,
    "warning_auto_deduct_amount" INTEGER NOT NULL DEFAULT 10,
    "suspension_duration_hours" INTEGER NOT NULL DEFAULT 24,
    "rewards_reserve_percent" INTEGER NOT NULL DEFAULT 20,
    "default_vendor_name" TEXT NOT NULL DEFAULT 'GreenCycle Recycling Vendor',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "type" "EventType" NOT NULL DEFAULT 'EVENT',
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL,
    "system" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'SUCCESS',
    "records_synced" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_presets" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campus_locations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Available',
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "streams" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campus_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "building" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waste_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hex_color" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waste_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "urgency_levels" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sla_hours" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "badge_style" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "urgency_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_conditions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "badge_style" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_rules" (
    "id" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "points_awarded" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "point_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_quarters" (
    "id" TEXT NOT NULL,
    "quarter_name" TEXT NOT NULL,
    "quarter_code" TEXT NOT NULL,
    "start_date" TEXT NOT NULL,
    "end_date" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_quarters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recycle_market_stocks" (
    "id" TEXT NOT NULL,
    "category_code" TEXT NOT NULL,
    "category_name" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "threshold_limit_kg" DOUBLE PRECISION NOT NULL,
    "market_price_per_kg" DOUBLE PRECISION NOT NULL,
    "accumulated_kg" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "is_approved_for_sale" BOOLEAN NOT NULL DEFAULT false,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recycle_market_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recycle_sale_transactions" (
    "id" TEXT NOT NULL,
    "category_code" TEXT NOT NULL,
    "category_name" TEXT NOT NULL,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "market_price_kg" DOUBLE PRECISION NOT NULL,
    "total_revenue" DOUBLE PRECISION NOT NULL,
    "buyer_name" TEXT NOT NULL,
    "school_year_id" TEXT,
    "sold_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recycle_sale_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "device_info" TEXT,
    "ip_address" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "term_calendars" (
    "id" TEXT NOT NULL,
    "enrollpro_id" INTEGER NOT NULL,
    "term_name" TEXT NOT NULL,
    "term_code" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "school_year_id" INTEGER NOT NULL,
    "school_year_label" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "term_calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollment_sync_logs" (
    "id" TEXT NOT NULL,
    "sync_type" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'SUCCESS',
    "records_pulled" INTEGER NOT NULL DEFAULT 0,
    "records_created" INTEGER NOT NULL DEFAULT 0,
    "records_updated" INTEGER NOT NULL DEFAULT 0,
    "records_deleted" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "school_year_id" INTEGER,
    "school_year_label" TEXT,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollment_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_name" TEXT NOT NULL,
    "actor_role" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "ip_address" TEXT,
    "school_year_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campus_news" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "tag_color" TEXT NOT NULL,
    "icon_color" TEXT NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campus_news_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_stock_snapshots" (
    "id" TEXT NOT NULL,
    "school_year_id" TEXT NOT NULL,
    "category_code" TEXT NOT NULL,
    "category_name" TEXT NOT NULL,
    "closing_kg" DOUBLE PRECISION NOT NULL,
    "opening_kg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_stock_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_point_snapshots" (
    "id" TEXT NOT NULL,
    "school_year_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "closing_points" INTEGER NOT NULL,
    "rank" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_point_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "school_years_enrollpro_id_key" ON "school_years"("enrollpro_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_employee_id_key" ON "users"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_enrollpro_id_key" ON "users"("enrollpro_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_enrollpro_lrn_key" ON "users"("enrollpro_lrn");

-- CreateIndex
CREATE INDEX "users_enrollpro_id_idx" ON "users"("enrollpro_id");

-- CreateIndex
CREATE INDEX "users_sync_source_idx" ON "users"("sync_source");

-- CreateIndex
CREATE INDEX "reports_reporter_id_idx" ON "reports"("reporter_id");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_category_idx" ON "reports"("category");

-- CreateIndex
CREATE INDEX "reports_school_year_id_idx" ON "reports"("school_year_id");

-- CreateIndex
CREATE INDEX "reports_location_key_category_school_year_id_idx" ON "reports"("location_key", "category", "school_year_id");

-- CreateIndex
CREATE INDEX "offenses_user_id_idx" ON "offenses"("user_id");

-- CreateIndex
CREATE INDEX "offenses_school_year_id_idx" ON "offenses"("school_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "point_histories_report_id_key" ON "point_histories"("report_id");

-- CreateIndex
CREATE INDEX "point_histories_user_id_idx" ON "point_histories"("user_id");

-- CreateIndex
CREATE INDEX "point_histories_school_year_id_idx" ON "point_histories"("school_year_id");

-- CreateIndex
CREATE INDEX "point_histories_challenge_id_idx" ON "point_histories"("challenge_id");

-- CreateIndex
CREATE UNIQUE INDEX "challenges_code_key" ON "challenges"("code");

-- CreateIndex
CREATE INDEX "user_challenge_progress_challenge_id_idx" ON "user_challenge_progress"("challenge_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_challenge_progress_user_id_challenge_id_key" ON "user_challenge_progress"("user_id", "challenge_id");

-- CreateIndex
CREATE INDEX "challenge_contributions_challenge_id_idx" ON "challenge_contributions"("challenge_id");

-- CreateIndex
CREATE INDEX "challenge_contributions_report_id_idx" ON "challenge_contributions"("report_id");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_contributions_user_id_challenge_id_report_id_key" ON "challenge_contributions"("user_id", "challenge_id", "report_id");

-- CreateIndex
CREATE UNIQUE INDEX "asset_categories_code_key" ON "asset_categories"("code");

-- CreateIndex
CREATE INDEX "item_presets_category_id_idx" ON "item_presets"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "campus_locations_code_key" ON "campus_locations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "room_locations_name_key" ON "room_locations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "waste_types_code_key" ON "waste_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "urgency_levels_code_key" ON "urgency_levels"("code");

-- CreateIndex
CREATE UNIQUE INDEX "asset_conditions_code_key" ON "asset_conditions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "point_rules_rank_key" ON "point_rules"("rank");

-- CreateIndex
CREATE UNIQUE INDEX "academic_quarters_quarter_code_key" ON "academic_quarters"("quarter_code");

-- CreateIndex
CREATE UNIQUE INDEX "recycle_market_stocks_category_code_key" ON "recycle_market_stocks"("category_code");

-- CreateIndex
CREATE INDEX "recycle_sale_transactions_school_year_id_idx" ON "recycle_sale_transactions"("school_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_refresh_token_key" ON "user_sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "user_sessions_refresh_token_idx" ON "user_sessions"("refresh_token");

-- CreateIndex
CREATE UNIQUE INDEX "term_calendars_enrollpro_id_key" ON "term_calendars"("enrollpro_id");

-- CreateIndex
CREATE INDEX "term_calendars_school_year_id_idx" ON "term_calendars"("school_year_id");

-- CreateIndex
CREATE INDEX "enrollment_sync_logs_created_at_idx" ON "enrollment_sync_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_type_idx" ON "audit_logs"("action_type");

-- CreateIndex
CREATE INDEX "audit_logs_school_year_id_idx" ON "audit_logs"("school_year_id");

-- CreateIndex
CREATE INDEX "campus_news_is_published_idx" ON "campus_news"("is_published");

-- CreateIndex
CREATE INDEX "campus_news_created_at_idx" ON "campus_news"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "market_stock_snapshots_school_year_id_category_code_key" ON "market_stock_snapshots"("school_year_id", "category_code");

-- CreateIndex
CREATE UNIQUE INDEX "user_point_snapshots_school_year_id_user_id_key" ON "user_point_snapshots"("school_year_id", "user_id");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_school_year_id_fkey" FOREIGN KEY ("school_year_id") REFERENCES "school_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_assigned_mrf_id_fkey" FOREIGN KEY ("assigned_mrf_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offenses" ADD CONSTRAINT "offenses_school_year_id_fkey" FOREIGN KEY ("school_year_id") REFERENCES "school_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offenses" ADD CONSTRAINT "offenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_histories" ADD CONSTRAINT "point_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_histories" ADD CONSTRAINT "point_histories_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_histories" ADD CONSTRAINT "point_histories_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_histories" ADD CONSTRAINT "point_histories_school_year_id_fkey" FOREIGN KEY ("school_year_id") REFERENCES "school_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_challenge_progress" ADD CONSTRAINT "user_challenge_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_challenge_progress" ADD CONSTRAINT "user_challenge_progress_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_contributions" ADD CONSTRAINT "challenge_contributions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_contributions" ADD CONSTRAINT "challenge_contributions_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_contributions" ADD CONSTRAINT "challenge_contributions_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_presets" ADD CONSTRAINT "item_presets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "asset_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recycle_sale_transactions" ADD CONSTRAINT "recycle_sale_transactions_school_year_id_fkey" FOREIGN KEY ("school_year_id") REFERENCES "school_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_school_year_id_fkey" FOREIGN KEY ("school_year_id") REFERENCES "school_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_stock_snapshots" ADD CONSTRAINT "market_stock_snapshots_school_year_id_fkey" FOREIGN KEY ("school_year_id") REFERENCES "school_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_point_snapshots" ADD CONSTRAINT "user_point_snapshots_school_year_id_fkey" FOREIGN KEY ("school_year_id") REFERENCES "school_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_point_snapshots" ADD CONSTRAINT "user_point_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
