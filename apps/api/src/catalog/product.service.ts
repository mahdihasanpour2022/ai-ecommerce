import { Injectable } from '@nestjs/common';

import type {
  CreateProductInput,
  ProductDetailDto,
  ProductImageMetadataDto,
  ProductListQuery,
  ProductListResponseDto,
  ProductSummaryDto,
  ProductVariantResponseDto,
  UpdateProductInput,
  VariantInput,
  VariantUpdateInput,
} from './product.dto.js';
import {
  ProductError,
  mapProductPersistenceError,
  type ProductPersistenceOperation,
} from './product.errors.js';
import type {
  ProductDetailRecord,
  ProductSummaryRecord,
  ProductTransaction,
} from './product.repository.js';
import { ProductRepository } from './product.repository.js';

@Injectable()
export class ProductService {
  constructor(private readonly repository: ProductRepository) {}

  async list(query: ProductListQuery): Promise<ProductListResponseDto> {
    const result = await this.repository.list(query);
    if (!result.categoryExists) throw new ProductError('CATEGORY_NOT_FOUND');
    return {
      items: result.rows.map(toProductSummaryDto),
      page: query.page,
      pageSize: query.pageSize,
      totalItems: result.totalItems,
      totalPages: Math.ceil(result.totalItems / query.pageSize),
    };
  }

  async detail(id: string): Promise<ProductDetailDto> {
    const product = await this.repository.detail(id);
    if (product === null) throw new ProductError('PRODUCT_NOT_FOUND');
    return toProductDetailDto(product);
  }

  async create(input: CreateProductInput): Promise<ProductDetailDto> {
    assertVariantSet(input.variants);
    return this.runMutation('create-product', () =>
      this.repository.transaction(async (transaction) => {
        if (!(await this.repository.categoryExists(transaction, input.categoryId))) {
          throw new ProductError('CATEGORY_NOT_FOUND');
        }
        const product = await transaction.product.create({
          data: {
            name: input.name,
            description: input.description,
            categoryId: input.categoryId,
          },
          select: { id: true },
        });
        for (const variant of input.variants) {
          await this.insertVariant(transaction, product.id, variant);
        }
        return toProductDetailDto(await this.requiredAggregate(transaction, product.id));
      }),
    );
  }

  async update(id: string, input: UpdateProductInput): Promise<ProductDetailDto> {
    return this.runMutation('update-product', () =>
      this.repository.transaction(async (transaction) => {
        if (!(await this.repository.lockProduct(transaction, id))) {
          throw new ProductError('PRODUCT_NOT_FOUND');
        }
        const existing = await this.requiredAggregate(transaction, id);
        assertProductMutationAllowed(existing, input);
        if (
          input.categoryId !== undefined &&
          !(await this.repository.categoryExists(transaction, input.categoryId))
        ) {
          throw new ProductError('CATEGORY_NOT_FOUND');
        }
        await transaction.product.update({
          where: { id },
          data: {
            ...(input.name === undefined ? {} : { name: input.name }),
            ...(input.description === undefined ? {} : { description: input.description }),
            ...(input.categoryId === undefined ? {} : { categoryId: input.categoryId }),
            ...(input.status === undefined ? {} : { status: input.status }),
          },
        });
        const updated = await this.requiredAggregate(transaction, id);
        if (updated.status === 'ACTIVE') assertActiveProductComplete(updated);
        return toProductDetailDto(updated);
      }),
    );
  }

  async createVariant(productId: string, input: VariantInput): Promise<ProductVariantResponseDto> {
    return this.runMutation('create-variant', () =>
      this.repository.transaction(async (transaction) => {
        if (!(await this.repository.lockProduct(transaction, productId))) {
          throw new ProductError('PRODUCT_NOT_FOUND');
        }
        const existing = await this.requiredAggregate(transaction, productId);
        if (existing.status === 'ARCHIVED') {
          throw new ProductError('PRODUCT_LIFECYCLE_CONFLICT');
        }
        await this.insertVariant(transaction, productId, input);
        const updated = await this.requiredAggregate(transaction, productId);
        assertVariantMode(updated);
        if (updated.status === 'ACTIVE') assertActiveProductComplete(updated);
        return requiredVariant(updated, undefined, input.sku);
      }),
    );
  }

