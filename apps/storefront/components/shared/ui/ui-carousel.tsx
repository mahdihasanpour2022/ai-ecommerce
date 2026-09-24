'use client';

import clsx from 'clsx';
import Autoplay, { type AutoplayOptionsType } from 'embla-carousel-autoplay';
import useEmblaCarousel from 'embla-carousel-react';
import {
  Children,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useMemo,
  useSyncExternalStore,
} from 'react';

import { UiButton } from './ui-button';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const EMPTY_NAVIGATION_SNAPSHOT = '0:0:0:0';
const getServerNavigationSnapshot = () => EMPTY_NAVIGATION_SNAPSHOT;

export type UiCarouselOptions = NonNullable<Parameters<typeof useEmblaCarousel>[0]>;
export type UiCarouselAutoplay = boolean | AutoplayOptionsType;
export type UiCarouselControls = 'none' | 'arrows' | 'dots' | 'both';

export interface UiCarouselLabels {
  readonly carousel?: string;
  readonly next?: string;
  readonly previous?: string;
  readonly slide?: (index: number, count: number) => string;
  readonly goToSlide?: (index: number) => string;
}

export interface UiCarouselProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  readonly children: ReactNode;
  readonly options?: UiCarouselOptions;
  readonly autoplay?: UiCarouselAutoplay;
  readonly controls?: UiCarouselControls;
  readonly labels?: UiCarouselLabels;
  readonly viewportClassName?: string;
  readonly containerClassName?: string;
  readonly slideClassName?: string;
  readonly controlsClassName?: string;
  readonly dotsClassName?: string;
}

const defaultSlideLabel = (index: number, count: number) => `اسلاید ${index} از ${count}`;
const defaultGoToSlideLabel = (index: number) => `رفتن به اسلاید ${index}`;

