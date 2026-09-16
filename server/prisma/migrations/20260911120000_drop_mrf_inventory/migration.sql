-- DropForeignKey
ALTER TABLE "mrf_inventory_transactions" DROP CONSTRAINT "mrf_inventory_transactions_item_id_fkey";

-- DropForeignKey
ALTER TABLE "mrf_inventory_transactions" DROP CONSTRAINT "mrf_inventory_transactions_school_year_id_fkey";

-- DropTable
DROP TABLE "mrf_inventory_transactions";

-- DropTable
DROP TABLE "mrf_inventory_items";
