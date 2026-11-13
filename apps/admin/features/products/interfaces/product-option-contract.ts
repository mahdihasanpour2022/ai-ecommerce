import type { ApiResponse } from '../../../app/http/api-response';

export interface ProductSizeOption {
  readonly 'persian-size-name': string;
  readonly 'english-size-name': string;
}

export interface ProductColorOption {
  readonly 'persian-color-name': string;
  readonly 'english-color-name': string;
  readonly 'hex-code': string;
}

export interface ProductStatusOption {
  readonly status_persian_name: string;
  readonly status_english_name: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
}

export type ProductSizesResponse = ApiResponse<readonly ProductSizeOption[], null, null>;
export type ProductColorsResponse = ApiResponse<readonly ProductColorOption[], null, null>;
export type DeleteProductColorResponse = ApiResponse<null, null, null>;
export type ProductStatusesResponse = ApiResponse<readonly ProductStatusOption[], null, null>;
