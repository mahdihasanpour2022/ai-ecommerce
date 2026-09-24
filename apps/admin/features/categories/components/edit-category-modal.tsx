'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { App } from 'antd';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { UiButton } from '../../../app/components/shared/ui-button';
import { UiForm } from '../../../app/components/shared/ui-form';
import { UiModal } from '../../../app/components/shared/ui-modal';
import type { Category, EditCategoryVariables } from '../interfaces/category-contract';
import type { EditCategoryFormValues } from '../schemas/edit-category-schema';
import { editCategorySchema } from '../schemas/edit-category-schema';
import { validEditParentOptions } from '../utils/category-options';
import {
  IMAGE_ACCEPT,
  ImageSanitizationError,
  imageSanitizer,
} from '../../../utils/image-sanitizer';

interface EditCategoryModalProps {
  readonly category: Category | null;
  readonly categories: readonly Category[];
  readonly pending: boolean;
  readonly onCancel: () => void;
  readonly onSubmit: (variables: EditCategoryVariables) => Promise<void>;
}

export function EditCategoryModal({
  category,
  categories,
  pending,
  onCancel,
  onSubmit,
}: EditCategoryModalProps) {
  const { message } = App.useApp();
  const {
    control,
    clearErrors,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EditCategoryFormValues>({
    resolver: zodResolver(editCategorySchema),
    defaultValues: { name: '', parentId: '' },
    mode: 'onChange',
    shouldFocusError: true,
  });

  useEffect(() => {
    reset({ name: category?.name ?? '', parentId: category?.parentId ?? '' });
  }, [category, reset]);

  const submit = handleSubmit(async ({ image, name, parentId }) => {
    if (!category) return;
    if (category.image === null && image === undefined) {
      setError(
        'image',
        { type: 'required', message: 'تصویر دسته‌بندی را انتخاب کنید.' },
        { shouldFocus: true },
      );
      await message.error('انتخاب تصویر دسته‌بندی الزامی است.');
      return;
    }
    await onSubmit({
      categoryId: category.id,
      ...(image === undefined ? {} : { image }),
      name,
      parentId: parentId || null,
    });
  });
  const options = category ? validEditParentOptions(categories, category) : [];
  const submitting = pending || isSubmitting;

  return (
    <UiModal.Root
      open={category !== null}
      title="ویرایش دسته‌بندی"
      closable={!submitting}
      keyboard={!submitting}
      mask={{ closable: !submitting }}
      onCancel={onCancel}
    >
      <UiForm.Root onSubmit={(event) => void submit(event)}>
        <UiForm.Field>
          <UiForm.Label htmlFor="edit-category-image">
            {category?.image ? 'تصویر جدید (اختیاری)' : 'تصویر دسته‌بندی'}
          </UiForm.Label>
          <Controller
            name="image"
            control={control}
            render={({ field }) => (
              <UiForm.TextInput
                key={category?.image?.id ?? category?.id}
                id="edit-category-image"
                ref={field.ref}
                name={field.name}
                type="file"
                accept={IMAGE_ACCEPT}
                disabled={submitting}
                aria-invalid={errors.image ? 'true' : 'false'}
                aria-describedby={
                  errors.image
                    ? 'edit-category-image-help edit-category-image-error'
                    : 'edit-category-image-help'
                }
                className="cursor-pointer file:me-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:font-bold file:text-accent-foreground"
                onBlur={field.onBlur}
                onChange={(event) => {
                  const input = event.currentTarget;
                  const file = input.files?.[0];
                  if (!file) return field.onChange(undefined);
                  void imageSanitizer(file)
                    .then((safeFile) => {
                      field.onChange(safeFile);
                      clearErrors('image');
                    })
                    .catch(async (error: unknown) => {
                      const content =
                        error instanceof ImageSanitizationError
                          ? error.message
                          : 'بررسی تصویر ممکن نشد. تصویر دیگری انتخاب کنید.';
                      input.value = '';
                      field.onChange(undefined);
                      setError('image', { type: 'validate', message: content });
                      await message.error({ key: 'edit-category-image-validation-error', content });
                    });
                }}
              />
            )}
          />
          <p id="edit-category-image-help" className="m-0 text-xs leading-6 text-muted">
            {category?.image ? 'انتخاب نکردن فایل، تصویر فعلی را حفظ می‌کند. ' : ''}
            فرمت‌های مجاز: JPG، JPEG، PNG و WebP — حجم حداکثر ۴۰۰ کیلوبایت است.
          </p>
          {errors.image ? (
            <UiForm.Error id="edit-category-image-error">{errors.image.message}</UiForm.Error>
          ) : null}
        </UiForm.Field>

        <UiForm.Field>
          <UiForm.Label htmlFor="edit-category-name">نام دسته‌بندی</UiForm.Label>
          <UiForm.TextInput
            id="edit-category-name"
            autoComplete="off"
            autoFocus
            maxLength={120}
            disabled={submitting}
            aria-invalid={errors.name ? 'true' : 'false'}
            aria-describedby={errors.name ? 'edit-category-name-error' : undefined}
            {...register('name')}
          />
          {errors.name ? (
            <UiForm.Error id="edit-category-name-error">{errors.name.message}</UiForm.Error>
          ) : null}
        </UiForm.Field>

        <UiForm.Field>
          <UiForm.Label htmlFor="edit-category-parent">دسته‌بندی والد</UiForm.Label>
          <UiForm.Select
            id="edit-category-parent"
            disabled={submitting}
            aria-invalid={errors.parentId ? 'true' : 'false'}
            aria-describedby={errors.parentId ? 'edit-category-parent-error' : undefined}
            {...register('parentId')}
          >
            <UiForm.Option value="">بدون والد (دسته‌بندی اصلی)</UiForm.Option>
            {options.map((option) => (
              <UiForm.Option key={option.id} value={option.id}>
                {option.label}
              </UiForm.Option>
            ))}
          </UiForm.Select>
          {errors.parentId ? (
            <UiForm.Error id="edit-category-parent-error">{errors.parentId.message}</UiForm.Error>
          ) : null}
        </UiForm.Field>

        <UiForm.Actions>
          <UiButton variant="secondary" disabled={submitting} onClick={onCancel}>
            انصراف
          </UiButton>
          <UiButton type="submit" disabled={submitting} loading={submitting}>
            {submitting ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
          </UiButton>
        </UiForm.Actions>
      </UiForm.Root>
    </UiModal.Root>
  );
}
