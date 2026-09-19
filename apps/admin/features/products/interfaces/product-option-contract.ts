import type { ApiResponse } from '../../../app/http/api-response';

export type ProductSizeOption = 'small' | 'medium' | 'large' | 'x-large' | '2x-large' | '3x-large';

export interface ProductColorOption {
  readonly 'color-name': 'blue' | 'red' | 'green' | 'white' | 'black';
  readonly 'hex-code': string;
}

export interface ProductStatusOption {
  readonly status_persian_name: string;
  readonly status_english_name: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
}

export type ProductSizesResponse = ApiResponse<readonly ProductSizeOption[], null, null>;
export type ProductColorsResponse = ApiResponse<readonly ProductColorOption[], null, null>;
export type ProductStatusesResponse = ApiResponse<readonly ProductStatusOption[], null, null>;
