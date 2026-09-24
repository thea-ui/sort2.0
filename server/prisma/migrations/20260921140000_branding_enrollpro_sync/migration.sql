-- AlterTable
ALTER TABLE "system_settings" ADD COLUMN     "enrollpro_branding_synced_at" TIMESTAMP(3),
ADD COLUMN     "enrollpro_url" TEXT,
ADD COLUMN     "school_head_name" TEXT;
