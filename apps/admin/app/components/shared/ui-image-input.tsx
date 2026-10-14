'use client';

import { App } from 'antd';
import { forwardRef } from 'react';

import {
  IMAGE_ACCEPT,
  IMAGE_MAX_BYTES,
  ImageSanitizationError,
  imageSanitizer,
} from '../../../utils/image-sanitizer';
import { UiForm } from './ui-form';

interface UiImageInputProps {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly help: string;
  readonly error?: string | undefined;
  readonly disabled?: boolean;
  readonly maxBytes?: number;
  readonly maxSizeLabel?: string;
  readonly toastKey: string;
  readonly onBlur: () => void;
  readonly onChange: (file: File | undefined) => void;
  readonly onValidationError: (message: string) => void;
}

// انتخاب فایل و اعتبارسنجی مشترک تصاویر فرم‌های Admin را یکپارچه می‌کند.
export const UiImageInput = forwardRef<HTMLInputElement, UiImageInputProps>(function UiImageInput(
  {
    id,
    name,
    label,
    help,
    error,
    disabled = false,
    maxBytes = IMAGE_MAX_BYTES,
    maxSizeLabel = '۴۰۰ کیلوبایت',
    toastKey,
    onBlur,
    onChange,
    onValidationError,
  },
  ref,
) {
  const { message } = App.useApp();
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;

  return (
    <UiForm.Field>
      <UiForm.Label htmlFor={id}>{label}</UiForm.Label>
      <UiForm.TextInput
        id={id}
        ref={ref}
        name={name}
        type="file"
        accept={IMAGE_ACCEPT}
        disabled={disabled}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${helpId} ${errorId}` : helpId}
        className="cursor-pointer file:me-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:font-bold file:text-accent-foreground"
        onBlur={onBlur}
        onChange={(event) => {
          const input = event.currentTarget;
          const file = input.files?.[0];
          if (!file) return onChange(undefined);
          void imageSanitizer(file, { maxBytes, maxSizeLabel })
            .then(onChange)
            .catch(async (reason: unknown) => {
              const content =
                reason instanceof ImageSanitizationError
                  ? reason.message
                  : 'بررسی تصویر ممکن نشد. تصویر دیگری انتخاب کنید.';
              input.value = '';
              onChange(undefined);
              onValidationError(content);
              await message.error({ key: toastKey, content });
            });
        }}
      />
      <p id={helpId} className="m-0 text-xs leading-6 text-muted">
        {help}
      </p>
      {error ? <UiForm.Error id={errorId}>{error}</UiForm.Error> : null}
    </UiForm.Field>
  );
});
