-- AlterEnum
ALTER TYPE "ReportStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "system_settings" ADD COLUMN     "bin_reset_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "bin_reset_time" TEXT NOT NULL DEFAULT '18:00';
