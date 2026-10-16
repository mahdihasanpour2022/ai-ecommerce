'use client';

import type { TableColumnsType } from 'antd';
import { Table } from 'antd';

import { UiButton } from '../../../app/components/shared/ui-button';
import { formatPersianDateTime } from '../../../utils/date-time';
import { formatPersianInteger } from '../../../utils/number';
import type { Banner } from '../interfaces/banner-contract';
import { BannerThumbnail } from './banner-thumbnail';

interface BannerTableProps {
  readonly banners: readonly Banner[];
  readonly pending: boolean;
  readonly onDelete: (banner: Banner) => void;
  readonly onEdit: (banner: Banner) => void;
}

export function BannerTable({ banners, pending, onDelete, onEdit }: BannerTableProps) {
  const columns: TableColumnsType<Banner> = [
    {
      title: 'تصویر',
      key: 'image',
      width: 140,
      render: (_, banner) => <BannerThumbnail banner={banner} />,
    },
    {
      title: 'متن جایگزین',
      dataIndex: 'alt',
      render: (alt: string | null) => alt || '—',
    },
    {
      title: 'ابعاد',
      key: 'dimensions',
      render: (_, banner) => `${formatPersianInteger(banner.width)} × ${formatPersianInteger(banner.height)}`,
    },
    {
      title: 'حجم',
      dataIndex: 'byteSize',
      render: (byteSize: number) => `${formatPersianInteger(Math.ceil(byteSize / 1024))} کیلوبایت`,
    },
    {
      title: 'آخرین تغییر',
      dataIndex: 'updatedAt',
      render: (value: string) => formatPersianDateTime(value),
    },
    {
      title: 'عملیات',
      key: 'actions',
      fixed: 'right',
      width: 190,
      render: (_, banner) => (
        <div className="flex flex-wrap gap-2">
          <UiButton size="small" variant="secondary" disabled={pending} onClick={() => onEdit(banner)}>
            ویرایش
          </UiButton>
          <UiButton size="small" variant="dangerSubtle" disabled={pending} onClick={() => onDelete(banner)}>
            حذف
          </UiButton>
        </div>
      ),
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <Table<Banner>
        rowKey="id"
        columns={columns}
        dataSource={[...banners]}
        pagination={false}
        loading={pending}
        scroll={{ x: 900 }}
      />
    </div>
  );
}
