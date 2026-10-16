import {
  Body,
  CallHandler,
  Controller,
  Delete,
  ExecutionContext,
  Get,
  HttpCode,
  HttpException,
  Injectable,
  NestInterceptor,
  Param,
  Patch,
  Post,
  Res,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express/multer/interceptors/any-files.interceptor.js';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Observable } from 'rxjs';
import { catchError } from 'rxjs';

import { safeInternalHttpException } from '../authentication/authentication-http.js';
import { ApiErrorDto } from '../authentication/login.dto.js';
import { ApiSuccess, RawApiResponse } from '../http/api-response.js';
import {
  BannerResponseDto,
  CreateBannerRequestDto,
  parseBannerId,
  parseCreateBannerRequest,
  parseUpdateBannerRequest,
  UpdateBannerRequestDto,
} from './banner.dto.js';
import { BannerError, toBannerHttpException } from './banner.errors.js';
import { BannerService } from './banner.service.js';
import { CatalogAccessGuard, CatalogPermission } from './catalog-access.guard.js';
import type { ProductImageUploadFile } from './product-image.dto.js';
import { ProductImageError, toProductImageHttpException } from './product-image.errors.js';

const CSRF_HEADER = {
  name: 'X-CSRF-Token',
  required: true,
  description: 'Current session-bound CSRF credential read from the Strict CSRF cookie.',
  schema: { type: 'string' },
} as const;

const NestBannerImageUploadInterceptor = AnyFilesInterceptor({
  limits: { fileSize: 1_048_576, files: 2, fields: 1, parts: 3 },
});

interface HeaderResponse {
  setHeader(name: string, value: string | number): unknown;
}

@Injectable()
export class BannerImageMultipartErrorInterceptor implements NestInterceptor {
  private readonly upload = new NestBannerImageUploadInterceptor();

  // خطاهای transport آپلود را به پیام امن و فارسی قرارداد تصویر تبدیل می‌کند.
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    try {
      const result = await this.upload.intercept(context, next);
      return result.pipe(
        catchError((error: unknown) => {
          throwMultipartError(error);
        }),
      );
    } catch (error) {
      throwMultipartError(error);
    }
  }
}

@ApiTags('Admin Homepage Banners')
@ApiCookieAuth('adminAccess')
@UseGuards(CatalogAccessGuard)
@Controller('admin/catalog/banners')
export class BannerController {
  constructor(private readonly banners: BannerService) {}

  @Get()
  @ApiSuccess({ code: 'BANNERS_FETCHED', message: 'بنرها با موفقیت دریافت شدند.', kind: 'collection' })
  @CatalogPermission('catalog.read')
  @ApiOperation({ summary: 'Return Homepage Banners for Admin management' })
  @ApiResponse({ status: 200, type: BannerResponseDto, isArray: true })
  @ApiResponse({ status: 401, type: ApiErrorDto })
  @ApiResponse({ status: 403, type: ApiErrorDto })
  async list(): Promise<BannerResponseDto[]> {
    return this.handle(() => this.banners.list());
  }

  @Get(':bannerId/content')
  @RawApiResponse()
  @CatalogPermission('catalog.read')
  @ApiOperation({ summary: 'Return Banner image content for authorized Admins' })
  @ApiParam({ name: 'bannerId', format: 'uuid' })
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiResponse({ status: 200, description: 'Validated immutable Banner image bytes.' })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  async content(
    @Param('bannerId') bannerId: string,
    @Res({ passthrough: true }) response: HeaderResponse,
  ): Promise<StreamableFile> {
    const result = await this.handle(() => this.banners.content(parseBannerId(bannerId)));
    response.setHeader('Content-Type', mediaType(result.banner.mediaType));
    response.setHeader('Content-Length', result.banner.byteSize);
    response.setHeader('Cache-Control', 'private, max-age=300, no-transform');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(result.bytes);
  }

