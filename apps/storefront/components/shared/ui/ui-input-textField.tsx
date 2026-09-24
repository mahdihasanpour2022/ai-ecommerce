import clsx from 'clsx';
import type { ComponentPropsWithRef } from 'react';

const INPUT_VARIANT = {
  style_1:
    'min-h-11 rounded-lg border border-foreground/20 bg-background px-3 py-2 text-base text-foreground outline-none transition-colors placeholder:text-xs placeholder:text-foreground/70 focus-visible:border-nice-red focus-visible:ring-1 focus-visible:ring-nice-red/20 aria-invalid:border-nice-red/50 aria-invalid:focus-visible:ring-nice-red/20 disabled:cursor-not-allowed disabled:bg-foreground/5 disabled:text-foreground/50',
  style_2: '',
} as const;

const LABEL_VARIANT = {
  style_1:
    'absolute! -top-2 right-2 h-fit w-fit translate-y-0 bg-background px-2 text-xs text-foreground/70',
  style_2: '',
} as const;

type InputType = 'text' | 'number';

type UiInputProps = Omit<ComponentPropsWithRef<'input'>, 'aria-invalid' | 'id' | 'type'> & {
  description?: string;
  errorMessage?: string | undefined;
  id: string;
  label: string;
  type: InputType;
  variant?: keyof typeof INPUT_VARIANT;
  label_variant?: keyof typeof LABEL_VARIANT;
  labelClassName?: string;
  containerClassName?: string;
  hasLabel?: boolean;
};

export const UiInputTextField = ({
  'aria-describedby': ariaDescribedBy,
  className,
  labelClassName,
  containerClassName,
  description,
  errorMessage,
  id,
  hasLabel = true,
  label,
  required = false,
  variant = 'style_1',
  label_variant = 'style_1',
  type,
  ...inputProps
}: UiInputProps) => {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = errorMessage ? `${id}-error` : undefined;
  const describedBy =
    [ariaDescribedBy, descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={clsx('relative w-full', containerClassName)}>
      {hasLabel && (
        <label htmlFor={id} className={clsx(LABEL_VARIANT[label_variant], labelClassName)}>
          {label}
          {required ? <span className="text-nice-red"> *</span> : null}
        </label>
      )}

      {description ? (
        <p id={descriptionId} className="text-foreground/70 text-sm leading-5">
          {description}
        </p>
      ) : null}

      <input
        {...inputProps}
        id={id}
        type={type}
        required={required}
        aria-describedby={describedBy}
        aria-invalid={errorMessage ? true : undefined}
        className={clsx('w-full', INPUT_VARIANT[variant], className)}
      />

      {errorMessage ? (
        <p id={errorId} role="alert" className="text-nice-red text-xs leading-5">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
};
