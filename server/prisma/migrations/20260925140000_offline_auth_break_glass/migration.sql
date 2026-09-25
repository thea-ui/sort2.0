-- Break-glass offline authentication (additive only).
--
-- SORT login is delegated to EnrollPro; when EnrollPro is unreachable every
-- fresh login fails closed. These columns add an explicitly-enabled, audited,
-- time-boxed fallback. Nothing here stores or mirrors an EnrollPro credential:
-- `offline_pin_hash` is a separate SORT-local PIN used only while the fallback
-- is enabled.
--
-- Note: this migration intentionally contains only offline-auth changes. The
-- working database also carries unrelated pre-existing drift (certificates
-- prize columns / CertificateType enum) that is NOT touched here.

-- AlterTable
ALTER TABLE "system_settings" ADD COLUMN     "offline_auth_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "offline_auth_enabled_at" TIMESTAMP(3),
ADD COLUMN     "offline_auth_enabled_by" TEXT,
ADD COLUMN     "offline_auth_expires_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "user_sessions" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'NORMAL';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "offline_pin_hash" TEXT,
ADD COLUMN     "offline_pin_set_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "offline_auth_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'OFFLINE_PIN',
    "success" BOOLEAN NOT NULL,
    "reason" TEXT,
    "ip_address" TEXT,
    "device_info" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offline_auth_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "offline_auth_logs_user_id_idx" ON "offline_auth_logs"("user_id");

-- CreateIndex
CREATE INDEX "offline_auth_logs_created_at_idx" ON "offline_auth_logs"("created_at");

-- CreateIndex
CREATE INDEX "user_sessions_kind_idx" ON "user_sessions"("kind");

-- AddForeignKey
ALTER TABLE "offline_auth_logs" ADD CONSTRAINT "offline_auth_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
