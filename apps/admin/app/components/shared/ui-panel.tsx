import type { HTMLAttributes } from 'react';
import { classNames } from './class-names';

export interface UiPanelProps extends HTMLAttributes<HTMLDivElement> {
  readonly padded?: boolean;
}

export function UiPanel({ className, padded = true, ...attributes }: UiPanelProps) {
  return (
    <div
      className={classNames(
        'rounded-2xl border border-border bg-surface shadow-panel',
        padded && 'p-4 sm:p-5',
        className,
      )}
      {...attributes}
    />
  );
}
