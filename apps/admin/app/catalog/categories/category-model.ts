import type { CategoryDto } from '../catalog-contracts';

export interface CategoryOption {
  readonly value: string | null;
  readonly label: string;
  readonly level: number;
}

export function normalizeCategoryName(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/gu, ' ');
}

export function categoryNameError(value: string): string | undefined {
  const normalized = normalizeCategoryName(value);
  const characters = Array.from(normalized);
  if (characters.length === 0) return 'نام دسته‌بندی الزامی است.';
  if (characters.length > 120) return 'نام دسته‌بندی باید حداکثر ۱۲۰ نویسه باشد.';
  if (
    characters.some((character) => {
      const point = character.codePointAt(0);
      return point !== undefined && (point < 32 || (point >= 127 && point <= 159));
    })
  ) {
    return 'نام دسته‌بندی شامل نویسهٔ مجاز نیست.';
  }
  return undefined;
}

export function categoryOptions(
  tree: readonly CategoryDto[],
  excludedRootId?: string,
): readonly CategoryOption[] {
  const options: CategoryOption[] = [{ value: null, label: 'ریشه', level: 0 }];

  function visit(nodes: readonly CategoryDto[], excluded: boolean) {
    for (const node of nodes) {
      const isExcluded = excluded || node.id === excludedRootId;
      if (!isExcluded) {
        options.push({ value: node.id, label: node.name, level: node.level });
      }
      visit(node.children, isExcluded);
    }
  }

  visit(tree, false);
  return options;
}

export function findCategory(
  tree: readonly CategoryDto[],
  categoryId: string,
): CategoryDto | undefined {
  for (const node of tree) {
    if (node.id === categoryId) return node;
    const child = findCategory(node.children, categoryId);
    if (child) return child;
  }
  return undefined;
}

export function reconcileCreatedCategory(
  tree: readonly CategoryDto[],
  created: CategoryDto,
): readonly CategoryDto[] {
  if (created.parentId === null) return [...tree, created];
  let inserted = false;
  const visit = (nodes: readonly CategoryDto[]): readonly CategoryDto[] =>
    nodes.map((node) => {
      if (node.id === created.parentId) {
        inserted = true;
        return { ...node, children: [...node.children, created] };
      }
      const children = visit(node.children);
      return children === node.children ? node : { ...node, children };
    });
  const next = visit(tree);
  return inserted ? next : tree;
}

export function reconcileUpdatedCategory(
  tree: readonly CategoryDto[],
  updated: CategoryDto,
): readonly CategoryDto[] {
  return tree.map((node) => {
    if (node.id === updated.id) {
      if (node.parentId !== updated.parentId) {
        return { ...node, name: updated.name, updatedAt: updated.updatedAt };
      }
      return { ...updated, children: node.children };
    }
    const children = reconcileUpdatedCategory(node.children, updated);
    return children === node.children ? node : { ...node, children };
  });
}

export function reconcileDeletedCategory(
  tree: readonly CategoryDto[],
  deletedId: string,
): readonly CategoryDto[] {
  return tree
    .filter((node) => node.id !== deletedId)
    .map((node) => {
      const children = reconcileDeletedCategory(node.children, deletedId);
      return children === node.children ? node : { ...node, children };
    });
}
