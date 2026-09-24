import clsx from 'clsx';
import { type ButtonHTMLAttributes, forwardRef } from 'react';

const VARIANT_CLASSES = {
  style_1:
    'w-full py-1 text-xs sm:text-sm leading-4 font-normal text-foreground/70 h-full border-none whitespace-nowrap',
  style_2: '',
} as const;

const SIZE_CLASSES = {
  small: 'min-h-9 px-3 py-1.5 text-xs',
  medium: 'min-h-11 px-4 py-2 text-sm',
  large: 'min-h-12 px-5 py-2.5 text-sm',
  icon: 'size-10 p-0',
} as const;

export interface UiButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: keyof typeof VARIANT_CLASSES;
  readonly size?: keyof typeof SIZE_CLASSES;
  readonly loading?: boolean;
}

export const UiButton = forwardRef<HTMLButtonElement, UiButtonProps>(function UiButton(
  {
    children,
    className,
    disabled,
    loading = false,
    variant = 'style_1',
    size = 'medium',
    type = 'button',
    ...attributes
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        'focus-visible:outline-brand inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border font-bold transition-colors duration-200 focus-visible:outline-3 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:border-gray-300! disabled:bg-gray-200! disabled:text-gray-500! disabled:shadow-none dark:disabled:border-gray-600! dark:disabled:bg-gray-700! dark:disabled:text-gray-300!',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...attributes}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  );
});
