import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ApiErrorDto } from '../authentication/login.dto.js';
import { ApiSuccess } from '../http/api-response.js';
import { CatalogAccessGuard, CatalogPermission } from './catalog-access.guard.js';
import {
  PRODUCT_SIZE_OPTIONS,
  ProductColorOptionDto,
  ProductStatusOptionDto,
  type ProductSizeOption,
} from './product-option.dto.js';
import { ProductOptionService } from './product-option.service.js';

@ApiTags('Admin Catalog Product Options')
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
  @ApiResponse({
    status: 200,
    schema: { type: 'array', items: { type: 'string', enum: [...PRODUCT_SIZE_OPTIONS] } },
  })
  @ApiResponse({ status: 401, type: ApiErrorDto })
  @ApiResponse({ status: 403, type: ApiErrorDto })
  sizes(): readonly ProductSizeOption[] {
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
  @ApiResponse({ status: 200, type: ProductColorOptionDto, isArray: true })
  @ApiResponse({ status: 401, type: ApiErrorDto })
  @ApiResponse({ status: 403, type: ApiErrorDto })
  colors(): readonly ProductColorOptionDto[] {
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
