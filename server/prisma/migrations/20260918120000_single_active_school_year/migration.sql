-- Structurally guarantee at most ONE active school year.
-- The rollover/sync previously activated a new year without deactivating the
-- previous one, leaving two active years and mis-tagging new records.
-- Partial unique index: at most one row may have is_active = true.
CREATE UNIQUE INDEX IF NOT EXISTS "school_years_single_active_idx"
  ON "school_years" ("is_active")
  WHERE "is_active" = true;