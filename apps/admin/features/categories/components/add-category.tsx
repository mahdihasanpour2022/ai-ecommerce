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

export default function AddCategory({ onCreated }: Readonly<{ onCreated?: () => void }>) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const submissionErrorRef = useRef<HTMLParagraphElement>(null);
  const { message } = App.useApp();
  const categories = useGetCategories({ page: 1, pageSize: CATEGORY_OPTIONS_PAGE_SIZE });
  const createCategory = useCreateCategory();
  const {
    control,
    register,
    handleSubmit,
    reset,
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
  };

  const submit = handleSubmit(async ({ name, parentId }) => {
    try {
      const response = await createCategory.mutateAsync({ name, parentId: parentId || null });
      reset();
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
      <UiButton ref={triggerRef} variant='primary' onClick={() => setOpen(true)}>
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
                    const level =
                      typeof option.data.level === 'number' ? option.data.level : null;
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
              disabled={
                submitting ||
                categories.isPending ||
                categories.isError
              }
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
