import type { ApiResponse } from '../../../app/http/api-response';

export interface Banner {
  readonly id: string;
  readonly src: string;
  readonly alt: string | null;
  readonly mediaType: 'JPEG' | 'PNG' | 'WEBP';
  readonly byteSize: number;
  readonly width: number;
  readonly height: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type BannersResponse = ApiResponse<readonly Banner[], null, null>;
export type BannerResponse = ApiResponse<null, Banner, null>;
export type DeleteBannerResponse = ApiResponse<null, null, null>;

export interface CreateBannerVariables {
  readonly image: File;
  readonly alt: string;
}

export interface UpdateBannerVariables {
  readonly bannerId: string;
  readonly image?: File;
  readonly alt: string;
}
