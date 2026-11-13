CREATE TABLE "product_color_options" (
    "english_name" VARCHAR(80) NOT NULL,
    "persian_name" VARCHAR(80) NOT NULL,
    "hex_code" CHAR(7) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_color_options_pkey" PRIMARY KEY ("english_name"),
    CONSTRAINT "product_color_options_persian_name_key" UNIQUE ("persian_name"),
    CONSTRAINT "product_color_options_english_name_check"
      CHECK ("english_name" ~ '^[a-z][a-z0-9-]{0,79}$'),
    CONSTRAINT "product_color_options_hex_code_check"
      CHECK ("hex_code" ~ '^#[0-9A-F]{6}$')
);

INSERT INTO "product_color_options" ("english_name", "persian_name", "hex_code")
VALUES
    ('blue', 'آبی', '#2563EB'),
    ('red', 'قرمز', '#DC2626'),
    ('green', 'سبز', '#16A34A'),
    ('white', 'سفید', '#FFFFFF'),
    ('black', 'مشکی', '#111827');
