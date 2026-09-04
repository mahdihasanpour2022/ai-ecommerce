import { Body, Controller, Param, Put, UseGuards } from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { safeInternalHttpException } from '../authentication/authentication-http.js';
import { ApiErrorDto } from '../authentication/login.dto.js';
import { CatalogAccessGuard, CatalogPermission } from './catalog-access.guard.js';
import {
  parseUpdateInventoryRequest,
  UpdateInventoryRequestDto,
  UpdateInventoryResponseDto,
} from './inventory.dto.js';
import { InventoryError, toInventoryHttpException } from './inventory.errors.js';
import { InventoryService } from './inventory.service.js';
import { parseCatalogUuid } from './product.dto.js';
import { ProductError } from './product.errors.js';

@ApiTags('Admin Catalog Inventory')
@ApiCookieAuth('adminAccess')
@UseGuards(CatalogAccessGuard)
@Controller('admin/catalog')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Put('variants/:variantId/inventory')
  @CatalogPermission('inventory.update')
  @ApiHeader({
    name: 'X-CSRF-Token',
    required: true,
    description: 'Current session-bound CSRF credential held only in browser memory.',
    schema: { type: 'string' },
  })
  @ApiOperation({
    summary: 'Set absolute Variant on-hand quantity using the last-read Inventory version',
    description:
      'Requires inventory.update. A stale version returns INVENTORY_VERSION_CONFLICT without current stock values.',
  })
  @ApiParam({ name: 'variantId', format: 'uuid' })
  @ApiBody({ type: UpdateInventoryRequestDto })
  @ApiResponse({ status: 200, type: UpdateInventoryResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorDto, description: 'VALIDATION_FAILED.' })
  @ApiResponse({ status: 401, type: ApiErrorDto, description: 'Current authentication failure.' })
  @ApiResponse({
    status: 403,
    type: ApiErrorDto,
    description: 'INSUFFICIENT_PERMISSION or CSRF_VALIDATION_FAILED.',
  })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'PRODUCT_VARIANT_NOT_FOUND.' })
  @ApiResponse({
    status: 409,
    type: ApiErrorDto,
    description: 'PRODUCT_LIFECYCLE_CONFLICT or INVENTORY_VERSION_CONFLICT.',
  })
  @ApiResponse({ status: 500, type: ApiErrorDto, description: 'Safe internal failure response.' })
  async update(
    @Param('variantId') variantId: string,
    @Body() body: unknown,
  ): Promise<UpdateInventoryResponseDto> {
    try {
      return await this.inventory.update(
        parseCatalogUuid(variantId, 'variantId'),
        parseUpdateInventoryRequest(body),
      );
    } catch (error) {
      if (error instanceof InventoryError) throw toInventoryHttpException(error);
      if (error instanceof ProductError && error.code === 'VALIDATION_FAILED') {
        throw toInventoryHttpException(new InventoryError('VALIDATION_FAILED'));
      }
      throw safeInternalHttpException();
    }
  }
}
