import { Controller, Delete, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiExtension,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { safeInternalHttpException } from '../authentication/authentication-http.js';
import { ApiErrorDto } from '../authentication/login.dto.js';
import { CustomerAccessGuard } from '../customer-authentication/customer-access.guard.js';
import { CurrentCustomerContext } from '../customer-authentication/customer-authentication-context.js';
import type { CurrentCustomerAuthentication } from '../customer-authentication/customer-session.service.js';
import { ApiSuccess } from '../http/api-response.js';
import {
  FavoriteMutationDto,
  FavoritePageDto,
  favoriteProductId,
  parseFavoriteListQuery,
} from './favorite.dto.js';
import { FavoriteError, toFavoriteHttpException } from './favorite.errors.js';
import { FavoriteService } from './favorite.service.js';

@ApiTags('site / favorite')
@ApiCookieAuth('customerAccess')
@UseGuards(CustomerAccessGuard)
@Controller('favorite')
export class FavoriteController {
  constructor(private readonly favorite: FavoriteService) {}

  @Get()
  @ApiExtension('x-api-response-kind', 'page')
  @ApiSuccess({
    code: 'FAVORITES_FETCHED',
    message: 'لیست علاقه‌مندی‌های شما با موفقیت دریافت شد.',
    kind: 'page',
    countProperty: 'totalItems',
  })
  @ApiOperation({ summary: 'Return a deterministic page of the current customer Active favorites' })
  @ApiQuery({ name: 'page', required: false, type: Number, minimum: 1, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, minimum: 1, maximum: 60, example: 24 })
  @ApiResponse({ status: 200, type: FavoritePageDto })
  @ApiResponse({ status: 400, type: ApiErrorDto, description: 'VALIDATION_FAILED.' })
  @ApiResponse({ status: 401, type: ApiErrorDto, description: 'Customer authentication failure.' })
  @ApiResponse({ status: 500, type: ApiErrorDto, description: 'Safe internal failure.' })
  list(
    @CurrentCustomerContext() authentication: CurrentCustomerAuthentication,
    @Query() query: unknown,
  ): Promise<FavoritePageDto> {
    return this.handle(() =>
      this.favorite.list(authentication.customer.id, parseFavoriteListQuery(query)),
    );
  }

  @Post(':productId')
  @HttpCode(200)
  @ApiSuccess({
    code: 'FAVORITE_PRODUCT_ADDED',
    message: 'محصول با موفقیت به لیست علاقه‌مندی‌های شما اضافه شد.',
    kind: 'single',
  })
  @ApiOperation({ summary: 'Idempotently add one Active Product to the current customer favorites' })
  @ApiParam({ name: 'productId', format: 'uuid' })
  @ApiHeader({ name: 'X-CSRF-Token', required: true, description: 'Current customer session CSRF credential.' })
  @ApiResponse({ status: 200, type: FavoriteMutationDto })
  @ApiResponse({ status: 400, type: ApiErrorDto, description: 'VALIDATION_FAILED.' })
  @ApiResponse({ status: 401, type: ApiErrorDto, description: 'Customer authentication failure.' })
  @ApiResponse({ status: 403, type: ApiErrorDto, description: 'CSRF_VALIDATION_FAILED.' })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'PRODUCT_NOT_FOUND.' })
  @ApiResponse({ status: 500, type: ApiErrorDto, description: 'Safe internal failure.' })
  add(
    @CurrentCustomerContext() authentication: CurrentCustomerAuthentication,
    @Param('productId') productId: string,
  ): Promise<FavoriteMutationDto> {
    return this.handle(() =>
      this.favorite.add(authentication.customer.id, favoriteProductId(productId)),
    );
  }

  @Delete(':productId')
  @HttpCode(200)
  @ApiSuccess({
    code: 'FAVORITE_PRODUCT_REMOVED',
    message: 'محصول با موفقیت از لیست علاقه‌مندی‌های شما حذف شد.',
    kind: 'single',
  })
  @ApiOperation({ summary: 'Idempotently remove one Product from the current customer favorites' })
  @ApiParam({ name: 'productId', format: 'uuid' })
  @ApiHeader({ name: 'X-CSRF-Token', required: true, description: 'Current customer session CSRF credential.' })
  @ApiResponse({ status: 200, type: FavoriteMutationDto })
  @ApiResponse({ status: 400, type: ApiErrorDto, description: 'VALIDATION_FAILED.' })
  @ApiResponse({ status: 401, type: ApiErrorDto, description: 'Customer authentication failure.' })
  @ApiResponse({ status: 403, type: ApiErrorDto, description: 'CSRF_VALIDATION_FAILED.' })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'Product identifier is not visible.' })
  @ApiResponse({ status: 500, type: ApiErrorDto, description: 'Safe internal failure.' })
  remove(
    @CurrentCustomerContext() authentication: CurrentCustomerAuthentication,
    @Param('productId') productId: string,
  ): Promise<FavoriteMutationDto> {
    return this.handle(() =>
      this.favorite.remove(authentication.customer.id, favoriteProductId(productId)),
    );
  }

  // خطاهای دامنه را پایدار نگه می‌دارد و خطاهای ناشناخته را به پاسخ امن تبدیل می‌کند.
  private async handle<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof FavoriteError) throw toFavoriteHttpException(error);
      throw safeInternalHttpException();
    }
  }
}
