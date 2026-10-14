CREATE TABLE "banners" (
    "id" UUID NOT NULL,
    "storage_key" VARCHAR(512) NOT NULL,
    "media_type" "product_image_media_type" NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "banner_image_cleanups" (
    "id" UUID NOT NULL,
    "storage_key" VARCHAR(512) NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMPTZ(3),
    "last_failure_code" VARCHAR(64),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "banner_image_cleanups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "banners_storage_key_key" ON "banners"("storage_key");
CREATE INDEX "banners_created_id_idx" ON "banners"("created_at", "id");
CREATE UNIQUE INDEX "banner_image_cleanups_storage_key_key" ON "banner_image_cleanups"("storage_key");
CREATE INDEX "banner_image_cleanups_created_id_idx" ON "banner_image_cleanups"("created_at", "id");
