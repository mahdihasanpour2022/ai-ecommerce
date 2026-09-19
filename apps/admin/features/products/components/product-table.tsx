'use client';

import type { TableColumnsType } from 'antd';
import { App, Table } from 'antd';
import { useState } from 'react';
import { normalizeHttpFailure } from '../../../app/http/http-client';
import { formatPersianDateTime } from '../../../utils/date-time';
import { formatPersianInteger } from '../../../utils/number';
import { useChangeProductStatus } from '../hooks/useChangeProductStatus';
import { useEditProductWorkflow } from '../hooks/useEditProductWorkflow';
import { useGetProductStatuses } from '../hooks/useGetProductOptions';
import type {
  ChangeProductStatusVariables,
  EditProductWorkflowVariables,
  Product,
  ProductStatus,
} from '../interfaces/product-contract';
import type { ProductStatusOption } from '../interfaces/product-option-contract';
import { ChangeProductStatusModal } from './change-product-status-modal';
import { EditProductModal } from './edit-product-modal';
import { ProductActionMenu } from './product-action-menu';
import { ProductThumbnail } from './productThumbnail';

const rialFormatter = new Intl.NumberFormat('fa-IR', {
  maximumFractionDigits: 0,
});

function ProductStatusBadge({
  status,
  statuses,
}: Readonly<{ status: ProductStatus; statuses: readonly ProductStatusOption[] }>) {
  const content = statuses.find(({ status_english_name }) => status_english_name === status);
  return (
    <span className="inline-flex rounded-full bg-surface-muted px-2 py-1 text-xs font-bold text-foreground">
      {content?.status_persian_name ?? status}
    </span>
  );
}

function formatPriceRange(product: Product): string {
  const minimum = `${rialFormatter.format(product.minimumPriceRial)} ریال`;
  if (product.minimumPriceRial === product.maximumPriceRial) return minimum;
  return `${minimum} تا ${rialFormatter.format(product.maximumPriceRial)} ریال`;
}

