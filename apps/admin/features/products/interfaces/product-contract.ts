import type { ApiResponse } from '../../../app/http/api-response';

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface ProductCategory {
  readonly id: string;
  readonly name: string;
}

export interface ProductImage {
  readonly id: string;
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
  readonly category: ProductCategory;
  readonly status: ProductStatus;
  readonly variantCount: number;
  readonly activeVariantCount: number;
  readonly sizes: readonly string[];
  readonly colors: readonly string[];
  readonly mainImage: ProductImage | null;
  readonly minimumPriceRial: number;
  readonly maximumPriceRial: number;
  readonly totalOnHandQuantity: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProductList {
  readonly items: readonly Product[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

export type ProductsResponse = ApiResponse<null, ProductList, null>;

export interface CreateProductVariantVariables {
  readonly size: string | null;
  readonly color: string | null;
  readonly priceRial: number;
  readonly isActive: boolean;
  readonly onHandQuantity: number;
}

export interface CreateProductVariables {
  readonly name: string;
  readonly description: string | null;
  readonly categoryId: string;
  readonly variants: readonly CreateProductVariantVariables[];
}

export interface ProductInventory {
  readonly onHandQuantity: number;
  readonly version: number;
}

export interface ProductVariant {
  readonly id: string;
  readonly productId: string;
  readonly sku: string;
  readonly size: string | null;
  readonly color: string | null;
  readonly priceRial: number;
  readonly isActive: boolean;
  readonly inventory: ProductInventory;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProductDetail {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly category: ProductCategory;
  readonly status: ProductStatus;
  readonly imageVersion: number;
  readonly variants: readonly ProductVariant[];
  readonly images: readonly ProductImage[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type CreateProductResponse = ApiResponse<null, ProductDetail, null>;
export type ProductDetailResponse = ApiResponse<null, ProductDetail, null>;

export interface UploadProductImageVariables {
  readonly productId: string;
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
  readonly categoryId?: string;
}

export type EditProductResponse = ApiResponse<null, ProductDetail, null>;

export interface EditProductVariantVariables {
  readonly variantId: string;
  readonly size?: string | null;
  readonly color?: string | null;
  readonly priceRial?: number;
}

export type EditProductVariantResponse = ApiResponse<null, ProductVariant, null>;

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
  readonly currentImageId: string | null;
  readonly imageVersion: number;
  readonly file: File;
}

export interface EditProductWorkflowVariables {
  readonly product?: EditProductVariables;
  readonly variant?: EditProductVariantVariables;
  readonly inventory?: EditProductInventoryVariables;
  readonly image?: SaveProductImageVariables;
}

export interface ChangeProductStatusVariables {
  readonly productId: string;
  readonly status: ProductStatus;
}

export type ChangeProductStatusResponse = ApiResponse<null, ProductDetail, null>;
export type DeleteProductResponse = ApiResponse<null, null, null>;
