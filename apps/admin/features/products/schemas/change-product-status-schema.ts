import { z } from 'zod';

export const changeProductStatusSchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED'], {
    error: 'وضعیت جدید محصول را انتخاب کنید.',
  }),
});

export type ChangeProductStatusFormValues = z.infer<typeof changeProductStatusSchema>;
