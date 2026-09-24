import { Injectable } from '@nestjs/common';

import type { CategoryRecord } from './category.repository.js';
import { CATEGORY_SELECT, CategoryRepository } from './category.repository.js';
import type {
  CategoryResponseDto,
  CreateCategoryInput,
  UpdateCategoryInput,
} from './category.dto.js';
import {
  CategoryError,
  mapCategoryPersistenceError,
  type CategoryPersistenceOperation,
} from './category.errors.js';
import type { ValidatedProductImage } from './product-image.dto.js';
import type { PreparedProductImage } from './product-image.storage.js';
import { ProductImageStorage } from './product-image.storage.js';
import { ProductImageValidator } from './product-image.validation.js';

@Injectable()
export class CategoryService {
  constructor(
    private readonly repository: CategoryRepository,
    private readonly storage: ProductImageStorage,
    private readonly validator: ProductImageValidator,
  ) {}

  async list(): Promise<CategoryResponseDto[]> {
    return buildCategoryTree(await this.repository.list());
  }

  async create(input: CreateCategoryInput): Promise<CategoryResponseDto> {
    await this.retryCleanup();
    const validated = await this.validator.validate(input.file);
    const prepared = await this.prepare(validated);
    try {
      return await this.runMutation('create', async () =>
        this.repository.transaction(async (transaction) => {
          const categories = await this.repository.listInTransaction(transaction);
          if (categories.length >= 1000) throw new CategoryError('CATEGORY_LIMIT_REACHED');
          const level = this.validateParent(categories, input.parentId, undefined, 1);
          this.assertSiblingAvailable(categories, input.parentId, input.nameKey);
          const created = await transaction.category.create({
            data: {
              name: input.name,
              nameKey: input.nameKey,
              parentId: input.parentId,
              image: {
                create: imageData(prepared.storageKey, validated),
              },
            },
            select: CATEGORY_SELECT,
          });
          return toCategoryDto(created, level);
        }),
      );
    } catch (error) {
      await this.compensate(prepared.storageKey);
      throw error;
    }
  }

  async update(id: string, input: UpdateCategoryInput): Promise<CategoryResponseDto> {
    await this.retryCleanup();
    const validated =
      input.file === undefined ? undefined : await this.validator.validate(input.file);
    const prepared = validated === undefined ? undefined : await this.prepare(validated);
    let cleanup: { readonly id: string; readonly storageKey: string } | undefined;
    try {
      const result = await this.runMutation('update', async () =>
        this.repository.transaction(async (transaction) => {
          const categories = await this.repository.listInTransaction(transaction);
          const existing = categories.find((category) => category.id === id);
          if (existing === undefined) throw new CategoryError('CATEGORY_NOT_FOUND');
          if (existing.image === null && prepared === undefined) {
            throw new CategoryError('CATEGORY_IMAGE_REQUIRED', ['file']);
          }
          const parentId = input.parentId === undefined ? existing.parentId : input.parentId;
          const nameKey = input.nameKey ?? existing.nameKey;
          const subtreeHeight = categorySubtreeHeight(categories, id);
          const level = this.validateParent(categories, parentId, id, subtreeHeight);
          this.assertSiblingAvailable(categories, parentId, nameKey, id);
          if (prepared !== undefined && validated !== undefined) {
            if (existing.image !== null) {
              const cleanupRow = await transaction.categoryImageCleanup.create({
                data: { storageKey: existing.image.storageKey },
                select: { id: true },
              });
              cleanup = { id: cleanupRow.id, storageKey: existing.image.storageKey };
              await transaction.categoryImage.delete({ where: { id: existing.image.id } });
            }
            await transaction.categoryImage.create({
              data: { categoryId: id, ...imageData(prepared.storageKey, validated) },
            });
          }
          const updated = await transaction.category.update({
            where: { id },
            data: {
              ...(input.name === undefined ? {} : { name: input.name, nameKey: input.nameKey }),
              ...(input.parentId === undefined ? {} : { parentId: input.parentId }),
            },
            select: CATEGORY_SELECT,
          });
          return toCategoryDto(updated, level);
        }),
      );
      if (cleanup !== undefined) await this.finishCleanup(cleanup);
      return result;
    } catch (error) {
      if (prepared !== undefined) await this.compensate(prepared.storageKey);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    await this.retryCleanup();
    const cleanup = await this.runMutation('delete', async () =>
      this.repository.transaction(async (transaction) => {
        const categories = await this.repository.listInTransaction(transaction);
        if (!categories.some((category) => category.id === id)) {
          throw new CategoryError('CATEGORY_NOT_FOUND');
        }
        if (
          categories.some((category) => category.parentId === id) ||
          (await transaction.product.count({ where: { categoryId: id } })) > 0
        ) {
          throw new CategoryError('CATEGORY_NOT_EMPTY');
        }
        const existing = categories.find((category) => category.id === id);
        let imageCleanup: { readonly id: string; readonly storageKey: string } | undefined;
        if (existing?.image !== null && existing?.image !== undefined) {
          const cleanupRow = await transaction.categoryImageCleanup.create({
            data: { storageKey: existing.image.storageKey },
            select: { id: true },
          });
          imageCleanup = { id: cleanupRow.id, storageKey: existing.image.storageKey };
          await transaction.categoryImage.delete({ where: { id: existing.image.id } });
        }
        await transaction.category.delete({ where: { id } });
        return imageCleanup;
      }),
    );
    if (cleanup !== undefined) await this.finishCleanup(cleanup);
  }

  async content(imageId: string) {
    const image = await this.repository.content(imageId);
    if (image === null) throw new CategoryError('CATEGORY_IMAGE_NOT_FOUND');
    const bytes = await this.storage.read(image.storageKey);
    if (bytes.length !== image.byteSize) throw new Error('Category Image byte size mismatch.');
    return { image, bytes };
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

  private async finishCleanup(cleanup: { readonly id: string; readonly storageKey: string }) {
    try {
      await this.storage.discard(cleanup.storageKey);
      await this.repository.deleteCleanup(cleanup.id);
    } catch {
      await this.repository.markCleanupFailure(cleanup.id).catch(() => undefined);
    }
  }

  private async retryCleanup(): Promise<void> {
    for (const cleanup of await this.repository.pendingCleanups()) {
      await this.finishCleanup(cleanup);
    }
  }

  private validateParent(
    categories: readonly CategoryRecord[],
    parentId: string | null,
    categoryId: string | undefined,
    subtreeHeight: number,
  ): number {
    if (parentId === null) return 1;
    if (parentId === categoryId) throw new CategoryError('CATEGORY_MOVE_INVALID');
    const parent = categories.find((category) => category.id === parentId);
    if (parent === undefined) throw new CategoryError('CATEGORY_NOT_FOUND');
    if (categoryId !== undefined && categoryDescendants(categories, categoryId).has(parentId)) {
      throw new CategoryError('CATEGORY_MOVE_INVALID');
    }
    const level = categoryLevel(categories, parentId) + 1;
    if (level + subtreeHeight - 1 > 6) throw new CategoryError('CATEGORY_MOVE_INVALID');
    return level;
  }

  private assertSiblingAvailable(
    categories: readonly CategoryRecord[],
    parentId: string | null,
    nameKey: string,
    excludedId?: string,
  ): void {
    if (
      categories.some(
        (category) =>
          category.id !== excludedId &&
          category.parentId === parentId &&
          category.nameKey === nameKey,
      )
    ) {
      throw new CategoryError('CATEGORY_NAME_CONFLICT');
    }
  }

  private async runMutation<T>(
    operation: CategoryPersistenceOperation,
    work: () => Promise<T>,
  ): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof CategoryError) throw error;
      const mapped = mapCategoryPersistenceError(error, operation);
      if (mapped !== undefined) throw mapped;
      throw error;
    }
  }
}

