import { z } from 'zod';

const asciiInteger = /^\d+$/u;
const maximumInventory = 2_147_483_647;

export const editProductVariantSchema = z.object({
  size: z.string().trim().min(1, 'یک سایز انتخاب کنید.'),
  color: z.string().trim().min(1, 'یک رنگ انتخاب کنید.'),
  onHandQuantity: z
    .string()
    .trim()
    .regex(asciiInteger, 'موجودی را وارد کنید.')
    .refine((value) => {
      const quantity = Number(value);
      return Number.isInteger(quantity) && quantity >= 0 && quantity <= maximumInventory;
    }, 'موجودی باید عددی بین صفر و حداکثر مجاز باشد.'),
});

export type EditProductVariantFormValues = z.infer<typeof editProductVariantSchema>;
