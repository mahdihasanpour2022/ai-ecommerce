-- CreateTable
CREATE TABLE "category_images" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "storage_key" VARCHAR(512) NOT NULL,
    "media_type" "product_image_media_type" NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "category_images_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "category_images_storage_key_check" CHECK (
        "storage_key" = btrim("storage_key")
        AND char_length("storage_key") BETWEEN 1 AND 512
    ),
    CONSTRAINT "category_images_byte_size_check" CHECK ("byte_size" BETWEEN 1 AND 409599),
    CONSTRAINT "category_images_dimensions_check" CHECK (
        "width" BETWEEN 1 AND 8192
        AND "height" BETWEEN 1 AND 8192
        AND "width"::BIGINT * "height"::BIGINT <= 25000000
    ),
    CONSTRAINT "category_images_timestamps_check" CHECK ("updated_at" >= "created_at")
);

-- CreateTable
CREATE TABLE "category_image_cleanups" (
    "id" UUID NOT NULL,
    "storage_key" VARCHAR(512) NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMPTZ(3),
    "last_failure_code" VARCHAR(64),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "category_image_cleanups_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "category_image_cleanups_storage_key_check" CHECK (
        "storage_key" = btrim("storage_key")
        AND char_length("storage_key") BETWEEN 1 AND 512
    ),
    CONSTRAINT "category_image_cleanups_attempt_check" CHECK (
        "attempt_count" >= 0
        AND (("attempt_count" = 0 AND "last_attempt_at" IS NULL)
             OR ("attempt_count" > 0 AND "last_attempt_at" IS NOT NULL))
        AND (
            "last_failure_code" IS NULL OR (
                "attempt_count" > 0
                AND "last_failure_code" = btrim("last_failure_code")
                AND char_length("last_failure_code") BETWEEN 1 AND 64
            )
        )
    ),
    CONSTRAINT "category_image_cleanups_timestamps_check" CHECK (
        "updated_at" >= "created_at"
        AND ("last_attempt_at" IS NULL OR "last_attempt_at" >= "created_at")
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "category_images_category_id_key" ON "category_images"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "category_images_storage_key_key" ON "category_images"("storage_key");

-- CreateIndex
CREATE UNIQUE INDEX "category_image_cleanups_storage_key_key" ON "category_image_cleanups"("storage_key");

-- CreateIndex
CREATE INDEX "category_image_cleanups_created_id_idx" ON "category_image_cleanups"("created_at", "id");

-- AddForeignKey
ALTER TABLE "category_images" ADD CONSTRAINT "category_images_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
