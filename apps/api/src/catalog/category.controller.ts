import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
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
  CategoryResponseDto,
  CreateCategoryRequestDto,
  parseCategoryId,
  parseCreateCategoryRequest,
  parseUpdateCategoryRequest,
  UpdateCategoryRequestDto,
} from './category.dto.js';
import { CategoryError, toCategoryHttpException } from './category.errors.js';
import { CategoryService } from './category.service.js';

const CSRF_HEADER = {
  name: 'X-CSRF-Token',
  required: true,
  description: 'Current session-bound CSRF credential held only in browser memory.',
  schema: { type: 'string' },
} as const;

@ApiTags('Admin Catalog Categories')
@ApiCookieAuth('adminAccess')
@UseGuards(CatalogAccessGuard)
@Controller('admin/catalog/categories')
export class CategoryController {
  constructor(private readonly categories: CategoryService) {}

  @Get()
  @CatalogPermission('catalog.read')
  @ApiOperation({ summary: 'Return the complete bounded Category tree' })
  @ApiResponse({ status: 200, type: CategoryResponseDto, isArray: true })
  @ApiResponse({ status: 401, type: ApiErrorDto })
  @ApiResponse({ status: 403, type: ApiErrorDto })
  @ApiResponse({ status: 500, type: ApiErrorDto })
  async list(): Promise<CategoryResponseDto[]> {
    return this.handle(() => this.categories.list());
  }

  @Post()
  @CatalogPermission('catalog.manage')
  @ApiHeader(CSRF_HEADER)
  @ApiOperation({ summary: 'Create a normalized Category' })
  @ApiBody({ type: CreateCategoryRequestDto })
  @ApiResponse({ status: 201, type: CategoryResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorDto })
  @ApiResponse({ status: 401, type: ApiErrorDto })
  @ApiResponse({ status: 403, type: ApiErrorDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  @ApiResponse({ status: 409, type: ApiErrorDto })
  @ApiResponse({ status: 500, type: ApiErrorDto })
  async create(@Body() body: unknown): Promise<CategoryResponseDto> {
    return this.handle(() => this.categories.create(parseCreateCategoryRequest(body)));
  }

  @Patch(':categoryId')
  @CatalogPermission('catalog.manage')
  @ApiHeader(CSRF_HEADER)
  @ApiOperation({ summary: 'Rename or atomically move a Category subtree' })
  @ApiParam({ name: 'categoryId', format: 'uuid' })
  @ApiBody({ type: UpdateCategoryRequestDto })
  @ApiResponse({ status: 200, type: CategoryResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorDto })
  @ApiResponse({ status: 401, type: ApiErrorDto })
  @ApiResponse({ status: 403, type: ApiErrorDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  @ApiResponse({ status: 409, type: ApiErrorDto })
  @ApiResponse({ status: 500, type: ApiErrorDto })
  async update(
    @Param('categoryId') categoryId: string,
    @Body() body: unknown,
  ): Promise<CategoryResponseDto> {
    return this.handle(() =>
      this.categories.update(parseCategoryId(categoryId), parseUpdateCategoryRequest(body)),
    );
  }

  @Delete(':categoryId')
  @HttpCode(204)
  @CatalogPermission('catalog.manage')
  @ApiHeader(CSRF_HEADER)
  @ApiOperation({ summary: 'Delete an eligible empty leaf Category' })
  @ApiParam({ name: 'categoryId', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Category deleted; no body.' })
  @ApiResponse({ status: 400, type: ApiErrorDto })
  @ApiResponse({ status: 401, type: ApiErrorDto })
  @ApiResponse({ status: 403, type: ApiErrorDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  @ApiResponse({ status: 409, type: ApiErrorDto })
  @ApiResponse({ status: 500, type: ApiErrorDto })
  async delete(@Param('categoryId') categoryId: string): Promise<void> {
    await this.handle(() => this.categories.delete(parseCategoryId(categoryId)));
  }

  private async handle<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof CategoryError) throw toCategoryHttpException(error);
      throw safeInternalHttpException();
    }
  }
}
