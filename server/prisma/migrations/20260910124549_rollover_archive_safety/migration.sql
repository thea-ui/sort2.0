-- DropForeignKey
ALTER TABLE "challenge_contributions" DROP CONSTRAINT "challenge_contributions_challenge_id_fkey";

-- DropForeignKey
ALTER TABLE "challenge_contributions" DROP CONSTRAINT "challenge_contributions_report_id_fkey";

-- DropForeignKey
ALTER TABLE "challenge_contributions" DROP CONSTRAINT "challenge_contributions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "point_histories" DROP CONSTRAINT "point_histories_challenge_id_fkey";

-- DropForeignKey
ALTER TABLE "point_histories" DROP CONSTRAINT "point_histories_report_id_fkey";

-- DropForeignKey
ALTER TABLE "user_challenge_progress" DROP CONSTRAINT "user_challenge_progress_challenge_id_fkey";

-- DropForeignKey
ALTER TABLE "user_challenge_progress" DROP CONSTRAINT "user_challenge_progress_user_id_fkey";

-- AlterTable
ALTER TABLE "enrollment_sync_logs" ADD COLUMN     "message" TEXT;

-- AlterTable
ALTER TABLE "reports" ALTER COLUMN "location_key" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "archived_at" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "point_histories" ADD CONSTRAINT "point_histories_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_histories" ADD CONSTRAINT "point_histories_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_challenge_progress" ADD CONSTRAINT "user_challenge_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_challenge_progress" ADD CONSTRAINT "user_challenge_progress_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_contributions" ADD CONSTRAINT "challenge_contributions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_contributions" ADD CONSTRAINT "challenge_contributions_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_contributions" ADD CONSTRAINT "challenge_contributions_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
