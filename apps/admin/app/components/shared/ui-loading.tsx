import Image from 'next/image';
import type { HTMLAttributes } from 'react';
import { classNames } from './class-names';

export interface UiLoadingProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  readonly message?: string;
  readonly fullscreen?: boolean;
}

export function UiLoading({
  className,
  message = 'لطفا منتظر بمانید...',
  fullscreen = false,
  ...attributes
}: UiLoadingProps) {
  return (
    <div
      {...attributes}
      className={classNames(
        'flex min-h-60 flex-col items-center justify-center gap-5 p-5 text-center sm:p-10',
        fullscreen && 'min-h-screen bg-admin-background',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Image
        className="h-auto w-14 sm:w-18"
        src="/admin-loader.svg"
        width={72}
        height={72}
        alt=""
        priority={fullscreen}
      />
      <p className="m-0 max-w-lg text-sm font-semibold leading-8 text-muted sm:text-base">
        {message}
      </p>
    </div>
  );
}
