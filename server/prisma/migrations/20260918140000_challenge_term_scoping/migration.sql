-- Scope challenges to an academic term so ended terms stop showing as "active"
-- and progress resets naturally per term. Replaces the global unique `code`
-- with a composite unique `(code, quarter_code)`.

-- 1. Add term scope column (existing/legacy rows default to GLOBAL).
ALTER TABLE "challenges" ADD COLUMN "quarter_code" TEXT NOT NULL DEFAULT 'GLOBAL';

-- 2. Backfill: attach legacy unscoped challenges to the currently active term so
--    they close when that term ends (instead of lingering forever).
UPDATE "challenges"
SET "quarter_code" = (
  SELECT "quarter_code"
  FROM "academic_quarters"
  WHERE "is_active" = true
  ORDER BY "created_at" DESC
  LIMIT 1
)
WHERE "quarter_code" = 'GLOBAL'
  AND EXISTS (SELECT 1 FROM "academic_quarters" WHERE "is_active" = true);

-- 3. Swap the global code unique for a per-term composite unique.
DROP INDEX IF EXISTS "challenges_code_key";
CREATE UNIQUE INDEX "challenges_code_quarter_code_key" ON "challenges"("code", "quarter_code");
CREATE INDEX "challenges_quarter_code_idx" ON "challenges"("quarter_code");
