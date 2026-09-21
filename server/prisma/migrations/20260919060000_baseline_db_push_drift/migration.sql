-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('MILESTONE', 'RANK');

-- CreateEnum
CREATE TYPE "CertificateTier" AS ENUM ('MILESTONE', 'CHAMPION', 'LEADER', 'ADVOCATE');

-- AlterTable
ALTER TABLE "mrf_asset_records" ADD COLUMN     "disposition" TEXT;

-- AlterTable
ALTER TABLE "system_settings" ADD COLUMN     "certificate_advocate_name" TEXT NOT NULL DEFAULT 'Eco-Advocate Certificate',
ADD COLUMN     "certificate_champion_name" TEXT NOT NULL DEFAULT 'Eco-Champion Certificate',
ADD COLUMN     "certificate_grace_days" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "certificate_leader_name" TEXT NOT NULL DEFAULT 'Eco-Leader Certificate',
ADD COLUMN     "certificate_milestone_name" TEXT NOT NULL DEFAULT 'Eco-Milestone Certificate';

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "type" "CertificateType" NOT NULL,
    "tier" "CertificateTier" NOT NULL,
    "name" TEXT NOT NULL,
    "rank_at_issue" INTEGER,
    "points_at_issue" INTEGER NOT NULL,
    "term_code" TEXT,
    "term_name" TEXT,
    "school_year_id" TEXT,
    "school_year_label" TEXT,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issued_by" TEXT,
    "template_version" TEXT NOT NULL DEFAULT 'v1',

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "certificates_serial_key" ON "certificates"("serial");

-- CreateIndex
CREATE INDEX "certificates_user_id_idx" ON "certificates"("user_id");

-- CreateIndex
CREATE INDEX "certificates_school_year_id_term_code_idx" ON "certificates"("school_year_id", "term_code");

-- CreateIndex
CREATE INDEX "certificates_type_idx" ON "certificates"("type");

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

