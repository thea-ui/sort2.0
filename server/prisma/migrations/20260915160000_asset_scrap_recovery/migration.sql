-- CreateTable
CREATE TABLE "asset_scrap_stocks" (
    "id" TEXT NOT NULL,
    "material_code" TEXT NOT NULL,
    "material_name" TEXT NOT NULL,
    "threshold_limit_kg" DOUBLE PRECISION NOT NULL,
    "market_price_per_kg" DOUBLE PRECISION NOT NULL,
    "accumulated_kg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_approved_for_sale" BOOLEAN NOT NULL DEFAULT false,
    "approval_reference" TEXT,
    "approved_at" TIMESTAMP(3),
    "hazmat" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_scrap_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "asset_scrap_stocks_material_code_key" ON "asset_scrap_stocks"("material_code");

-- CreateTable
CREATE TABLE "asset_scrap_sale_transactions" (
    "id" TEXT NOT NULL,
    "material_code" TEXT NOT NULL,
    "material_name" TEXT NOT NULL,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "market_price_kg" DOUBLE PRECISION NOT NULL,
    "total_revenue" DOUBLE PRECISION NOT NULL,
    "buyer_name" TEXT NOT NULL,
    "approval_reference" TEXT,
    "school_year_id" TEXT,
    "sold_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_scrap_sale_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "asset_scrap_sale_transactions_school_year_id_idx" ON "asset_scrap_sale_transactions"("school_year_id");

-- CreateTable
CREATE TABLE "asset_scrap_stock_snapshots" (
    "id" TEXT NOT NULL,
    "school_year_id" TEXT NOT NULL,
    "material_code" TEXT NOT NULL,
    "material_name" TEXT NOT NULL,
    "closing_kg" DOUBLE PRECISION NOT NULL,
    "opening_kg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_scrap_stock_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "asset_scrap_stock_snapshots_school_year_id_material_code_key" ON "asset_scrap_stock_snapshots"("school_year_id", "material_code");

-- AddForeignKey
ALTER TABLE "asset_scrap_sale_transactions" ADD CONSTRAINT "asset_scrap_sale_transactions_school_year_id_fkey" FOREIGN KEY ("school_year_id") REFERENCES "school_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_scrap_stock_snapshots" ADD CONSTRAINT "asset_scrap_stock_snapshots_school_year_id_fkey" FOREIGN KEY ("school_year_id") REFERENCES "school_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
