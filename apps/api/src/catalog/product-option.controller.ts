import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ApiErrorDto } from '../authentication/login.dto.js';
import { ApiSuccess } from '../http/api-response.js';
import { CatalogAccessGuard, CatalogPermission } from './catalog-access.guard.js';
import {
  PublicProductColorOptionDto,
  type PublicProductColorOption,
  PublicProductSizeOptionDto,
  type PublicProductSizeOption,
  ProductStatusOptionDto,
} from './product-option.dto.js';
import { ProductOptionService } from './product-option.service.js';

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
  colors(): readonly PublicProductColorOption[] {
    return this.options.colors();
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
}
