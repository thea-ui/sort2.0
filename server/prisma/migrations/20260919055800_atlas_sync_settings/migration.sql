-- AlterTable
ALTER TABLE "system_settings" ADD COLUMN     "atlas_sync_interval_minutes" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "atlas_sync_mode" TEXT NOT NULL DEFAULT 'AUTO';
