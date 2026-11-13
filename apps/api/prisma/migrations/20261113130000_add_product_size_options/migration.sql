CREATE TABLE "product_size_options" (
    "english_name" VARCHAR(80) NOT NULL,
    "persian_name" VARCHAR(80) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_size_options_pkey" PRIMARY KEY ("english_name"),
    CONSTRAINT "product_size_options_persian_name_key" UNIQUE ("persian_name"),
    CONSTRAINT "product_size_options_english_name_check"
      CHECK ("english_name" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

INSERT INTO "product_size_options" ("english_name", "persian_name")
VALUES
    ('small', 'کوچک'),
    ('medium', 'متوسط'),
    ('large', 'بزرگ'),
    ('x-large', 'خیلی بزرگ'),
    ('2x-large', 'دو ایکس بزرگ'),
    ('3x-large', 'سه ایکس بزرگ');
