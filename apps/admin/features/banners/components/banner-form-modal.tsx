'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import { UiButton } from '../../../app/components/shared/ui-button';
import { UiForm } from '../../../app/components/shared/ui-form';
import { UiImageInput } from '../../../app/components/shared/ui-image-input';
import { UiModal } from '../../../app/components/shared/ui-modal';
import type { BannerFormValues } from '../schemas/banner-schema';
import { bannerSchema } from '../schemas/banner-schema';

interface BannerFormModalProps {
  readonly open: boolean;
  readonly mode: 'create' | 'edit';
  readonly pending: boolean;
  readonly onCancel: () => void;
  readonly onSubmit: (values: BannerFormValues) => Promise<void>;
}

export function BannerFormModal({ open, mode, pending, onCancel, onSubmit }: BannerFormModalProps) {
  const {
    control,
    clearErrors,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BannerFormValues>({ resolver: zodResolver(bannerSchema) });
  const submitting = pending || isSubmitting;
  const submit = handleSubmit(onSubmit);

  // بستن فرم را فقط در نبود درخواست فعال انجام می‌دهد و state فایل را پاک می‌کند.
  const close = () => {
    if (submitting) return;
    reset();
    onCancel();
  };

  return (
    <UiModal.Root
      open={open}
      title={mode === 'create' ? 'ایجاد بنر' : 'ویرایش بنر'}
      closable={!submitting}
      keyboard={!submitting}
      mask={{ closable: !submitting }}
      onCancel={close}
      afterOpenChange={(isOpen) => {
        if (!isOpen) reset();
      }}
    >
      <UiForm.Root onSubmit={(event) => void submit(event)}>
        <Controller
          name="image"
          control={control}
          render={({ field }) => (
            <UiImageInput
              id={`${mode}-banner-image`}
              ref={field.ref}
              name={field.name}
              label={mode === 'create' ? 'تصویر بنر' : 'تصویر جدید بنر'}
              help="فرمت‌های مجاز: JPG، JPEG، PNG و WebP — حجم باید کمتر از ۱ مگابایت باشد."
              error={errors.image?.message}
              disabled={submitting}
              maxBytes={1_048_576}
              maxSizeLabel="۱ مگابایت"
              toastKey={`${mode}-banner-image-validation-error`}
              onBlur={field.onBlur}
              onChange={(file) => {
                field.onChange(file);
                if (file) clearErrors('image');
              }}
              onValidationError={(message) => setError('image', { type: 'validate', message })}
            />
          )}
        />
        <UiForm.Actions className="mt-6">
          <UiButton type="button" variant="secondary" disabled={submitting} onClick={close}>
            انصراف
          </UiButton>
          <UiButton type="submit" loading={submitting}>
            {submitting ? 'در حال ذخیره…' : mode === 'create' ? 'ایجاد بنر' : 'ذخیره تغییرات'}
          </UiButton>
        </UiForm.Actions>
      </UiForm.Root>
    </UiModal.Root>
  );
}