  @Post()
  @UseInterceptors(BannerImageMultipartErrorInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiSuccess({ code: 'BANNER_CREATED', message: 'بنر با موفقیت ایجاد شد.', kind: 'single' })
  @CatalogPermission('catalog.manage')
  @ApiHeader(CSRF_HEADER)
  @ApiOperation({ summary: 'Create a Homepage Banner' })
  @ApiBody({ type: CreateBannerRequestDto })
  @ApiResponse({ status: 201, type: BannerResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorDto })
  @ApiResponse({ status: 422, type: ApiErrorDto })
  async create(
    @UploadedFiles() files: ProductImageUploadFile[] | undefined,
    @Body() body: unknown,
  ): Promise<BannerResponseDto> {
    return this.handle(() => this.banners.create(parseCreateBannerRequest(files, body)));
  }

  @Patch(':bannerId')
  @UseInterceptors(BannerImageMultipartErrorInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiSuccess({ code: 'BANNER_UPDATED', message: 'بنر با موفقیت ویرایش شد.', kind: 'single' })
  @CatalogPermission('catalog.manage')
  @ApiHeader(CSRF_HEADER)
  @ApiOperation({ summary: 'Replace a Homepage Banner image' })
  @ApiParam({ name: 'bannerId', format: 'uuid' })
  @ApiBody({ type: UpdateBannerRequestDto })
  @ApiResponse({ status: 200, type: BannerResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  @ApiResponse({ status: 422, type: ApiErrorDto })
  async update(
    @Param('bannerId') bannerId: string,
    @UploadedFiles() files: ProductImageUploadFile[] | undefined,
    @Body() body: unknown,
  ): Promise<BannerResponseDto> {
    return this.handle(() =>
      this.banners.update(parseBannerId(bannerId), parseUpdateBannerRequest(files, body)),
    );
  }

  @Delete(':bannerId')
  @HttpCode(200)
  @ApiSuccess({ code: 'BANNER_DELETED', message: 'بنر با موفقیت حذف شد.', kind: 'none' })
  @CatalogPermission('catalog.manage')
  @ApiHeader(CSRF_HEADER)
  @ApiOperation({ summary: 'Delete a Homepage Banner' })
  @ApiParam({ name: 'bannerId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Banner deleted successfully.' })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  async delete(@Param('bannerId') bannerId: string): Promise<void> {
    await this.handle(() => this.banners.delete(parseBannerId(bannerId)));
  }

  // خطاهای شناخته‌شده را به envelope امن API نگاشت می‌کند.
  private async handle<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof BannerError) throw toBannerHttpException(error);
      if (error instanceof ProductImageError) throw toProductImageHttpException(error);
      throw safeInternalHttpException();
    }
  }
}

@ApiTags('Public Homepage Banners')
@Controller('catalog/banners')
export class PublicBannerController {
  constructor(private readonly banners: BannerService) {}

  @Get()
  @ApiSuccess({ code: 'BANNERS_FETCHED', message: 'بنرها با موفقیت دریافت شدند.', kind: 'collection' })
  @ApiOperation({ summary: 'Return Homepage Banners for the public Storefront' })
  @ApiResponse({ status: 200, type: BannerResponseDto, isArray: true })
  @ApiResponse({ status: 500, type: ApiErrorDto, description: 'Safe internal failure response.' })
  async list(): Promise<BannerResponseDto[]> {
    return this.handle(() => this.banners.list());
  }

  @Get(':bannerId/content')
  @RawApiResponse()
  @ApiOperation({ summary: 'Return public Banner image content' })
  @ApiParam({ name: 'bannerId', format: 'uuid' })
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiResponse({ status: 200, description: 'Validated immutable Banner image bytes.' })
  @ApiResponse({ status: 400, type: ApiErrorDto, description: 'VALIDATION_FAILED.' })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'BANNER_NOT_FOUND.' })
  @ApiResponse({ status: 500, type: ApiErrorDto, description: 'Safe internal failure response.' })
  async content(
    @Param('bannerId') bannerId: string,
    @Res({ passthrough: true }) response: HeaderResponse,
  ): Promise<StreamableFile> {
    const result = await this.handle(() => this.banners.content(parseBannerId(bannerId)));
    response.setHeader('Content-Type', mediaType(result.banner.mediaType));
    response.setHeader('Content-Length', result.banner.byteSize);
    response.setHeader('Cache-Control', 'public, max-age=300, no-transform');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(result.bytes);
  }

  private async handle<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof BannerError) throw toBannerHttpException(error);
      throw safeInternalHttpException();
    }
  }
}

function throwMultipartError(error: unknown): never {
  const code = errorCode(error);
  if (code === 'LIMIT_FILE_SIZE' || httpStatus(error) === 413) {
    throw toProductImageHttpException(new ProductImageError('PRODUCT_IMAGE_TOO_LARGE'));
  }
  if (code?.startsWith('LIMIT_') === true || httpStatus(error) === 400) {
    throw toProductImageHttpException(new ProductImageError('VALIDATION_FAILED'));
  }
  throw error;
}

function mediaType(value: 'JPEG' | 'PNG' | 'WEBP'): string {
  if (value === 'JPEG') return 'image/jpeg';
  if (value === 'PNG') return 'image/png';
  return 'image/webp';
}

function errorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code)
    : undefined;
}

function httpStatus(error: unknown): number | undefined {
  return error instanceof HttpException ? error.getStatus() : undefined;
}
