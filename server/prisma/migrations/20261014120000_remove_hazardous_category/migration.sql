-- Retire the HAZARDOUS stream. The campus operates exactly three streams
-- (RECYCLABLE, BIODEGRADABLE, NON_BIODEGRADABLE); legacy rows are folded into
-- the residual (NON_BIODEGRADABLE) stream before the enum values are dropped.

-- 1. Reclassify legacy rows so the enum swap below cannot fail.
UPDATE "reports" SET "category" = 'NON_BIODEGRADABLE' WHERE "category" = 'HAZARDOUS';
UPDATE "waste_bins" SET "type" = 'NON_BIODEGRADABLE' WHERE "type" = 'HAZARDOUS';
UPDATE "challenges" SET "challenge_type" = 'REPORT_COUNT' WHERE "challenge_type" = 'HAZARDOUS_REPORT';

-- 2. Recreate WasteCategory without HAZARDOUS (Postgres cannot drop enum values).
ALTER TYPE "WasteCategory" RENAME TO "WasteCategory_old";
CREATE TYPE "WasteCategory" AS ENUM ('RECYCLABLE', 'BIODEGRADABLE', 'NON_BIODEGRADABLE');

ALTER TABLE "reports" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "reports" ALTER COLUMN "category" TYPE "WasteCategory" USING ("category"::text::"WasteCategory");
ALTER TABLE "reports" ALTER COLUMN "category" SET DEFAULT 'NON_BIODEGRADABLE';

ALTER TABLE "waste_bins" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "waste_bins" ALTER COLUMN "type" TYPE "WasteCategory" USING ("type"::text::"WasteCategory");
ALTER TABLE "waste_bins" ALTER COLUMN "type" SET DEFAULT 'NON_BIODEGRADABLE';

DROP TYPE "WasteCategory_old";

-- 3. Recreate ChallengeType without HAZARDOUS_REPORT.
ALTER TYPE "ChallengeType" RENAME TO "ChallengeType_old";
CREATE TYPE "ChallengeType" AS ENUM ('REPORT_COUNT', 'WEIGHT_COLLECTED');

ALTER TABLE "challenges" ALTER COLUMN "challenge_type" DROP DEFAULT;
ALTER TABLE "challenges" ALTER COLUMN "challenge_type" TYPE "ChallengeType" USING ("challenge_type"::text::"ChallengeType");
ALTER TABLE "challenges" ALTER COLUMN "challenge_type" SET DEFAULT 'REPORT_COUNT';

DROP TYPE "ChallengeType_old";