  async updateVariant(
    variantId: string,
    input: VariantUpdateInput,
  ): Promise<ProductVariantResponseDto> {
    return this.runMutation('update-variant', () =>
      this.repository.transaction(async (transaction) => {
        const candidate = await transaction.productVariant.findUnique({
          where: { id: variantId },
          select: { productId: true },
        });
        if (candidate === null) throw new ProductError('PRODUCT_VARIANT_NOT_FOUND');
        if (!(await this.repository.lockProduct(transaction, candidate.productId))) {
          throw new ProductError('PRODUCT_NOT_FOUND');
        }
        const existing = await this.requiredAggregate(transaction, candidate.productId);
        if (existing.status === 'ARCHIVED') {
          throw new ProductError('PRODUCT_LIFECYCLE_CONFLICT');
        }
        if (!existing.variants.some((variant) => variant.id === variantId)) {
          throw new ProductError('PRODUCT_VARIANT_NOT_FOUND');
        }
        await transaction.productVariant.update({
          where: { id: variantId },
          data: {
            ...(input.sku === undefined ? {} : { sku: input.sku }),
            ...(input.size === undefined ? {} : { size: input.size, sizeKey: input.sizeKey }),
            ...(input.color === undefined ? {} : { color: input.color, colorKey: input.colorKey }),
            ...(input.priceRial === undefined ? {} : { priceRial: input.priceRial }),
            ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
          },
        });
        const updated = await this.requiredAggregate(transaction, candidate.productId);
        assertVariantMode(updated);
        if (updated.status === 'ACTIVE') {
          if (!updated.variants.some((variant) => variant.isActive)) {
            throw new ProductError('VARIANT_MODE_CONFLICT');
          }
          assertActiveProductComplete(updated);
        }
        return requiredVariant(updated, variantId);
      }),
    );
  }

  private async insertVariant(
    transaction: ProductTransaction,
    productId: string,
    input: VariantInput,
  ): Promise<void> {
    const variant = await transaction.productVariant.create({
      data: {
        productId,
        sku: input.sku,
        size: input.size,
        sizeKey: input.sizeKey,
        color: input.color,
        colorKey: input.colorKey,
        priceRial: input.priceRial,
        isActive: input.isActive,
      },
      select: { id: true },
    });
    await transaction.inventory.create({
      data: { variantId: variant.id, onHandQuantity: input.onHandQuantity },
    });
  }

  private async requiredAggregate(
    transaction: ProductTransaction,
    productId: string,
  ): Promise<ProductDetailRecord> {
    const product = await this.repository.aggregate(transaction, productId);
    if (product === null) throw new ProductError('PRODUCT_NOT_FOUND');
    return product;
  }

  private async runMutation<T>(
    operation: ProductPersistenceOperation,
    work: () => Promise<T>,
  ): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof ProductError) throw error;
      const mapped = mapProductPersistenceError(error, operation);
      if (mapped !== undefined) throw mapped;
      throw error;
    }
  }
}

function assertProductMutationAllowed(
  product: ProductDetailRecord,
  input: UpdateProductInput,
): void {
  if (product.status !== 'ARCHIVED') return;
  if (
    input.status !== 'DRAFT' ||
    input.name !== undefined ||
    input.description !== undefined ||
    input.categoryId !== undefined
  ) {
    throw new ProductError('PRODUCT_LIFECYCLE_CONFLICT');
  }
}

function assertVariantSet(variants: readonly VariantInput[]): void {
  const skus = new Set<string>();
  const combinations = new Set<string>();
  for (const variant of variants) {
    if (skus.has(variant.sku)) throw new ProductError('SKU_CONFLICT');
    skus.add(variant.sku);
    const combination = JSON.stringify([variant.sizeKey, variant.colorKey]);
    if (combinations.has(combination)) {
      throw new ProductError('VARIANT_COMBINATION_CONFLICT');
    }
    combinations.add(combination);
  }
  const active = variants.filter((variant) => variant.isActive);
  assertActiveVariantMode(active);
}

