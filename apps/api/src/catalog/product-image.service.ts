import { Injectable } from '@nestjs/common';

import type {
  ProductImageCollectionResponseDto,
  ProductImageContent,
  ProductImageOrderInput,
  ProductImageUploadInput,
  ValidatedProductImage,
} from './product-image.dto.js';
import { ProductImageError } from './product-image.errors.js';
import type { ProductImageRecord, ProductImageTransaction } from './product-image.repository.js';
import { ProductImageRepository } from './product-image.repository.js';
import type { PreparedProductImage } from './product-image.storage.js';
import { ProductImageStorage } from './product-image.storage.js';
import { ProductImageValidator } from './product-image.validation.js';

@Injectable()
export class ProductImageService {
  constructor(
    private readonly repository: ProductImageRepository,
    private readonly storage: ProductImageStorage,
    private readonly validator: ProductImageValidator,
  ) {}

  async upload(
    productId: string,
    input: ProductImageUploadInput,
  ): Promise<ProductImageCollectionResponseDto> {
    await this.retryCleanup();
    const validated = await this.validator.validate(input.file);
    const prepared = await this.prepare(validated);
    try {
      return await this.repository.transaction(async (transaction) => {
        const product = await this.requiredProduct(transaction, productId);
        assertMutable(product.status);
        assertVersion(product.imageVersion, input.imageVersion);
        const images = await this.repository.images(transaction, productId);
        if (images.length >= 9) throw new ProductImageError('PRODUCT_IMAGE_LIMIT_REACHED');
        await this.repository.createImage(transaction, {
          productId,
          storageKey: prepared.storageKey,
          mediaType: validated.mediaType,
          byteSize: validated.byteSize,
          width: validated.width,
          height: validated.height,
          position: images.length,
        });
        await this.repository.incrementVersion(transaction, productId);
        return collection(
          product.imageVersion + 1,
          await this.repository.images(transaction, productId),
        );
      });
    } catch (error) {
      await this.compensate(prepared.storageKey);
      throw error;
    }
  }

  async reorder(
    productId: string,
    input: ProductImageOrderInput,
  ): Promise<ProductImageCollectionResponseDto> {
    await this.retryCleanup();
    return this.repository.transaction(async (transaction) => {
      const product = await this.requiredProduct(transaction, productId);
      assertMutable(product.status);
      assertVersion(product.imageVersion, input.imageVersion);
      const images = await this.repository.images(transaction, productId);
      if (!sameMembership(images, input.imageIds)) {
        throw new ProductImageError('PRODUCT_IMAGE_ORDER_CONFLICT');
      }
      await this.repository.deferOrderConstraint(transaction);
      for (const [position, id] of input.imageIds.entries()) {
        await this.repository.setPosition(transaction, id, position);
      }
      await this.repository.incrementVersion(transaction, productId);
      return collection(
        product.imageVersion + 1,
        await this.repository.images(transaction, productId),
      );
    });
  }

  async replace(
    imageId: string,
    input: ProductImageUploadInput,
  ): Promise<ProductImageCollectionResponseDto> {
    await this.retryCleanup();
    const validated = await this.validator.validate(input.file);
    const prepared = await this.prepare(validated);
    let cleanup: { readonly id: string; readonly storageKey: string } | undefined;
    try {
      const result = await this.repository.transaction(async (transaction) => {
        const productId = await this.repository.imageOwner(transaction, imageId);
        if (productId === undefined) throw new ProductImageError('PRODUCT_IMAGE_NOT_FOUND');
        const product = await this.requiredProduct(transaction, productId);
        assertMutable(product.status);
        assertVersion(product.imageVersion, input.imageVersion);
        const images = await this.repository.images(transaction, productId);
        const existing = images.find((image) => image.id === imageId);
        if (existing === undefined) throw new ProductImageError('PRODUCT_IMAGE_NOT_FOUND');
        await this.repository.deferOrderConstraint(transaction);
        const cleanupRow = await this.repository.createCleanup(transaction, existing.storageKey);
        cleanup = { id: cleanupRow.id, storageKey: existing.storageKey };
        await this.repository.deleteImage(transaction, imageId);
        await this.repository.createImage(transaction, {
          productId,
          storageKey: prepared.storageKey,
          mediaType: validated.mediaType,
          byteSize: validated.byteSize,
          width: validated.width,
          height: validated.height,
          position: existing.position,
        });
        await this.repository.incrementVersion(transaction, productId);
        return collection(
          product.imageVersion + 1,
          await this.repository.images(transaction, productId),
        );
      });
      if (cleanup !== undefined) await this.finishCleanup(cleanup);
      return result;
    } catch (error) {
      await this.compensate(prepared.storageKey);
      throw error;
    }
  }