export function UiCarousel({
  children,
  className,
  options,
  autoplay = false,
  controls = 'both',
  labels,
  viewportClassName,
  containerClassName,
  slideClassName,
  controlsClassName,
  dotsClassName,
  ...attributes
}: UiCarouselProps) {
  const slides = Children.toArray(children);
  const axis = options?.axis ?? 'x';
  const direction = options?.direction ?? 'rtl';

  const carouselOptions = useMemo<UiCarouselOptions>(
    () => ({
      align: 'start',
      loop: false,
      ...options,
      axis,
      direction,
      breakpoints: {
        ...options?.breakpoints,
        [REDUCED_MOTION_QUERY]: {
          ...options?.breakpoints?.[REDUCED_MOTION_QUERY],
          duration: 0,
        },
      },
    }),
    [axis, direction, options],
  );

  const autoplayPlugin = useMemo(() => {
    if (!autoplay) return null;

    const autoplayOptions = typeof autoplay === 'object' ? autoplay : {};

    return Autoplay({
      delay: 5000,
      stopOnFocusIn: true,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
      ...autoplayOptions,
      breakpoints: {
        ...autoplayOptions.breakpoints,
        [REDUCED_MOTION_QUERY]: {
          ...autoplayOptions.breakpoints?.[REDUCED_MOTION_QUERY],
          active: false,
        },
      },
    });
  }, [autoplay]);

  const plugins = useMemo(() => (autoplayPlugin ? [autoplayPlugin] : []), [autoplayPlugin]);
  const [viewportRef, carouselApi] = useEmblaCarousel(carouselOptions, plugins);

  const subscribeToNavigation = useCallback(
    (onStoreChange: () => void) => {
      if (!carouselApi) return () => undefined;

      carouselApi.on('reInit', onStoreChange).on('select', onStoreChange);

      return () => {
        carouselApi.off('reInit', onStoreChange).off('select', onStoreChange);
      };
    },
    [carouselApi],
  );

  const getNavigationSnapshot = useCallback(() => {
    if (!carouselApi) return EMPTY_NAVIGATION_SNAPSHOT;

    return [
      carouselApi.selectedScrollSnap(),
      carouselApi.scrollSnapList().length,
      carouselApi.canScrollPrev() ? 1 : 0,
      carouselApi.canScrollNext() ? 1 : 0,
    ].join(':');
  }, [carouselApi]);

  const navigationSnapshot = useSyncExternalStore(
    subscribeToNavigation,
    getNavigationSnapshot,
    getServerNavigationSnapshot,
  );
  const [selectedIndexValue, scrollSnapCountValue, canScrollPreviousValue, canScrollNextValue] =
    navigationSnapshot.split(':');
  const selectedIndex = Number(selectedIndexValue ?? 0);
  const scrollSnapCount = Number(scrollSnapCountValue ?? 0);
  const canScrollPrevious = canScrollPreviousValue === '1';
  const canScrollNext = canScrollNextValue === '1';
  const hasMultipleSlides = scrollSnapCount > 1;
  const showArrows = hasMultipleSlides && (controls === 'arrows' || controls === 'both');
  const showDots = hasMultipleSlides && (controls === 'dots' || controls === 'both');
  const slideLabel = labels?.slide ?? defaultSlideLabel;
  const goToSlideLabel = labels?.goToSlide ?? defaultGoToSlideLabel;

  return (
    <div
      {...attributes}
      className={clsx('relative min-w-0', className)}
      role="region"
      aria-roledescription="carousel"
      aria-label={labels?.carousel ?? 'اسلایدر'}
      dir={direction}
    >
      <div ref={viewportRef} className={clsx('overflow-hidden', viewportClassName)}>
        <div
          className={clsx(
            axis === 'x' ? 'flex touch-pan-y' : 'flex touch-pan-x flex-col',
            containerClassName,
          )}
        >
          {slides.map((slide, index) => (
            <div
              key={index}
              className={clsx(
                'relative shrink-0 grow-0 basis-full',
                axis === 'x' ? 'min-w-0' : 'min-h-0',
                slideClassName,
              )}
              role="group"
              aria-roledescription="slide"
              aria-label={slideLabel(index + 1, slides.length)}
            >
              {slide}
            </div>
          ))}
        </div>
      </div>

      {showArrows ? (
        <div
          className={clsx(
            'pointer-events-none absolute inset-x-0 top-1/2 hidden -translate-y-1/2 justify-between px-2 sm:flex!',
            controlsClassName,
          )}
        >
          <UiButton
            variant="style_2"
            size="icon"
            className="pointer-events-auto rounded-full border border-white/70 bg-black/45 text-white shadow-sm hover:bg-black/60"
            onClick={() => carouselApi?.scrollPrev()}
            disabled={!canScrollPrevious}
            aria-label={labels?.previous ?? 'اسلاید قبلی'}
          >
            <ChevronIcon direction={direction === 'rtl' ? 'right' : 'left'} />
          </UiButton>

          <UiButton
            variant="style_2"
            size="icon"
            className="pointer-events-auto rounded-full border border-white/70 bg-black/45 text-white shadow-sm hover:bg-black/60"
            onClick={() => carouselApi?.scrollNext()}
            disabled={!canScrollNext}
            aria-label={labels?.next ?? 'اسلاید بعدی'}
          >
            <ChevronIcon direction={direction === 'rtl' ? 'left' : 'right'} />
          </UiButton>
        </div>
      ) : null}

      {showDots ? (
        <div
          className={clsx(
            'absolute -bottom-3 left-1/2 flex w-24 -translate-x-1/2 items-center gap-0 rounded-full bg-black/0 px-3 py-2 sm:bottom-0 sm:w-40 sm:gap-2',
            dotsClassName,
          )}
        >
          {Array.from({ length: scrollSnapCount }, (_, index) => (
            <button
              key={index}
              type="button"
              className={clsx(
                'group flex size-6 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
              )}
              onClick={() => carouselApi?.scrollTo(index)}
              aria-label={goToSlideLabel(index + 1)}
              aria-current={selectedIndex === index ? 'true' : undefined}
            >
              <span
                aria-hidden="true"
                className={clsx(
                  'size-1.5 rounded-full transition-colors sm:size-2',
                  selectedIndex === index
                    ? 'w-4 bg-white sm:w-10'
                    : 'bg-white/50 group-hover:bg-white/80',
                )}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ChevronIcon({ direction }: { readonly direction: 'left' | 'right' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      className={clsx('size-4 sm:size-5', direction === 'right' && 'rotate-180')}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
    </svg>
  );
}
