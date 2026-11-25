'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { UiButton } from '../../../app/components/shared/ui-button';
import { UiForm } from '../../../app/components/shared/ui-form';
import { UiModal } from '../../../app/components/shared/ui-modal';
import {
  MAX_MAIN_SPEC_TITLE_LENGTH,
  MAX_MAIN_SPEC_VALUE_LENGTH,
  normalizeMainSpecText,
  productMainSpecSchema,
  type ProductMainSpec,
  type ProductMainSpecInput,
} from '../schemas/product-main-spec-schema';

interface ProductMainSpecModalProps {
  readonly open: boolean;
  readonly existingKeys: readonly string[];
  readonly kind?: 'main' | 'secondary';
  readonly onCancel: () => void;
  readonly onAdd: (item: ProductMainSpec) => void;
}

const EMPTY_VALUES: ProductMainSpecInput = { key: '', value: '' };

export function ProductMainSpecModal({
  open,
  existingKeys,
  kind = 'main',
  onCancel,
  onAdd,
}: ProductMainSpecModalProps) {
  const isSecondary = kind === 'secondary';
  const modalTitle = isSecondary ? 'افزودن ویژگی فرعی' : 'افزودن ویژگی اصلی';
  const fieldIdPrefix = isSecondary ? 'secondary-spec' : 'main-spec';
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ProductMainSpecInput, unknown, ProductMainSpec>({
    resolver: zodResolver(productMainSpecSchema),
    defaultValues: EMPTY_VALUES,
    shouldFocusError: true,
  });

  const close = () => {
    reset(EMPTY_VALUES);
    onCancel();
  };

  const submit = handleSubmit((values) => {
    const comparisonKey = values.key.toLocaleLowerCase('en-US');
    const duplicate = existingKeys.some(
      (key) => normalizeMainSpecText(key).toLocaleLowerCase('en-US') === comparisonKey,
    );
    if (duplicate) {
      setError(
        'key',
        { type: 'duplicate', message: 'این عنوان ویژگی قبلاً اضافه شده است.' },
        { shouldFocus: true },
      );
      return;
    }
    onAdd(values);
    reset(EMPTY_VALUES);
  });

  return (
    <UiModal.Root
      open={open}
      title={modalTitle}
      width={{ xs: 'calc(100vw - 2rem)', sm: 480 }}
      onCancel={close}
    >
      <UiForm.Root
        onSubmit={(event) => {
          event.stopPropagation();
          void submit(event);
        }}
      >
        <UiForm.Field>
          <UiForm.Label htmlFor={`${fieldIdPrefix}-key`}>عنوان ویژگی</UiForm.Label>
          <UiForm.TextInput
            id={`${fieldIdPrefix}-key`}
            autoFocus
            autoComplete="off"
            maxLength={MAX_MAIN_SPEC_TITLE_LENGTH}
            aria-invalid={errors.key ? 'true' : 'false'}
            aria-describedby={errors.key ? `${fieldIdPrefix}-key-error` : undefined}
            {...register('key')}
          />
          {errors.key ? (
            <UiForm.Error id={`${fieldIdPrefix}-key-error`}>{errors.key.message}</UiForm.Error>
          ) : null}
        </UiForm.Field>

        <UiForm.Field>
          <UiForm.Label htmlFor={`${fieldIdPrefix}-value`}>مقدار ویژگی</UiForm.Label>
          <UiForm.TextInput
            id={`${fieldIdPrefix}-value`}
            autoComplete="off"
            maxLength={MAX_MAIN_SPEC_VALUE_LENGTH}
            aria-invalid={errors.value ? 'true' : 'false'}
            aria-describedby={errors.value ? `${fieldIdPrefix}-value-error` : undefined}
            {...register('value')}
          />
          {errors.value ? (
            <UiForm.Error id={`${fieldIdPrefix}-value-error`}>{errors.value.message}</UiForm.Error>
          ) : null}
        </UiForm.Field>

        <UiForm.Actions>
          <UiButton type="button" variant="secondary" onClick={close}>
            انصراف
          </UiButton>
          <UiButton type="submit">افزودن ویژگی</UiButton>
        </UiForm.Actions>
      </UiForm.Root>
    </UiModal.Root>
  );
}
