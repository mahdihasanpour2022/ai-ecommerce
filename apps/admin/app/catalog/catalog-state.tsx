'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { AppLoading } from '../components/app-loading';

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

  if (busy) return <AppLoading message={title} />;

  return (
    <section
      className={`catalog-state catalog-state-${kind}`}
      aria-live={kind === 'empty' ? 'polite' : 'assertive'}
      role={kind === 'empty' ? 'status' : 'alert'}
    >
      <h1 ref={heading} tabIndex={blocking ? -1 : undefined}>
        {title}
      </h1>
      <p>{message}</p>
      <div className="catalog-state-actions">
        {onRetry ? (
          <button className="secondary-button" type="button" onClick={onRetry}>
            تلاش دوباره
          </button>
        ) : null}
        {returnHref ? <Link href={returnHref}>{returnLabel}</Link> : null}
      </div>
    </section>
  );
}
