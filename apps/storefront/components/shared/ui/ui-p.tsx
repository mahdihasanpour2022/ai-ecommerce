import clsx from 'clsx';
import type { ComponentPropsWithoutRef } from 'react';

const VARIANT_CLASSES = {
  style_1: 'w-full py-1 text-sm leading-4 font-normal text-foreground/70 h-full',
  style_2: '',
} as const;

interface UiP_Props extends ComponentPropsWithoutRef<'p'> {
  variant?: keyof typeof VARIANT_CLASSES;
}

export const UiP = ({ children, className, variant = 'style_1', ...props }: UiP_Props) => {
  return (
    <p className={clsx(VARIANT_CLASSES[variant], className)} {...props}>
      {children}
    </p>
  );
};
