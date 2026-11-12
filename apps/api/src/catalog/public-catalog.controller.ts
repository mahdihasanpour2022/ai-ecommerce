import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiExtension, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { safeInternalHttpException } from '../authentication/authentication-http.js';
import { ApiErrorDto } from '../authentication/login.dto.js';
import { ProductError, toProductHttpException } from './product.errors.js';
import { ApiSuccess } from '../http/api-response.js';
import {
  parsePublicProductListQuery,
  PublicCategoryDto,
  publicCatalogUuid,
  PublicProductDetailDto,
  PublicProductListResponseDto,
} from './public-catalog.dto.js';
import { PublicCatalogService } from './public-catalog.service.js';
import {
  PublicProductColorOptionDto,
  type PublicProductColorOption,
  PublicProductSizeOptionDto,
  type PublicProductSizeOption,
} from './product-option.dto.js';

@Controller('catalog')
export class PublicCatalogController {
  constructor(private readonly catalog: PublicCatalogService) {}

  @Get('categories')
  @ApiTags('site / categories')
  @ApiSuccess({
    code: 'CATEGORIES_FETCHED',
    message: 'دسته‌بندی‌ها با موفقیت دریافت شدند.',
    kind: 'collection',
  })
  @ApiOperation({ summary: 'Return the complete bounded public Category tree' })
  @ApiResponse({ status: 200, type: PublicCategoryDto, isArray: true })
  @ApiResponse({ status: 500, type: ApiErrorDto, description: 'Safe internal failure response.' })
  categories(): Promise<PublicCategoryDto[]> {
    return this.handle(() => this.catalog.categories());
  }

  @Get('product-options/colors')
  @ApiTags('site / products')
  @ApiSuccess({
    code: 'PRODUCT_COLOR_OPTIONS_FETCHED',
    message: 'گزینه‌های رنگ محصول با موفقیت دریافت شدند.',
    kind: 'collection',
  })
  @ApiOperation({ summary: 'Return supported public Product color options' })
  @ApiResponse({ status: 200, type: PublicProductColorOptionDto, isArray: true })
  colors(): readonly PublicProductColorOption[] {
    return this.catalog.colors();
  }

  @Get('product-options/sizes')
  @ApiTags('site / products')
  @ApiSuccess({
    code: 'PRODUCT_SIZE_OPTIONS_FETCHED',
    message: 'گزینه‌های سایز محصول با موفقیت دریافت شدند.',
    kind: 'collection',
  })
  @ApiOperation({ summary: 'Return supported public Product size options' })
  @ApiResponse({ status: 200, type: PublicProductSizeOptionDto, isArray: true })
  sizes(): readonly PublicProductSizeOption[] {
    return this.catalog.sizes();
  }

  @Get('products')
  @ApiTags('site / products')
  @ApiExtension('x-api-response-kind', 'page')
  @ApiSuccess({
    code: 'PRODUCTS_FETCHED',
    message: 'محصولات با موفقیت دریافت شدند.',
    kind: 'page',
    countProperty: 'totalItems',
  })
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
  @ApiQuery({
    name: 'name',
    required: false,
    type: String,
    minLength: 0,
    maxLength: 200,
    description: 'Case-insensitive partial Product-name search; a blank value returns an empty page.',
  })
  @ApiQuery({
    name: 'categories',
    required: false,
    type: String,
    format: 'uuid',
    isArray: true,
    description: 'Repeat the query parameter to match Products in any supplied Category.',
  })
  @ApiQuery({
    name: 'tags',
    required: false,
    type: String,
    isArray: true,
    pattern: '^[a-z]+(?:_[a-z]+)*$',
    description: 'Repeat the query parameter to match Products having any supplied tag.',
  })
  @ApiQuery({
    name: 'color',
    required: false,
    type: String,
    minLength: 1,
    maxLength: 80,
    description: 'Match Products having an Active Variant with this normalized color.',
  })
  @ApiQuery({
    name: 'size',
    required: false,
    type: String,
    minLength: 1,
    maxLength: 80,
    description: 'Match Products having an Active Variant with this normalized size.',
  })
  @ApiResponse({ status: 200, type: PublicProductListResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorDto, description: 'VALIDATION_FAILED.' })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'CATEGORY_NOT_FOUND.' })
  @ApiResponse({ status: 500, type: ApiErrorDto, description: 'Safe internal failure response.' })
  products(@Query() query: unknown): Promise<PublicProductListResponseDto> {
    return this.handle(() => this.catalog.products(parsePublicProductListQuery(query)));
  }

  @Get('products/:productId')
  @ApiTags('site / products')
  @ApiSuccess({ code: 'PRODUCT_FETCHED', message: 'محصول با موفقیت دریافت شد.', kind: 'single' })
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
