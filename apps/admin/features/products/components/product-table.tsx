'use client';

import type { TableColumnsType } from 'antd';
import { App, Table } from 'antd';
import { useMemo, useState } from 'react';
import { UiButton } from '../../../app/components/shared/ui-button';
import { normalizeHttpFailure } from '../../../app/http/http-client';
import { useGetProductColors } from '../../../hooks/shared/useGetProductColors';
import { useGetProductSizes } from '../../../hooks/shared/useGetProductSizes';
import { formatPersianDateTime } from '../../../utils/date-time';
import { formatPersianInteger } from '../../../utils/number';
import { useChangeProductStatus } from '../hooks/useChangeProductStatus';
import { useDeleteProduct } from '../hooks/useDeleteProduct';
import { useEditProductWorkflow } from '../hooks/useEditProductWorkflow';
import type {
  ChangeProductStatusVariables,
  EditProductWorkflowVariables,
  Product,
  ProductStatus,
} from '../interfaces/product-contract';
import { ChangeProductStatusModal } from './change-product-status-modal';
import { DeleteProductModal } from './delete-product-modal';
import { EditProductModal } from './edit-product-modal';
import { ProductActionMenu } from './product-action-menu';
import { ProductSpecificationsModal } from './product-specifications-modal';
import { ProductVariantsExpandedRow } from './product-variants-expanded-row';
import { ProductThumbnail } from './productThumbnail';

const rialFormatter = new Intl.NumberFormat('fa-IR', {
  maximumFractionDigits: 0,
});

function ProductStatusBadge({ status }: Readonly<{ status: ProductStatus }>) {
  const labels: Readonly<Record<ProductStatus, string>> = {
    DRAFT: 'پیش‌نویس',
    ACTIVE: 'فعال',
    ARCHIVED: 'بایگانی‌شده',
  };
  return (
    <span className="bg-surface-muted text-foreground inline-flex rounded-full px-2 py-1 text-xs font-bold">
      {labels[status]}
    </span>
  );
}

