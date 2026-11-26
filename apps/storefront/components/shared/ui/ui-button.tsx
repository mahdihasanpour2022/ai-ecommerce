import clsx from 'clsx';
import { type ButtonHTMLAttributes, forwardRef } from 'react';

const VARIANT_CLASSES = {
  style_1:
    'focus-visible:outline-brand inline-flex items-center justify-center gap-2 rounded-xl border font-bold transition-colors duration-200 focus-visible:outline-3 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:border-gray-300! disabled:bg-gray-200! disabled:text-gray-500! disabled:shadow-none dark:disabled:border-gray-600! dark:disabled:bg-gray-700! dark:disabled:text-gray-300! w-full py-1 text-xs sm:text-sm leading-4 font-normal text-foreground/70 h-full border-none whitespace-nowrap',
  style_2: '',
  style_3:
    'bg-white border-0 text-foreground/60 text-xs py-1! px-4! whitespace-nowrap leading-4 font-medium rounded-lg sm:rounded-xl',
  style_4: 'w-full h-fit z-10 over:z-20',
  style_5:
    'w-fit bg-nice-red text-white rounded-xl text-xs font-medium hover:bg-foreground/10 transition-colors hover:text-foreground/80',
  style_6: 'w-full h-fit z-10 over:z-20 w-fit! text-nice-red',
  style_7: 'w-full h-fit text-sm! text-foreground/70',
  style_8:
    'bg-foreground/10 text-foreground/70! font-bold rounded-full px-2! py-0! flex items-center justify-start gap-1 whitespace-nowrap text-xs',
  style_9: 'px-0! py-0 w-full min-h-fit! sm:px-0! sm:py-0! w-full! h-fit sm:min-h-fit',
  style_10:
    'w-fit bg-transparent rounded-xl text-xs font-medium hover:bg-foreground/10 transition-colors border-nice-red border text-nice-red hover:bg-transparent!',
} as const;

const SIZE_CLASSES = {
  'x-small': 'h-5 sm:min-h-7 px-1 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs',
  small: 'h-7 sm:min-h-9 px-1 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs',
  medium: 'min-h-11 px-4 py-2 text-sm',
  large: 'min-h-12 px-5 py-2.5 text-sm',
  icon: 'size-6 sm:size-10 p-0',
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
    size = 'small',
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
      className={clsx('cursor-pointer', VARIANT_CLASSES[variant], SIZE_CLASSES[size], className)}
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
