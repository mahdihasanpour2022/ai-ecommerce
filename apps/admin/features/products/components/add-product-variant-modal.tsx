'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { UiButton } from '../../../app/components/shared/ui-button';
import { UiForm } from '../../../app/components/shared/ui-form';
import { UiImageInput } from '../../../app/components/shared/ui-image-input';
import { UiModal } from '../../../app/components/shared/ui-modal';
import { UiSelect } from '../../../app/components/shared/ui-select';
import { normalizeHttpFailure } from '../../../app/http/http-client';
import { useGetProductColors } from '@/hooks/shared/useGetProductColors';
import { useGetProductSizes } from '@/hooks/shared/useGetProductSizes';
import { useAddProductVariant } from '../hooks/useAddProductVariant';
import { useEditProductVariant } from '../hooks/useEditProductVariant';
import { useUploadProductImage } from '../hooks/useUploadProductImage';
import { productKeys } from '../hooks/useGetProducts';
import {
  addProductVariantSchema,
  type AddProductVariantFormValues,
} from '../schemas/add-product-variant-schema';

interface AddProductVariantModalProps {
  readonly productId: string;
  readonly imageVersion: number;
  readonly open: boolean;
  readonly onClose: () => void;
}

export function AddProductVariantModal({
  productId,
  imageVersion,
  open,
  onClose,
}: AddProductVariantModalProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [imageKey, setImageKey] = useState(0);
  const sizes = useGetProductSizes(open);
  const colors = useGetProductColors(open);
  const addVariant = useAddProductVariant();
  const activateVariant = useEditProductVariant();
  const uploadImage = useUploadProductImage();
  const {
    control,
    register,
    handleSubmit,
    reset,
    clearErrors,
    setError,
    formState: { errors, isSubmitting, isValid },
  } = useForm<AddProductVariantFormValues>({
    resolver: zodResolver(addProductVariantSchema),
    defaultValues: { image: undefined, size: '', color: '', onHandQuantity: '' },
    mode: 'onChange',
  });
  const submitting =
    addVariant.isPending || activateVariant.isPending || uploadImage.isPending || isSubmitting;

  const close = () => {
    if (submitting) return;
    reset();
    setImageKey((current) => current + 1);
    onClose();
  };

  // واریانت ابتدا ایجاد و سپس تصویر اجباری آن با شناسهٔ همان واریانت ذخیره می‌شود.
  const submit = handleSubmit(async (values) => {
    try {
      const created = await addVariant.mutateAsync({
        productId,
        size: values.size,
        color: values.color,
        isActive: false,
        onHandQuantity: Number(values.onHandQuantity),
      });
      await uploadImage.mutateAsync({
        productId,
        variantId: created.singleResult.id,
        imageVersion,
        file: values.image,
      });
      await activateVariant.mutateAsync({ variantId: created.singleResult.id, isActive: true });
      await queryClient.invalidateQueries({ queryKey: productKeys.all });
      reset();
      setImageKey((current) => current + 1);
      onClose();
      await message.success('واریانت جدید با موفقیت اضافه شد.');
    } catch (error) {
      await message.error(normalizeHttpFailure(error).message);
    }
  });

  const sizeOptions = (sizes.data?.result ?? []).map((size) => ({
    value: size['english-size-name'],
    label: size['english-size-name'],
  }));
  const colorOptions = (colors.data?.result ?? []).map((color) => ({
    value: color['english-color-name'],
    label: color['persian-color-name'],
  }));

  return (
    <UiModal.Root
      open={open}
      title="افزودن واریانت"
      closable={!submitting}
      keyboard={!submitting}
      mask={{ closable: !submitting }}
      onCancel={close}
    >
      <UiForm.Root onSubmit={(event) => void submit(event)}>
        <Controller
          name="image"
          control={control}
          render={({ field }) => (
            <UiImageInput
              key={imageKey}
              id="new-variant-image"
              ref={field.ref}
              name={field.name}
              label="تصویر واریانت"
              error={errors.image?.message}
              disabled={submitting}
              toastKey="new-variant-image-error"
              onBlur={field.onBlur}
              onChange={(file) => {
                field.onChange(file);
                if (file) clearErrors('image');
              }}
              onValidationError={(errorMessage) =>
                setError('image', { type: 'validate', message: errorMessage })
              }
            />
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <UiForm.Field>
            <UiForm.Label htmlFor="new-variant-size">سایز</UiForm.Label>
            <Controller
              name="size"
              control={control}
              render={({ field }) => (
                <UiSelect.Root
                  id="new-variant-size"
                  ref={field.ref}
                  value={field.value || null}
                  options={sizeOptions}
                  disabled={submitting || sizes.isFetching}
                  status={errors.size ? 'error' : ''}
                  aria-invalid={errors.size ? 'true' : 'false'}
                  aria-describedby={errors.size ? 'new-variant-size-error' : undefined}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                />
              )}
            />
            {errors.size ? (
              <UiForm.Error id="new-variant-size-error">{errors.size.message}</UiForm.Error>
            ) : null}
          </UiForm.Field>
          <UiForm.Field>
            <UiForm.Label htmlFor="new-variant-color">رنگ</UiForm.Label>
            <Controller
              name="color"
              control={control}
              render={({ field }) => (
                <UiSelect.Root
                  id="new-variant-color"
                  ref={field.ref}
                  value={field.value || null}
                  options={colorOptions}
                  disabled={submitting || colors.isFetching}
                  status={errors.color ? 'error' : ''}
                  aria-invalid={errors.color ? 'true' : 'false'}
                  aria-describedby={errors.color ? 'new-variant-color-error' : undefined}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                />
              )}
            />
            {errors.color ? (
              <UiForm.Error id="new-variant-color-error">{errors.color.message}</UiForm.Error>
            ) : null}
          </UiForm.Field>
          <UiForm.Field className="sm:col-span-2">
            <UiForm.Label htmlFor="new-variant-quantity">موجودی</UiForm.Label>
            <UiForm.TextInput
              id="new-variant-quantity"
              type="number"
              inputMode="numeric"
              min={1}
              max={2147483647}
              disabled={submitting}
              aria-invalid={errors.onHandQuantity ? 'true' : 'false'}
              aria-describedby={
                errors.onHandQuantity ? 'new-variant-quantity-error' : undefined
              }
              {...register('onHandQuantity')}
            />
            {errors.onHandQuantity ? (
              <UiForm.Error id="new-variant-quantity-error">
                {errors.onHandQuantity.message}
              </UiForm.Error>
            ) : null}
          </UiForm.Field>
        </div>
        <UiForm.Actions>
          <UiButton variant="secondary" disabled={submitting} onClick={close}>
            انصراف
          </UiButton>
          <UiButton type="submit" loading={submitting} disabled={submitting || !isValid}>
            افزودن واریانت
          </UiButton>
        </UiForm.Actions>
      </UiForm.Root>
    </UiModal.Root>
  );
}
