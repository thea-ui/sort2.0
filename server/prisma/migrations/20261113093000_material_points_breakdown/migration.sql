-- Per-material awarded points, so the activity detail can itemize each material.

ALTER TABLE "reports" ADD COLUMN "material_points_breakdown" JSONB;
