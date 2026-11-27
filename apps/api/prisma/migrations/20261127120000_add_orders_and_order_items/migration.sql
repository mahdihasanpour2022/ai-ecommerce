BEGIN;

CREATE TYPE "order_status" AS ENUM ('PENDING', 'FULFILLED', 'CANCELLED', 'FAILED');
CREATE TYPE "order_item_status" AS ENUM ('PENDING', 'FULFILLED', 'CANCELLED', 'FAILED');

-- سابقهٔ سفارش را با مالکیت مشتری و وضعیت نهایی پایدار نگه می‌دارد.
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "status" "order_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "orders_timestamps_check" CHECK ("updated_at" >= "created_at")
);

-- وضعیت fulfil و کمیت خالص هر Variant را در مرز پایگاه داده معتبر نگه می‌دارد.
CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "status" "order_item_status" NOT NULL DEFAULT 'PENDING',
    "fulfilled_quantity" INTEGER NOT NULL DEFAULT 0,
    "refunded_quantity" INTEGER NOT NULL DEFAULT 0,
    "returned_quantity" INTEGER NOT NULL DEFAULT 0,
    "fulfilled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "order_items_quantities_nonnegative_check" CHECK (
        "fulfilled_quantity" >= 0
        AND "refunded_quantity" >= 0
        AND "returned_quantity" >= 0
    ),
    CONSTRAINT "order_items_quantity_balance_check" CHECK (
        "refunded_quantity" + "returned_quantity" <= "fulfilled_quantity"
    ),
    CONSTRAINT "order_items_fulfillment_state_check" CHECK (
        (
            "status" = 'FULFILLED'
            AND "fulfilled_quantity" > 0
            AND "fulfilled_at" IS NOT NULL
        )
        OR (
            "status" <> 'FULFILLED'
            AND "fulfilled_quantity" = 0
            AND "refunded_quantity" = 0
            AND "returned_quantity" = 0
            AND "fulfilled_at" IS NULL
        )
    ),
    CONSTRAINT "order_items_fulfilled_at_check" CHECK (
        "fulfilled_at" IS NULL OR "fulfilled_at" >= "created_at"
    ),
    CONSTRAINT "order_items_timestamps_check" CHECK ("updated_at" >= "created_at")
);

CREATE INDEX "orders_customer_id_status_idx"
    ON "orders"("customer_id", "status");
CREATE INDEX "order_items_order_id_variant_id_idx"
    ON "order_items"("order_id", "variant_id");

-- حذف مبدأهای سابقهٔ خرید را بدون پاک‌شدن ضمنی داده‌ها مسدود می‌کند.
ALTER TABLE "orders"
    ADD CONSTRAINT "orders_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "order_items"
    ADD CONSTRAINT "order_items_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "order_items"
    ADD CONSTRAINT "order_items_variant_id_fkey"
    FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION;

COMMIT;
