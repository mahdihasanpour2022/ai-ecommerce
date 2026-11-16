ALTER TABLE "product_images"
ADD COLUMN "variant_id" UUID;

CREATE UNIQUE INDEX "product_images_variant_id_key"
ON "product_images"("variant_id");

ALTER TABLE "product_images"
ADD CONSTRAINT "product_images_variant_id_fkey"
FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;