function ProductLabels({
  labels,
  emptyLabel,
}: Readonly<{ labels: readonly string[]; emptyLabel: string }>) {
  if (labels.length === 0) {
    return <span className="text-foreground-muted">{emptyLabel}</span>;
  }

  return (
    <div className="flex max-w-56 flex-wrap gap-1">
      {labels.map((label) => (
        <span
          key={label}
          className="inline-flex rounded-full bg-surface-muted px-2 py-1 text-xs font-semibold text-foreground"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

interface ProductTableProps {
  readonly products: readonly Product[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly onPageChange: (page: number) => void;
}

export function ProductTable({
  products,
  page,
  pageSize,
  totalItems,
  onPageChange,
}: ProductTableProps) {
  const { message } = App.useApp();
  const statuses = useGetProductStatuses();
  const editProduct = useEditProductWorkflow();
  const changeProductStatus = useChangeProductStatus();
  const [editing, setEditing] = useState<Product | null>(null);
  const [changingStatus, setChangingStatus] = useState<Product | null>(null);

  const mutationPending = editProduct.isPending || changeProductStatus.isPending;
  async function submitEdit(variables: EditProductWorkflowVariables) {
    try {
      const changed = await editProduct.save(variables);
      setEditing(null);
      await (changed
        ? message.success('تغییرات محصول با موفقیت ذخیره شد.')
        : message.info('تغییری برای ذخیره وجود نداشت.'));
    } catch (error) {
      await message.error(
        `ذخیره کامل نشد و برخی تغییرات ممکن است اعمال شده باشند. ${normalizeHttpFailure(error).message}`,
      );
    }
  }

  async function submitStatusChange(variables: ChangeProductStatusVariables) {
    try {
      const response = await changeProductStatus.mutateAsync(variables);
      setChangingStatus(null);
      await message.success(response.message);
    } catch (error) {
      await message.error(normalizeHttpFailure(error).message);
    }
  }

  const columns: TableColumnsType<Product> = [
    {
      title: 'ردیف',
      key: 'rowNumber',
      align: 'center',
      width: 72,
      render: (_value, _product, index) => (
        <span className="text-foreground">
          {formatPersianInteger((page - 1) * pageSize + index + 1)}
        </span>
      ),
    },
    {
      title: 'تصویر',
      key: 'image',
      align: 'center',
      width: 80,
      render: (_value, product) => <ProductThumbnail product={product} />,
    },
    {
      title: 'محصول',
      dataIndex: 'name',
      key: 'name',
      // rowScope: 'row',
      render: (_name: string, product) => (
        <div className="min-w-24">
          <p className="m-0 truncate text-foreground" title={product.name}>
            {product.name}
          </p>
        </div>
      ),
    },
    {
      title: 'دسته‌بندی',
      dataIndex: ['category', 'name'],
      key: 'category',
      render: (name: string) => <span className="whitespace-nowrap text-foreground">{name}</span>,
    },
    {
      title: 'توضیحات',
      dataIndex: 'description',
      key: 'description',
      render: (description: string | null) =>
        description === null ? (
          <span className="text-foreground-muted">بدون توضیحات</span>
        ) : (
          <p className="m-0 max-w-56 line-clamp-2 text-sm text-foreground" title={description}>
            {description}
          </p>
        ),
    },
    {
      title: 'سایز',
      dataIndex: 'sizes',
      key: 'sizes',
      render: (sizes: readonly string[]) => <ProductLabels labels={sizes} emptyLabel="بدون سایز" />,
    },
    {
      title: 'رنگ',
      dataIndex: 'colors',
      key: 'colors',
      render: (colors: readonly string[]) => (
        <ProductLabels labels={colors} emptyLabel="بدون رنگ" />
      ),
    },
    {
      title: 'وضعیت',
      dataIndex: 'status',
      key: 'status',
      render: (status: ProductStatus) => (
        <ProductStatusBadge status={status} statuses={statuses.data?.result ?? []} />
      ),
    },
    {
      title: 'تنوع‌ها',
      key: 'variants',
      align: 'center',
      render: (_value, product) => (
        <span className="whitespace-nowrap text-foreground">
          {formatPersianInteger(product.activeVariantCount)} فعال از{' '}
          {formatPersianInteger(product.variantCount)}
        </span>
      ),
    },
    {
      title: 'موجودی',
      dataIndex: 'totalOnHandQuantity',
      key: 'inventory',
      align: 'center',
      render: (quantity: number) => (
        <span className="text-foreground">{formatPersianInteger(quantity)}</span>
      ),
    },
    {
      title: 'قیمت',
      key: 'price',
      render: (_value, product) => (
        <span className="whitespace-nowrap text-foreground">{formatPriceRange(product)}</span>
      ),
    },
    {
      title: 'تاریخ ایجاد',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (createdAt: string) => (
        <time className="whitespace-nowrap text-foreground" dateTime={createdAt}>
          {formatPersianDateTime(createdAt)}
        </time>
      ),
    },
    {
      title: 'عملیات',
      key: 'actions',
      align: 'center',
      render: (_value, product) => (
        <ProductActionMenu
          product={product}
          disabled={mutationPending}
          onEdit={setEditing}
          onChangeStatus={setChangingStatus}
        />
      ),
    },
  ];

  return (
    <>
      <div
        className="rounded-xl border border-border bg-surface shadow-panel"
        role="region"
        aria-label="جدول محصولات"
        tabIndex={0}
      >
        <Table<Product>
          bordered
          columns={columns}
          dataSource={[...products]}
          rowKey="id"
          scroll={{ x: 'max-content' }}
          size="small"
          pagination={{
            current: page,
            pageSize,
            total: totalItems,
            showSizeChanger: false,
            showTotal: (total) => `${formatPersianInteger(total)} محصول`,
            onChange: onPageChange,
          }}
        />
      </div>
      {editing ? (
        <EditProductModal
          product={editing}
          pending={editProduct.isPending}
          onCancel={() => {
            if (!editProduct.isPending) setEditing(null);
          }}
          onSubmit={submitEdit}
        />
      ) : null}
      {changingStatus ? (
        <ChangeProductStatusModal
          product={changingStatus}
          statuses={statuses.data?.result ?? []}
          statusesPending={statuses.isPending}
          statusesFailed={statuses.isError}
          pending={changeProductStatus.isPending}
          onCancel={() => {
            if (!changeProductStatus.isPending) setChangingStatus(null);
          }}
          onSubmit={submitStatusChange}
        />
      ) : null}
    </>
  );
}
