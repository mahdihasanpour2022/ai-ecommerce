'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { App } from 'antd';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { UiButton } from '../../../app/components/shared/ui-button';
import { UiForm } from '../../../app/components/shared/ui-form';
import { UiModal } from '../../../app/components/shared/ui-modal';
import { UiSelect } from '../../../app/components/shared/ui-select';
import { normalizeHttpFailure } from '../../../app/http/http-client';
import { useGetProductColors } from '../../../hooks/shared/useGetProductColors';
import { useGetProductSizes } from '../../../hooks/shared/useGetProductSizes';
import { useEditProductWorkflow } from '../hooks/useEditProductWorkflow';
import type { ProductVariant } from '../interfaces/product-contract';
import {
  editProductVariantSchema,
  type EditProductVariantFormValues,
} from '../schemas/edit-product-variant-schema';

interface EditProductVariantModalProps {
  readonly variant: ProductVariant | null;
  readonly onClose: () => void;
}

// ویرایش مشخصات و موجودی واریانت را مستقل از فرم اصلی محصول انجام می‌دهد.
export function EditProductVariantModal({ variant, onClose }: EditProductVariantModalProps) {
  const { message } = App.useApp();
  const editVariant = useEditProductWorkflow();
  const sizes = useGetProductSizes(variant !== null);
  const colors = useGetProductColors(variant !== null);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditProductVariantFormValues>({
    resolver: zodResolver(editProductVariantSchema),
    defaultValues: { size: '', color: '', onHandQuantity: '' },
    mode: 'onChange',
  });

  useEffect(() => {
    if (!variant) return;
    reset({
      size: variant.size ?? '',
      color: variant.color?.englishColorName ?? '',
      onHandQuantity: String(variant.inventory.onHandQuantity),
    });
  }, [reset, variant]);

  const submitting = editVariant.isPending || isSubmitting;
  const submit = handleSubmit(async (values) => {
    if (!variant) return;
    const size = values.size;
    const color = values.color;
    const onHandQuantity = Number(values.onHandQuantity);
    try {
      const changed = await editVariant.save({
        ...(size === variant.size && color === variant.color?.englishColorName
          ? {}
          : {
              variant: {
                variantId: variant.id,
                ...(size === variant.size ? {} : { size }),
                ...(color === variant.color?.englishColorName ? {} : { color }),
              },
            }),
        ...(onHandQuantity === variant.inventory.onHandQuantity
          ? {}
          : {
              inventory: {
                variantId: variant.id,
                onHandQuantity,
                version: variant.inventory.version,
              },
            }),
      });
      onClose();
      await (changed
        ? message.success('واریانت با موفقیت ویرایش شد.')
        : message.info('تغییری برای ذخیره وجود نداشت.'));
    } catch (error) {
      await message.error(normalizeHttpFailure(error).message);
    }
  });

  return (
    <UiModal.Root
      open={variant !== null}
      title="ویرایش واریانت"
      closable={!submitting}
      keyboard={!submitting}
      mask={{ closable: !submitting }}
      onCancel={onClose}
    >
      <UiForm.Root onSubmit={(event) => void submit(event)}>
        <UiForm.Field>
          <UiForm.Label htmlFor="edit-variant-size">سایز</UiForm.Label>
          <Controller
            name="size"
            control={control}
            render={({ field }) => (
              <UiSelect.Root
                id="edit-variant-size"
                ref={field.ref}
                value={field.value || null}
                options={(sizes.data?.result ?? []).map((size) => ({
                  value: size['english-size-name'],
                  label: size['english-size-name'],
                }))}
                placeholder="انتخاب سایز"
                loading={sizes.isFetching}
                disabled={submitting || sizes.isFetching || sizes.isError}
                status={errors.size ? 'error' : ''}
                aria-invalid={errors.size ? 'true' : 'false'}
                aria-describedby={errors.size ? 'edit-variant-size-error' : undefined}
                onBlur={field.onBlur}
                onChange={field.onChange}
              />
            )}
          />
          {errors.size ? (
            <UiForm.Error id="edit-variant-size-error">{errors.size.message}</UiForm.Error>
          ) : null}
        </UiForm.Field>

        <UiForm.Field>
          <UiForm.Label htmlFor="edit-variant-color">رنگ</UiForm.Label>
          <Controller
            name="color"
            control={control}
            render={({ field }) => (
              <UiSelect.Root
                id="edit-variant-color"
                ref={field.ref}
                value={field.value || null}
                options={(colors.data?.result ?? []).map((color) => ({
                  value: color['english-color-name'],
                  label: color['persian-color-name'],
                }))}
                placeholder="انتخاب رنگ"
                loading={colors.isFetching}
                disabled={submitting || colors.isFetching || colors.isError}
                status={errors.color ? 'error' : ''}
                aria-invalid={errors.color ? 'true' : 'false'}
                aria-describedby={errors.color ? 'edit-variant-color-error' : undefined}
                onBlur={field.onBlur}
                onChange={field.onChange}
              />
            )}
          />
          {errors.color ? (
            <UiForm.Error id="edit-variant-color-error">{errors.color.message}</UiForm.Error>
          ) : null}
        </UiForm.Field>

        <UiForm.Field>
          <UiForm.Label htmlFor="edit-variant-quantity">موجودی</UiForm.Label>
          <UiForm.TextInput
            id="edit-variant-quantity"
            type="number"
            inputMode="numeric"
            min={0}
            max={2147483647}
            step={1}
            dir="ltr"
            disabled={submitting}
            aria-invalid={errors.onHandQuantity ? 'true' : 'false'}
            aria-describedby={errors.onHandQuantity ? 'edit-variant-quantity-error' : undefined}
            {...register('onHandQuantity')}
          />
          {errors.onHandQuantity ? (
            <UiForm.Error id="edit-variant-quantity-error">
              {errors.onHandQuantity.message}
            </UiForm.Error>
          ) : null}
        </UiForm.Field>

        <UiForm.Actions>
          <UiButton variant="secondary" disabled={submitting} onClick={onClose}>
            انصراف
          </UiButton>
          <UiButton type="submit" loading={submitting} disabled={submitting}>
            ذخیره تغییرات
          </UiButton>
        </UiForm.Actions>
      </UiForm.Root>
    </UiModal.Root>
  );
}
