'use client';

import type { ProductSizeOption } from '@/hooks/shared/useGetProductSizes';
import { zodResolver } from '@hookform/resolvers/zod';
import { App } from 'antd';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { UiButton } from '../../../app/components/shared/ui-button';
import { UiForm } from '../../../app/components/shared/ui-form';
import { UiModal } from '../../../app/components/shared/ui-modal';
import { normalizeHttpFailure } from '../../../app/http/http-client';
import { productSizeSchema, type ProductSizeFormValues } from '../schemas/product-size-schema';
import { useCreateProductSize } from '../hooks/useCreateProductSize';
import { useUpdateProductSize } from '../hooks/useUpdateProductSize';

interface ProductSizeFormModalProps {
  readonly mode: 'create' | 'edit';
  readonly open: boolean;
  readonly size?: ProductSizeOption | null;
  readonly onClose: () => void;
}

const emptyValues: ProductSizeFormValues = {
  persianName: '',
  englishName: '',
};

export function ProductSizeFormModal({
  mode,
  open,
  size = null,
  onClose,
}: ProductSizeFormModalProps) {
  const { message } = App.useApp();
  const createSize = useCreateProductSize();
  const updateSize = useUpdateProductSize();
  const {
    register,
    handleSubmit,
    reset,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<ProductSizeFormValues>({
    resolver: zodResolver(productSizeSchema),
    defaultValues: emptyValues,
    mode: 'onChange',
    shouldFocusError: true,
  });
  const mutationPending = createSize.isPending || updateSize.isPending;
  const submitting = mutationPending || isSubmitting;

  useEffect(() => {
    if (!open) return;
    reset(
      size
        ? {
            persianName: size['persian-size-name'],
            englishName: size['english-size-name'],
          }
        : emptyValues,
    );
    if (size) void trigger();
  }, [size, open, reset, trigger]);

  const close = () => {
    if (submitting) return;
    reset(emptyValues);
    createSize.reset();
    updateSize.reset();
    onClose();
  };

  const submit = handleSubmit(async (values) => {
    try {
      const response =
        mode === 'create'
          ? await createSize.mutateAsync(values)
          : await updateSize.mutateAsync({
              ...values,
              currentEnglishName: size?.['english-size-name'] ?? '',
            });
      reset(emptyValues);
      onClose();
      await message.success(response.message);
    } catch (error) {
      reset(emptyValues);
      onClose();
      await message.error(normalizeHttpFailure(error).message);
    }
  });

  return (
    <UiModal.Root
      open={open}
      title={mode === 'create' ? 'ایجاد سایز جدید' : 'ویرایش سایز'}
      closable={!submitting}
      keyboard={!submitting}
      mask={{ closable: !submitting }}
      onCancel={close}
    >
      <UiForm.Root onSubmit={(event) => void submit(event)}>
        <UiForm.Field>
          <UiForm.Label htmlFor={`${mode}-size-persian-name`}>نام فارسی</UiForm.Label>
          <UiForm.TextInput
            id={`${mode}-size-persian-name`}
            autoComplete="off"
            autoFocus
            maxLength={80}
            disabled={submitting}
            aria-invalid={errors.persianName ? 'true' : 'false'}
            aria-describedby={errors.persianName ? `${mode}-size-persian-name-error` : undefined}
            {...register('persianName')}
          />
          {errors.persianName ? (
            <UiForm.Error id={`${mode}-size-persian-name-error`}>
              {errors.persianName.message}
            </UiForm.Error>
          ) : null}
        </UiForm.Field>

        <UiForm.Field>
          <UiForm.Label htmlFor={`${mode}-size-english-name`}>نام انگلیسی</UiForm.Label>
          <UiForm.TextInput
            id={`${mode}-size-english-name`}
            dir="ltr"
            autoComplete="off"
            maxLength={80}
            disabled={submitting}
            aria-invalid={errors.englishName ? 'true' : 'false'}
            aria-describedby={errors.englishName ? `${mode}-size-english-name-error` : undefined}
            {...register('englishName')}
          />
          {errors.englishName ? (
            <UiForm.Error id={`${mode}-size-english-name-error`}>
              {errors.englishName.message}
            </UiForm.Error>
          ) : null}
        </UiForm.Field>

        <UiForm.Actions>
          <UiButton variant="secondary" disabled={submitting} onClick={close}>
            انصراف
          </UiButton>
          <UiButton type="submit" disabled={submitting} loading={submitting}>
            {submitting
              ? mode === 'create'
                ? 'در حال ایجاد…'
                : 'در حال ویرایش…'
              : mode === 'create'
                ? 'ایجاد سایز'
                : 'ویرایش سایز'}
          </UiButton>
        </UiForm.Actions>
      </UiForm.Root>
    </UiModal.Root>
  );
}
