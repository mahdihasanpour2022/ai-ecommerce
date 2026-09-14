import { z } from 'zod';
import { createCategorySchema } from './create-category-schema';

export const editCategorySchema = createCategorySchema;
export type EditCategoryFormValues = z.infer<typeof editCategorySchema>;
