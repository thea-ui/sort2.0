-- Point breakdown for the student activity detail: rank bonus + material bonus.

ALTER TABLE "reports" ADD COLUMN "rank_points_awarded" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "reports" ADD COLUMN "material_points_awarded" INTEGER NOT NULL DEFAULT 0;
