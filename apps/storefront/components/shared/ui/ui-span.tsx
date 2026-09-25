import clsx from 'clsx';
import type { ComponentPropsWithoutRef } from 'react';

const VARIANT_CLASSES = {
  style_1: 'w-full py-1 text-xs leading-5 font-normal text-foreground/70 whitespace-nowrap',
  style_2: 'text-[10px] sm:text-sm text-foreground/50 font-medium leading-4',
  style_3 :'text-foreground/30 w-fit text-sm line-through',
  style_4 :'text-white w-fit text-xs bg-nice-red px-1.5 py-0.5 rounded-2xl',
  style_5 :'text-foreground/80 w-fit text-base pt-0.5 rounded-2xl font-bold'
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
