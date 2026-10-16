import { Injectable } from '@nestjs/common';

import type { BannerResponseDto, CreateBannerInput, UpdateBannerInput } from './banner.dto.js';
import { BannerError } from './banner.errors.js';
import { BANNER_SELECT, BannerRepository, type BannerRecord } from './banner.repository.js';
import type { ValidatedProductImage } from './product-image.dto.js';
import type { PreparedProductImage } from './product-image.storage.js';
import { ProductImageStorage } from './product-image.storage.js';
import { ProductImageValidator } from './product-image.validation.js';

const BANNER_MAX_BYTES = 1_048_575;

@Injectable()
export class BannerService {
  constructor(
    private readonly repository: BannerRepository,
    private readonly storage: ProductImageStorage,
    private readonly validator: ProductImageValidator,
  ) {}

  // فهرست بنرها را بدون افشای کلید داخلی ذخیره‌سازی ارائه می‌کند.
  async list(): Promise<BannerResponseDto[]> {
    return (await this.repository.list()).map(toBannerDto);
  }

  // تصویر معتبر را ابتدا پایدار و سپس رکورد بنر را اتمیک ایجاد می‌کند.
  async create(input: CreateBannerInput): Promise<BannerResponseDto> {
    await this.retryCleanup();
    const validated = await this.validator.validate(input.file, BANNER_MAX_BYTES);
    const prepared = await this.prepare(validated);
    try {
      const created = await this.repository.transaction((transaction) =>
        transaction.banner.create({
          data: { ...imageData(prepared.storageKey, validated), altText: input.alt },
          select: BANNER_SELECT,
        }),
      );
      return toBannerDto(created);
    } catch (error) {
      await this.compensate(prepared.storageKey);
      throw error;
    }
  }

  // تصویر جدید را جایگزین می‌کند و حذف فایل قبلی را با cleanup پایدار ادامه می‌دهد.
  async update(id: string, input: UpdateBannerInput): Promise<BannerResponseDto> {
    await this.retryCleanup();
    if (input.file === undefined) {
      const updated = await this.repository.transaction(async (transaction) => {
        const existing = await transaction.banner.findUnique({ where: { id }, select: { id: true } });
        if (existing === null) throw new BannerError('BANNER_NOT_FOUND');
        return transaction.banner.update({
          where: { id },
          data: { altText: input.alt ?? null },
          select: BANNER_SELECT,
        });
      });
      return toBannerDto(updated);
    }
    const validated = await this.validator.validate(input.file, BANNER_MAX_BYTES);
    const prepared = await this.prepare(validated);
    let cleanup: { readonly id: string; readonly storageKey: string } | undefined;
    try {
      const updated = await this.repository.transaction(async (transaction) => {
        const existing = await transaction.banner.findUnique({ where: { id }, select: BANNER_SELECT });
        if (existing === null) throw new BannerError('BANNER_NOT_FOUND');
        const cleanupRow = await transaction.bannerImageCleanup.create({
          data: { storageKey: existing.storageKey },
          select: { id: true },
        });
        cleanup = { id: cleanupRow.id, storageKey: existing.storageKey };
        return transaction.banner.update({
          where: { id },
          data: {
            ...imageData(prepared.storageKey, validated),
            ...('alt' in input ? { altText: input.alt ?? null } : {}),
          },
          select: BANNER_SELECT,
        });
      });
      if (cleanup !== undefined) await this.finishCleanup(cleanup);
      return toBannerDto(updated);
    } catch (error) {
      await this.compensate(prepared.storageKey);
      throw error;
    }
  }

  // رکورد بنر را حذف و فایل متناظر را خارج از تراکنش پاک می‌کند.
  async delete(id: string): Promise<void> {
    await this.retryCleanup();
    const cleanup = await this.repository.transaction(async (transaction) => {
      const existing = await transaction.banner.findUnique({ where: { id }, select: BANNER_SELECT });
      if (existing === null) throw new BannerError('BANNER_NOT_FOUND');
      const cleanupRow = await transaction.bannerImageCleanup.create({
        data: { storageKey: existing.storageKey },
        select: { id: true },
      });
      await transaction.banner.delete({ where: { id } });
      return { id: cleanupRow.id, storageKey: existing.storageKey };
    });
    await this.finishCleanup(cleanup);
  }

  // بایت‌های تصویر را همراه با کنترل سازگاری اندازه برای پاسخ خام فراهم می‌کند.
  async content(id: string) {
    const banner = await this.repository.content(id);
    if (banner === null) throw new BannerError('BANNER_NOT_FOUND');
    const bytes = await this.storage.read(banner.storageKey);
    if (bytes.length !== banner.byteSize) throw new Error('Banner Image byte size mismatch.');
    return { banner, bytes };
  }

  private async prepare(validated: ValidatedProductImage): Promise<PreparedProductImage> {
    const prepared = await this.storage.prepare(validated.bytes, validated.extension);
    try {
      await this.storage.promote(prepared);
      return prepared;
    } catch (error) {
      await this.storage.discard(prepared.stagingKey).catch(() => undefined);
      throw error;
    }
  }

  private async compensate(storageKey: string): Promise<void> {
    try {
      await this.storage.discard(storageKey);
    } catch {
      await this.repository.createCleanupOutside(storageKey).catch(() => undefined);
    }
  }

  private async finishCleanup(cleanup: { readonly id: string; readonly storageKey: string }): Promise<void> {
    try {
      await this.storage.discard(cleanup.storageKey);
      await this.repository.deleteCleanup(cleanup.id);
    } catch {
      await this.repository.markCleanupFailure(cleanup.id).catch(() => undefined);
    }
  }

  private async retryCleanup(): Promise<void> {
    for (const cleanup of await this.repository.pendingCleanups()) await this.finishCleanup(cleanup);
  }
}

// رکورد داخلی را به قرارداد امن پاسخ بنر تبدیل می‌کند.
function toBannerDto(row: BannerRecord): BannerResponseDto {
  return {
    id: row.id,
    src: `/api/v1/catalog/banners/${row.id}/content`,
    alt: row.altText,
    mediaType: row.mediaType,
    byteSize: row.byteSize,
    width: row.width,
    height: row.height,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function imageData(storageKey: string, image: ValidatedProductImage) {
  return {
    storageKey,
    mediaType: image.mediaType,
    byteSize: image.byteSize,
    width: image.width,
    height: image.height,
  };
}
