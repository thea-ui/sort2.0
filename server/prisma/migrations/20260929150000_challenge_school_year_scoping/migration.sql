-- Scope challenges to a school year so each year/term gets its own instances
-- and rewards are re-earnable across years. Existing rows are backfilled to the
-- currently active school year; rows created before any school year existed
-- stay null and are treated as GLOBAL/legacy.

-- 1. Add the column
ALTER TABLE "challenges" ADD COLUMN "school_year_id" TEXT;

-- 2. Backfill existing challenge instances to the active school year
UPDATE "challenges"
SET "school_year_id" = (
  SELECT "id" FROM "school_years"
  WHERE "is_active" = true AND "is_archived" = false
  ORDER BY "start_date" DESC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM "school_years"
  WHERE "is_active" = true AND "is_archived" = false
);

-- 3. Swap the unique key for (code, quarter_code, school_year_id)
DROP INDEX IF EXISTS "challenges_code_quarter_code_key";
CREATE UNIQUE INDEX "challenges_code_quarter_code_school_year_id_key"
  ON "challenges"("code", "quarter_code", "school_year_id");

-- 4. Relation + lookup index
CREATE INDEX "challenges_school_year_id_idx" ON "challenges"("school_year_id");

ALTER TABLE "challenges"
  ADD CONSTRAINT "challenges_school_year_id_fkey"
  FOREIGN KEY ("school_year_id") REFERENCES "school_years"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
