-- Persist the EnrollPro sync schedule so automatic mirroring can actually run.
-- Idempotent: safe whether or not the columns were previously created via db push.
ALTER TABLE "system_settings" ADD COLUMN IF NOT EXISTS "sync_mode" TEXT NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "system_settings" ADD COLUMN IF NOT EXISTS "sync_interval_minutes" INTEGER NOT NULL DEFAULT 60;