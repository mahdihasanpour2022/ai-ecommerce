ALTER TABLE "banners"
ADD COLUMN "alt_text" VARCHAR(160),
ADD CONSTRAINT "banners_alt_text_check"
CHECK (
  "alt_text" IS NULL
  OR (
    "alt_text" = BTRIM("alt_text")
    AND CHAR_LENGTH("alt_text") BETWEEN 1 AND 160
  )
);
