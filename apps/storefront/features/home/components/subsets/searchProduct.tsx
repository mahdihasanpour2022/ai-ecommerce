'use client';

import { UiInputTextField } from '@/components/shared/ui';
import { validationMessage } from '@/constants';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import z from 'zod';

const searchInputSchema = z.object({
  query: z.string({ message: VALIDATION_MSG.isRequired('نام') }),
});

type FormSchemaType = z.infer<typeof searchInputSchema>;

const SearchProduct = () => {
  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<FormSchemaType>({
    resolver: zodResolver(searchInputSchema),
    mode: 'all',
  });

  return (
    <div className="w-full sm:max-w-md">
      <UiInputTextField
        id="product-search"
        name="query"
        type="text"
        label="جستجوی محصولات"
        placeholder="نام محصول را وارد کنید"
        enterKeyHint="search"
        required
        hasLabel={true}
      />
    </div>
  );
};

export default SearchProduct;
