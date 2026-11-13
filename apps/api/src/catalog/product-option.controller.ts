import { Controller, Delete, Get, HttpCode, Param, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { safeInternalHttpException } from '../authentication/authentication-http.js';
import { ApiErrorDto } from '../authentication/login.dto.js';
import { ApiSuccess } from '../http/api-response.js';
import { CatalogAccessGuard, CatalogPermission } from './catalog-access.guard.js';
import {
  PublicProductColorOptionDto,
  parseProductColorName,
  type PublicProductColorOption,
  PublicProductSizeOptionDto,
  type PublicProductSizeOption,
  ProductStatusOptionDto,
} from './product-option.dto.js';
import { ProductOptionError, toProductOptionHttpException } from './product-option.errors.js';
import { ProductOptionService } from './product-option.service.js';

const CSRF_HEADER = {
  name: 'X-CSRF-Token',
  required: true,
  description: 'Current session-bound CSRF credential read from the Strict CSRF cookie.',
  schema: { type: 'string' },
} as const;

@ApiTags('panel / product-options')
@ApiCookieAuth('adminAccess')
@UseGuards(CatalogAccessGuard)
@Controller('admin/catalog/product-options')
export class ProductOptionController {
  constructor(private readonly options: ProductOptionService) {}

  @Get('sizes')
  @ApiSuccess({
    code: 'PRODUCT_SIZE_OPTIONS_FETCHED',
    message: 'گزینه‌های سایز محصول با موفقیت دریافت شدند.',
    kind: 'collection',
  })
  @CatalogPermission('catalog.read')
  @ApiOperation({ summary: 'Return the server-owned Product size options' })
  @ApiResponse({ status: 200, type: PublicProductSizeOptionDto, isArray: true })
  @ApiResponse({ status: 401, type: ApiErrorDto })
  @ApiResponse({ status: 403, type: ApiErrorDto })
  sizes(): readonly PublicProductSizeOption[] {
    return this.options.sizes();
  }

  @Get('colors')
  @ApiSuccess({
    code: 'PRODUCT_COLOR_OPTIONS_FETCHED',
    message: 'گزینه‌های رنگ محصول با موفقیت دریافت شدند.',
    kind: 'collection',
  })
  @CatalogPermission('catalog.read')
  @ApiOperation({ summary: 'Return the server-owned Product color options and hex codes' })
  @ApiResponse({ status: 200, type: PublicProductColorOptionDto, isArray: true })
  @ApiResponse({ status: 401, type: ApiErrorDto })
  @ApiResponse({ status: 403, type: ApiErrorDto })
  colors(): Promise<readonly PublicProductColorOption[]> {
    return this.handle(() => this.options.colors());
  }

  @Delete('colors/:englishColorName')
  @HttpCode(200)
  @ApiSuccess({
    code: 'PRODUCT_COLOR_DELETED',
    message: 'رنگ محصول با موفقیت حذف شد.',
    kind: 'none',
  })
  @CatalogPermission('catalog.manage')
  @ApiHeader(CSRF_HEADER)
  @ApiOperation({ summary: 'Delete a Product color option from the shared catalog' })
  @ApiParam({ name: 'englishColorName', example: 'blue' })
  @ApiResponse({ status: 200, description: 'Product color deleted successfully.' })
  @ApiResponse({ status: 401, type: ApiErrorDto })
  @ApiResponse({ status: 403, type: ApiErrorDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  @ApiResponse({ status: 500, type: ApiErrorDto })
  async deleteColor(@Param('englishColorName') englishColorName: string): Promise<void> {
    await this.handle(() => this.options.deleteColor(parseProductColorName(englishColorName)));
  }

  @Get('statuses')
  @ApiSuccess({
    code: 'PRODUCT_STATUS_OPTIONS_FETCHED',
    message: 'گزینه‌های وضعیت محصول با موفقیت دریافت شدند.',
    kind: 'collection',
  })
  @CatalogPermission('catalog.read')
  @ApiOperation({ summary: 'Return the server-owned Product status names' })
  @ApiResponse({ status: 200, type: ProductStatusOptionDto, isArray: true })
  @ApiResponse({ status: 401, type: ApiErrorDto })
  @ApiResponse({ status: 403, type: ApiErrorDto })
  statuses(): readonly ProductStatusOptionDto[] {
    return this.options.statuses();
  }

  private async handle<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof ProductOptionError) throw toProductOptionHttpException(error);
      throw safeInternalHttpException();
    }
  }
}
