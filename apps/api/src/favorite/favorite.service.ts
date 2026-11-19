import { Injectable } from '@nestjs/common';

import type { PublicProductSummaryDto } from '../catalog/public-catalog.dto.js';
import type { FavoriteListQuery, FavoriteMutationDto, FavoritePageDto } from './favorite.dto.js';
import { FavoriteError } from './favorite.errors.js';
import {
  FavoriteRepository,
  type FavoriteProductSummaryRecord,
} from './favorite.repository.js';

@Injectable()
export class FavoriteService {
  constructor(private readonly repository: FavoriteRepository) {}

  // صفحه repository را بدون افشای رکوردهای غیر Active به قرارداد عمومی محصول تبدیل می‌کند.
  async list(customerId: string, query: FavoriteListQuery): Promise<FavoritePageDto> {
    const result = await this.repository.list(customerId, query);
    return {
      items: result.rows.map(favoriteSummary),
      page: query.page,
      pageSize: query.pageSize,
      totalItems: result.totalItems,
      totalPages: Math.ceil(result.totalItems / query.pageSize),
    };
  }

  // فقط محصول Active را با اتکا به قید یکتا به‌شکل هم‌زمان امن و idempotent اضافه می‌کند.
  async add(customerId: string, productId: string): Promise<FavoriteMutationDto> {
    if (!(await this.repository.productIsActive(productId))) {
      throw new FavoriteError('PRODUCT_NOT_FOUND');
    }
    await this.repository.add(customerId, productId);
    return { productId, isFavorite: true };
  }

  // حذف فقط در محدوده مشتری جاری انجام می‌شود و نبود رکورد نتیجه موفق پایدار دارد.
  async remove(customerId: string, productId: string): Promise<FavoriteMutationDto> {
    await this.repository.remove(customerId, productId);
    return { productId, isFavorite: false };
  }
}

// رکورد داخلی Favorite را با همان قرارداد summary عمومی و کنترل overflow به DTO تبدیل می‌کند.
function favoriteSummary(product: FavoriteProductSummaryRecord): PublicProductSummaryDto {
  const image = product.variants[0]?.image ?? product.images[0];
  if (image === null || image === undefined || product.description === null) {
    throw new Error('Persisted Active Product is incomplete.');
  }
  const originalPrice = safeNumber(product.originalPriceRial);
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    category: product.category,
    image: `/api/v1/catalog/product-images/${image.id}/content`,
    alt: product.name,
    original_price: originalPrice,
    final_price: safeNumber(
      (product.originalPriceRial * BigInt(100 - product.discountPercent)) / 100n,
    ),
    discount: product.discountPercent,
    currency: 'IRR',
    quantity: safeNumber(product.quantity),
    isAvailable: product.isAvailable,
  };
}

// تبدیل bigint فقط در محدوده امن JSON مجاز است تا پاسخ عددی بی‌صدا خراب نشود.
function safeNumber(value: bigint): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 0) {
    throw new Error('Persisted Product numeric value is invalid.');
  }
  return result;
}