function formatRialPrice(price: number): string {
  return `${rialFormatter.format(price)} ریال`;
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
          className="bg-surface-muted text-foreground inline-flex rounded-full border border-gray-200 px-2 py-1 text-xs font-semibold"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

interface ProductColorBadge {
  readonly key: string;
  readonly label: string;
  readonly hexCode: string | null;
}

function ProductColorLabels({ colors }: Readonly<{ colors: readonly ProductColorBadge[] }>) {
  if (colors.length === 0) {
    return <span className="text-foreground-muted">بدون رنگ</span>;
  }

  return (
    <div className="flex max-w-56 flex-wrap gap-1">
      {colors.map((color) => (
        <span
          key={color.key}
          className="bg-surface-muted text-foreground/50 border-foreground/20 inline-flex h-4 w-4 rounded-full border text-xs font-semibold"

          style={color.hexCode ? { backgroundColor: color.hexCode } : undefined}
        >
          {/* {color.label} */}
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
  const editProduct = useEditProductWorkflow();
  const changeProductStatus = useChangeProductStatus();
  const deleteProduct = useDeleteProduct();
  const sizeOptions = useGetProductSizes();
  const colorOptions = useGetProductColors();
  const [editing, setEditing] = useState<Product | null>(null);
  const [viewingSpecifications, setViewingSpecifications] = useState<Product | null>(null);
  const [changingStatus, setChangingStatus] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const mutationPending =
    editProduct.isPending || changeProductStatus.isPending || deleteProduct.isPending;
  const sizeLabels = useMemo(
    () =>
      new Map(
        (sizeOptions.data?.result ?? []).map((size) => [
          size['english-size-name'],
          size['english-size-name'],
        ]),
      ),
    [sizeOptions.data?.result],
  );
  const colorBadges = useMemo(
    () =>
      new Map(
        (colorOptions.data?.result ?? []).map((color) => [
          color['english-color-name'],
          {
            label: color['persian-color-name'],
            hexCode: color['hex-code'],
          },
        ]),
      ),
    [colorOptions.data?.result],
  );
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

  async function confirmDelete() {
    if (!deleting) return;
    try {
      const response = await deleteProduct.mutateAsync(deleting.id);
      setDeleting(null);
      await message.success(response.message);
    } catch (error) {
      setDeleting(null);
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
      rowScope: 'row',
      render: (_name: string, product) => (
        <div className="min-w-24">
          <p className="text-foreground m-0 truncate" title={product.name}>
            {product.name}
          </p>
        </div>
      ),
    },
    {
      title: 'دسته‌بندی',
      dataIndex: ['category', 'name'],
      key: 'category',
      render: (name: string) => <span className="text-foreground whitespace-nowrap">{name}</span>,
    },
    {
      title: 'تگ',
      dataIndex: 'tag',
      key: 'tag',
      render: (tag: string | null) => (
        <span className="text-foreground whitespace-nowrap" dir="ltr">
          {tag ?? '—'}
        </span>
      ),
    },
    {
      title: 'توضیحات',
      dataIndex: 'description',
      key: 'description',
      render: (description: string | null) =>
        description === null ? (
          <span className="text-foreground-muted">بدون توضیحات</span>
        ) : (
          <p
            className="text-foreground m-0 line-clamp-2 max-w-24 truncate text-sm"
            title={description}
          >
            {description}
          </p>
        ),
    },
    {
      title: 'ویژگی‌ها',
      key: 'secondarySpecifications',
      align: 'center',
      render: (_value, product) => {
        const count = Math.max(0, product.specificationCount - product.mainSpecs.length);
        return (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-foreground w-full text-center!">
              {count === 0 && 'بدون ویژگی فرعی'}
            </span>
            {count > 0 ? (
              <UiButton
                type="button"
                size="small"
                variant="ghost"
                className="min-h-0 p-0"
                aria-label={`مشاهده ویژگی‌های فرعی ${product.name}`}
                onClick={() => setViewingSpecifications(product)}
              >
                برای مشاهده <span className="text-red-500">کلیک</span> کنید.
              </UiButton>
            ) : null}
          </div>
        );
      },
    },
    {
      title: 'سایز',
      dataIndex: 'sizes',
      key: 'sizes',
      render: (sizes: readonly string[]) => (
        <ProductLabels
          labels={sizes.map((size) => sizeLabels.get(size) ?? size)}
          emptyLabel="بدون سایز"
        />
      ),
    },
    {
      title: 'رنگ',
      dataIndex: 'colors',
      key: 'colors',
      render: (colors: readonly string[]) => (
        <ProductColorLabels
          colors={colors.map((color) => ({
            key: color,
            label: colorBadges.get(color)?.label ?? color,
            hexCode: colorBadges.get(color)?.hexCode ?? null,
          }))}
        />
      ),
    },
    {
      title: 'وضعیت',
      dataIndex: 'status',
      key: 'status',
      render: (status: ProductStatus) => <ProductStatusBadge status={status} />,
    },
    {
      title: 'واریانت‌ها',
      key: 'variants',
      align: 'center',
      render: (_value, product) => (
        <span className="text-foreground whitespace-nowrap">
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
      title: 'قیمت اصلی',
      dataIndex: 'originalPriceRial',
      key: 'originalPriceRial',
      render: (price: number) => (
        <span className="text-foreground whitespace-nowrap">{formatRialPrice(price)}</span>
      ),
    },
    {
      title: 'تخفیف',
      dataIndex: 'discountPercent',
      key: 'discountPercent',
      align: 'center',
      render: (discountPercent: number) => (
        <span className="text-foreground whitespace-nowrap">
          {formatPersianInteger(discountPercent)}٪
        </span>
      ),
    },
    {
      title: 'قیمت نهایی',
      dataIndex: 'finalPriceRial',
      key: 'finalPriceRial',
      render: (price: number) => (
        <span className="text-foreground whitespace-nowrap">{formatRialPrice(price)}</span>
      ),
    },
    {
      title: 'تاریخ ایجاد',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (createdAt: string) => (
        <time className="text-foreground whitespace-nowrap" dateTime={createdAt}>
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
          onDelete={setDeleting}
        />
      ),
    },
  ];

  return (
    <>
      <div
        className="border-border bg-surface shadow-panel rounded-xl border"
        role="region"
        aria-label="جدول محصولات"
        tabIndex={0}
      >
        <Table<Product>
          bordered
          columns={columns}
          dataSource={[...products]}
          rowKey="id"
          expandable={{
            expandedRowRender: (product) => <ProductVariantsExpandedRow productId={product.id} />,
            rowExpandable: (product) => product.variantCount > 0,
          }}
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
      <ProductSpecificationsModal
        product={viewingSpecifications}
        onCancel={() => setViewingSpecifications(null)}
      />
      {changingStatus ? (
        <ChangeProductStatusModal
          product={changingStatus}
          pending={changeProductStatus.isPending}
          onCancel={() => {
            if (!changeProductStatus.isPending) setChangingStatus(null);
          }}
          onSubmit={submitStatusChange}
        />
      ) : null}
      <DeleteProductModal
        product={deleting}
        pending={deleteProduct.isPending}
        onCancel={() => {
          if (!deleteProduct.isPending) setDeleting(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
