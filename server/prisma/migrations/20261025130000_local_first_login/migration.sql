-- Local-first password login: EnrollPro remains the password authority, but an
-- existing verified hash may complete a normal login without a network round trip.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "password_verified_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "password_change_required" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "password_reset_required" BOOLEAN NOT NULL DEFAULT false;

-- New rows start unverified on purpose: the first login after deployment calls
-- EnrollPro once, captures must-change flags, and only then enables local-first.
-- Do not backfill password_verified_at from password_cached_at; that would bypass
-- the default-password gate for accounts cached before this migration.
