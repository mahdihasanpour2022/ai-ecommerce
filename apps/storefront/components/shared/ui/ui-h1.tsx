import clsx from 'clsx';
import type { ComponentPropsWithoutRef } from 'react';

const VARIANT_CLASSES = {
  style_1: 'text-lg font-bold leading-6 whitespace-nowrap',
  style_2: '',
} as const;

type HeadingType = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

interface UiHeadingProps extends ComponentPropsWithoutRef<'h1'> {
  variant?: keyof typeof VARIANT_CLASSES;
  type?: HeadingType;
}

export const UiH1 = ({
  children,
  type: Tag = 'h1',
  className,
  variant = 'style_1',
  ...props
}: UiHeadingProps) => {
  return (
    <Tag className={clsx(VARIANT_CLASSES[variant], className)} {...props}>
      {children}
    </Tag>
  );
};
