import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { safeInternalHttpException } from '../authentication/authentication-http.js';
import { ApiErrorDto } from '../authentication/login.dto.js';
import { ProductError, toProductHttpException } from './product.errors.js';
import {
  parsePublicProductListQuery,
  PublicCategoryDto,
  publicCatalogUuid,
  PublicProductDetailDto,
  PublicProductListResponseDto,
} from './public-catalog.dto.js';
import { PublicCatalogService } from './public-catalog.service.js';

@ApiTags('Public Catalog')
@Controller('catalog')
export class PublicCatalogController {
  constructor(private readonly catalog: PublicCatalogService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Return the complete bounded public Category tree' })
  @ApiResponse({ status: 200, type: PublicCategoryDto, isArray: true })
  @ApiResponse({ status: 500, type: ApiErrorDto, description: 'Safe internal failure response.' })
  categories(): Promise<PublicCategoryDto[]> {
    return this.handle(() => this.catalog.categories());
  }

  @Get('products')
  @ApiOperation({ summary: 'Return deterministic page-bounded Active Product summaries' })
  @ApiQuery({ name: 'page', required: false, type: Number, minimum: 1, example: 1 })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    type: Number,
    minimum: 1,
    maximum: 60,
    example: 24,
  })
  @ApiQuery({ name: 'categoryId', required: false, type: String, format: 'uuid' })
  @ApiResponse({ status: 200, type: PublicProductListResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorDto, description: 'VALIDATION_FAILED.' })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'CATEGORY_NOT_FOUND.' })
  @ApiResponse({ status: 500, type: ApiErrorDto, description: 'Safe internal failure response.' })
  products(@Query() query: unknown): Promise<PublicProductListResponseDto> {
    return this.handle(() => this.catalog.products(parsePublicProductListQuery(query)));
  }

  @Get('products/:productId')
  @ApiOperation({ summary: 'Return public detail for one Active Product' })
  @ApiParam({ name: 'productId', format: 'uuid' })
  @ApiResponse({ status: 200, type: PublicProductDetailDto })
  @ApiResponse({ status: 400, type: ApiErrorDto, description: 'VALIDATION_FAILED.' })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'PRODUCT_NOT_FOUND.' })
  @ApiResponse({ status: 500, type: ApiErrorDto, description: 'Safe internal failure response.' })
  product(@Param('productId') productId: string): Promise<PublicProductDetailDto> {
    return this.handle(() => this.catalog.product(publicCatalogUuid(productId, 'productId')));
  }

  private async handle<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof ProductError) throw toProductHttpException(error);
      throw safeInternalHttpException();
    }
  }
}
