import type { HTMLAttributes } from 'react';
import { classNames } from './class-names';

const TONE_CLASSES = {
  neutral: 'bg-surface-muted text-muted ring-border',
  accent: 'bg-brand-soft/20 text-accent-foreground ring-brand-soft/30',
  success: 'bg-success-soft text-success-foreground ring-success-border',
} as const;

export interface UiBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly tone?: keyof typeof TONE_CLASSES;
}

export function UiBadge({ className, tone = 'neutral', ...attributes }: UiBadgeProps) {
  return (
    <span
      className={classNames(
        'inline-flex min-h-7 items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset',
        TONE_CLASSES[tone],
        className,
      )}
      {...attributes}
    />
  );
}
