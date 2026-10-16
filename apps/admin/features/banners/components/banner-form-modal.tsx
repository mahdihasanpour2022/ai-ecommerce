'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { UiButton } from '../../../app/components/shared/ui-button';
import { UiForm } from '../../../app/components/shared/ui-form';
import { UiImageInput } from '../../../app/components/shared/ui-image-input';
import { UiModal } from '../../../app/components/shared/ui-modal';
import type { Banner } from '../interfaces/banner-contract';
import type { BannerFormValues } from '../schemas/banner-schema';
import { bannerSchema } from '../schemas/banner-schema';

interface BannerFormModalProps {
  readonly open: boolean;
  readonly mode: 'create' | 'edit';
  readonly pending: boolean;
  readonly banner?: Banner | null;
  readonly onCancel: () => void;
  readonly onSubmit: (values: BannerFormValues) => Promise<void>;
}

export function BannerFormModal({ open, mode, pending, banner = null, onCancel, onSubmit }: BannerFormModalProps) {
  const {
    control,
    clearErrors,
    handleSubmit,
    register,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BannerFormValues>({
    resolver: zodResolver(bannerSchema),
    defaultValues: { alt: '' },
    mode: 'onChange',
    shouldFocusError: true,
  });
  const submitting = pending || isSubmitting;
  const submit = handleSubmit(async (values) => {
    if (mode === 'create' && values.image === undefined) {
      setError(
        'image',
        { type: 'required', message: 'تصویر بنر را انتخاب کنید.' },
        { shouldFocus: true },
      );
      return;
    }
    await onSubmit(values);
  });

  useEffect(() => {
    if (open) reset({ alt: banner?.alt ?? '' });
  }, [banner, open, reset]);

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
              key={banner?.id ?? mode}
              id={`${mode}-banner-image`}
              ref={field.ref}
              name={field.name}
              label={mode === 'create' ? 'تصویر بنر' : 'تصویر جدید بنر (اختیاری)'}
              help={`${mode === 'edit' ? 'انتخاب نکردن فایل، تصویر فعلی را حفظ می‌کند. ' : ''}فرمت‌های مجاز: JPG، JPEG، PNG و WebP — حجم باید کمتر از ۱ مگابایت باشد.`}
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
        <UiForm.Field>
          <UiForm.Label htmlFor={`${mode}-banner-alt`}>متن جایگزین تصویر (اختیاری)</UiForm.Label>
          <UiForm.TextInput
            id={`${mode}-banner-alt`}
            maxLength={160}
            autoComplete="off"
            disabled={submitting}
            aria-invalid={errors.alt ? 'true' : 'false'}
            aria-describedby={errors.alt ? `${mode}-banner-alt-error` : `${mode}-banner-alt-help`}
            {...register('alt')}
          />
          <p id={`${mode}-banner-alt-help`} className="m-0 text-xs leading-6 text-muted">
            این متن برای دسترس‌پذیری تصویر بنر در فروشگاه استفاده می‌شود.
          </p>
          {errors.alt ? (
            <UiForm.Error id={`${mode}-banner-alt-error`}>{errors.alt.message}</UiForm.Error>
          ) : null}
        </UiForm.Field>
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
