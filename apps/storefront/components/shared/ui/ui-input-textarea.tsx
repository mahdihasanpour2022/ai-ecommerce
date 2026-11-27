import clsx from 'clsx';
import { forwardRef, type TextareaHTMLAttributes } from 'react';

const TEXTAREA_VARIANT = {
  style_1:
    'min-h-32 resize-y rounded-lg border border-foreground/20 bg-background px-3 py-3 text-sm text-foreground/70 outline-none transition-colors placeholder:text-xs placeholder:text-foreground/70 focus-visible:border-nice-red focus-visible:ring-2 focus-visible:ring-nice-red/20 aria-invalid:border-nice-red/50 aria-invalid:focus-visible:ring-nice-red/20 disabled:cursor-not-allowed disabled:bg-foreground/5 disabled:text-foreground/50',
  style_2: '',
} as const;

const LABEL_VARIANT = {
  style_1:
    'absolute! -top-2 right-2 h-fit w-fit translate-y-0 bg-background px-2 text-xs text-foreground/70',
  style_2: '',
} as const;

type UiInputTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'aria-invalid' | 'id'
> & {
  readonly description?: string;
  readonly errorMessage?: string | undefined;
  readonly id: string;
  readonly label: string;
  readonly variant?: keyof typeof TEXTAREA_VARIANT;
  readonly label_variant?: keyof typeof LABEL_VARIANT;
  readonly labelClassName?: string;
  readonly containerClassName?: string;
  readonly hasLabel?: boolean;
};

// textarea عمومی، قرارداد label، خطای متصل و ref بومی را یکپارچه نگه می‌دارد.
export const UiInputTextarea = forwardRef<HTMLTextAreaElement, UiInputTextareaProps>(
  function UiInputTextarea(
    {
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
      rows = 5,
      variant = 'style_1',
      label_variant = 'style_1',
      ...textareaProps
    },
    ref,
  ) {
    const descriptionId = description ? `${id}-description` : undefined;
    const errorId = errorMessage ? `${id}-error` : undefined;
    const describedBy =
      [ariaDescribedBy, descriptionId, errorId].filter(Boolean).join(' ') || undefined;

    return (
      <div className={clsx('relative w-full', containerClassName)}>
        {hasLabel ? (
          <label htmlFor={id} className={clsx(LABEL_VARIANT[label_variant], labelClassName)}>
            {label}
            {required ? <span className="text-nice-red"> *</span> : null}
          </label>
        ) : null}

        {description ? (
          <p id={descriptionId} className="text-foreground/70 text-sm leading-5">
            {description}
          </p>
        ) : null}

        <textarea
          {...textareaProps}
          ref={ref}
          id={id}
          rows={rows}
          required={required}
          aria-describedby={describedBy}
          aria-invalid={errorMessage ? true : undefined}
          className={clsx('w-full', TEXTAREA_VARIANT[variant], className)}
        />

        {errorMessage ? (
          <p id={errorId} role="alert" className="text-nice-red text-xs leading-5">
            {errorMessage}
          </p>
        ) : null}
      </div>
    );
  },
);
