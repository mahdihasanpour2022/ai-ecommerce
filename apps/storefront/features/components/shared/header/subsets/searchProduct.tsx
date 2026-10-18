'use client';

import { UiInputTextField } from '@/components/shared/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import z from 'zod';

const SEARCH_DEBOUNCE_MS = 1_000;

const searchInputSchema = z.object({
  query: z.string().trim(),
  // .min(1, {
  //   error: validationMsg.isRequired('نام محصول'),
  // }),
});

type FormSchemaType = z.infer<typeof searchInputSchema>;

const SearchProduct = () => {
  const { control, handleSubmit } = useForm<FormSchemaType>({
    resolver: zodResolver(searchInputSchema),
    defaultValues: {
      query: '',
    },
    mode: 'onChange',
  });

  const query = useWatch({ control, name: 'query' });
  const previousQueryRef = useRef(query);
  const handleValidSearch = useCallback(
    ({ query: validQuery }: FormSchemaType) => console.log('search ...', validQuery),
    [],
  );
  const runSearch = useMemo(
    () => handleSubmit(handleValidSearch),
    [handleSubmit, handleValidSearch],
  );

  useEffect(() => {
    if (query === previousQueryRef.current) return;

    previousQueryRef.current = query;
    const timeoutId = window.setTimeout(() => {
      void runSearch();
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [query, runSearch]);

  return (
    <form
      role="search"
      aria-label="جستجوی محصولات"
      onSubmit={runSearch}
      autoComplete="off"
      noValidate
      className="w-full space-y-3 sm:max-w-md"
    >
      <Controller
        name="query"
        control={control}
        render={({ field, fieldState }) => (
          <UiInputTextField
            {...field}
            id="query"
            type="text"
            // className="bg-foreground/3 border-gray-50"
            label="جستجوی محصولات"
            placeholder="جستجو در فروشگاه ..."
            enterKeyHint="search"
            errorMessage={fieldState.error?.message}
            required={false}
            hasLabel={false}
          />
        )}
      />
    </form>
  );
};

export default SearchProduct;