  async remove(imageId: string, imageVersion: number): Promise<void> {
    await this.retryCleanup();
    const cleanup = await this.repository.transaction(async (transaction) => {
      const productId = await this.repository.imageOwner(transaction, imageId);
      if (productId === undefined) throw new ProductImageError('PRODUCT_IMAGE_NOT_FOUND');
      const product = await this.requiredProduct(transaction, productId);
      assertMutable(product.status);
      assertVersion(product.imageVersion, imageVersion);
      const images = await this.repository.images(transaction, productId);
      const existing = images.find((image) => image.id === imageId);
      if (existing === undefined) throw new ProductImageError('PRODUCT_IMAGE_NOT_FOUND');
      if (product.status === 'ACTIVE' && existing.position === 0) {
        throw new ProductImageError('PRODUCT_MAIN_IMAGE_REQUIRED');
      }
      await this.repository.deferOrderConstraint(transaction);
      const cleanupRow = await this.repository.createCleanup(transaction, existing.storageKey);
      await this.repository.deleteImage(transaction, imageId);
      await this.repository.compactPositions(transaction, productId, existing.position);
      await this.repository.incrementVersion(transaction, productId);
      return { id: cleanupRow.id, storageKey: existing.storageKey };
    });
    await this.finishCleanup(cleanup);
  }

  async content(
    imageId: string,
    publicOnly: boolean,
  ): Promise<{
    readonly content: ProductImageContent;
    readonly bytes: Buffer;
  }> {
    const image = await this.repository.content(imageId, publicOnly);
    if (image === null) throw new ProductImageError('PRODUCT_IMAGE_NOT_FOUND');
    const bytes = await this.storage.read(image.storageKey);
    if (bytes.length !== image.byteSize) {
      throw new ProductImageError('PRODUCT_IMAGE_STORAGE_UNAVAILABLE');
    }
    return {
      content: {
        id: image.id,
        storageKey: image.storageKey,
        mediaType: image.mediaType,
        byteSize: image.byteSize,
      },
      bytes,
    };
  }

  private async requiredProduct(
    transaction: ProductImageTransaction,
    productId: string,
  ): Promise<{ readonly status: string; readonly imageVersion: number }> {
    const product = await this.repository.lockProduct(transaction, productId);
    if (product === undefined) throw new ProductImageError('PRODUCT_NOT_FOUND');
    return product;
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

  private async finishCleanup(cleanup: {
    readonly id: string;
    readonly storageKey: string;
  }): Promise<void> {
    try {
      await this.storage.discard(cleanup.storageKey);
      await this.repository.deleteCleanup(cleanup.id);
    } catch {
      await this.repository.markCleanupFailure(cleanup.id).catch(() => undefined);
    }
  }

  private async retryCleanup(): Promise<void> {
    const pending = await this.repository.pendingCleanups();
    for (const cleanup of pending) await this.finishCleanup(cleanup);
  }
}

function assertMutable(status: string): void {
  if (status === 'ARCHIVED') throw new ProductImageError('PRODUCT_LIFECYCLE_CONFLICT');
}

function assertVersion(actual: number, expected: number): void {
  if (actual !== expected) throw new ProductImageError('PRODUCT_IMAGE_ORDER_CONFLICT');
}

function sameMembership(images: readonly ProductImageRecord[], ids: readonly string[]): boolean {
  return (
    images.length === ids.length &&
    new Set(ids).size === ids.length &&
    images.every((image) => ids.includes(image.id))
  );
}

function collection(
  imageVersion: number,
  images: readonly ProductImageRecord[],
): ProductImageCollectionResponseDto {
  return {
    imageVersion,
    images: images.map((image) => ({
      id: image.id,
      mediaType: image.mediaType,
      byteSize: image.byteSize,
      width: image.width,
      height: image.height,
      position: image.position,
      createdAt: image.createdAt.toISOString(),
      updatedAt: image.updatedAt.toISOString(),
    })),
  };
}
