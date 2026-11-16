'use client';

import type { ProductTagOption } from '@/hooks/shared/useGetProductTags';
import type { TableColumnsType } from 'antd';
import { App, Table } from 'antd';
import { useState } from 'react';
import { UiButton } from '../../../app/components/shared/ui-button';
import { normalizeHttpFailure } from '../../../app/http/http-client';
import { formatPersianInteger } from '../../../utils/number';
import { useDeleteProductTag } from '../hooks/useDeleteProductTag';
import { DeleteProductTagModal } from './delete-product-tag-modal';
import { ProductTagFormModal } from './product-tag-form-modal';

export function ProductTagTable({ tags }: Readonly<{ tags: readonly ProductTagOption[] }>) {
  const { message } = App.useApp();
  const deleteTag = useDeleteProductTag();
  const [deleting, setDeleting] = useState<ProductTagOption | null>(null);
  const [editing, setEditing] = useState<ProductTagOption | null>(null);

  // حذف تاییدشده را انجام می‌دهد و پیام امن API را نمایش می‌دهد.
  async function confirmDelete() {
    if (!deleting) return;
    try {
      const response = await deleteTag.mutateAsync(deleting['english-tag-name']);
      setDeleting(null);
      await message.success(response.message);
    } catch (error) {
      setDeleting(null);
      await message.error(normalizeHttpFailure(error).message);
    }
  }

  const columns: TableColumnsType<ProductTagOption> = [
    {
      title: 'ردیف',
      key: 'rowNumber',
      align: 'center',
      width: 72,
      render: (_value, _tag, index) => formatPersianInteger(index + 1),
    },
    {
      title: 'نام تگ',
      dataIndex: 'english-tag-name',
      key: 'englishName',
      render: (name: string) => <bdi className="direction-ltr text-muted isolate">{name}</bdi>,
    },
    {
      title: 'عملیات',
      key: 'actions',
      align: 'center',
      render: (_value, tag) => (
        <div className="flex items-center justify-center gap-2">
          <UiButton
            size="small"
            variant="secondary"
            disabled={deleteTag.isPending}
            aria-label={`ویرایش برچسب ${tag['english-tag-name']}`}
            onClick={() => setEditing(tag)}
          >
            ویرایش
          </UiButton>
          <UiButton
            size="small"
            variant="dangerSubtle"
            disabled={deleteTag.isPending}
            aria-label={`حذف برچسب ${tag['english-tag-name']}`}
            onClick={() => setDeleting(tag)}
          >
            حذف
          </UiButton>
        </div>
      ),
    },
  ];

  return (
    <>
      <div
        className="border-border bg-surface shadow-panel rounded-xl border"
        role="region"
        aria-label="جدول برچسب‌ها"
        tabIndex={0}
      >
        <Table<ProductTagOption>
          bordered
          columns={columns}
          dataSource={[...tags]}
          pagination={false}
          rowKey="english-tag-name"
          scroll={{ x: 'max-content' }}
          size="small"
        />
      </div>
      <DeleteProductTagModal
        tag={deleting}
        pending={deleteTag.isPending}
        onCancel={() => {
          if (!deleteTag.isPending) setDeleting(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
      <ProductTagFormModal
        mode="edit"
        open={editing !== null}
        tag={editing}
        onClose={() => setEditing(null)}
      />
    </>
  );
}
