import { z } from 'zod';

export const USER_COMMENT_MAX_LENGTH = 1000;

// دیدگاه را بدون محدودکردن حروف فارسی، انگلیسی، عدد و علائم به متن معنادار و محدود تبدیل می‌کند.
export const userCommentSchema = z.object({
  comment: z
    .string()
    .trim()
    .min(1, 'متن دیدگاه را وارد کنید.')
    .max(USER_COMMENT_MAX_LENGTH, `متن دیدگاه نباید بیشتر از ${USER_COMMENT_MAX_LENGTH} نویسه باشد.`),
});

export type UserCommentFormInput = z.input<typeof userCommentSchema>;
export type UserCommentFormValues = z.output<typeof userCommentSchema>;
