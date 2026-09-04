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
  Post,
  Put,
  Query,
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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Observable } from 'rxjs';
import { catchError } from 'rxjs';

import { safeInternalHttpException } from '../authentication/authentication-http.js';
import { ApiErrorDto } from '../authentication/login.dto.js';
import { CatalogAccessGuard, CatalogPermission } from './catalog-access.guard.js';
import {
  parseProductImageOrder,
  parseProductImageUpload,
  parseProductImageVersionQuery,
  ProductImageCollectionResponseDto,
  ProductImageMultipartRequestDto,
  ProductImageOrderRequestDto,
  type ProductImageUploadFile,
} from './product-image.dto.js';
import { ProductImageError, toProductImageHttpException } from './product-image.errors.js';
import { ProductImageService } from './product-image.service.js';
import { parseCatalogUuid } from './product.dto.js';
import { ProductError } from './product.errors.js';

const CSRF_HEADER = {
  name: 'X-CSRF-Token',
  required: true,
  description: 'Current session-bound CSRF credential held only in browser memory.',
  schema: { type: 'string' },
} as const;
const NestProductImageUploadInterceptor = AnyFilesInterceptor({
  limits: { fileSize: 409_600, files: 2, fields: 2, parts: 4 },
});

interface HeaderResponse {
  setHeader(name: string, value: string | number): unknown;
}

@Injectable()
export class ProductImageMultipartErrorInterceptor implements NestInterceptor {
  private readonly upload = new NestProductImageUploadInterceptor();

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

@ApiTags('Admin Catalog Product Images')
@ApiCookieAuth('adminAccess')
@UseGuards(CatalogAccessGuard)
@Controller('admin/catalog')
export class AdminProductImageController {
  constructor(private readonly images: ProductImageService) {}

  @Post('products/:productId/images')
  @CatalogPermission('product.media.manage')
  @UseInterceptors(ProductImageMultipartErrorInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiHeader(CSRF_HEADER)
  @ApiOperation({ summary: 'Validate and append one ready Product Image' })
  @ApiParam({ name: 'productId', format: 'uuid' })
  @ApiBody({ type: ProductImageMultipartRequestDto })
  @ApiResponse({ status: 201, type: ProductImageCollectionResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorDto, description: 'VALIDATION_FAILED.' })
  @ApiResponse({ status: 401, type: ApiErrorDto })
  @ApiResponse({ status: 403, type: ApiErrorDto })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'PRODUCT_NOT_FOUND.' })
  @ApiResponse({ status: 409, type: ApiErrorDto })
  @ApiResponse({ status: 413, type: ApiErrorDto, description: 'PRODUCT_IMAGE_TOO_LARGE.' })
  @ApiResponse({ status: 415, type: ApiErrorDto, description: 'PRODUCT_IMAGE_TYPE_UNSUPPORTED.' })
  @ApiResponse({ status: 422, type: ApiErrorDto, description: 'Invalid content or dimensions.' })
  @ApiResponse({ status: 500, type: ApiErrorDto })
  @ApiResponse({
    status: 503,
    type: ApiErrorDto,
    description: 'PRODUCT_IMAGE_STORAGE_UNAVAILABLE.',
  })
  upload(
    @Param('productId') productId: string,
    @UploadedFiles() files: ProductImageUploadFile[] | undefined,
    @Body() body: unknown,
  ): Promise<ProductImageCollectionResponseDto> {
    return this.handle(() =>
      this.images.upload(
        parseCatalogUuid(productId, 'productId'),
        parseProductImageUpload(files, body),
      ),
    );
  }

  @Put('products/:productId/images/order')
  @CatalogPermission('product.media.manage')
  @ApiHeader(CSRF_HEADER)
  @ApiOperation({ summary: 'Atomically replace the complete ready Product Image order' })
  @ApiParam({ name: 'productId', format: 'uuid' })
  @ApiBody({ type: ProductImageOrderRequestDto })
  @ApiResponse({ status: 200, type: ProductImageCollectionResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorDto })
  @ApiResponse({ status: 401, type: ApiErrorDto })
  @ApiResponse({ status: 403, type: ApiErrorDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'Image order/lifecycle conflict.' })
  @ApiResponse({ status: 500, type: ApiErrorDto })
  reorder(
    @Param('productId') productId: string,
    @Body() body: unknown,
  ): Promise<ProductImageCollectionResponseDto> {
    return this.handle(() =>
      this.images.reorder(parseCatalogUuid(productId, 'productId'), parseProductImageOrder(body)),
    );
  }

