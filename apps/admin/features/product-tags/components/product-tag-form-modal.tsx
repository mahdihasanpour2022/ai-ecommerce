'use client';

import type { ProductTagOption } from '@/hooks/shared/useGetProductTags';
import { zodResolver } from '@hookform/resolvers/zod';
import { App } from 'antd';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { UiButton } from '../../../app/components/shared/ui-button';
import { UiForm } from '../../../app/components/shared/ui-form';
import { UiModal } from '../../../app/components/shared/ui-modal';
import { normalizeHttpFailure } from '../../../app/http/http-client';
import { useCreateProductTag } from '../hooks/useCreateProductTag';
import { useUpdateProductTag } from '../hooks/useUpdateProductTag';
import { productTagSchema, type ProductTagFormValues } from '../schemas/product-tag-schema';

interface ProductTagFormModalProps {
  readonly mode: 'create' | 'edit';
  readonly open: boolean;
  readonly tag?: ProductTagOption | null;
  readonly onClose: () => void;
}

const emptyValues: ProductTagFormValues = { englishName: '' };

// فرم مشترک ایجاد و ویرایش، نام برچسب را پیش از فعال‌شدن دکمه اعتبارسنجی می‌کند.
export function ProductTagFormModal({ mode, open, tag = null, onClose }: ProductTagFormModalProps) {
  const { message } = App.useApp();
  const createTag = useCreateProductTag();
  const updateTag = useUpdateProductTag();
  const {
    register,
    handleSubmit,
    reset,
    trigger,
    formState: { errors, isSubmitting, isValid },
  } = useForm<ProductTagFormValues>({
    resolver: zodResolver(productTagSchema),
    defaultValues: emptyValues,
    mode: 'onChange',
    shouldFocusError: true,
  });
  const submitting = createTag.isPending || updateTag.isPending || isSubmitting;

  useEffect(() => {
    if (!open) return;
    reset(tag ? { englishName: tag['english-tag-name'] } : emptyValues);
    if (tag) void trigger();
  }, [open, reset, tag, trigger]);

  const close = () => {
    if (submitting) return;
    reset(emptyValues);
    createTag.reset();
    updateTag.reset();
    onClose();
  };

  const submit = handleSubmit(async (values) => {
    try {
      const response =
        mode === 'create'
          ? await createTag.mutateAsync(values)
          : await updateTag.mutateAsync({
              ...values,
              currentEnglishName: tag?.['english-tag-name'] ?? '',
            });
      reset(emptyValues);
      onClose();
      await message.success(response.message);
    } catch (error) {
      await message.error(normalizeHttpFailure(error).message);
    }
  });

  return (
    <UiModal.Root
      open={open}
      title={mode === 'create' ? 'افزودن برچسب' : 'ویرایش برچسب'}
      closable={!submitting}
      keyboard={!submitting}
      mask={{ closable: !submitting }}
      onCancel={close}
    >
      <UiForm.Root onSubmit={(event) => void submit(event)}>
        <UiForm.Field>
          <UiForm.Label htmlFor={`${mode}-tag-english-name`}>نام تگ</UiForm.Label>
          <UiForm.TextInput
            id={`${mode}-tag-english-name`}
            dir="ltr"
            autoComplete="off"
            autoFocus
            maxLength={80}
            placeholder="for example cap or red_cap"
            disabled={submitting}
            aria-invalid={errors.englishName ? 'true' : 'false'}
            aria-describedby={errors.englishName ? `${mode}-tag-english-name-error` : undefined}
            {...register('englishName')}
          />
          {errors.englishName ? (
            <UiForm.Error id={`${mode}-tag-english-name-error`}>
              {errors.englishName.message}
            </UiForm.Error>
          ) : null}
        </UiForm.Field>

        <UiForm.Actions>
          <UiButton variant="secondary" disabled={submitting} onClick={close}>
            انصراف
          </UiButton>
          <UiButton type="submit" disabled={submitting || !isValid} loading={submitting}>
            {submitting
              ? mode === 'create'
                ? 'در حال افزودن…'
                : 'در حال ویرایش…'
              : mode === 'create'
                ? 'افزودن برچسب'
                : 'ویرایش برچسب'}
          </UiButton>
        </UiForm.Actions>
      </UiForm.Root>
    </UiModal.Root>
  );
}
