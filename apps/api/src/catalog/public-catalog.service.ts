import { Injectable } from '@nestjs/common';

import { ProductError } from './product.errors.js';
import type {
  PublicCategoryDto,
  PublicProductDetailDto,
  PublicProductImageDto,
  PublicProductListQuery,
  PublicProductListResponseDto,
  PublicProductPriceRangeDto,
  PublicProductSummaryDto,
  PublicProductVariantDto,
} from './public-catalog.dto.js';
import type {
  PublicCategoryRecord,
  PublicProductDetailRecord,
  PublicProductSummaryRecord,
} from './public-catalog.repository.js';
import { PublicCatalogRepository } from './public-catalog.repository.js';
import type {
  PublicProductColorOption,
  PublicProductSizeOption,
} from './product-option.dto.js';
import { ProductOptionService } from './product-option.service.js';

@Injectable()
export class PublicCatalogService {
  constructor(
    private readonly repository: PublicCatalogRepository,
    private readonly options: ProductOptionService,
  ) {}

  colors(): readonly PublicProductColorOption[] {
    return this.options.colors();
  }

  sizes(): readonly PublicProductSizeOption[] {
    return this.options.sizes();
  }

  async priceRange(): Promise<PublicProductPriceRangeDto> {
    const range = await this.repository.priceRange();
    return {
      minimumPriceRial: range.minimumPriceRial === null ? 0 : safeRial(range.minimumPriceRial),
      maximumPriceRial: range.maximumPriceRial === null ? 0 : safeRial(range.maximumPriceRial),
    };
  }

  async categories(): Promise<PublicCategoryDto[]> {
    return publicCategoryTree(await this.repository.categories());
  }

  async products(query: PublicProductListQuery): Promise<PublicProductListResponseDto> {
    if (query.name === '') {
      return {
        items: [],
        page: query.page,
        pageSize: query.pageSize,
        totalItems: 0,
        totalPages: 0,
      };
    }
    const result = await this.repository.products(query);
    if (!result.categoryExists) throw new ProductError('CATEGORY_NOT_FOUND');
    return {
      items: result.rows.map(publicListSummary),
      page: query.page,
      pageSize: query.pageSize,
      totalItems: result.totalItems,
      totalPages: Math.ceil(result.totalItems / query.pageSize),
    };
  }

  async product(id: string): Promise<PublicProductDetailDto> {
    const product = await this.repository.product(id);
    if (product === null) throw new ProductError('PRODUCT_NOT_FOUND');
    const categoryPath = await this.repository.categoryPath(product.categoryId);
    if (categoryPath.length === 0) throw new Error('Persisted Product Category is missing.');
    return {
      ...publicDetailSummary(product),
      description: product.description ?? failPersistedProduct(),
      categoryPath,
      images: product.images.map(publicImage),
      variants: product.variants.map(publicVariant),
    };
  }
}

export function publicCategoryTree(rows: readonly PublicCategoryRecord[]): PublicCategoryDto[] {
  const nodes = new Map<string, PublicCategoryDto>(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        name: row.name,
        src: row.image === null ? null : `/api/v1/catalog/category-images/${row.image.id}/content`,
        children: [],
      },
    ]),
  );
  const roots: PublicCategoryDto[] = [];
  for (const row of rows) {
    const node = nodes.get(row.id);
    if (node === undefined) continue;
    if (row.parentId === null) roots.push(node);
    else {
      const parent = nodes.get(row.parentId);
      if (parent === undefined) throw new Error('Persisted Category parent is missing.');
      parent.children.push(node);
    }
  }
  return roots;
}

function publicListSummary(product: PublicProductSummaryRecord): PublicProductSummaryDto {
  if (product.images[0] === undefined) failPersistedProduct();
  return publicSummaryFields(product, safeQuantity(product.quantity), product.isAvailable);
}

function publicDetailSummary(product: PublicProductDetailRecord): PublicProductSummaryDto {
  if (product.variants.length === 0 || product.images[0] === undefined) failPersistedProduct();
  return publicSummaryFields(
    product,
    safeQuantity(
      product.variants.reduce((total, { inventory }) => {
        if (inventory === null) failPersistedProduct();
        return total + BigInt(inventory.onHandQuantity);
      }, 0n),
    ),
    product.variants.some(({ inventory }) => {
      if (inventory === null) failPersistedProduct();
      return inventory.onHandQuantity > 0;
    }),
  );
}

function publicSummaryFields(
  product: Pick<
    PublicProductSummaryRecord,
    'category' | 'description' | 'discountPercent' | 'id' | 'images' | 'name' | 'originalPriceRial'
  >,
  quantity: number,
  isAvailable: boolean,
): PublicProductSummaryDto {
  const mainImage = product.images[0];
  if (mainImage === undefined || product.description === null) failPersistedProduct();
  const originalPriceRial = safeRial(product.originalPriceRial);
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    category: product.category,
    image: publicImage(mainImage).url,
    alt: product.name,
    original_price: originalPriceRial,
    final_price: finalPriceRial(product.originalPriceRial, product.discountPercent),
    discount: product.discountPercent,
    currency: 'IRR',
    quantity,
    isAvailable,
  };
}

function publicVariant(
  variant: PublicProductDetailRecord['variants'][number],
): PublicProductVariantDto {
  if (variant.inventory === null) failPersistedProduct();
  return {
    id: variant.id,
    size: variant.size,
    color: variant.color,
    isAvailable: variant.inventory.onHandQuantity > 0,
  };
}

function publicImage(image: PublicProductSummaryRecord['images'][number]): PublicProductImageDto {
  return {
    id: image.id,
    url: `/api/v1/catalog/product-images/${image.id}/content`,
    width: image.width,
    height: image.height,
    mediaType: image.mediaType,
  };
}

function safeRial(value: bigint): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result)) failPersistedProduct();
  return result;
}

function safeQuantity(value: bigint): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 0) failPersistedProduct();
  return result;
}

function finalPriceRial(originalPriceRial: bigint, discountPercent: number): number {
  return safeRial((originalPriceRial * BigInt(100 - discountPercent)) / 100n);
}

function failPersistedProduct(): never {
  throw new Error('Persisted Active Product is incomplete.');
}