  @Post('product-images/:imageId/replacements')
  @CatalogPermission('product.media.manage')
  @UseInterceptors(ProductImageMultipartErrorInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiHeader(CSRF_HEADER)
  @ApiOperation({ summary: 'Replace Image content with a new immutable Image identity' })
  @ApiParam({ name: 'imageId', format: 'uuid' })
  @ApiBody({ type: ProductImageMultipartRequestDto })
  @ApiResponse({ status: 201, type: ProductImageCollectionResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorDto })
  @ApiResponse({ status: 401, type: ApiErrorDto })
  @ApiResponse({ status: 403, type: ApiErrorDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  @ApiResponse({ status: 409, type: ApiErrorDto })
  @ApiResponse({ status: 413, type: ApiErrorDto })
  @ApiResponse({ status: 415, type: ApiErrorDto })
  @ApiResponse({ status: 422, type: ApiErrorDto })
  @ApiResponse({ status: 500, type: ApiErrorDto })
  @ApiResponse({ status: 503, type: ApiErrorDto })
  replace(
    @Param('imageId') imageId: string,
    @UploadedFiles() files: ProductImageUploadFile[] | undefined,
    @Body() body: unknown,
  ): Promise<ProductImageCollectionResponseDto> {
    return this.handle(() =>
      this.images.replace(
        parseCatalogUuid(imageId, 'imageId'),
        parseProductImageUpload(files, body),
      ),
    );
  }

  @Delete('product-images/:imageId')
  @HttpCode(204)
  @CatalogPermission('product.media.manage')
  @ApiHeader(CSRF_HEADER)
  @ApiOperation({ summary: 'Remove an eligible ready Product Image and compact its order' })
  @ApiParam({ name: 'imageId', format: 'uuid' })
  @ApiQuery({ name: 'imageVersion', type: Number, minimum: 1, maximum: 2_147_483_647 })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 400, type: ApiErrorDto })
  @ApiResponse({ status: 401, type: ApiErrorDto })
  @ApiResponse({ status: 403, type: ApiErrorDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  @ApiResponse({ status: 409, type: ApiErrorDto })
  @ApiResponse({ status: 500, type: ApiErrorDto })
  @ApiResponse({ status: 503, type: ApiErrorDto })
  async remove(@Param('imageId') imageId: string, @Query() query: unknown): Promise<void> {
    await this.handle(() =>
      this.images.remove(
        parseCatalogUuid(imageId, 'imageId'),
        parseProductImageVersionQuery(query),
      ),
    );
  }

  @Get('product-images/:imageId/content')
  @CatalogPermission('catalog.read')
  @ApiOperation({ summary: 'Return ready Product Image content for authorized Admins' })
  @ApiParam({ name: 'imageId', format: 'uuid' })
  @ApiProduces('image/webp', 'image/jpeg', 'image/png')
  @ApiResponse({ status: 200, schema: { type: 'string', format: 'binary' } })
  @ApiResponse({ status: 400, type: ApiErrorDto })
  @ApiResponse({ status: 401, type: ApiErrorDto })
  @ApiResponse({ status: 403, type: ApiErrorDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  @ApiResponse({ status: 500, type: ApiErrorDto })
  @ApiResponse({ status: 503, type: ApiErrorDto })
  content(
    @Param('imageId') imageId: string,
    @Res({ passthrough: true }) response: HeaderResponse,
  ): Promise<StreamableFile> {
    return this.contentResponse(imageId, response, false);
  }

  private async contentResponse(
    imageId: string,
    response: HeaderResponse,
    publicOnly: boolean,
  ): Promise<StreamableFile> {
    return this.handle(async () => {
      const result = await this.images.content(parseCatalogUuid(imageId, 'imageId'), publicOnly);
      response.setHeader('X-Content-Type-Options', 'nosniff');
      response.setHeader(
        'Cache-Control',
        publicOnly ? 'public, max-age=31536000, immutable' : 'private, no-store',
      );
      return streamable(result);
    });
  }

  private async handle<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof ProductImageError) throw toProductImageHttpException(error);
      if (error instanceof ProductError && error.code === 'VALIDATION_FAILED') {
        throw toProductImageHttpException(new ProductImageError('VALIDATION_FAILED'));
      }
      throw safeInternalHttpException();
    }
  }
}

@ApiTags('Public Catalog Product Images')
@Controller('catalog/product-images')
export class PublicProductImageController {
  constructor(private readonly images: ProductImageService) {}

  @Get(':imageId/content')
  @ApiOperation({ summary: 'Return immutable ready Image content for an Active Product' })
  @ApiParam({ name: 'imageId', format: 'uuid' })
  @ApiProduces('image/webp', 'image/jpeg', 'image/png')
  @ApiResponse({ status: 200, schema: { type: 'string', format: 'binary' } })
  @ApiResponse({ status: 400, type: ApiErrorDto })
  @ApiResponse({ status: 404, type: ApiErrorDto })
  @ApiResponse({ status: 500, type: ApiErrorDto })
  @ApiResponse({ status: 503, type: ApiErrorDto })
  async content(
    @Param('imageId') imageId: string,
    @Res({ passthrough: true }) response: HeaderResponse,
  ): Promise<StreamableFile> {
    try {
      const result = await this.images.content(parseCatalogUuid(imageId, 'imageId'), true);
      response.setHeader('X-Content-Type-Options', 'nosniff');
      response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return streamable(result);
    } catch (error) {
      if (error instanceof ProductImageError) throw toProductImageHttpException(error);
      if (error instanceof ProductError && error.code === 'VALIDATION_FAILED') {
        throw toProductImageHttpException(new ProductImageError('VALIDATION_FAILED'));
      }
      throw safeInternalHttpException();
    }
  }
}

function streamable(result: Awaited<ReturnType<ProductImageService['content']>>): StreamableFile {
  const extension =
    result.content.mediaType === 'JPEG' ? 'jpg' : result.content.mediaType.toLowerCase();
  const type =
    result.content.mediaType === 'JPEG'
      ? 'image/jpeg'
      : result.content.mediaType === 'PNG'
        ? 'image/png'
        : 'image/webp';
  return new StreamableFile(result.bytes, {
    type,
    length: result.content.byteSize,
    disposition: `inline; filename="${result.content.id}.${extension}"`,
  });
}

function errorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code)
    : undefined;
}

function httpStatus(error: unknown): number | undefined {
  return error instanceof HttpException ? error.getStatus() : undefined;
}
