'use client';

import type { RefSelectProps, SelectProps } from 'antd';
import { Select as AntSelect } from 'antd';
import type { HTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import { classNames } from './class-names';

type UiSelectRootProps = Omit<SelectProps<string>, 'classNames' | 'size'>;

const Root = forwardRef<RefSelectProps, UiSelectRootProps>(function UiSelectRoot(
  { className, notFoundContent = 'دسته‌بندی‌ای یافت نشد.', placement = 'bottomRight', ...props },
  ref,
) {
  return (
    <AntSelect
      ref={ref}
      className={classNames('w-full', className)}
      classNames={{
        popup: {
          root: 'overflow-hidden rounded-2xl border border-border bg-surface p-1 shadow-panel',
        },
      }}
      notFoundContent={notFoundContent}
      placement={placement}
      size="large"
      {...props}
    />
  );
});

interface OptionContentProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  readonly label: ReactNode;
  readonly hint: ReactNode;
  readonly tone?: 'highlight' | 'neutral';
}

function OptionContent({
  className,
  hint,
  label,
  tone = 'neutral',
  ...attributes
}: OptionContentProps) {
  return (
    <div
      className={classNames('flex min-h-6 items-center justify-between gap-3', className)}
      {...attributes}
    >
      <span className="min-w-0 truncate text-sm font-semibold text-inherit">{label}</span>
      <span
        className={classNames(
          'shrink-0 rounded-full px-2 py-0 text-xs font-bold',
          tone === 'highlight'
            ? 'bg-brand-soft/20 text-accent-foreground'
            : 'bg-surface-muted text-muted',
        )}
      >
        {hint}
      </span>
    </div>
  );
}

export const UiSelect = { Root, OptionContent } as const;
