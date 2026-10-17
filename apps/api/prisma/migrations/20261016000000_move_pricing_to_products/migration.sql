ALTER TABLE "products"
ADD COLUMN "original_price_rial" BIGINT,
ADD COLUMN "discount_percent" INTEGER NOT NULL DEFAULT 0;

UPDATE "products" AS product
SET "original_price_rial" = (
  SELECT MIN(variant."price_rial")
  FROM "product_variants" AS variant
  WHERE variant."product_id" = product."id"
);

ALTER TABLE "products"
ALTER COLUMN "original_price_rial" SET NOT NULL,
ADD CONSTRAINT "products_original_price_rial_check" CHECK (
  "original_price_rial" > 0
  AND "original_price_rial" % 10 = 0
  AND "original_price_rial" <= 9007199254740991
),
ADD CONSTRAINT "products_discount_percent_check" CHECK (
  "discount_percent" >= 0
  AND "discount_percent" <= 100
);

ALTER TABLE "product_variants"
DROP CONSTRAINT "product_variants_price_rial_check",
DROP COLUMN "price_rial";
