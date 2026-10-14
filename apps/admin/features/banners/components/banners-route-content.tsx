'use client';

import { App } from 'antd';
import { useState } from 'react';

import { UiButton } from '../../../app/components/shared/ui-button';
import { UiLoading } from '../../../app/components/shared/ui-loading';
import { normalizeHttpFailure } from '../../../app/http/http-client';
import { useCreateBanner } from '../hooks/useCreateBanner';
import { useDeleteBanner } from '../hooks/useDeleteBanner';
import { useGetBanners } from '../hooks/useGetBanners';
import { useUpdateBanner } from '../hooks/useUpdateBanner';
import type { Banner } from '../interfaces/banner-contract';
import type { BannerFormValues } from '../schemas/banner-schema';
import { BannerFormModal } from './banner-form-modal';
import { BannerTable } from './banner-table';
import { DeleteBannerModal } from './delete-banner-modal';

export default function BannersRouteContent() {
  const { message } = App.useApp();
  const banners = useGetBanners();
  const createBanner = useCreateBanner();
  const updateBanner = useUpdateBanner();
  const deleteBanner = useDeleteBanner();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [deleting, setDeleting] = useState<Banner | null>(null);
  const mutating = createBanner.isPending || updateBanner.isPending || deleteBanner.isPending;

  // ایجاد بنر را با toast فارسی و تازه‌سازی declarative فهرست نهایی می‌کند.
  async function submitCreate({ image }: BannerFormValues): Promise<void> {
    try {
      const response = await createBanner.mutateAsync({ image });
      setCreating(false);
      await message.success(response.message);
    } catch (error) {
      await message.error(normalizeHttpFailure(error).message);
    }
  }

  // جایگزینی تصویر بنر انتخاب‌شده را بدون بستن فرم در خطا انجام می‌دهد.
  async function submitEdit({ image }: BannerFormValues): Promise<void> {
    if (!editing) return;
    try {
      const response = await updateBanner.mutateAsync({ bannerId: editing.id, image });
      setEditing(null);
      await message.success(response.message);
    } catch (error) {
      await message.error(normalizeHttpFailure(error).message);
    }
  }

  // حذف تأییدشده را single-flight اجرا و نتیجه Backend را مستقیم نمایش می‌دهد.
  async function confirmDelete(): Promise<void> {
    if (!deleting) return;
    try {
      const response = await deleteBanner.mutateAsync(deleting.id);
      setDeleting(null);
      await message.success(response.message);
    } catch (error) {
      await message.error(normalizeHttpFailure(error).message);
    }
  }

  if (banners.isPending) return <UiLoading message="در حال دریافت بنرها…" className="h-full" />;

  return (
    <section aria-labelledby="banners-title" className="pt-2">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="banners-title" className="mb-2 text-xl font-bold text-foreground">
            مدیریت بنرها
          </h2>
          <p className="m-0 text-sm text-muted">تصاویر بنر صفحه اصلی را ایجاد، ویرایش یا حذف کنید.</p>
        </div>
        <UiButton className="w-full sm:w-auto" onClick={() => setCreating(true)}>
          ایجاد بنر
        </UiButton>
      </div>

      {banners.isError ? (
        <div className="rounded-xl bg-surface-subtle p-4" role="alert">
          <p className="m-0 text-foreground">دریافت بنرها ناموفق بود.</p>
          <UiButton
            className="mt-3"
            variant="secondary"
            disabled={banners.isFetching}
            onClick={() => void banners.refetch()}
          >
            تلاش دوباره
          </UiButton>
        </div>
      ) : banners.data.result.length === 0 ? (
        <p className="rounded-xl bg-surface-subtle p-4 text-muted">هنوز بنری ثبت نشده است.</p>
      ) : (
        <BannerTable banners={banners.data.result} pending={mutating} onEdit={setEditing} onDelete={setDeleting} />
      )}

      <BannerFormModal
        open={creating}
        mode="create"
        pending={createBanner.isPending}
        onCancel={() => setCreating(false)}
        onSubmit={submitCreate}
      />
      <BannerFormModal
        key={editing?.id ?? 'edit-banner'}
        open={editing !== null}
        mode="edit"
        pending={updateBanner.isPending}
        onCancel={() => setEditing(null)}
        onSubmit={submitEdit}
      />
      <DeleteBannerModal
        banner={deleting}
        pending={deleteBanner.isPending}
        onCancel={() => {
          if (!deleteBanner.isPending) setDeleting(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </section>
  );
}
