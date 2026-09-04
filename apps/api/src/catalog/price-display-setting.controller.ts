import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { safeInternalHttpException } from '../authentication/authentication-http.js';
import { ApiErrorDto } from '../authentication/login.dto.js';
import { CatalogAccessGuard, CatalogPermission } from './catalog-access.guard.js';
import {
  parseUpdatePriceDisplaySettingRequest,
  PriceDisplaySettingResponseDto,
  UpdatePriceDisplaySettingRequestDto,
} from './price-display-setting.dto.js';
import {
  PriceDisplaySettingError,
  toPriceDisplaySettingHttpException,
} from './price-display-setting.errors.js';
import { PriceDisplaySettingService } from './price-display-setting.service.js';

@ApiTags('Admin Catalog Settings')
@ApiCookieAuth('adminAccess')
@UseGuards(CatalogAccessGuard)
@Controller('admin/catalog/settings/price-display-unit')
export class AdminPriceDisplaySettingController {
  constructor(private readonly settings: PriceDisplaySettingService) {}

  @Get()
  @CatalogPermission('catalog.read')
  @ApiOperation({ summary: 'Return the global catalog price display/input unit' })
  @ApiResponse({ status: 200, type: PriceDisplaySettingResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorDto, description: 'Current authentication failure.' })
  @ApiResponse({ status: 403, type: ApiErrorDto, description: 'INSUFFICIENT_PERMISSION.' })
  @ApiResponse({ status: 500, type: ApiErrorDto, description: 'Safe internal failure response.' })
  read(): Promise<PriceDisplaySettingResponseDto> {
    return this.handle(() => this.settings.read());
  }

  @Put()
  @CatalogPermission('settings.price.display.unit.update')
  @ApiHeader({
    name: 'X-CSRF-Token',
    required: true,
    description: 'Current session-bound CSRF credential held only in browser memory.',
    schema: { type: 'string' },
  })
  @ApiOperation({
    summary: 'Replace the global catalog price display/input unit',
    description:
      'Requires settings.price.display.unit.update. This preference never changes canonical priceRial values.',
  })
  @ApiBody({ type: UpdatePriceDisplaySettingRequestDto })
  @ApiResponse({ status: 200, type: PriceDisplaySettingResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorDto, description: 'VALIDATION_FAILED.' })
  @ApiResponse({ status: 401, type: ApiErrorDto, description: 'Current authentication failure.' })
  @ApiResponse({
    status: 403,
    type: ApiErrorDto,
    description: 'INSUFFICIENT_PERMISSION or CSRF_VALIDATION_FAILED.',
  })
  @ApiResponse({ status: 500, type: ApiErrorDto, description: 'Safe internal failure response.' })
  update(@Body() body: unknown): Promise<PriceDisplaySettingResponseDto> {
    return this.handle(() => this.settings.update(parseUpdatePriceDisplaySettingRequest(body)));
  }

  private async handle<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof PriceDisplaySettingError) {
        throw toPriceDisplaySettingHttpException(error);
      }
      throw safeInternalHttpException();
    }
  }
}

@ApiTags('Public Catalog Settings')
@Controller('catalog/settings/price-display-unit')
export class PublicPriceDisplaySettingController {
  constructor(private readonly settings: PriceDisplaySettingService) {}

  @Get()
  @ApiOperation({ summary: 'Return the public catalog price display unit' })
  @ApiResponse({ status: 200, type: PriceDisplaySettingResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorDto, description: 'Safe internal failure response.' })
  async read(): Promise<PriceDisplaySettingResponseDto> {
    try {
      return await this.settings.read();
    } catch {
      throw safeInternalHttpException();
    }
  }
}
