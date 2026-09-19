-- CreateTable
CREATE TABLE "asset_scrap_items" (
    "id" TEXT NOT NULL,
    "material_code" TEXT NOT NULL,
    "material_name" TEXT NOT NULL,
    "weight_kg" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'AWAITING_WEIGHT',
    "description" TEXT,
    "source_asset_id" TEXT,
    "source_report_id" TEXT,
    "weighed_by" TEXT,
    "weighed_at" TIMESTAMP(3),
    "sale_transaction_id" TEXT,
    "disposed_by" TEXT,
    "disposed_at" TIMESTAMP(3),
    "disposal_reference" TEXT,
    "school_year_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_scrap_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "asset_scrap_items_material_code_idx" ON "asset_scrap_items"("material_code");

-- CreateIndex
CREATE INDEX "asset_scrap_items_status_idx" ON "asset_scrap_items"("status");

-- CreateIndex
CREATE INDEX "asset_scrap_items_source_asset_id_idx" ON "asset_scrap_items"("source_asset_id");

-- CreateIndex
CREATE INDEX "asset_scrap_items_source_report_id_idx" ON "asset_scrap_items"("source_report_id");

-- CreateIndex
CREATE INDEX "asset_scrap_items_school_year_id_idx" ON "asset_scrap_items"("school_year_id");

-- AddForeignKey
ALTER TABLE "asset_scrap_items" ADD CONSTRAINT "asset_scrap_items_school_year_id_fkey" FOREIGN KEY ("school_year_id") REFERENCES "school_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;
