-- Phase 1: Points System & Challenges Schema Overhaul
-- Migration: 20260908_points_system_overhaul

-- 1. Create ChallengeType enum
CREATE TYPE "ChallengeType" AS ENUM ('REPORT_COUNT', 'WEIGHT_COLLECTED', 'HAZARDOUS_REPORT');

-- 2. Add location_key to reports (before altering challenges to avoid FK issues)
ALTER TABLE "reports" ADD COLUMN "location_key" TEXT NOT NULL DEFAULT '';

-- Backfill location_key from location_name
UPDATE "reports" SET "location_key" = LOWER(TRIM(REGEXP_REPLACE("location_name", '\s+', ' ', 'g')));

-- Add index on location_key + category + school_year_id
CREATE INDEX "reports_location_key_category_school_year_id_idx" ON "reports"("location_key", "category", "school_year_id");

-- 3. Add challenge_id to point_histories
ALTER TABLE "point_histories" ADD COLUMN "challenge_id" TEXT;
CREATE INDEX "point_histories_challenge_id_idx" ON "point_histories"("challenge_id");

-- Add FK for challenge_id on point_histories
ALTER TABLE "point_histories" ADD CONSTRAINT "point_histories_challenge_id_fkey"
  FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE SET NULL;

-- Add FK for report_id on point_histories (was missing)
ALTER TABLE "point_histories" ADD CONSTRAINT "point_histories_report_id_fkey"
  FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE SET NULL;

-- 4. Create partial unique index: one challenge reward per user
CREATE UNIQUE INDEX "point_histories_user_challenge_unique"
  ON "point_histories"("user_id", "challenge_id")
  WHERE "challenge_id" IS NOT NULL;

-- 5. Rework challenges table
-- Drop old columns
ALTER TABLE "challenges" DROP COLUMN "progress";
ALTER TABLE "challenges" DROP COLUMN "completed";

-- Add new columns
ALTER TABLE "challenges" ADD COLUMN "code" TEXT;
ALTER TABLE "challenges" ADD COLUMN "challenge_type" "ChallengeType" NOT NULL DEFAULT 'REPORT_COUNT';
ALTER TABLE "challenges" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "challenges" ADD COLUMN "start_date" TIMESTAMP(3);
ALTER TABLE "challenges" ADD COLUMN "end_date" TIMESTAMP(3);

-- Backfill existing challenge rows per D12
UPDATE "challenges" SET
  "code" = 'WEEKLY_RECYCLING_PIONEER',
  "challenge_type" = 'REPORT_COUNT'
WHERE "title" = 'Weekly Recycling Pioneer';

UPDATE "challenges" SET
  "code" = 'ZERO_SINGLE_USE_PLASTICS',
  "challenge_type" = 'REPORT_COUNT'
WHERE "title" = 'Zero Single-Use Plastics';

-- Make code unique (after backfill)
ALTER TABLE "challenges" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "challenges_code_key" ON "challenges"("code");

-- 6. Create user_challenge_progress table
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

CREATE UNIQUE INDEX "user_challenge_progress_user_id_challenge_id_key" ON "user_challenge_progress"("user_id", "challenge_id");
CREATE INDEX "user_challenge_progress_challenge_id_idx" ON "user_challenge_progress"("challenge_id");

ALTER TABLE "user_challenge_progress" ADD CONSTRAINT "user_challenge_progress_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "user_challenge_progress" ADD CONSTRAINT "user_challenge_progress_challenge_id_fkey"
  FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE;

-- 7. Create challenge_contributions table
CREATE TABLE "challenge_contributions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "challenge_id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenge_contributions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "challenge_contributions_user_id_challenge_id_report_id_key" ON "challenge_contributions"("user_id", "challenge_id", "report_id");
CREATE INDEX "challenge_contributions_challenge_id_idx" ON "challenge_contributions"("challenge_id");
CREATE INDEX "challenge_contributions_report_id_idx" ON "challenge_contributions"("report_id");

ALTER TABLE "challenge_contributions" ADD CONSTRAINT "challenge_contributions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "challenge_contributions" ADD CONSTRAINT "challenge_contributions_challenge_id_fkey"
  FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE;
ALTER TABLE "challenge_contributions" ADD CONSTRAINT "challenge_contributions_report_id_fkey"
  FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE;
