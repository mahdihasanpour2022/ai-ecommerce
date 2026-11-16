import { z } from 'zod';

const maximumInventory = 2_147_483_647;

function isFileLike(value: unknown): value is File {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    'size' in value &&
    'type' in value &&
    'arrayBuffer' in value
  );
}

// افزودن واریانت فقط با تصویر، رنگ، سایز و موجودی معتبر مجاز است.
export const addProductVariantSchema = z.object({
  image: z.custom<File>(isFileLike, { message: 'تصویر واریانت را انتخاب کنید.' }),
  size: z.string().trim().min(1, 'یک سایز انتخاب کنید.'),
  color: z.string().trim().min(1, 'یک رنگ انتخاب کنید.'),
  onHandQuantity: z
    .string()
    .trim()
    .regex(/^\d+$/u, 'موجودی را وارد کنید.')
    .refine((value) => {
      const quantity = Number(value);
      return Number.isInteger(quantity) && quantity >= 1 && quantity <= maximumInventory;
    }, 'موجودی باید حداقل ۱ باشد.'),
});

export type AddProductVariantFormValues = z.infer<typeof addProductVariantSchema>;
