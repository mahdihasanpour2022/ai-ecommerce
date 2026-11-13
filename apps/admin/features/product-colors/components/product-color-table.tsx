'use client';

import type { TableColumnsType } from 'antd';
import { App, Table } from 'antd';
import { useState } from 'react';
import { UiButton } from '../../../app/components/shared/ui-button';
import { normalizeHttpFailure } from '../../../app/http/http-client';
import { formatPersianInteger } from '../../../utils/number';
import type { ProductColorOption } from '../../../hooks/shared/useGetProductColors';
import { useDeleteProductColor } from '../hooks/useDeleteProductColor';
import { DeleteProductColorModal } from './delete-product-color-modal';
import { ProductColorFormModal } from './product-color-form-modal';

export function ProductColorTable({ colors }: Readonly<{ colors: readonly ProductColorOption[] }>) {
  const { message } = App.useApp();
  const deleteColor = useDeleteProductColor();
  const [deleting, setDeleting] = useState<ProductColorOption | null>(null);
  const [editing, setEditing] = useState<ProductColorOption | null>(null);

  async function confirmDelete() {
    if (!deleting) return;
    try {
      const response = await deleteColor.mutateAsync(deleting['english-color-name']);
      setDeleting(null);
      await message.success(response.message);
    } catch (error) {
      setDeleting(null);
      await message.error(normalizeHttpFailure(error).message);
    }
  }

  const columns: TableColumnsType<ProductColorOption> = [
    {
      title: 'ردیف',
      key: 'rowNumber',
      align: 'center',
      width: 72,
      render: (_value, _color, index) => formatPersianInteger(index + 1),
    },
    {
      title: 'رنگ',
      key: 'swatch',
      align: 'center',
      width: 80,
      render: (_value, color) => (
        <span
          className="inline-block size-6 rounded-full border border-border"
          style={{ backgroundColor: color['hex-code'] }}
          aria-label={`نمونه رنگ ${color['persian-color-name']}`}
          role="img"
        />
      ),
    },
    {
      title: 'نام فارسی',
      dataIndex: 'persian-color-name',
      key: 'persianName',
      render: (name: string) => <span className="font-semibold text-foreground">{name}</span>,
    },
    {
      title: 'نام انگلیسی',
      dataIndex: 'english-color-name',
      key: 'englishName',
      render: (name: string) => <bdi className="direction-ltr isolate text-muted">{name}</bdi>,
    },
    {
      title: 'کد رنگ',
      dataIndex: 'hex-code',
      key: 'hexCode',
      render: (hexCode: string) => (
        <bdi className="direction-ltr isolate font-mono text-muted">{hexCode}</bdi>
      ),
    },
    {
      title: 'عملیات',
      key: 'actions',
      align: 'center',
      render: (_value, color) => (
        <div className="flex items-center justify-center gap-2">
          <UiButton
            size="small"
            variant="secondary"
            disabled={deleteColor.isPending}
            aria-label={`ویرایش رنگ ${color['persian-color-name']}`}
            onClick={() => setEditing(color)}
          >
            ویرایش
          </UiButton>
          <UiButton
            size="small"
            variant="dangerSubtle"
            disabled={deleteColor.isPending}
            aria-label={`حذف رنگ ${color['persian-color-name']}`}
            onClick={() => setDeleting(color)}
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
        className="rounded-xl border border-border bg-surface shadow-panel"
        role="region"
        aria-label="جدول رنگ‌ها"
        tabIndex={0}
      >
        <Table<ProductColorOption>
          bordered
          columns={columns}
          dataSource={[...colors]}
          pagination={false}
          rowKey="english-color-name"
          scroll={{ x: 'max-content' }}
          size="small"
        />
      </div>
      <DeleteProductColorModal
        color={deleting}
        pending={deleteColor.isPending}
        onCancel={() => {
          if (!deleteColor.isPending) setDeleting(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
      <ProductColorFormModal
        mode="edit"
        open={editing !== null}
        color={editing}
        onClose={() => setEditing(null)}
      />
    </>
  );
}
