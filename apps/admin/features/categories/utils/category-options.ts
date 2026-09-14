import type { Category } from '../interfaces/category-contract';

export interface CategoryOption {
  readonly id: string;
  readonly label: string;
  readonly level: number;
}

export function categoryOptions(
  categories: readonly Category[],
  depth = 0,
): readonly CategoryOption[] {
  return categories.flatMap((category) => [
    { id: category.id, label: `${'— '.repeat(depth)}${category.name}`, level: category.level },
    ...categoryOptions(category.children, depth + 1),
  ]);
}

function descendantIds(category: Category): ReadonlySet<string> {
  const ids = new Set<string>();
  const visit = (children: readonly Category[]) => {
    for (const child of children) {
      ids.add(child.id);
      visit(child.children);
    }
  };
  visit(category.children);
  return ids;
}

function subtreeHeight(category: Category): number {
  return category.children.length === 0
    ? 1
    : 1 + Math.max(...category.children.map(subtreeHeight));
}

export function validEditParentOptions(
  categories: readonly Category[],
  category: Category,
): readonly CategoryOption[] {
  const blockedIds = descendantIds(category);
  const height = subtreeHeight(category);
  return categoryOptions(categories).filter(
    (option) =>
      option.id !== category.id &&
      !blockedIds.has(option.id) &&
      option.level + height <= 6,
  );
}
