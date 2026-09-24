'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { UiButton } from '../../../app/components/shared/ui-button';
import { UiForm } from '../../../app/components/shared/ui-form';
import { UiModal } from '../../../app/components/shared/ui-modal';
import { UiSelect } from '../../../app/components/shared/ui-select';
import { useGetProductStatuses } from '../hooks/useGetProductOptions';
import type { ChangeProductStatusVariables, Product } from '../interfaces/product-contract';
import type { ChangeProductStatusFormValues } from '../schemas/change-product-status-schema';
import { changeProductStatusSchema } from '../schemas/change-product-status-schema';

interface ChangeProductStatusModalProps {
  readonly product: Product | null;
  readonly pending: boolean;
  readonly onCancel: () => void;
  readonly onSubmit: (variables: ChangeProductStatusVariables) => Promise<void>;
}

export function ChangeProductStatusModal({
  product,
  pending,
  onCancel,
  onSubmit,
}: ChangeProductStatusModalProps) {
  const statusesQuery = useGetProductStatuses(product !== null);
  const statuses = statusesQuery.data?.result ?? [];
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangeProductStatusFormValues>({
    resolver: zodResolver(changeProductStatusSchema),
    defaultValues: {},
    mode: 'onChange',
    shouldFocusError: true,
  });

  useEffect(() => {
    reset({});
  }, [product, reset]);

  const currentStatus = statuses.find(
    ({ status_english_name }) => status_english_name === product?.status,
  );
  const options = statuses
    .filter(({ status_english_name }) => status_english_name !== product?.status)
    .map(({ status_english_name, status_persian_name }) => ({
      value: status_english_name,
      label: status_persian_name,
    }));
  const submitting = pending || isSubmitting;
  const submit = handleSubmit(async ({ status }) => {
    if (!product) return;
    await onSubmit({ productId: product.id, status });
  });

  return (
    <UiModal.Root
      open={product !== null}
      title="تغییر وضعیت محصول"
      closable={!submitting}
      keyboard={!submitting}
      mask={{ closable: !submitting }}
      onCancel={onCancel}
    >
      <UiForm.Root onSubmit={(event) => void submit(event)}>
        <p className="m-0 leading-8 text-foreground">
          وضعیت فعلی «{product?.name}»:{' '}
          <strong>{currentStatus?.status_persian_name ?? product?.status}</strong>
        </p>

        <UiForm.Field>
          <UiForm.Label htmlFor="product-next-status">وضعیتی که می‌خواهید</UiForm.Label>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <UiSelect.Root
                id="product-next-status"
                ref={field.ref}
                value={field.value ?? null}
                options={options}
                placeholder="انتخاب وضعیت جدید"
                notFoundContent="وضعیت دیگری برای انتخاب وجود ندارد."
                loading={statusesQuery.isFetching}
                disabled={submitting || statusesQuery.isFetching || statusesQuery.isError}
                status={errors.status ? 'error' : ''}
                aria-invalid={errors.status ? 'true' : 'false'}
                aria-describedby={errors.status ? 'product-next-status-error' : undefined}
                onBlur={field.onBlur}
                onChange={field.onChange}
              />
            )}
          />
          {errors.status ? (
            <UiForm.Error id="product-next-status-error">{errors.status.message}</UiForm.Error>
          ) : null}
          {statusesQuery.isError ? (
            <UiForm.Error>دریافت وضعیت‌های محصول ناموفق بود. دوباره تلاش کنید.</UiForm.Error>
          ) : null}
        </UiForm.Field>

        <UiForm.Actions>
          <UiButton variant="secondary" disabled={submitting} onClick={onCancel}>
            انصراف
          </UiButton>
          <UiButton
            type="submit"
            disabled={submitting || statusesQuery.isFetching || statusesQuery.isError}
            loading={submitting}
          >
            {submitting ? 'در حال تغییر وضعیت…' : 'تغییر وضعیت'}
          </UiButton>
        </UiForm.Actions>
      </UiForm.Root>
    </UiModal.Root>
  );
}
