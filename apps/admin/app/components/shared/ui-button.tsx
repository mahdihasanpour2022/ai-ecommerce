import type { ButtonHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { classNames } from './class-names';

const VARIANT_CLASSES = {
  primary: 'border-transparent bg-brand text-brand-ink shadow-brand-button hover:bg-brand-soft',
  secondary: 'border-border bg-surface text-gray-400! hover:border-gray-400 hover:text-gray-400!',
  ghost:
    'border-transparent bg-transparent text-muted hover:bg-brand-soft/10 hover:text-accent-foreground',
  theme: 'text-accent-foreground shadow-sm hover:bg-brand-soft/20 border-gray-300 dark:border-gray-700',
  danger: 'border-red-700 bg-red-700 text-white hover:bg-red-800',
  dangerSubtle:
    'border-red-200 bg-red-400 text-white! border-red-400 hover:border-red-300 hover:bg-white hover:text-red-400! dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/70',
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
}

export const UiButton = forwardRef<HTMLButtonElement, UiButtonProps>(function UiButton(
  { className, variant = 'primary', size = 'medium', type = 'button', ...attributes },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={classNames(
        'inline-flex items-center justify-center gap-2 rounded-xl border font-bold cursor-pointer transition-colors duration-200 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...attributes}
    />
  );
});
