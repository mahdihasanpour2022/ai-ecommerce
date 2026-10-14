ALTER TABLE "banners"
ADD CONSTRAINT "banners_byte_size_check" CHECK ("byte_size" BETWEEN 1 AND 1048575),
ADD CONSTRAINT "banners_width_check" CHECK ("width" BETWEEN 1 AND 8192),
ADD CONSTRAINT "banners_height_check" CHECK ("height" BETWEEN 1 AND 8192);
