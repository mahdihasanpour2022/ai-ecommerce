'use client';

import { App, Table } from 'antd';
import type { TableColumnsType } from 'antd';
import { useState } from 'react';
import type { Key } from 'react';
import { normalizeHttpFailure } from '../../../app/http/http-client';
import { UiButton } from '../../../app/components/shared/ui-button';
import { classNames } from '../../../app/components/shared/class-names';
import { formatPersianDateTime } from '../../../utils/date-time';
import { formatPersianInteger } from '../../../utils/number';
import { useDeleteCategories } from '../hooks/useDeleteCategories';
import { useEditCategory } from '../hooks/useEditCategory';
import type { Category, EditCategoryVariables } from '../interfaces/category-contract';
import { CategoryActionMenu } from './category-action-menu';
import { DeleteCategoryModal } from './delete-category-modal';
import { EditCategoryModal } from './edit-category-modal';

const ROW_LEVEL_CLASSES: Readonly<Record<number, string>> = {
  1: 'category-row-level-1',
  2: 'category-row-level-2',
  3: 'category-row-level-3',
  4: 'category-row-level-4',
  5: 'category-row-level-5',
  6: 'category-row-level-6',
};

export function CategoryTable({ categories }: Readonly<{ categories: readonly Category[] }>) {
  const { message } = App.useApp();
  const editCategory = useEditCategory();
  const deleteCategory = useDeleteCategories();
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [expandedRowKeys, setExpandedRowKeys] = useState<readonly Key[]>([]);
  const mutationPending = editCategory.isPending || deleteCategory.isPending;

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
      title: 'شناسه',
      dataIndex: 'id',
      key: 'id',
      render: (id: string) => (
        <span className="font-mono text-xs text-muted" dir="ltr" title={id}>
          {id}
        </span>
      ),
    },
    {
      title: 'نام',
      dataIndex: 'name',
      key: 'name',
      rowScope: 'row',
      render: (name: string, category) => (
        <div
          className={classNames(
            'flex min-w-48 items-center gap-2',
            category.level > 1 && 'border-s-2 border-brand-soft ps-3',
          )}
        >
          <span
            className={classNames(
              'size-2 shrink-0 rounded-full',
              category.level === 1 ? 'bg-brand' : 'bg-brand-soft',
            )}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 truncate font-semibold text-foreground" title={name}>
            {name}
          </span>
          <span
            className={classNames(
              'shrink-0 rounded-full border px-2 py-0 text-xs font-bold leading-6',
              category.level === 1
                ? 'border-brand-soft/50 bg-brand-soft/20 text-accent-foreground'
                : 'border-border bg-surface-muted text-muted',
            )}
          >
            {category.level === 1 ? 'اصلی' : `سطح ${formatPersianInteger(category.level)}`}
          </span>
        </div>
      ),
    },
    {
      title: 'زمان ایجاد',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (createdAt: string) => (
        <time className="whitespace-nowrap text-foreground" dateTime={createdAt}>
          {formatPersianDateTime(createdAt)}
        </time>
      ),
    },
    {
      title: 'زیر‌دسته‌ها',
      key: 'children',
      align: 'center',
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
                expanded
                  ? current.filter((key) => key !== category.id)
                  : [...current, category.id],
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
          pagination={false}
          rowKey="id"
          rowClassName={(category) =>
            ROW_LEVEL_CLASSES[category.level] ?? 'category-row-level-6'
          }
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
