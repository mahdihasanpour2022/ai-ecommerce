BEGIN;

-- مشخصات با پیش‌فرض امن به محصولات موجود افزوده و ترتیب کلیدهای اصلی جداگانه حفظ می‌شود.
ALTER TABLE "products"
    ADD COLUMN "specifications" JSONB NOT NULL DEFAULT '{}'::JSONB,
    ADD COLUMN "main_spec_keys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- ساختار JSON و ارتباط کلیدهای اصلی را در مرز پایگاه داده محدود می‌کند.
ALTER TABLE "products"
    ADD CONSTRAINT "products_specifications_object_check"
        CHECK (jsonb_typeof("specifications") = 'object'),
    ADD CONSTRAINT "products_specifications_count_check"
        CHECK (
            jsonb_array_length(
                jsonb_path_query_array("specifications", '$.keyvalue()')
            ) <= 30
        ),
    ADD CONSTRAINT "products_specifications_values_check"
        CHECK (NOT jsonb_path_exists("specifications", '$.* ? (@.type() != "string")')),
    ADD CONSTRAINT "products_main_spec_keys_count_check"
        CHECK (cardinality("main_spec_keys") <= 3),
    ADD CONSTRAINT "products_main_spec_keys_membership_check"
        CHECK (
            array_position("main_spec_keys", NULL) IS NULL
            AND "specifications" ?& "main_spec_keys"
        );

COMMIT;
