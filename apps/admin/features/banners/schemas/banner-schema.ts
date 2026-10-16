import { z } from 'zod';

export const bannerSchema = z.object({
  image: z
    .custom<File>((value) => typeof File !== 'undefined' && value instanceof File, {
      message: 'تصویر بنر معتبر نیست.',
    })
    .optional(),
  alt: z.string().trim().max(160, 'متن جایگزین تصویر حداکثر ۱۶۰ نویسه است.'),
});

export type BannerFormValues = z.infer<typeof bannerSchema>;
