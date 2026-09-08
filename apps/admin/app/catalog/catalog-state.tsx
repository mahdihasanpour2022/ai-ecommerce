'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { classNames } from '../components/shared/class-names';
import { UiButton } from '../components/shared/ui-button';
import { UiLoading } from '../components/shared/ui-loading';

export type CatalogStateKind = 'loading' | 'empty' | 'error' | 'forbidden' | 'not-found';

interface CatalogStateProps {
  readonly kind: CatalogStateKind;
  readonly title: string;
  readonly message: string;
  readonly onRetry?: () => void;
  readonly returnHref?: string;
  readonly returnLabel?: string;
}

export function CatalogState({
  kind,
  title,
  message,
  onRetry,
  returnHref,
  returnLabel = 'بازگشت',
}: CatalogStateProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  const busy = kind === 'loading';
  const blocking = kind === 'error' || kind === 'forbidden' || kind === 'not-found';

  useEffect(() => {
    if (blocking) heading.current?.focus();
  }, [blocking]);

  if (busy) return <UiLoading message={title} />;

  return (
    <section
      className={classNames(
        'rounded-2xl border border-border bg-surface p-5 sm:p-8',
        blocking && 'border-s-4 border-s-danger',
      )}
      aria-live={kind === 'empty' ? 'polite' : 'assertive'}
      role={kind === 'empty' ? 'status' : 'alert'}
    >
      <h1
        className="m-0 text-2xl font-bold leading-snug"
        ref={heading}
        tabIndex={blocking ? -1 : undefined}
      >
        {title}
      </h1>
      <p className="mb-0 leading-8 text-muted">{message}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {onRetry ? (
          <UiButton variant="secondary" onClick={onRetry}>
            تلاش دوباره
          </UiButton>
        ) : null}
        {returnHref ? <Link href={returnHref}>{returnLabel}</Link> : null}
      </div>
    </section>
  );
}
