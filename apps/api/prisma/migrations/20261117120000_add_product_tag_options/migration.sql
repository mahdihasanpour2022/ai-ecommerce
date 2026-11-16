CREATE TABLE "product_tag_options" (
    "english_name" VARCHAR(80) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_tag_options_pkey" PRIMARY KEY ("english_name"),
    CONSTRAINT "product_tag_options_english_name_check"
      CHECK ("english_name" ~ '^[a-z]+(_[a-z]+)*$')
);

INSERT INTO "product_tag_options" ("english_name")
SELECT DISTINCT "tag"
FROM "products"
WHERE "tag" IS NOT NULL
ON CONFLICT ("english_name") DO NOTHING;
