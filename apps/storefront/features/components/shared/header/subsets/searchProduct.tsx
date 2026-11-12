'use client';

import { UiInputTextField } from '@/components/shared/ui';
import { useGetProducts } from '@/hooks/shared/useGetProducts';
import { Product } from '@/interfaces/product';
import productIcon from '@/public/assets/product/product-icon.png';
import { zodResolver } from '@hookform/resolvers/zod';
import { nanoid } from 'nanoid';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import z from 'zod';

const SEARCH_DEBOUNCE_MS = 1_500;

const searchInputSchema = z.object({
  query: z.string().trim().max(200, 'عبارت جستجو نباید بیشتر از ۲۰۰ نویسه باشد.'),
});

type FormSchemaType = z.infer<typeof searchInputSchema>;

const SearchProduct = () => {
  const router = useRouter();
  const [debouncedQuery, setDebouncedQuery] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('name') ?? '';
  const [submittedQuery, setSubmittedQuery] = useState(urlQuery);
  const { control, handleSubmit, reset } = useForm<FormSchemaType>({
    resolver: zodResolver(searchInputSchema),
    defaultValues: {
      query: urlQuery,
    },
    mode: 'onChange',
  });

  const query = useWatch({ control, name: 'query' });
  const previousQueryRef = useRef(query);

  const { data, isSuccess, isLoading } = useGetProducts({
    name: submittedQuery,
    pageSize: 10,
    enabled: debouncedQuery !== null,
  });

  const searchedReslt: readonly Product[] | [] = useMemo(() => {
    if (!data || !isSuccess) return [];
    return data?.result;
  }, [isSuccess, data]);

  console.log('searchedReslt ::', searchedReslt);

  const handleValidSearch = useCallback(
    ({ query: validQuery }: FormSchemaType) => {
      const nextSearchParams = new URLSearchParams(searchParams.toString());
      nextSearchParams.set('name', validQuery);
      router.replace(`?${nextSearchParams.toString()}`, { scroll: false });
      setSubmittedQuery(validQuery);
      setDebouncedQuery(validQuery);
    },
    [router, searchParams],
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
    <div className="relative w-full sm:max-w-md">
      <form
        role="search"
        aria-label="جستجوی محصولات"
        onSubmit={runSearch}
        autoComplete="off"
        noValidate
        className="relative z-20 w-full"
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
              placeholder="جستجو در همه کالاها ..."
              enterKeyHint="search"
              errorMessage={fieldState.error?.message}
              required={false}
              hasLabel={false}
              loading={isLoading}
            />
          )}
        />
      </form>
      <div className="bg-nice-red shadow-product-card absolute -inset-x-3 -top-4 z-10 min-h-44 rounded-xl px-4 pt-18">
        <p className="pb-4 text-xs text-white">{`نتیجه جستجو برای " ${urlQuery} "`}</p>
        {searchedReslt.length > 0 &&
          searchedReslt.map((product) => (
            <Link
              href={`/products?name=${encodeURIComponent(product.name)}`}
              className="flex list-none items-center justify-start gap-2 border-b border-white/50 py-2"
              key={nanoid()}
            >
              <Image
                className="h-3! w-3! opacity-100"
                src={productIcon}
                width={200}
                height={200}
                alt=""
                priority={false}
              />
              <span className="text-xs text-white">{product.name}</span>
            </Link>
          ))}
      </div>
    </div>
  );
};

export default SearchProduct;
