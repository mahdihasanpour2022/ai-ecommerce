import clsx from 'clsx';
import Link from 'next/link';
import { type ComponentPropsWithoutRef, forwardRef } from 'react';

const VARIANT_CLASSES = {
  style_1:
    'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-xl bg-nice-red px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-foreground/10 hover:text-foreground/80 focus-visible:outline-3 focus-visible:outline-brand focus-visible:outline-offset-2 sm:text-sm',
  style_2:
    'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-xl bg-white px-3 py-2 text-xs font-medium text-foreground/60 transition-colors hover:bg-foreground/15 hover:text-white focus-visible:outline-3 focus-visible:outline-brand focus-visible:outline-offset-2 sm:text-sm',
} as const;

export interface UiLinkProps extends ComponentPropsWithoutRef<typeof Link> {
  readonly variant?: keyof typeof VARIANT_CLASSES;
}

export const UiLink = forwardRef<HTMLAnchorElement, UiLinkProps>(function UiLink(
  { children, className, variant = 'style_1', ...attributes },
  ref,
) {
  return (
    <Link ref={ref} className={clsx(VARIANT_CLASSES[variant], className)} {...attributes}>
      {children}
    </Link>
  );
});
