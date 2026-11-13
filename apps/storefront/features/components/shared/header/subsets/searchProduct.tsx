'use client';

import { UiInputTextField } from '@/components/shared/ui';
import { useInfiniteProducts } from '@/hooks/shared/useInfiniteProducts';
import { Product } from '@/interfaces/product';
import productIcon from '@/public/assets/product/product-icon.png';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
  const pathname = usePathname();
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

  const { data, hasNextPage, isLoading, isFetchingNextPage, loadMoreRef } = useInfiniteProducts({
    name: submittedQuery,
    pageSize: 10,
    enabled: debouncedQuery !== null && debouncedQuery.trim().length > 0,
  });

  const searchedReslt: readonly Product[] | [] = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((page) => page.result);
  }, [data]);

  console.log('searchedReslt ::', searchedReslt);

  const handleValidSearch = useCallback(
    ({ query: validQuery }: FormSchemaType) => {
      const nextSearchParams = new URLSearchParams(searchParams.toString());
      if (validQuery) {
        nextSearchParams.set('name', validQuery);
      } else {
        nextSearchParams.delete('name');
      }

      const queryString = nextSearchParams.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
      setSubmittedQuery(validQuery);
      setDebouncedQuery(validQuery);
    },
    [pathname, router, searchParams],
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
    if (query === urlQuery) {
      previousQueryRef.current = query;
      return;
    }

    if (query === previousQueryRef.current) return;

    previousQueryRef.current = query;
    const timeoutId = window.setTimeout(() => {
      void runSearch();
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [query, runSearch, urlQuery]);

  return (
    <div className="group relative w-full sm:max-w-md">
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
              maxLength={30}
            />
          )}
        />
      </form>
      <div className="bg-nice-red shadow-product-card pointer-events-none invisible absolute -inset-x-3 -top-4 z-10 h-fit max-h-48 rounded-xl px-4 pt-18 opacity-0 transition-opacity group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100">
        <p className="pb-2 text-xs text-white">{`نتیجه جستجو برای " ${urlQuery} "`}</p>

        {searchedReslt.length > 0 && (
          <div className="scrollbar-white h-24 overflow-y-auto">
            {searchedReslt.map((product) => (
              <Link
                href={`/products?name=${encodeURIComponent(product.name)}`}
                className="ml-4 flex list-none items-center justify-start gap-2 border-b border-white/50 py-2"
                key={product.id}
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
            {hasNextPage || isFetchingNextPage ? (
              <div
                ref={loadMoreRef}
                className="flex min-h-8 items-center justify-center"
                role="status"
                aria-live="polite"
              >
                {isFetchingNextPage ? (
                  <>
                    <Image src="/admin-loader.svg" width={28} height={28} alt="" />
                    <span className="sr-only">در حال دریافت محصولات بیشتر...</span>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchProduct;
