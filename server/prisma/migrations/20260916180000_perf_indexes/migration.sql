-- Performance indexes for hot query paths.
-- Idempotent so it is safe whether or not the indexes already exist.
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role");
CREATE INDEX IF NOT EXISTS "users_points_idx" ON "users"("points");
CREATE INDEX IF NOT EXISTS "reports_assigned_mrf_id_idx" ON "reports"("assigned_mrf_id");
CREATE INDEX IF NOT EXISTS "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");
CREATE INDEX IF NOT EXISTS "mrf_asset_records_source_report_id_idx" ON "mrf_asset_records"("source_report_id");