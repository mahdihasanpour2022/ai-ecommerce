'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { App } from 'antd';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { UiButton } from '../../../app/components/shared/ui-button';
import { UiForm } from '../../../app/components/shared/ui-form';
import { normalizeHttpFailure } from '../../../app/http/http-client';
import { UiModal } from '../../../app/components/shared/ui-modal';
import type { ProductColorOption } from '../../../hooks/shared/useGetProductColors';
import { useCreateProductColor } from '../hooks/useCreateProductColor';
import { useUpdateProductColor } from '../hooks/useUpdateProductColor';
import type { ProductColorFormValues } from '../schemas/product-color-schema';
import { productColorSchema } from '../schemas/product-color-schema';

interface ProductColorFormModalProps {
  readonly mode: 'create' | 'edit';
  readonly open: boolean;
  readonly color?: ProductColorOption | null;
  readonly onClose: () => void;
}

const emptyValues: ProductColorFormValues = {
  persianName: '',
  englishName: '',
  hexCode: '#000000',
};

export function ProductColorFormModal({
  mode,
  open,
  color = null,
  onClose,
}: ProductColorFormModalProps) {
  const { message } = App.useApp();
  const createColor = useCreateProductColor();
  const updateColor = useUpdateProductColor();
  const {
    register,
    handleSubmit,
    reset,
    trigger,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<ProductColorFormValues>({
    resolver: zodResolver(productColorSchema),
    defaultValues: emptyValues,
    mode: 'onChange',
    shouldFocusError: true,
  });
  const mutationPending = createColor.isPending || updateColor.isPending;
  const submitting = mutationPending || isSubmitting;
  const hexCode = watch('hexCode');

  useEffect(() => {
    if (!open) return;
    reset(
      color
        ? {
            persianName: color['persian-color-name'],
            englishName: color['english-color-name'],
            hexCode: color['hex-code'],
          }
        : emptyValues,
    );
    if (color) void trigger();
  }, [color, open, reset, trigger]);

  const close = () => {
    if (submitting) return;
    reset(emptyValues);
    createColor.reset();
    updateColor.reset();
    onClose();
  };

  const submit = handleSubmit(async (values) => {
    try {
      const response =
        mode === 'create'
          ? await createColor.mutateAsync(values)
          : await updateColor.mutateAsync({
              ...values,
              currentEnglishName: color?.['english-color-name'] ?? '',
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
      title={mode === 'create' ? 'ایجاد رنگ جدید' : 'ویرایش رنگ'}
      closable={!submitting}
      keyboard={!submitting}
      mask={{ closable: !submitting }}
      onCancel={close}
    >
      <UiForm.Root onSubmit={(event) => void submit(event)}>
        <UiForm.Field>
          <UiForm.Label htmlFor={`${mode}-color-persian-name`}>نام فارسی</UiForm.Label>
          <UiForm.TextInput
            id={`${mode}-color-persian-name`}
            autoComplete="off"
            autoFocus
            maxLength={80}
            disabled={submitting}
            aria-invalid={errors.persianName ? 'true' : 'false'}
            aria-describedby={errors.persianName ? `${mode}-color-persian-name-error` : undefined}
            {...register('persianName')}
          />
          {errors.persianName ? (
            <UiForm.Error id={`${mode}-color-persian-name-error`}>
              {errors.persianName.message}
            </UiForm.Error>
          ) : null}
        </UiForm.Field>

        <UiForm.Field>
          <UiForm.Label htmlFor={`${mode}-color-english-name`}>نام انگلیسی</UiForm.Label>
          <UiForm.TextInput
            id={`${mode}-color-english-name`}
            dir="ltr"
            autoComplete="off"
            maxLength={80}
            disabled={submitting}
            aria-invalid={errors.englishName ? 'true' : 'false'}
            aria-describedby={errors.englishName ? `${mode}-color-english-name-error` : undefined}
            {...register('englishName')}
          />
          {errors.englishName ? (
            <UiForm.Error id={`${mode}-color-english-name-error`}>
              {errors.englishName.message}
            </UiForm.Error>
          ) : null}
        </UiForm.Field>

        <UiForm.Field>
          <UiForm.Label htmlFor={`${mode}-color-hex-code`}>رنگ</UiForm.Label>
          <div className="flex items-center gap-3">
            <UiForm.TextInput
              id={`${mode}-color-hex-code`}
              type="color"
              className="h-12 min-w-20 cursor-pointer p-1"
              disabled={submitting}
              aria-invalid={errors.hexCode ? 'true' : 'false'}
              aria-describedby={errors.hexCode ? `${mode}-color-hex-code-error` : undefined}
              {...register('hexCode')}
            />
            <bdi className="direction-ltr isolate font-mono text-sm text-muted">
              {hexCode.toUpperCase()}
            </bdi>
          </div>
          {errors.hexCode ? (
            <UiForm.Error id={`${mode}-color-hex-code-error`}>
              {errors.hexCode.message}
            </UiForm.Error>
          ) : null}
        </UiForm.Field>

        <UiForm.Actions>
          <UiButton variant="secondary" disabled={submitting} onClick={close}>
            انصراف
          </UiButton>
          <UiButton type="submit" disabled={!isValid || submitting} loading={submitting}>
            {submitting
              ? mode === 'create'
                ? 'در حال ایجاد…'
                : 'در حال ویرایش…'
              : mode === 'create'
                ? 'ایجاد رنگ'
                : 'ویرایش رنگ'}
          </UiButton>
        </UiForm.Actions>
      </UiForm.Root>
    </UiModal.Root>
  );
}
