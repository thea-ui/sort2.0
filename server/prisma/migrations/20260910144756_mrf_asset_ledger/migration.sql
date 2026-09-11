-- CreateTable
CREATE TABLE "mrf_asset_records" (
    "id" TEXT NOT NULL,
    "asset_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "condition" TEXT,
    "source_report_id" TEXT,
    "location_name" TEXT,
    "notes" TEXT,
    "performed_by" TEXT,
    "school_year_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mrf_asset_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mrf_asset_records_school_year_id_idx" ON "mrf_asset_records"("school_year_id");

-- CreateIndex
CREATE INDEX "mrf_asset_records_action_idx" ON "mrf_asset_records"("action");

-- AddForeignKey
ALTER TABLE "mrf_asset_records" ADD CONSTRAINT "mrf_asset_records_school_year_id_fkey" FOREIGN KEY ("school_year_id") REFERENCES "school_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;
