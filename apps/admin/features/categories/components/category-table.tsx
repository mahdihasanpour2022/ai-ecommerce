'use client';

import type { TableColumnsType } from 'antd';
import { App, Table } from 'antd';
import type { Key } from 'react';
import { useMemo, useState } from 'react';
import { classNames } from '../../../app/components/shared/class-names';
import { UiButton } from '../../../app/components/shared/ui-button';
import { normalizeHttpFailure } from '../../../app/http/http-client';
import { formatPersianDateTime } from '../../../utils/date-time';
import { formatPersianInteger } from '../../../utils/number';
import { CATEGORY_PAGE_SIZE } from '../constants/pagination';
import { useDeleteCategories } from '../hooks/useDeleteCategories';
import { useEditCategory } from '../hooks/useEditCategory';
import type { Category, EditCategoryVariables } from '../interfaces/category-contract';
import { CategoryActionMenu } from './category-action-menu';
import { DeleteCategoryModal } from './delete-category-modal';
import { EditCategoryModal } from './edit-category-modal';
import { CategoryThumbnail } from './category-thumbnail';

const ROW_LEVEL_CLASSES: Readonly<Record<number, string>> = {
  1: 'category-row-level-1',
  2: 'category-row-level-2',
  3: 'category-row-level-3',
  4: 'category-row-level-4',
  5: 'category-row-level-5',
  6: 'category-row-level-6',
};

interface CategoryTableProps {
  readonly categories: readonly Category[];
  readonly page?: number;
  readonly onPageChange?: (page: number) => void;
}

export function CategoryTable({
  categories,
  page = 1,
  onPageChange = () => undefined,
}: CategoryTableProps) {
  const { message } = App.useApp();
  const editCategory = useEditCategory();
  const deleteCategory = useDeleteCategories();
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [expandedRowKeys, setExpandedRowKeys] = useState<readonly Key[]>([]);
  const mutationPending = editCategory.isPending || deleteCategory.isPending;
  const rowNumbers = useMemo(() => {
    const numbers = new Map<string, number>();
    let current = 0;
    const visit = (items: readonly Category[]) => {
      for (const category of items) {
        current += 1;
        numbers.set(category.id, current);
        visit(category.children);
      }
    };
    visit(categories);
    return numbers;
  }, [categories]);

  async function submitEdit(variables: EditCategoryVariables) {
    try {
      const response = await editCategory.mutateAsync(variables);
      setEditing(null);
      await message.success(response.message);
    } catch (error) {
      setEditing(null);
      await message.error(normalizeHttpFailure(error).message);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      const response = await deleteCategory.mutateAsync(deleting.id);
      setDeleting(null);
      await message.success(response.message);
    } catch (error) {
      setDeleting(null);
      await message.error(normalizeHttpFailure(error).message);
    }
  }

  const columns: TableColumnsType<Category> = [
    {
      title: 'ردیف',
      key: 'rowNumber',
      align: 'center',
      width: 72,
      render: (_value, category) => (
        <span className="text-foreground">
          {formatPersianInteger(rowNumbers.get(category.id) ?? 0)}
        </span>
      ),
    },
    {
      title: 'تصویر',
      key: 'image',
      align: 'center',
      width: 80,
      render: (_value, category) => <CategoryThumbnail category={category} />,
    },
    {
      title: 'نام',
      dataIndex: 'name',
      key: 'name',
      // rowScope: 'row',
      className: '',
      render: (name: string) => (
        <div className={classNames('flex w-fit! items-center gap-2')}>
          <span className={classNames('size-2 shrink-0 rounded-full')} aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate font-semibold text-foreground" title={name}>
            {name}
          </span>
        </div>
      ),
    },
    {
      title: 'سطح',
      dataIndex: 'level',
      key: 'level',
      className: 'min-w-24!',
      render: (level: number) => {
        return (
          <span className={classNames('px-2 py-0 text-sm')}>
            {level === 1 ? 'اصلی' : `سطح ${formatPersianInteger(level)}`}
          </span>
        );
      },
    },
    {
      title: 'زمان ایجاد',
      dataIndex: 'createdAt',
      key: 'createdAt',
      className: 'w-fit',
      render: (createdAt: string) => (
        <time className="whitespace-nowrap" dateTime={createdAt}>
          {formatPersianDateTime(createdAt)}
        </time>
      ),
    },
    {
      title: 'زیر‌دسته‌ها',
      key: 'children',
      align: 'center',
      className: 'w-28',
      render: (_value, category) => {
        if (category.children.length === 0) return '—';
        const expanded = expandedRowKeys.includes(category.id);
        return (
          <UiButton
            size="small"
            variant="ghost"
            aria-expanded={expanded}
            aria-label={`${expanded ? 'بستن' : 'نمایش'} زیر‌دسته‌های ${category.name}`}
            onClick={() =>
              setExpandedRowKeys((current) =>
                expanded ? current.filter((key) => key !== category.id) : [...current, category.id],
              )
            }
          >
            <span aria-hidden="true">{expanded ? '−' : '+'}</span>
            <span>{formatPersianInteger(category.children.length)}</span>
          </UiButton>
        );
      },
    },
    {
      title: 'عملیات',
      key: 'actions',
      align: 'center',
      render: (_value, category) => (
        <CategoryActionMenu
          category={category}
          disabled={mutationPending}
          onEdit={setEditing}
          onDelete={setDeleting}
        />
      ),
    },
  ];

  return (
    <>
      <div
        className="rounded-xl border border-border bg-surface shadow-panel"
        role="region"
        aria-label="جدول دسته‌بندی‌ها"
        tabIndex={0}
      >
        <Table<Category>
          bordered
          className="category-tree-table"
          columns={columns}
          dataSource={[...categories]}
          pagination={{
            current: page,
            pageSize: CATEGORY_PAGE_SIZE,
            total: categories.length,
            showSizeChanger: false,
            showTotal: (total) => `${formatPersianInteger(total)} دسته‌بندی`,
            onChange: onPageChange,
          }}
          rowKey="id"
          rowClassName={(category) => ROW_LEVEL_CLASSES[category.level] ?? 'category-row-level-6'}
          scroll={{ x: 'max-content' }}
          size="small"
          expandable={{
            childrenColumnName: 'children',
            expandedRowKeys,
            indentSize: 20,
            rowExpandable: (category) => category.children.length > 0,
            showExpandColumn: false,
            onExpandedRowsChange: setExpandedRowKeys,
          }}
        />
      </div>

      <EditCategoryModal
        category={editing}
        categories={categories}
        pending={editCategory.isPending}
        onCancel={() => {
          if (!editCategory.isPending) setEditing(null);
        }}
        onSubmit={submitEdit}
      />
      <DeleteCategoryModal
        category={deleting}
        pending={deleteCategory.isPending}
        onCancel={() => {
          if (!deleteCategory.isPending) setDeleting(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