export function buildCategoryTree(rows: readonly CategoryRecord[]): CategoryResponseDto[] {
  const nodes = new Map<string, CategoryResponseDto>();
  for (const row of rows) nodes.set(row.id, toCategoryDto(row, categoryLevel(rows, row.id)));
  const roots: CategoryResponseDto[] = [];
  for (const row of rows) {
    const node = nodes.get(row.id);
    if (node === undefined) continue;
    if (row.parentId === null) roots.push(node);
    else nodes.get(row.parentId)?.children.push(node);
  }
  return roots;
}

function toCategoryDto(row: CategoryRecord, level: number): CategoryResponseDto {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parentId,
    level,
    image:
      row.image === null
        ? null
        : {
            id: row.image.id,
            mediaType: row.image.mediaType,
            byteSize: row.image.byteSize,
            width: row.image.width,
            height: row.image.height,
          },
    children: [],
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

function categoryLevel(rows: readonly CategoryRecord[], id: string): number {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const visited = new Set<string>();
  let current = byId.get(id);
  let level = 0;
  while (current !== undefined) {
    if (visited.has(current.id)) throw new Error('Persisted Category cycle detected.');
    visited.add(current.id);
    level += 1;
    current = current.parentId === null ? undefined : byId.get(current.parentId);
  }
  return level;
}

function categoryDescendants(rows: readonly CategoryRecord[], id: string): Set<string> {
  const descendants = new Set<string>();
  const pending = [id];
  while (pending.length > 0) {
    const parentId = pending.pop();
    for (const row of rows) {
      if (row.parentId === parentId && !descendants.has(row.id)) {
        descendants.add(row.id);
        pending.push(row.id);
      }
    }
  }
  return descendants;
}

function categorySubtreeHeight(rows: readonly CategoryRecord[], id: string): number {
  let maximum = 1;
  const pending: Array<{ id: string; depth: number }> = [{ id, depth: 1 }];
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) continue;
    maximum = Math.max(maximum, current.depth);
    for (const row of rows) {
      if (row.parentId === current.id) pending.push({ id: row.id, depth: current.depth + 1 });
    }
  }
  return maximum;
}
