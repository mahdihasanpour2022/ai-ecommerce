import { z } from 'zod';
import { createCategorySchema } from './create-category-schema';

export const editCategorySchema = createCategorySchema.extend({
  image: createCategorySchema.shape.image.optional(),
});
export type EditCategoryFormValues = z.infer<typeof editCategorySchema>;
