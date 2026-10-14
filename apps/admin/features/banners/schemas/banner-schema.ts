import { z } from 'zod';

export const bannerSchema = z.object({
  image: z.custom<File>((value) => typeof File !== 'undefined' && value instanceof File, {
    message: 'تصویر بنر را انتخاب کنید.',
  }),
});

export type BannerFormValues = z.infer<typeof bannerSchema>;
