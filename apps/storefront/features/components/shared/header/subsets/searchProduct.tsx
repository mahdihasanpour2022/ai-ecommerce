'use client';

import { UiInputTextField } from '@/components/shared/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import z from 'zod';

const SEARCH_DEBOUNCE_MS = 1_000;

const searchInputSchema = z.object({
  query: z.string().trim().max(200, 'عبارت جستجو نباید بیشتر از ۲۰۰ نویسه باشد.'),
});

type FormSchemaType = z.infer<typeof searchInputSchema>;

const SearchProduct = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('name') ?? '';
  const { control, handleSubmit, reset } = useForm<FormSchemaType>({
    resolver: zodResolver(searchInputSchema),
    defaultValues: {
      query: urlQuery,
    },
    mode: 'onChange',
  });

  const query = useWatch({ control, name: 'query' });
  const previousQueryRef = useRef(query);
  const handleValidSearch = useCallback(
    ({ query: validQuery }: FormSchemaType) => {
      const href = validQuery ? `/products?name=${encodeURIComponent(validQuery)}` : '/products';
      router.replace(href, { scroll: false });
    },
    [router],
  );
  const runSearch = useMemo(
    () => handleSubmit(handleValidSearch),
    [handleSubmit, handleValidSearch],
  );

  useEffect(() => {
    previousQueryRef.current = urlQuery;
    reset({ query: urlQuery });
  }, [reset, urlQuery]);

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
