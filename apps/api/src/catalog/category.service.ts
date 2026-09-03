import { Injectable } from '@nestjs/common';

import type { CategoryRecord } from './category.repository.js';
import { CategoryRepository } from './category.repository.js';
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

@Injectable()
export class CategoryService {
  constructor(private readonly repository: CategoryRepository) {}

  async list(): Promise<CategoryResponseDto[]> {
    return buildCategoryTree(await this.repository.list());
  }

  async create(input: CreateCategoryInput): Promise<CategoryResponseDto> {
    return this.runMutation('create', async () =>
      this.repository.transaction(async (transaction) => {
        const categories = await this.repository.listInTransaction(transaction);
        if (categories.length >= 1000) throw new CategoryError('CATEGORY_LIMIT_REACHED');
        const level = this.validateParent(categories, input.parentId, undefined, 1);
        this.assertSiblingAvailable(categories, input.parentId, input.nameKey);
        const created = await transaction.category.create({
          data: input,
          select: {
            id: true,
            name: true,
            nameKey: true,
            parentId: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        return toCategoryDto(created, level);
      }),
    );
  }

  async update(id: string, input: UpdateCategoryInput): Promise<CategoryResponseDto> {
    return this.runMutation('update', async () =>
      this.repository.transaction(async (transaction) => {
        const categories = await this.repository.listInTransaction(transaction);
        const existing = categories.find((category) => category.id === id);
        if (existing === undefined) throw new CategoryError('CATEGORY_NOT_FOUND');
        const parentId = input.parentId === undefined ? existing.parentId : input.parentId;
        const nameKey = input.nameKey ?? existing.nameKey;
        const subtreeHeight = categorySubtreeHeight(categories, id);
        const level = this.validateParent(categories, parentId, id, subtreeHeight);
        this.assertSiblingAvailable(categories, parentId, nameKey, id);
        const updated = await transaction.category.update({
          where: { id },
          data: {
            ...(input.name === undefined ? {} : { name: input.name, nameKey: input.nameKey }),
            ...(input.parentId === undefined ? {} : { parentId: input.parentId }),
          },
          select: {
            id: true,
            name: true,
            nameKey: true,
            parentId: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        return toCategoryDto(updated, level);
      }),
    );
  }

  async delete(id: string): Promise<void> {
    await this.runMutation('delete', async () =>
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
        await transaction.category.delete({ where: { id } });
      }),
    );
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
    children: [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
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
