ALTER TABLE "products"
ADD COLUMN "tag" VARCHAR(80),
ADD CONSTRAINT "products_tag_format_check"
CHECK ("tag" IS NULL OR "tag" ~ '^[a-z]+(_[a-z]+)*$');

CREATE INDEX "products_status_tag_created_id_idx"
ON "products" ("status", "tag", "created_at" DESC, "id" DESC);
