-- CreateTable
CREATE TABLE "atlas_map_snapshots" (
    "id" TEXT NOT NULL,
    "school_id" INTEGER NOT NULL,
    "etag" TEXT,
    "content_hash" TEXT NOT NULL,
    "building_count" INTEGER NOT NULL DEFAULT 0,
    "room_count" INTEGER NOT NULL DEFAULT 0,
    "campus_image_url" TEXT,
    "campus_image_path" TEXT,
    "campus_image_hash" TEXT,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "atlas_map_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atlas_buildings" (
    "id" TEXT NOT NULL,
    "atlas_id" INTEGER NOT NULL,
    "school_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "short_code" TEXT,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "color" TEXT,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "floor_count" INTEGER NOT NULL DEFAULT 1,
    "is_teaching_building" BOOLEAN NOT NULL DEFAULT true,
    "gradeScope" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "atlas_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "atlas_buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atlas_rooms" (
    "id" TEXT NOT NULL,
    "atlas_id" INTEGER NOT NULL,
    "atlas_building_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "floor" INTEGER NOT NULL DEFAULT 1,
    "type" TEXT NOT NULL,
    "capacity" INTEGER,
    "is_teaching_space" BOOLEAN NOT NULL DEFAULT false,
    "is_shared_facility" BOOLEAN NOT NULL DEFAULT false,
    "floor_position" INTEGER,
    "features" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "atlas_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "atlas_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atlas_sync_logs" (
    "id" TEXT NOT NULL,
    "school_id" INTEGER NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "unchanged" BOOLEAN NOT NULL DEFAULT false,
    "buildings_seen" INTEGER NOT NULL DEFAULT 0,
    "rooms_seen" INTEGER NOT NULL DEFAULT 0,
    "inserted" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "deactivated" INTEGER NOT NULL DEFAULT 0,
    "image_changed" BOOLEAN NOT NULL DEFAULT false,
    "error_message" TEXT,
    "duration_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atlas_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "atlas_map_snapshots_school_id_key" ON "atlas_map_snapshots"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "atlas_buildings_atlas_id_key" ON "atlas_buildings"("atlas_id");

-- CreateIndex
CREATE INDEX "atlas_buildings_school_id_is_active_idx" ON "atlas_buildings"("school_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "atlas_rooms_atlas_id_key" ON "atlas_rooms"("atlas_id");

-- CreateIndex
CREATE INDEX "atlas_rooms_atlas_building_id_is_active_idx" ON "atlas_rooms"("atlas_building_id", "is_active");

-- CreateIndex
CREATE INDEX "atlas_sync_logs_school_id_created_at_idx" ON "atlas_sync_logs"("school_id", "created_at");

-- AddForeignKey
ALTER TABLE "atlas_rooms" ADD CONSTRAINT "atlas_rooms_atlas_building_id_fkey" FOREIGN KEY ("atlas_building_id") REFERENCES "atlas_buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
