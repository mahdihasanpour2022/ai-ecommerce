'use client';

import { App, Table } from 'antd';
import type { TableColumnsType } from 'antd';
import Image from 'next/image';
import { useState } from 'react';
import { UiButton } from '../../../app/components/shared/ui-button';
import { UiForm } from '../../../app/components/shared/ui-form';
import { UiModal } from '../../../app/components/shared/ui-modal';
import { normalizeHttpFailure } from '../../../app/http/http-client';
import { formatPersianInteger } from '../../../utils/number';
import { useDeleteProductVariant } from '../hooks/useDeleteProductVariant';
import { useGetProductDetail } from '../hooks/useGetProductDetail';
import type { ProductVariant } from '../interfaces/product-contract';
import { AddProductVariantModal } from './add-product-variant-modal';
import { EditProductVariantModal } from './edit-product-variant-modal';

function VariantThumbnail({ variant }: Readonly<{ variant: ProductVariant }>) {
  const [open, setOpen] = useState(false);
  if (!variant.image) return <span className="text-muted text-xs">بدون تصویر</span>;
  const url = `/api/v1/admin/catalog/product-images/${variant.image.id}/content`;
  return (
    <>
      <button
        type="button"
        className="border-border size-12 cursor-zoom-in overflow-hidden rounded-lg border p-0"
        aria-label={`نمایش تصویر واریانت ${variant.size ?? ''} ${variant.color?.persianColorName ?? ''}`}
        onClick={() => setOpen(true)}
      >
        <Image
          className="size-12 object-cover"
          src={url}
          alt="تصویر واریانت"
          width={48}
          height={48}
          unoptimized
        />
      </button>
      <UiModal.Root
        open={open}
        title="تصویر واریانت"
        width={{ xs: 'calc(100vw - 2rem)', sm: '50vw' }}
        onCancel={() => setOpen(false)}
      >
        <Image
          className="h-auto w-full rounded-xl object-contain"
          src={url}
          alt="تصویر بزرگ واریانت"
          width={variant.image.width}
          height={variant.image.height}
          sizes="(min-width: 640px) 50vw, calc(100vw - 2rem)"
          unoptimized
        />
      </UiModal.Root>
    </>
  );
}

export function ProductVariantsExpandedRow({ productId }: Readonly<{ productId: string }>) {
  const { message } = App.useApp();
  const detail = useGetProductDetail(productId);
  const deleteVariant = useDeleteProductVariant();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ProductVariant | null>(null);
  const [deleting, setDeleting] = useState<ProductVariant | null>(null);

  if (detail.isFetching) {
    return <p className="text-muted m-0 p-4 text-sm">در حال دریافت واریانت‌ها…</p>;
  }
  if (detail.isError || !detail.data?.singleResult) {
    return <p className="text-danger m-0 p-4 text-sm">دریافت واریانت‌ها ناموفق بود.</p>;
  }

  const product = detail.data.singleResult;

  // حذف واریانت از همان ردیف انجام و جزئیات محصول پس از موفقیت تازه‌سازی می‌شود.
  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      const response = await deleteVariant.mutateAsync(deleting.id);
      setDeleting(null);
      await message.success(response.message);
    } catch (error) {
      await message.error(normalizeHttpFailure(error).message);
    }
  };

  // ردیف‌های زیرمجموعه، مشخصات فروش و عملیات هر واریانت را مستقل نشان می‌دهند.
  const columns: TableColumnsType<ProductVariant> = [
    {
      title: 'تصویر',
      key: 'image',
      align: 'center',
      render: (_value, variant) => <VariantThumbnail variant={variant} />,
    },
    {
      title: 'رنگ',
      dataIndex: 'color',
      key: 'color',
      render: (color: ProductVariant['color']) => color?.persianColorName ?? '—',
    },
    {
      title: 'سایز',
      dataIndex: 'size',
      key: 'size',
      render: (size: string | null) => size ?? '—',
    },
    {
      title: 'موجودی',
      key: 'inventory',
      align: 'center',
      render: (_value, variant) => formatPersianInteger(variant.inventory.onHandQuantity),
    },
    {
      title: 'وضعیت',
      key: 'status',
      align: 'center',
      render: (_value, variant) => (
        <span className="text-foreground whitespace-nowrap">
          {variant.isActive ? 'فعال' : 'غیرفعال'}
        </span>
      ),
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      render: (sku: string) => <bdi className="text-foreground isolate">{sku}</bdi>,
    },
    {
      title: 'عملیات',
      key: 'actions',
      align: 'center',
      render: (_value, variant) => (
        <div className="flex flex-wrap justify-center gap-2">
          <UiButton
            type="button"
            size="small"
            variant="secondary"
            disabled={deleteVariant.isPending}
            onClick={() => setEditing(variant)}
          >
            ویرایش
          </UiButton>
          <UiButton
            type="button"
            size="small"
            variant="dangerSubtle"
            disabled={deleteVariant.isPending || product.variants.length === 1}
            onClick={() => setDeleting(variant)}
          >
            حذف
          </UiButton>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="mb-3 flex justify-end">
        <UiButton
          type="button"
          size="small"
          variant="secondary"
          disabled={deleteVariant.isPending || product.variants.length >= 9}
          onClick={() => setAdding(true)}
        >
          افزودن واریانت
        </UiButton>
      </div>
      <Table<ProductVariant>
        bordered
        columns={columns}
        dataSource={[...product.variants]}
        rowKey="id"
        pagination={false}
        size="small"
        scroll={{ x: 'max-content' }}
      />
      <AddProductVariantModal
        productId={product.id}
        imageVersion={product.imageVersion}
        open={adding}
        onClose={() => setAdding(false)}
      />
      <EditProductVariantModal variant={editing} onClose={() => setEditing(null)} />
      <UiModal.Root
        open={deleting !== null}
        title="حذف واریانت"
        closable={!deleteVariant.isPending}
        keyboard={!deleteVariant.isPending}
        mask={{ closable: !deleteVariant.isPending }}
        onCancel={() => setDeleting(null)}
      >
        <p className="text-foreground m-0 leading-8">
          واریانت «{deleting?.sku ?? ''}» برای همیشه حذف شود؟
        </p>
        <UiForm.Actions>
          <UiButton
            variant="secondary"
            disabled={deleteVariant.isPending}
            onClick={() => setDeleting(null)}
          >
            انصراف
          </UiButton>
          <UiButton
            variant="dangerSubtle"
            loading={deleteVariant.isPending}
            onClick={() => void confirmDelete()}
          >
            حذف واریانت
          </UiButton>
        </UiForm.Actions>
      </UiModal.Root>
    </>
  );
}
