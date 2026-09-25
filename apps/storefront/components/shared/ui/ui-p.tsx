import clsx from 'clsx';
import type { ComponentPropsWithoutRef } from 'react';

const VARIANT_CLASSES = {
  style_1: 'w-full py-1 text-sm leading-4 sm:leading-5 font-normal text-foreground/80 ',
  style_2: 'text-white text-bold text-base sm:text-2xl leading-4 whitespace-nowrap',
} as const;

interface UiP_Props extends ComponentPropsWithoutRef<'p'> {
  variant?: keyof typeof VARIANT_CLASSES;
  title?: string;
}

export const UiP = ({ children, title, className, variant = 'style_1', ...props }: UiP_Props) => {
  return (
    <p className={clsx(VARIANT_CLASSES[variant], className)} title={title} {...props}>
      {children}
    </p>
  );
};
