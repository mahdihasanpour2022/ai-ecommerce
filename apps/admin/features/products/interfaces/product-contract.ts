import type { ApiResponse, PaginatedApiResponse } from '../../../app/http/api-response';

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface ProductCategory {
  readonly id: string;
  readonly name: string;
}

export interface ProductImage {
  readonly id: string;
  readonly variantId: string | null;
  readonly mediaType: 'WEBP' | 'JPEG' | 'PNG';
  readonly byteSize: number;
  readonly width: number;
  readonly height: number;
  readonly position: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Product {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly tag: string | null;
  readonly category: ProductCategory;
  readonly status: ProductStatus;
  readonly variantCount: number;
  readonly activeVariantCount: number;
  readonly sizes: readonly string[];
  readonly colors: readonly string[];
  readonly mainImage: ProductImage | null;
  readonly originalPriceRial: number;
  readonly finalPriceRial: number;
  readonly discountPercent: number;
  readonly currency: 'IRR';
  readonly totalOnHandQuantity: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type ProductsResponse = PaginatedApiResponse<readonly Product[]>;

export interface CreateProductVariantVariables {
  readonly size: string;
  readonly color: string;
  readonly isActive: boolean;
  readonly onHandQuantity: number;
}

export interface CreateProductVariables {
  readonly name: string;
  readonly description: string | null;
  readonly tag: string | null;
  readonly originalPriceRial: number;
  readonly discountPercent: number;
  readonly categoryId: string;
  readonly variants: readonly CreateProductVariantVariables[];
}

export interface ProductInventory {
  readonly onHandQuantity: number;
  readonly version: number;
}

export interface ProductVariantColor {
  readonly persianColorName: string;
  readonly englishColorName: string;
}

export interface ProductVariant {
  readonly id: string;
  readonly productId: string;
  readonly sku: string;
  readonly size: string | null;
  readonly color: ProductVariantColor | null;
  readonly isActive: boolean;
  readonly inventory: ProductInventory;
  readonly image: ProductImage | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RawProductVariant extends Omit<ProductVariant, 'color'> {
  readonly color: string | null;
}

export interface ProductDetail {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly tag: string | null;
  readonly originalPriceRial: number;
  readonly finalPriceRial: number;
  readonly discountPercent: number;
  readonly currency: 'IRR';
  readonly category: ProductCategory;
  readonly status: ProductStatus;
  readonly imageVersion: number;
  readonly variants: readonly ProductVariant[];
  readonly images: readonly ProductImage[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RawProductDetail extends Omit<ProductDetail, 'variants'> {
  readonly variants: readonly RawProductVariant[];
}

export type RawProductDetailResponse = ApiResponse<null, RawProductDetail, null>;
export type CreateProductResponse = RawProductDetailResponse;
export type ProductDetailResponse = ApiResponse<null, ProductDetail, null>;

export interface UploadProductImageVariables {
  readonly productId: string;
  readonly variantId?: string;
  readonly imageVersion: number;
  readonly file: File;
}

export interface ProductImageCollection {
  readonly imageVersion: number;
  readonly images: readonly ProductImage[];
}

export type UploadProductImageResponse = ApiResponse<null, ProductImageCollection, null>;

export interface EditProductVariables {
  readonly productId: string;
  readonly name?: string;
  readonly description?: string | null;
  readonly tag?: string | null;
  readonly originalPriceRial?: number;
  readonly discountPercent?: number;
  readonly categoryId?: string;
}

export type EditProductResponse = RawProductDetailResponse;

export interface EditProductVariantVariables {
  readonly variantId: string;
  readonly size?: string;
  readonly color?: string;
  readonly isActive?: boolean;
}

export type EditProductVariantResponse = ApiResponse<null, RawProductVariant, null>;

export interface AddProductVariantVariables {
  readonly productId: string;
  readonly size: string;
  readonly color: string;
  readonly isActive: boolean;
  readonly onHandQuantity: number;
}

export type AddProductVariantResponse = ApiResponse<null, RawProductVariant, null>;

export interface EditProductInventoryVariables {
  readonly variantId: string;
  readonly onHandQuantity: number;
  readonly version: number;
}

export interface ProductInventoryUpdate {
  readonly onHandQuantity: number;
  readonly version: number;
}

export type EditProductInventoryResponse = ApiResponse<null, ProductInventoryUpdate, null>;

export interface SaveProductImageVariables {
  readonly productId: string;
  readonly variantId: string;
  readonly currentImageId: string | null;
  readonly imageVersion: number;
  readonly file: File;
}

export interface EditProductWorkflowVariables {
  readonly product?: EditProductVariables;
  readonly variant?: EditProductVariantVariables;
  readonly inventory?: EditProductInventoryVariables;
}

export interface ChangeProductStatusVariables {
  readonly productId: string;
  readonly status: ProductStatus;
}

export type ChangeProductStatusResponse = RawProductDetailResponse;
export type DeleteProductResponse = ApiResponse<null, null, null>;
export type DeleteProductVariantResponse = ApiResponse<null, null, null>;
