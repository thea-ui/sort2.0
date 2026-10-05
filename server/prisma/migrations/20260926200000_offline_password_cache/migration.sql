-- Offline password-cache auth: SORT keeps a bcrypt hash of the last password
-- EnrollPro verified and accepts it ONLY while EnrollPro is unreachable.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_cached_at" TIMESTAMP(3);

ALTER TABLE "system_settings" ADD COLUMN IF NOT EXISTS "offline_auth_cache_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "system_settings" ADD COLUMN IF NOT EXISTS "offline_auth_cache_max_days" INTEGER NOT NULL DEFAULT 30;

-- A hash without a cache timestamp is not a valid offline credential, so any
-- pre-delegation local hashes are cleared.
UPDATE "users" SET "password_hash" = NULL WHERE "password_hash" IS NOT NULL;

-- Cleanup of the reverted break-glass PIN artifacts (no-ops on fresh databases).
ALTER TABLE "users" DROP COLUMN IF EXISTS "offline_pin_hash";
ALTER TABLE "users" DROP COLUMN IF EXISTS "offline_pin_set_at";
DROP TABLE IF EXISTS "offline_auth_logs";
ALTER TABLE "user_sessions" DROP COLUMN IF EXISTS "kind";
DROP INDEX IF EXISTS "user_sessions_kind_idx";
ALTER TABLE "system_settings" DROP COLUMN IF EXISTS "offline_auth_enabled";
ALTER TABLE "system_settings" DROP COLUMN IF EXISTS "offline_auth_expires_at";
ALTER TABLE "system_settings" DROP COLUMN IF EXISTS "offline_auth_enabled_by";
ALTER TABLE "system_settings" DROP COLUMN IF EXISTS "offline_auth_enabled_at";
