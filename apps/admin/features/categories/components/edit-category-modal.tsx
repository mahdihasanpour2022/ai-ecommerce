'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { UiButton } from '../../../app/components/shared/ui-button';
import { UiForm } from '../../../app/components/shared/ui-form';
import { UiModal } from '../../../app/components/shared/ui-modal';
import type { Category, EditCategoryVariables } from '../interfaces/category-contract';
import type { EditCategoryFormValues } from '../schemas/edit-category-schema';
import { editCategorySchema } from '../schemas/edit-category-schema';
import { validEditParentOptions } from '../utils/category-options';

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
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditCategoryFormValues>({
    resolver: zodResolver(editCategorySchema),
    defaultValues: { name: '', parentId: '' },
    mode: 'onChange',
    shouldFocusError: true,
  });

  useEffect(() => {
    reset({ name: category?.name ?? '', parentId: category?.parentId ?? '' });
  }, [category, reset]);

  const submit = handleSubmit(async ({ name, parentId }) => {
    if (!category) return;
    await onSubmit({ categoryId: category.id, name, parentId: parentId || null });
  });
  const options = category ? validEditParentOptions(categories, category) : [];

  return (
    <UiModal.Root
      open={category !== null}
      title="ویرایش دسته‌بندی"
      closable={!pending}
      keyboard={!pending}
      mask={{ closable: !pending }}
      onCancel={onCancel}
    >
      <UiForm.Root onSubmit={(event) => void submit(event)}>
        <UiForm.Field>
          <UiForm.Label htmlFor="edit-category-name">نام دسته‌بندی</UiForm.Label>
          <UiForm.TextInput
            id="edit-category-name"
            autoComplete="off"
            autoFocus
            maxLength={120}
            disabled={pending}
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
            disabled={pending}
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
            <UiForm.Error id="edit-category-parent-error">
              {errors.parentId.message}
            </UiForm.Error>
          ) : null}
        </UiForm.Field>

        <UiForm.Actions>
          <UiButton variant="secondary" disabled={pending} onClick={onCancel}>
            انصراف
          </UiButton>
          <UiButton type="submit" disabled={pending} aria-busy={pending}>
            {pending ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
          </UiButton>
        </UiForm.Actions>
      </UiForm.Root>
    </UiModal.Root>
  );
}
