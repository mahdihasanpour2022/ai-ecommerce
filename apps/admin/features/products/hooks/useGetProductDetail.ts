'use client';

import { useMemo } from 'react';
import { useRQFetcher } from '../../../hooks/rq_hooks/useRQFetcher';
import { useGetProductColors } from '../../../hooks/shared/useGetProductColors';
import type {
  ProductDetailResponse,
  RawProductDetailResponse,
} from '../interfaces/product-contract';
import { productKeys } from './useGetProducts';

export function useGetProductDetail(productId: string | null) {
  const safeProductId = productId ?? '00000000-0000-4000-8000-000000000000';
  const detail = useRQFetcher<RawProductDetailResponse>({
    queryKey: productKeys.detail(safeProductId),
    url: `/admin/catalog/products/${encodeURIComponent(safeProductId)}`,
    enabled: productId !== null,
    staleTime: 0,
  });
  const colors = useGetProductColors(productId !== null);

  // نام انگلیسی ذخیره‌شده در واریانت با نام فارسی گزینهٔ رنگ ترکیب می‌شود.
  const data = useMemo<ProductDetailResponse | undefined>(() => {
    if (!detail.data) return undefined;
    const colorNames = new Map(
      (colors.data?.result ?? []).map((color) => [color['english-color-name'], color] as const),
    );
    const singleResult = detail.data.singleResult;
    return {
      ...detail.data,
      singleResult: {
        ...singleResult,
        variants: singleResult.variants.map((variant) => {
          if (variant.color === null) return { ...variant, color: null };
          const color = colorNames.get(variant.color);
          return {
            ...variant,
            color: {
              englishColorName: variant.color,
              persianColorName: color?.['persian-color-name'] ?? variant.color,
            },
          };
        }),
      },
    };
  }, [colors.data?.result, detail.data]);

  return {
    ...detail,
    data,
    isFetching: detail.isFetching || colors.isFetching,
    isError: detail.isError || colors.isError,
  };
}
