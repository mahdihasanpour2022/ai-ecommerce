'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { App } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { UiButton } from '../../../app/components/shared/ui-button';
import { UiForm } from '../../../app/components/shared/ui-form';
import { UiModal } from '../../../app/components/shared/ui-modal';
import { UiSelect } from '../../../app/components/shared/ui-select';
import { CATEGORY_OPTIONS_PAGE_SIZE } from '../constants/pagination';
import { useCreateCategory } from '../hooks/useCreateCategory';
import { useGetCategories } from '../hooks/useGetCategories';
import type { CreateCategoryFormValues } from '../schemas/create-category-schema';
import { createCategorySchema } from '../schemas/create-category-schema';
import { categoryOptions } from '../utils/category-options';
import {
  IMAGE_ACCEPT,
  ImageSanitizationError,
  imageSanitizer,
} from '../../../utils/image-sanitizer';

export default function AddCategory({ onCreated }: Readonly<{ onCreated?: () => void }>) {
  const [open, setOpen] = useState(false);
  const [imageInputKey, setImageInputKey] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const submissionErrorRef = useRef<HTMLParagraphElement>(null);
  const { message } = App.useApp();
  const categories = useGetCategories({ page: 1, pageSize: CATEGORY_OPTIONS_PAGE_SIZE });
  const createCategory = useCreateCategory();
  const {
    control,
    clearErrors,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateCategoryFormValues>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: { name: '', parentId: '' },
    mode: 'onChange',
    shouldFocusError: true,
  });
  const submitting = createCategory.isPending || isSubmitting;

  useEffect(() => {
    if (createCategory.error) submissionErrorRef.current?.focus();
  }, [createCategory.error]);

  const close = () => {
    if (submitting) return;
    setOpen(false);
    createCategory.reset();
    reset();
    setImageInputKey((value) => value + 1);
  };

  const submit = handleSubmit(async ({ image, name, parentId }) => {
    try {
      const response = await createCategory.mutateAsync({
        image,
        name,
        parentId: parentId || null,
      });
      reset();
      setImageInputKey((value) => value + 1);
      setOpen(false);
      onCreated?.();
      await message.success(response.message);
    } catch {
      return;
    }
  });

  const options = categories.data
    ? categoryOptions(categories.data.result).filter((option) => option.level < 6)
    : [];
  const parentOptions = [
    { value: '', label: 'بدون والد (دسته‌بندی اصلی)', level: null },
    ...options.map((option) => ({
      value: option.id,
      label: option.label,
      level: option.level,
    })),
  ];

  return (
    <div className="flex justify-end absolute top-0 left-0">
      <UiButton ref={triggerRef} variant="primary" onClick={() => setOpen(true)}>
        افزودن دسته‌بندی
      </UiButton>
      <UiModal.Root
        open={open}
        title="ایجاد دسته‌بندی"
        closable={!submitting}
        keyboard={!submitting}
        mask={{ closable: !submitting }}
        onCancel={close}
        afterOpenChange={(isOpen) => {
          if (!isOpen) triggerRef.current?.focus();
        }}
      >
        <UiForm.Root onSubmit={(event) => void submit(event)}>
          <UiForm.Field>
            <UiForm.Label htmlFor="category-image">تصویر دسته‌بندی</UiForm.Label>
            <Controller
              name="image"
              control={control}
              render={({ field }) => (
                <UiForm.TextInput
                  key={imageInputKey}
                  id="category-image"
                  ref={field.ref}
                  name={field.name}
                  type="file"
                  accept={IMAGE_ACCEPT}
                  disabled={submitting}
                  aria-invalid={errors.image ? 'true' : 'false'}
                  aria-describedby={
                    errors.image
                      ? 'category-image-help category-image-error'
                      : 'category-image-help'
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
                        await message.error({ key: 'category-image-validation-error', content });
                      });
                  }}
                />
              )}
            />
            <p id="category-image-help" className="m-0 text-xs leading-6 text-muted">
              فرمت‌های مجاز: JPG، JPEG، PNG و WebP — حجم حداکثر ۴۰۰ کیلوبایت است.
            </p>
            {errors.image ? (
              <UiForm.Error id="category-image-error">{errors.image.message}</UiForm.Error>
            ) : null}
          </UiForm.Field>

          <UiForm.Field>
            <UiForm.Label htmlFor="category-name">نام دسته‌بندی</UiForm.Label>
            <UiForm.TextInput
              id="category-name"
              autoComplete="off"
              autoFocus
              maxLength={120}
              placeholder="مثلاً پوشاک زنانه"
              disabled={submitting}
              aria-invalid={errors.name ? 'true' : 'false'}
              aria-describedby={errors.name ? 'category-name-error' : undefined}
              {...register('name')}
            />
            {errors.name ? (
              <UiForm.Error id="category-name-error">{errors.name.message}</UiForm.Error>
            ) : null}
          </UiForm.Field>

          <UiForm.Field>
            <UiForm.Label htmlFor="category-parent">دسته‌بندی والد</UiForm.Label>
            <Controller
              name="parentId"
              control={control}
              render={({ field }) => (
                <UiSelect.Root
                  id="category-parent"
                  ref={field.ref}
                  value={field.value}
                  options={parentOptions}
                  disabled={submitting || categories.isPending}
                  status={errors.parentId ? 'error' : ''}
                  aria-invalid={errors.parentId ? 'true' : 'false'}
                  aria-describedby={errors.parentId ? 'category-parent-error' : undefined}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  optionRender={(option) => {
                    const level = typeof option.data.level === 'number' ? option.data.level : null;
                    return (
                      <UiSelect.OptionContent
                        label={option.label}
                        hint={level === null ? 'دستهٔ اصلی' : `سطح ${level}`}
                        tone={level === null ? 'highlight' : 'neutral'}
                      />
                    );
                  }}
                />
              )}
            />
            {errors.parentId ? (
              <UiForm.Error id="category-parent-error">{errors.parentId.message}</UiForm.Error>
            ) : null}
          </UiForm.Field>

          {createCategory.error ? (
            <UiForm.SubmissionError ref={submissionErrorRef}>
              {createCategory.error.message}
            </UiForm.SubmissionError>
          ) : null}

          <UiForm.Actions>
            <UiButton variant="secondary" disabled={submitting} onClick={close}>
              انصراف
            </UiButton>
            <UiButton
              type="submit"
              disabled={submitting || categories.isPending || categories.isError}
              loading={submitting}
            >
              {submitting ? 'در حال ایجاد…' : 'ایجاد دسته‌بندی'}
            </UiButton>
          </UiForm.Actions>
        </UiForm.Root>
      </UiModal.Root>
    </div>
  );
}
