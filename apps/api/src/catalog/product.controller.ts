import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { safeInternalHttpException } from '../authentication/authentication-http.js';
import { ApiErrorDto } from '../authentication/login.dto.js';
import { ProductStatus } from '../generated/prisma/enums.js';
import { CatalogAccessGuard, CatalogPermission } from './catalog-access.guard.js';
import {
  CreateProductRequestDto,
  CreateVariantRequestDto,
  parseCatalogUuid,
  parseCreateProductRequest,
  parseCreateVariantRequest,
  parseProductListQuery,
  parseUpdateProductRequest,
  parseUpdateVariantRequest,
  ProductDetailDto,
  ProductListResponseDto,
  ProductVariantResponseDto,
  UpdateProductRequestDto,
  UpdateVariantRequestDto,
} from './product.dto.js';
import { ProductError, toProductHttpException } from './product.errors.js';
import { ProductService } from './product.service.js';

const CSRF_HEADER = {
  name: 'X-CSRF-Token',
  required: true,
  description: 'Current session-bound CSRF credential read from the Strict CSRF cookie.',
  schema: { type: 'string' },
} as const;

@ApiTags('Admin Catalog Products')
@ApiCookieAuth('adminAccess')
@UseGuards(CatalogAccessGuard)
@Controller('admin/catalog')
export class ProductController {
  constructor(private readonly products: ProductService) {}

  @Get('products')
  @CatalogPermission('catalog.read')
  @ApiOperation({ summary: 'Return deterministic page-bounded protected Product summaries' })
  @ApiQuery({ name: 'page', required: false, type: Number, minimum: 1, example: 1 })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    type: Number,
    minimum: 1,
    maximum: 100,
    example: 25,
  })
  @ApiQuery({ name: 'categoryId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'status', required: false, enum: ProductStatus })
  @ApiResponse({ status: 200, type: ProductListResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorDto })
  @ApiResponse({ status: 401, type: ApiErrorDto })
  @ApiResponse({ status: 403, type: ApiErrorDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  @ApiResponse({ status: 500, type: ApiErrorDto })
  async list(@Query() query: unknown): Promise<ProductListResponseDto> {
    return this.handle(() => this.products.list(parseProductListQuery(query)));
  }

  @Get('products/:productId')
  @CatalogPermission('catalog.read')
  @ApiOperation({ summary: 'Return protected Product detail with Variants and exact Inventory' })
  @ApiParam({ name: 'productId', format: 'uuid' })
  @ApiResponse({ status: 200, type: ProductDetailDto })
  @ApiResponse({ status: 400, type: ApiErrorDto })
  @ApiResponse({ status: 401, type: ApiErrorDto })
  @ApiResponse({ status: 403, type: ApiErrorDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  @ApiResponse({ status: 500, type: ApiErrorDto })
  async detail(@Param('productId') productId: string): Promise<ProductDetailDto> {
    return this.handle(() => this.products.detail(parseCatalogUuid(productId, 'productId')));
  }

  @Post('products')
  @CatalogPermission('catalog.manage')
  @ApiHeader(CSRF_HEADER)
  @ApiOperation({ summary: 'Atomically create a Draft Product, initial Variants, and Inventory' })
  @ApiBody({ type: CreateProductRequestDto })
  @ApiResponse({ status: 201, type: ProductDetailDto })
  @ApiResponse({ status: 400, type: ApiErrorDto })
  @ApiResponse({ status: 401, type: ApiErrorDto })
  @ApiResponse({ status: 403, type: ApiErrorDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  @ApiResponse({ status: 409, type: ApiErrorDto })
  @ApiResponse({ status: 500, type: ApiErrorDto })
  async create(@Body() body: unknown): Promise<ProductDetailDto> {
    return this.handle(() => this.products.create(parseCreateProductRequest(body)));
  }

  @Patch('products/:productId')
  @CatalogPermission('catalog.manage')
  @ApiHeader(CSRF_HEADER)
  @ApiOperation({ summary: 'Update Product fields or perform an accepted lifecycle transition' })
  @ApiParam({ name: 'productId', format: 'uuid' })
  @ApiBody({ type: UpdateProductRequestDto })
  @ApiResponse({ status: 200, type: ProductDetailDto })
  @ApiResponse({ status: 400, type: ApiErrorDto })
  @ApiResponse({ status: 401, type: ApiErrorDto })
  @ApiResponse({ status: 403, type: ApiErrorDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  @ApiResponse({ status: 409, type: ApiErrorDto })
  @ApiResponse({ status: 500, type: ApiErrorDto })
  async update(
    @Param('productId') productId: string,
    @Body() body: unknown,
  ): Promise<ProductDetailDto> {
    return this.handle(() =>
      this.products.update(
        parseCatalogUuid(productId, 'productId'),
        parseUpdateProductRequest(body),
      ),
    );
  }

  @Post('products/:productId/variants')
  @CatalogPermission('catalog.manage')
  @ApiHeader(CSRF_HEADER)
  @ApiOperation({ summary: 'Create a retained Product Variant and its Inventory atomically' })
  @ApiParam({ name: 'productId', format: 'uuid' })
  @ApiBody({ type: CreateVariantRequestDto })
  @ApiResponse({ status: 201, type: ProductVariantResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorDto })
  @ApiResponse({ status: 401, type: ApiErrorDto })
  @ApiResponse({ status: 403, type: ApiErrorDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  @ApiResponse({ status: 409, type: ApiErrorDto })
  @ApiResponse({ status: 500, type: ApiErrorDto })
  async createVariant(
    @Param('productId') productId: string,
    @Body() body: unknown,
  ): Promise<ProductVariantResponseDto> {
    return this.handle(() =>
      this.products.createVariant(
        parseCatalogUuid(productId, 'productId'),
        parseCreateVariantRequest(body),
      ),
    );
  }

  @Patch('variants/:variantId')
  @CatalogPermission('catalog.manage')
  @ApiHeader(CSRF_HEADER)
  @ApiOperation({ summary: 'Update or reactivate a retained Product Variant' })
  @ApiParam({ name: 'variantId', format: 'uuid' })
  @ApiBody({ type: UpdateVariantRequestDto })
  @ApiResponse({ status: 200, type: ProductVariantResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorDto })
  @ApiResponse({ status: 401, type: ApiErrorDto })
  @ApiResponse({ status: 403, type: ApiErrorDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  @ApiResponse({ status: 409, type: ApiErrorDto })
  @ApiResponse({ status: 500, type: ApiErrorDto })
  async updateVariant(
    @Param('variantId') variantId: string,
    @Body() body: unknown,
  ): Promise<ProductVariantResponseDto> {
    return this.handle(() =>
      this.products.updateVariant(
        parseCatalogUuid(variantId, 'variantId'),
        parseUpdateVariantRequest(body),
      ),
    );
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
