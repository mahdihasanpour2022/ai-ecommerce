import type { AxiosInstance } from 'axios';
import {
  parseCategoryTree,
  parseCategory,
  parsePriceDisplaySetting,
  parseProductDetail,
  parseProductList,
  isCatalogUuid,
} from './catalog-contracts';
import type {
  CategoryDto,
  PriceDisplaySettingDto,
  ProductDetailDto,
  ProductListDto,
  ProductStatus,
} from './catalog-contracts';
import { AdminHttpError, httpClient } from '../http/http-client';
import { httpFailureChannel } from '../http/http-failure-channel';

export interface ProductListQuery {
  readonly page?: number;
  readonly pageSize?: 25 | 50 | 100;
  readonly categoryId?: string;
  readonly status?: ProductStatus;
}

export interface CreateCategoryInput {
  readonly name: string;
  readonly parentId: string | null;
}

export interface UpdateCategoryInput {
  readonly name?: string;
  readonly parentId?: string | null;
}

export interface CatalogApi {
  categories(signal?: AbortSignal): Promise<readonly CategoryDto[]>;
  createCategory(input: CreateCategoryInput): Promise<CategoryDto>;
  updateCategory(categoryId: string, input: UpdateCategoryInput): Promise<CategoryDto>;
  deleteCategory(categoryId: string): Promise<void>;
  products(query?: ProductListQuery, signal?: AbortSignal): Promise<ProductListDto>;
  product(productId: string, signal?: AbortSignal): Promise<ProductDetailDto>;
  priceDisplaySetting(signal?: AbortSignal): Promise<PriceDisplaySettingDto>;
}

const READ_POLICY = { csrf: 'omit', failure: 'caller', refresh: 'eligible' } as const;
const MUTATION_POLICY = { csrf: 'required', failure: 'caller', refresh: 'eligible' } as const;
const PRODUCT_STATUSES = new Set<ProductStatus>(['DRAFT', 'ACTIVE', 'ARCHIVED']);

function invalidRequest(): never {
  throw new AdminHttpError('configuration', null, 'INVALID_CATALOG_REQUEST');
}

function validateProductQuery(query: ProductListQuery): ProductListQuery {
  if (
    (query.page !== undefined && (!Number.isSafeInteger(query.page) || query.page < 1)) ||
    (query.pageSize !== undefined && ![25, 50, 100].includes(query.pageSize)) ||
    (query.categoryId !== undefined && !isCatalogUuid(query.categoryId)) ||
    (query.status !== undefined && !PRODUCT_STATUSES.has(query.status))
  ) {
    invalidRequest();
  }
  return query;
}

function validateProductId(productId: string): string {
  if (!isCatalogUuid(productId)) invalidRequest();
  return productId;
}

function validateCategoryInput(input: CreateCategoryInput | UpdateCategoryInput, update = false) {
  const keys = Object.keys(input);
  if (
    (update && keys.length === 0) ||
    keys.some((key) => key !== 'name' && key !== 'parentId') ||
    ('name' in input && typeof input.name !== 'string') ||
    ('parentId' in input && input.parentId !== null && !isCatalogUuid(input.parentId))
  ) {
    invalidRequest();
  }
  return input;
}

function mutationConfig() {
  return { authPolicy: MUTATION_POLICY };
}

function publishDefinitiveAuthFailure(error: unknown): never {
  if (
    error instanceof AdminHttpError &&
    (error.status === 401 || error.code === 'ACCOUNT_DISABLED')
  ) {
    httpFailureChannel.publish(error);
  }
  throw error;
}

function signalConfig(signal?: AbortSignal) {
  return { ...(signal ? { signal } : {}), authPolicy: READ_POLICY };
}

export function createCatalogApi(client: AxiosInstance = httpClient): CatalogApi {
  return {
    async categories(signal) {
      try {
        const response = await client.get<unknown>(
          '/admin/catalog/categories',
          signalConfig(signal),
        );
        return parseCategoryTree(response.data);
      } catch (error) {
        return publishDefinitiveAuthFailure(error);
      }
    },
    async createCategory(input) {
      try {
        const response = await client.post<unknown>(
          '/admin/catalog/categories',
          validateCategoryInput(input),
          mutationConfig(),
        );
        return parseCategory(response.data);
      } catch (error) {
        return publishDefinitiveAuthFailure(error);
      }
    },
    async updateCategory(categoryId, input) {
      try {
        const id = validateProductId(categoryId);
        const response = await client.patch<unknown>(
          `/admin/catalog/categories/${id}`,
          validateCategoryInput(input, true),
          mutationConfig(),
        );
        return parseCategory(response.data);
      } catch (error) {
        return publishDefinitiveAuthFailure(error);
      }
    },
    async deleteCategory(categoryId) {
      try {
        const id = validateProductId(categoryId);
        const response = await client.delete(`/admin/catalog/categories/${id}`, mutationConfig());
        if (response.status !== 204) {
          throw new AdminHttpError('http', 502, 'INVALID_RESPONSE');
        }
      } catch (error) {
        return publishDefinitiveAuthFailure(error);
      }
    },
    async products(query = {}, signal) {
      try {
        const validated = validateProductQuery(query);
        const response = await client.get<unknown>('/admin/catalog/products', {
          ...signalConfig(signal),
          params: {
            ...(validated.page === undefined ? {} : { page: validated.page }),
            ...(validated.pageSize === undefined ? {} : { pageSize: validated.pageSize }),
            ...(validated.categoryId === undefined ? {} : { categoryId: validated.categoryId }),
            ...(validated.status === undefined ? {} : { status: validated.status }),
          },
        });
        return parseProductList(response.data);
      } catch (error) {
        return publishDefinitiveAuthFailure(error);
      }
    },
    async product(productId, signal) {
      try {
        const id = validateProductId(productId);
        const response = await client.get<unknown>(
          `/admin/catalog/products/${id}`,
          signalConfig(signal),
        );
        return parseProductDetail(response.data);
      } catch (error) {
        return publishDefinitiveAuthFailure(error);
      }
    },
    async priceDisplaySetting(signal) {
      try {
        const response = await client.get<unknown>(
          '/admin/catalog/settings/price-display-unit',
          signalConfig(signal),
        );
        return parsePriceDisplaySetting(response.data);
      } catch (error) {
        return publishDefinitiveAuthFailure(error);
      }
    },
  };
}

export const catalogApi = createCatalogApi();
