-- Phase 6 deployment hardening:
-- 1. File-backed report photos (new uploads go to disk; legacy base64 rows are
--    kept in image_url until scripts/migrate-report-photos.ts has run).
-- 2. Shared rate-limit counters for multi-instance deployments.
-- 3. Index for the reports list (school year + newest-first ordering).

ALTER TABLE "reports" ADD COLUMN "photo_path" TEXT;

CREATE INDEX "reports_school_year_id_created_at_idx" ON "reports"("school_year_id", "created_at");

CREATE TABLE "rate_limit_counters" (
    "key" TEXT NOT NULL,
    "total_hits" INTEGER NOT NULL DEFAULT 0,
    "reset_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rate_limit_counters_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "rate_limit_counters_reset_at_idx" ON "rate_limit_counters"("reset_at");
