-- AlterTable
ALTER TABLE "system_settings" ADD COLUMN     "accent_color" TEXT NOT NULL DEFAULT '#00A77C',
ADD COLUMN     "address" TEXT,
ADD COLUMN     "division" TEXT,
ADD COLUMN     "enrollpro_public_url" TEXT,
ADD COLUMN     "gold_color" TEXT NOT NULL DEFAULT '#C69B26',
ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "primary_color" TEXT NOT NULL DEFAULT '#00271D',
ADD COLUMN     "region" TEXT,
ADD COLUMN     "school_acronym" TEXT,
ADD COLUMN     "school_id" TEXT,
ADD COLUMN     "school_name" TEXT NOT NULL DEFAULT 'School Name',
ADD COLUMN     "secondary_color" TEXT NOT NULL DEFAULT '#00A77C';
