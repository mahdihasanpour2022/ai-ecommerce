BEGIN;

-- هر جفت مشتری و محصول را یک‌بار و با زمان ایجاد پایدار نگه می‌دارد.
CREATE TABLE "customer_favorite_items" (
    "customer_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_favorite_items_pkey" PRIMARY KEY ("customer_id", "product_id")
);

CREATE INDEX "customer_favorite_items_customer_created_product_idx"
    ON "customer_favorite_items"("customer_id", "created_at" DESC, "product_id" DESC);
CREATE INDEX "customer_favorite_items_product_id_idx"
    ON "customer_favorite_items"("product_id");

ALTER TABLE "customer_favorite_items"
    ADD CONSTRAINT "customer_favorite_items_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "customer_favorite_items"
    ADD CONSTRAINT "customer_favorite_items_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;

COMMIT;
