import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiBody,
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
  parseProductColorRequest,
  parseProductSizeName,
  parseProductSizeRequest,
  ProductColorRequestDto,
  ProductSizeRequestDto,
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
  sizes(): Promise<readonly PublicProductSizeOption[]> {
    return this.handle(() => this.options.sizes());
  }

  @Post('sizes')
  @ApiSuccess({
    code: 'PRODUCT_SIZE_CREATED',
    message: 'سایز محصول با موفقیت ایجاد شد.',
    kind: 'single',
  })
  @CatalogPermission('catalog.manage')
  @ApiHeader(CSRF_HEADER)
  @ApiOperation({ summary: 'Create a shared Product size option' })
  @ApiBody({ type: ProductSizeRequestDto })
  @ApiResponse({ status: 201, type: PublicProductSizeOptionDto })
  @ApiResponse({ status: 400, type: ApiErrorDto })
  @ApiResponse({ status: 401, type: ApiErrorDto })
  @ApiResponse({ status: 403, type: ApiErrorDto })
  @ApiResponse({ status: 409, type: ApiErrorDto })
  @ApiResponse({ status: 500, type: ApiErrorDto })
  createSize(@Body() body: unknown): Promise<PublicProductSizeOption> {
    return this.handle(() => this.options.createSize(parseProductSizeRequest(body)));
  }

  @Patch('sizes/:englishSizeName')
  @ApiSuccess({
    code: 'PRODUCT_SIZE_UPDATED',
    message: 'سایز محصول با موفقیت ویرایش شد.',
    kind: 'single',
  })
  @CatalogPermission('catalog.manage')
  @ApiHeader(CSRF_HEADER)
  @ApiOperation({ summary: 'Update a shared Product size option' })
  @ApiParam({ name: 'englishSizeName', example: 'x-large' })
  @ApiBody({ type: ProductSizeRequestDto })
  @ApiResponse({ status: 200, type: PublicProductSizeOptionDto })
  @ApiResponse({ status: 400, type: ApiErrorDto })
  @ApiResponse({ status: 401, type: ApiErrorDto })
  @ApiResponse({ status: 403, type: ApiErrorDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  @ApiResponse({ status: 409, type: ApiErrorDto })
  @ApiResponse({ status: 500, type: ApiErrorDto })
  updateSize(
    @Param('englishSizeName') englishSizeName: string,
    @Body() body: unknown,
  ): Promise<PublicProductSizeOption> {
    return this.handle(() =>
      this.options.updateSize(
        parseProductSizeName(englishSizeName),
        parseProductSizeRequest(body),
      ),
    );
  }

  @Delete('sizes/:englishSizeName')
  @HttpCode(200)
  @ApiSuccess({
    code: 'PRODUCT_SIZE_DELETED',
    message: 'سایز محصول با موفقیت حذف شد.',
    kind: 'none',
  })
  @CatalogPermission('catalog.manage')
  @ApiHeader(CSRF_HEADER)
  @ApiOperation({ summary: 'Delete a Product size option from the shared catalog' })
  @ApiParam({ name: 'englishSizeName', example: 'x-large' })
  @ApiResponse({ status: 200, description: 'Product size deleted successfully.' })
  @ApiResponse({ status: 401, type: ApiErrorDto })
  @ApiResponse({ status: 403, type: ApiErrorDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  @ApiResponse({ status: 500, type: ApiErrorDto })
  async deleteSize(@Param('englishSizeName') englishSizeName: string): Promise<void> {
    await this.handle(() => this.options.deleteSize(parseProductSizeName(englishSizeName)));
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

  @Post('colors')
  @ApiSuccess({
    code: 'PRODUCT_COLOR_CREATED',
    message: 'رنگ محصول با موفقیت ایجاد شد.',
    kind: 'single',
  })
  @CatalogPermission('catalog.manage')
  @ApiHeader(CSRF_HEADER)
  @ApiOperation({ summary: 'Create a shared Product color option' })
  @ApiBody({ type: ProductColorRequestDto })
  @ApiResponse({ status: 201, type: PublicProductColorOptionDto })
  @ApiResponse({ status: 400, type: ApiErrorDto })
  @ApiResponse({ status: 401, type: ApiErrorDto })
  @ApiResponse({ status: 403, type: ApiErrorDto })
  @ApiResponse({ status: 409, type: ApiErrorDto })
  @ApiResponse({ status: 500, type: ApiErrorDto })
  createColor(@Body() body: unknown): Promise<PublicProductColorOption> {
    return this.handle(() => this.options.createColor(parseProductColorRequest(body)));
  }

  @Patch('colors/:englishColorName')
  @ApiSuccess({
    code: 'PRODUCT_COLOR_UPDATED',
    message: 'رنگ محصول با موفقیت ویرایش شد.',
    kind: 'single',
  })
  @CatalogPermission('catalog.manage')
  @ApiHeader(CSRF_HEADER)
  @ApiOperation({ summary: 'Update a shared Product color option' })
  @ApiParam({ name: 'englishColorName', example: 'blue' })
  @ApiBody({ type: ProductColorRequestDto })
  @ApiResponse({ status: 200, type: PublicProductColorOptionDto })
  @ApiResponse({ status: 400, type: ApiErrorDto })
  @ApiResponse({ status: 401, type: ApiErrorDto })
  @ApiResponse({ status: 403, type: ApiErrorDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  @ApiResponse({ status: 409, type: ApiErrorDto })
  @ApiResponse({ status: 500, type: ApiErrorDto })
  updateColor(
    @Param('englishColorName') englishColorName: string,
    @Body() body: unknown,
  ): Promise<PublicProductColorOption> {
    return this.handle(() =>
      this.options.updateColor(
        parseProductColorName(englishColorName),
        parseProductColorRequest(body),
      ),
    );
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
