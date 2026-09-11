import type { ButtonHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { classNames } from './class-names';

const VARIANT_CLASSES = {
  primary: 'border-transparent bg-brand text-brand-ink shadow-brand-button hover:bg-brand-soft',
  secondary:
    'border-border bg-surface text-foreground hover:border-brand hover:text-accent-foreground',
  ghost:
    'border-transparent bg-transparent text-muted hover:bg-brand-soft/10 hover:text-accent-foreground',
  danger: 'border-red-700 bg-red-700 text-white hover:bg-red-800',
} as const;

const SIZE_CLASSES = {
  small: 'min-h-9 px-3 py-1.5 text-xs',
  medium: 'min-h-11 px-4 py-2 text-sm',
  large: 'min-h-12 px-5 py-2.5 text-sm',
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
        'inline-flex items-center justify-center gap-2 rounded-xl border font-bold transition-colors duration-200 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...attributes}
    />
  );
});
