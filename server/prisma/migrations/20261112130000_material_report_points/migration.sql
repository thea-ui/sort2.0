-- Student-reported recyclable materials + configurable material bonus points.

ALTER TABLE "reports" ADD COLUMN "materials" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "reports" ADD COLUMN "other_material_label" TEXT;

CREATE TABLE "material_point_rules" (
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 2,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_point_rules_pkey" PRIMARY KEY ("code")
);

INSERT INTO "material_point_rules" ("code", "label", "points", "updated_at") VALUES
    ('pet_plastic', 'Plastic (PET/HDPE)', 2, CURRENT_TIMESTAMP),
    ('cardboard', 'Paper & Cardboard', 2, CURRENT_TIMESTAMP),
    ('aluminum_cans', 'Aluminum & Metal Cans', 2, CURRENT_TIMESTAMP),
    ('glass', 'Glass', 2, CURRENT_TIMESTAMP),
    ('others', 'Mixed / Others', 1, CURRENT_TIMESTAMP);
