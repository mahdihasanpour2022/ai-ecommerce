'use client';

import type { ProductSizeOption } from '@/hooks/shared/useGetProductSizes';
import type { TableColumnsType } from 'antd';
import { App, Table } from 'antd';
import { useState } from 'react';
import { UiButton } from '../../../app/components/shared/ui-button';
import { normalizeHttpFailure } from '../../../app/http/http-client';
import { formatPersianInteger } from '../../../utils/number';
import { DeleteProductSizeModal } from './delete-product-size-modal';
import { ProductSizeFormModal } from './product-size-form-modal';
import { useDeleteProductSize } from '../hooks/useDeleteProductSize';

export function ProductSizeTable({ sizes }: Readonly<{ sizes: readonly ProductSizeOption[] }>) {
  const { message } = App.useApp();
  const deleteSize = useDeleteProductSize();
  const [deleting, setDeleting] = useState<ProductSizeOption | null>(null);
  const [editing, setEditing] = useState<ProductSizeOption | null>(null);

  async function confirmDelete() {
    if (!deleting) return;
    try {
      const response = await deleteSize.mutateAsync(deleting['english-size-name']);
      setDeleting(null);
      await message.success(response.message);
    } catch (error) {
      setDeleting(null);
      await message.error(normalizeHttpFailure(error).message);
    }
  }

  const columns: TableColumnsType<ProductSizeOption> = [
    {
      title: 'ردیف',
      key: 'rowNumber',
      align: 'center',
      width: 72,
      render: (_value, _size, index) => formatPersianInteger(index + 1),
    },
    {
      title: 'نام فارسی',
      dataIndex: 'persian-size-name',
      key: 'persianName',
      render: (name: string) => <span className="text-foreground font-semibold">{name}</span>,
    },
    {
      title: 'نام انگلیسی',
      dataIndex: 'english-size-name',
      key: 'englishName',
      render: (name: string) => <bdi className="direction-ltr text-muted isolate">{name}</bdi>,
    },
    {
      title: 'عملیات',
      key: 'actions',
      align: 'center',
      render: (_value, size) => (
        <div className="flex items-center justify-center gap-2">
          <UiButton
            size="small"
            variant="secondary"
            disabled={deleteSize.isPending}
            aria-label={`ویرایش سایز ${size['persian-size-name']}`}
            onClick={() => setEditing(size)}
          >
            ویرایش
          </UiButton>
          <UiButton
            size="small"
            variant="dangerSubtle"
            disabled={deleteSize.isPending}
            aria-label={`حذف سایز ${size['persian-size-name']}`}
            onClick={() => setDeleting(size)}
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
        aria-label="جدول سایز‌ها"
        tabIndex={0}
      >
        <Table<ProductSizeOption>
          bordered
          columns={columns}
          dataSource={[...sizes]}
          pagination={false}
          rowKey="english-size-name"
          scroll={{ x: 'max-content' }}
          size="small"
        />
      </div>
      <DeleteProductSizeModal
        size={deleting}
        pending={deleteSize.isPending}
        onCancel={() => {
          if (!deleteSize.isPending) setDeleting(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
      <ProductSizeFormModal
        mode="edit"
        open={editing !== null}
        size={editing}
        onClose={() => setEditing(null)}
      />
    </>
  );
}