function assertVariantMode(product: ProductDetailRecord): void {
  assertActiveVariantMode(product.variants.filter((variant) => variant.isActive));
}

function assertActiveVariantMode(
  variants: ReadonlyArray<{ readonly size: string | null; readonly color: string | null }>,
): void {
  const defaults = variants.filter((variant) => variant.size === null && variant.color === null);
  if (defaults.length > 1 || (defaults.length > 0 && defaults.length !== variants.length)) {
    throw new ProductError('VARIANT_MODE_CONFLICT');
  }
}

function assertActiveProductComplete(product: ProductDetailRecord): void {
  const active = product.variants.filter((variant) => variant.isActive);
  if (
    product.description === null ||
    active.length === 0 ||
    active.some((variant) => variant.inventory === null) ||
    !product.images.some((image) => image.position === 0)
  ) {
    throw new ProductError('PRODUCT_ACTIVATION_INCOMPLETE');
  }
  assertActiveVariantMode(active);
}

function safeRial(value: bigint): number {
  const numberValue = Number(value);
  if (!Number.isSafeInteger(numberValue)) throw new Error('Persisted rial value is not JSON-safe.');
  return numberValue;
}

function safeTotal(values: readonly number[]): number {
  const total = values.reduce((sum, value) => sum + BigInt(value), 0n);
  const numberValue = Number(total);
  if (!Number.isSafeInteger(numberValue)) {
    throw new Error('Persisted Inventory aggregate is not JSON-safe.');
  }
  return numberValue;
}

function toImageDto(image: ProductDetailRecord['images'][number]): ProductImageMetadataDto {
  return {
    id: image.id,
    mediaType: image.mediaType,
    byteSize: image.byteSize,
    width: image.width,
    height: image.height,
    position: image.position,
    createdAt: image.createdAt.toISOString(),
    updatedAt: image.updatedAt.toISOString(),
  };
}

function toVariantDto(variant: ProductDetailRecord['variants'][number]): ProductVariantResponseDto {
  if (variant.inventory === null) throw new Error('Persisted Variant Inventory is missing.');
  return {
    id: variant.id,
    productId: variant.productId,
    sku: variant.sku,
    size: variant.size,
    color: variant.color,
    priceRial: safeRial(variant.priceRial),
    isActive: variant.isActive,
    inventory: variant.inventory,
    createdAt: variant.createdAt.toISOString(),
    updatedAt: variant.updatedAt.toISOString(),
  };
}

function requiredVariant(
  product: ProductDetailRecord,
  id?: string,
  sku?: string,
): ProductVariantResponseDto {
  const variant = product.variants.find(
    (candidate) =>
      (id !== undefined && candidate.id === id) || (sku !== undefined && candidate.sku === sku),
  );
  if (variant === undefined) throw new Error('Persisted Variant is unavailable after mutation.');
  return toVariantDto(variant);
}

function toProductDetailDto(product: ProductDetailRecord): ProductDetailDto {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    category: product.category,
    status: product.status,
    imageVersion: product.imageVersion,
    variants: product.variants.map(toVariantDto),
    images: product.images.map(toImageDto),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

function toProductSummaryDto(product: ProductSummaryRecord): ProductSummaryDto {
  const prices = product.variants.map((variant) => variant.priceRial);
  if (prices.length === 0) throw new Error('Persisted Product has no Variants.');
  const minimumPriceRial = prices.reduce((minimum, price) => (price < minimum ? price : minimum));
  const maximumPriceRial = prices.reduce((maximum, price) => (price > maximum ? price : maximum));
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    status: product.status,
    variantCount: product.variants.length,
    activeVariantCount: product.variants.filter((variant) => variant.isActive).length,
    mainImage: product.images[0] === undefined ? null : toImageDto(product.images[0]),
    minimumPriceRial: safeRial(minimumPriceRial),
    maximumPriceRial: safeRial(maximumPriceRial),
    totalOnHandQuantity: safeTotal(
      product.variants.map((variant) => {
        if (variant.inventory === null) throw new Error('Persisted Variant Inventory is missing.');
        return variant.inventory.onHandQuantity;
      }),
    ),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
