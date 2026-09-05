'use client';

import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type {
  CatalogApi,
  CreateCategoryInput,
  CreateProductInput,
  CreateVariantInput,
  UpdateCategoryInput,
  UpdateProductInput,
  UpdateVariantInput,
} from '../../app/catalog/catalog-api';
import { catalogApi } from '../../app/catalog/catalog-api';
import type {
  CategoryDto,
  ProductDetailDto,
  ProductVariantDto,
} from '../../app/catalog/catalog-contracts';
import { useRQDeleter } from '../rq_hooks/useRQDeleter';
import { useRQFetchQuery } from '../rq_hooks/useRQFetcher';
import { useRQSender } from '../rq_hooks/useRQSender';
import { catalogQueryKeys } from './catalog-query-keys';

function reconcileVariant(
  product: ProductDetailDto | undefined,
  variant: ProductVariantDto,
): ProductDetailDto | undefined {
  if (!product || product.id !== variant.productId) return product;
  const exists = product.variants.some((current) => current.id === variant.id);
  return {
    ...product,
    variants: exists
      ? product.variants.map((current) => (current.id === variant.id ? variant : current))
      : [...product.variants, variant],
  };
}

export function useCatalogRQClient(baseClient: CatalogApi = catalogApi): CatalogApi {
  const queryClient = useQueryClient();
  const fetchQuery = useRQFetchQuery();
  const createCategoryMutation = useRQSender<CategoryDto, CreateCategoryInput>({
    mutationKey: ['catalog', 'create-category'],
    mutationFn: (input) => baseClient.createCategory(input),
    invalidateQueryKeys: [catalogQueryKeys.categories(), catalogQueryKeys.productLists()],
  });
  const updateCategoryMutation = useRQSender<
    CategoryDto,
    { readonly categoryId: string; readonly input: UpdateCategoryInput }
  >({
    mutationKey: ['catalog', 'update-category'],
    mutationFn: ({ categoryId, input }) => baseClient.updateCategory(categoryId, input),
    invalidateQueryKeys: [catalogQueryKeys.categories(), catalogQueryKeys.productLists()],
  });
  const deleteCategoryMutation = useRQDeleter<void, string>({
    mutationKey: ['catalog', 'delete-category'],
    mutationFn: (categoryId) => baseClient.deleteCategory(categoryId),
    invalidateQueryKeys: [catalogQueryKeys.categories(), catalogQueryKeys.productLists()],
  });
  const createProductMutation = useRQSender<ProductDetailDto, CreateProductInput>({
    mutationKey: ['catalog', 'create-product'],
    mutationFn: (input) => baseClient.createProduct(input),
    invalidateQueryKeys: [catalogQueryKeys.productLists()],
    onSuccess(product) {
      queryClient.setQueryData(catalogQueryKeys.product(product.id), product);
    },
  });
  const updateProductMutation = useRQSender<
    ProductDetailDto,
    { readonly productId: string; readonly input: UpdateProductInput }
  >({
    mutationKey: ['catalog', 'update-product'],
    mutationFn: ({ productId, input }) => baseClient.updateProduct(productId, input),
    invalidateQueryKeys: [catalogQueryKeys.productLists()],
    onSuccess(product) {
      queryClient.setQueryData(catalogQueryKeys.product(product.id), product);
    },
  });
  const createVariantMutation = useRQSender<
    ProductVariantDto,
    { readonly productId: string; readonly input: CreateVariantInput }
  >({
    mutationKey: ['catalog', 'create-variant'],
    mutationFn: ({ productId, input }) => baseClient.createVariant(productId, input),
    invalidateQueryKeys: [catalogQueryKeys.productLists()],
    onSuccess(variant) {
      queryClient.setQueryData<ProductDetailDto>(
        catalogQueryKeys.product(variant.productId),
        (product) => reconcileVariant(product, variant),
      );
    },
  });
  const updateVariantMutation = useRQSender<
    ProductVariantDto,
    { readonly variantId: string; readonly input: UpdateVariantInput }
  >({
    mutationKey: ['catalog', 'update-variant'],
    mutationFn: ({ variantId, input }) => baseClient.updateVariant(variantId, input),
    invalidateQueryKeys: [catalogQueryKeys.productLists()],
    onSuccess(variant) {
      queryClient.setQueryData<ProductDetailDto>(
        catalogQueryKeys.product(variant.productId),
        (product) => reconcileVariant(product, variant),
      );
    },
  });
  const createCategory = createCategoryMutation.mutateAsync;
  const updateCategory = updateCategoryMutation.mutateAsync;
  const deleteCategory = deleteCategoryMutation.mutateAsync;
  const createProduct = createProductMutation.mutateAsync;
  const updateProduct = updateProductMutation.mutateAsync;
  const createVariant = createVariantMutation.mutateAsync;
  const updateVariant = updateVariantMutation.mutateAsync;

  return useMemo<CatalogApi>(
    () => ({
      categories: (signal) =>
        fetchQuery({
          queryKey: catalogQueryKeys.categories(),
          queryFn: ({ signal: querySignal }) => baseClient.categories(signal ?? querySignal),
          ...(signal ? {} : { staleTime: 0 }),
        }),
      createCategory: (input) => createCategory(input),
      updateCategory: (categoryId, input) => updateCategory({ categoryId, input }),
      deleteCategory: (categoryId) => deleteCategory(categoryId),
      products: (query = {}, signal) =>
        fetchQuery({
          queryKey: catalogQueryKeys.products(query),
          queryFn: ({ signal: querySignal }) => baseClient.products(query, signal ?? querySignal),
          ...(signal ? {} : { staleTime: 0 }),
        }),
      createProduct: (input) => createProduct(input),
      product: (productId, signal) =>
        fetchQuery({
          queryKey: catalogQueryKeys.product(productId),
          queryFn: ({ signal: querySignal }) =>
            baseClient.product(productId, signal ?? querySignal),
          ...(signal ? {} : { staleTime: 0 }),
        }),
      updateProduct: (productId, input) => updateProduct({ productId, input }),
      createVariant: (productId, input) => createVariant({ productId, input }),
      updateVariant: (variantId, input) => updateVariant({ variantId, input }),
      priceDisplaySetting: (signal) =>
        fetchQuery({
          queryKey: catalogQueryKeys.priceDisplaySetting(),
          queryFn: ({ signal: querySignal }) =>
            baseClient.priceDisplaySetting(signal ?? querySignal),
          ...(signal ? {} : { staleTime: 0 }),
        }),
    }),
    [
      baseClient,
      createCategory,
      createProduct,
      createVariant,
      deleteCategory,
      fetchQuery,
      updateCategory,
      updateProduct,
      updateVariant,
    ],
  );
}
