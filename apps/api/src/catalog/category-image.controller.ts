import { Controller, Get, Param, Res, StreamableFile, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { safeInternalHttpException } from '../authentication/authentication-http.js';
import { ApiErrorDto } from '../authentication/login.dto.js';
import { RawApiResponse } from '../http/api-response.js';
import { CatalogAccessGuard, CatalogPermission } from './catalog-access.guard.js';
import { parseCategoryId } from './category.dto.js';
import { CategoryError, toCategoryHttpException } from './category.errors.js';
import { CategoryService } from './category.service.js';
import { ProductImageError, toProductImageHttpException } from './product-image.errors.js';

interface HeaderResponse {
  setHeader(name: string, value: string | number): unknown;
}

@ApiTags('Admin Catalog Category Images')
@ApiCookieAuth('adminAccess')
@UseGuards(CatalogAccessGuard)
@Controller('admin/catalog/category-images')
export class CategoryImageController {
  constructor(private readonly categories: CategoryService) {}

  @Get(':imageId/content')
  @RawApiResponse()
  @CatalogPermission('catalog.read')
  @ApiOperation({ summary: 'Return Category Image content for authorized Admins' })
  @ApiParam({ name: 'imageId', format: 'uuid' })
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiResponse({ status: 200, description: 'Validated immutable Category Image bytes.' })
  @ApiResponse({ status: 401, type: ApiErrorDto })
  @ApiResponse({ status: 403, type: ApiErrorDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  async content(
    @Param('imageId') imageId: string,
    @Res({ passthrough: true }) response: HeaderResponse,
  ): Promise<StreamableFile> {
    try {
      const result = await this.categories.content(parseCategoryId(imageId));
      response.setHeader('Content-Type', mediaType(result.image.mediaType));
      response.setHeader('Content-Length', result.image.byteSize);
      response.setHeader('Cache-Control', 'private, max-age=300, no-transform');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      return new StreamableFile(result.bytes);
    } catch (error) {
      if (error instanceof CategoryError) throw toCategoryHttpException(error);
      if (error instanceof ProductImageError) throw toProductImageHttpException(error);
      throw safeInternalHttpException();
    }
  }
}

function mediaType(value: 'JPEG' | 'PNG' | 'WEBP'): string {
  if (value === 'JPEG') return 'image/jpeg';
  if (value === 'PNG') return 'image/png';
  return 'image/webp';
}
