-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('POINTS', 'PHYSICAL');

-- CreateEnum
CREATE TYPE "RewardClaimStatus" AS ENUM ('UNLOCKED', 'REQUESTED', 'RELEASED', 'CANCELLED');

-- AlterTable
ALTER TABLE "point_histories" ADD COLUMN     "reward_claim_id" TEXT,
ADD COLUMN     "walk_in_turnover_id" TEXT;

-- AlterTable
ALTER TABLE "system_settings" ADD COLUMN     "walk_in_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "walk_in_points_per_500ml" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "walk_in_turnovers" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "recorded_by_id" TEXT,
    "recorded_by_name" TEXT NOT NULL,
    "total_ml" INTEGER NOT NULL,
    "total_bottles" INTEGER NOT NULL,
    "total_grams" INTEGER NOT NULL,
    "points_awarded" INTEGER NOT NULL,
    "rate_per_500ml" INTEGER NOT NULL,
    "notes" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "school_year_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "walk_in_turnovers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "walk_in_turnover_items" (
    "id" TEXT NOT NULL,
    "turnover_id" TEXT NOT NULL,
    "bottle_ml" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "grams" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "walk_in_turnover_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rewards" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon_name" TEXT NOT NULL,
    "reward_type" "RewardType" NOT NULL DEFAULT 'PHYSICAL',
    "required_grams" INTEGER NOT NULL,
    "points_value" INTEGER NOT NULL DEFAULT 0,
    "stock" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_claims" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reward_id" TEXT NOT NULL,
    "turnover_id" TEXT,
    "status" "RewardClaimStatus" NOT NULL DEFAULT 'UNLOCKED',
    "claim_code" TEXT NOT NULL,
    "grams_at_unlock" INTEGER NOT NULL,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requested_at" TIMESTAMP(3),
    "released_at" TIMESTAMP(3),
    "released_by_id" TEXT,
    "school_year_id" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "reward_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "walk_in_turnovers_idempotency_key_key" ON "walk_in_turnovers"("idempotency_key");

-- CreateIndex
CREATE INDEX "walk_in_turnovers_student_id_school_year_id_idx" ON "walk_in_turnovers"("student_id", "school_year_id");

-- CreateIndex
CREATE INDEX "walk_in_turnovers_student_id_created_at_idx" ON "walk_in_turnovers"("student_id", "created_at");

-- CreateIndex
CREATE INDEX "walk_in_turnovers_recorded_by_id_idx" ON "walk_in_turnovers"("recorded_by_id");

-- CreateIndex
CREATE INDEX "walk_in_turnovers_created_at_idx" ON "walk_in_turnovers"("created_at");

-- CreateIndex
CREATE INDEX "walk_in_turnover_items_turnover_id_idx" ON "walk_in_turnover_items"("turnover_id");

-- CreateIndex
CREATE UNIQUE INDEX "rewards_code_key" ON "rewards"("code");

-- CreateIndex
CREATE INDEX "rewards_is_active_required_grams_idx" ON "rewards"("is_active", "required_grams");

-- CreateIndex
CREATE UNIQUE INDEX "reward_claims_claim_code_key" ON "reward_claims"("claim_code");

-- CreateIndex
CREATE INDEX "reward_claims_status_unlocked_at_idx" ON "reward_claims"("status", "unlocked_at");

-- CreateIndex
CREATE INDEX "reward_claims_user_id_idx" ON "reward_claims"("user_id");

-- CreateIndex
CREATE INDEX "reward_claims_reward_id_idx" ON "reward_claims"("reward_id");

-- CreateIndex
CREATE UNIQUE INDEX "reward_claims_user_id_reward_id_school_year_id_key" ON "reward_claims"("user_id", "reward_id", "school_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "point_histories_walk_in_turnover_id_key" ON "point_histories"("walk_in_turnover_id");

-- CreateIndex
CREATE UNIQUE INDEX "point_histories_reward_claim_id_key" ON "point_histories"("reward_claim_id");

-- AddForeignKey
ALTER TABLE "point_histories" ADD CONSTRAINT "point_histories_walk_in_turnover_id_fkey" FOREIGN KEY ("walk_in_turnover_id") REFERENCES "walk_in_turnovers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_histories" ADD CONSTRAINT "point_histories_reward_claim_id_fkey" FOREIGN KEY ("reward_claim_id") REFERENCES "reward_claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "walk_in_turnovers" ADD CONSTRAINT "walk_in_turnovers_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "walk_in_turnovers" ADD CONSTRAINT "walk_in_turnovers_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "walk_in_turnovers" ADD CONSTRAINT "walk_in_turnovers_school_year_id_fkey" FOREIGN KEY ("school_year_id") REFERENCES "school_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "walk_in_turnover_items" ADD CONSTRAINT "walk_in_turnover_items_turnover_id_fkey" FOREIGN KEY ("turnover_id") REFERENCES "walk_in_turnovers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_claims" ADD CONSTRAINT "reward_claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_claims" ADD CONSTRAINT "reward_claims_reward_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "rewards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_claims" ADD CONSTRAINT "reward_claims_turnover_id_fkey" FOREIGN KEY ("turnover_id") REFERENCES "walk_in_turnovers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_claims" ADD CONSTRAINT "reward_claims_released_by_id_fkey" FOREIGN KEY ("released_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_claims" ADD CONSTRAINT "reward_claims_school_year_id_fkey" FOREIGN KEY ("school_year_id") REFERENCES "school_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

