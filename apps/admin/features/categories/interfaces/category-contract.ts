import type { ApiResponse } from '../../../app/http/api-response';

export interface Category {
  readonly id: string;
  readonly name: string;
  readonly parentId: string | null;
  readonly level: number;
  readonly image: {
    readonly id: string;
    readonly mediaType: 'JPEG' | 'PNG' | 'WEBP';
    readonly byteSize: number;
    readonly width: number;
    readonly height: number;
  } | null;
  readonly children: readonly Category[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type CategoriesResponse = ApiResponse<readonly Category[], null, null>;

export interface CreateCategoryVariables {
  readonly image: File;
  readonly name: string;
  readonly parentId: string | null;
}

export type CreateCategoryResponse = ApiResponse<null, Category, null>;

export interface EditCategoryVariables {
  readonly categoryId: string;
  readonly name: string;
  readonly parentId: string | null;
  readonly image?: File;
}

export type EditCategoryResponse = ApiResponse<null, Category, null>;
export type DeleteCategoryResponse = ApiResponse<null, null, null>;
