import clsx from 'clsx';
import type { ComponentPropsWithoutRef } from 'react';

const VARIANT_CLASSES = {
  style_1: 'w-full py-1 text-xs leading-5 font-normal text-foreground/70 whitespace-nowrap',
  style_2: '',
} as const;

interface UiSpanProps extends ComponentPropsWithoutRef<'span'> {
  variant?: keyof typeof VARIANT_CLASSES;
}

export const UiSpan = ({ children, className, variant = 'style_1', ...props }: UiSpanProps) => {
  return (
    <span className={clsx(VARIANT_CLASSES[variant], className)} {...props}>
      {children}
    </span>
  );
};
