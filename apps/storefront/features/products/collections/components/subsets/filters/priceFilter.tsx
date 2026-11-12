import { UiButton, UiInputTextField, UiSpan } from '@/components/shared/ui';
import { Accordion, AccordionItem } from '@szhsin/react-accordion';
import clsx from 'clsx';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import styles from './priceFilter.module.css';

interface PriceFilterProps {
  readonly minimumPriceRial: number | undefined;
  readonly maximumPriceRial: number | undefined;
  readonly onChange: (minimum: number, maximum: number) => void;
  readonly onClear: () => void;
}

const STEP_RIAL = 1;
const PRICE_FILTER_DEBOUNCE_MS = 1_000;
const MINIMUM_PRICE_RIAL = 1;
const MAXIMUM_PRICE_RIAL = 100_000_000;
const priceFormatter = new Intl.NumberFormat('fa-IR');
const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
const arabicDigits = '٠١٢٣٤٥٦٧٨٩';

function formatPrice(value: number): string {
  return priceFormatter.format(value);
}

function parsePrice(value: string): number | undefined {
  const normalized = [...value]
    .map((character) => {
      const persianIndex = persianDigits.indexOf(character);
      if (persianIndex >= 0) return String(persianIndex);
      const arabicIndex = arabicDigits.indexOf(character);
      return arabicIndex >= 0 ? String(arabicIndex) : character;
    })
    .join('')
    .replace(/[^0-9]/gu, '');
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function PriceFilter({
  minimumPriceRial,
  maximumPriceRial,
  onChange,
  onClear,
}: PriceFilterProps) {
  const lowerBound = MINIMUM_PRICE_RIAL;
  const upperBound = MAXIMUM_PRICE_RIAL;
  const [minimum, setMinimum] = useState(lowerBound);
  const [maximum, setMaximum] = useState(upperBound);
  const [minimumInput, setMinimumInput] = useState(formatPrice(lowerBound));
  const [maximumInput, setMaximumInput] = useState(formatPrice(upperBound));
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  const isActive = minimumPriceRial !== undefined || maximumPriceRial !== undefined;
  const sliderDisabled = upperBound <= lowerBound;
  const stateSource = `${lowerBound}:${upperBound}:${minimumPriceRial ?? ''}:${maximumPriceRial ?? ''}`;
  const [previousStateSource, setPreviousStateSource] = useState(stateSource);

  if (previousStateSource !== stateSource) {
    const nextMinimum = clamp(minimumPriceRial ?? lowerBound, lowerBound, upperBound);
    const nextMaximum = clamp(maximumPriceRial ?? upperBound, nextMinimum, upperBound);
    setPreviousStateSource(stateSource);
    setMinimum(nextMinimum);
    setMaximum(nextMaximum);
    setMinimumInput(formatPrice(nextMinimum));
    setMaximumInput(formatPrice(nextMaximum));
  }

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(
    () => () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    },
    [],
  );

  useEffect(() => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = null;
  }, [stateSource]);

  const percentages = useMemo(() => {
    const span = upperBound - lowerBound;
    if (span <= 0) return { left: 0, right: 0 };
    return {
      left: ((upperBound - maximum) / span) * 100,
      right: ((minimum - lowerBound) / span) * 100,
    };
  }, [lowerBound, maximum, minimum, upperBound]);

  const commitRange = (nextMinimum: number, nextMaximum: number, debounce = false) => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    if (!debounce) {
      onChangeRef.current(nextMinimum, nextMaximum);
      return;
    }
    debounceTimeoutRef.current = setTimeout(() => {
      onChangeRef.current(nextMinimum, nextMaximum);
      debounceTimeoutRef.current = null;
    }, PRICE_FILTER_DEBOUNCE_MS);
  };

  const applyRange = (nextMinimum: number, nextMaximum: number, debounce = false) => {
    const safeMinimum = clamp(nextMinimum, lowerBound, upperBound);
    const safeMaximum = clamp(nextMaximum, safeMinimum, upperBound);
    setMinimum(safeMinimum);
    setMaximum(safeMaximum);
    setMinimumInput(formatPrice(safeMinimum));
    setMaximumInput(formatPrice(safeMaximum));
    commitRange(safeMinimum, safeMaximum, debounce);
  };

  const commitMinimum = () => {
    const parsed = parsePrice(minimumInput);
    applyRange(parsed === undefined ? minimum : Math.min(parsed, maximum), maximum);
  };

  const commitMaximum = () => {
    const parsed = parsePrice(maximumInput);
    applyRange(minimum, parsed === undefined ? maximum : Math.max(parsed, minimum));
  };

  const commitOnEnter = (event: KeyboardEvent<HTMLInputElement>, commit: () => void) => {
    if (event.key !== 'Enter') return;
    commit();
    event.currentTarget.blur();
  };

  const handleTrackPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (sliderDisabled || event.target instanceof HTMLInputElement) return;
    const boundsRect = event.currentTarget.getBoundingClientRect();
    const ratio = clamp((event.clientX - boundsRect.left) / boundsRect.width, 0, 1);
    const rawValue = upperBound - ratio * (upperBound - lowerBound);
    const value = clamp(Math.round(rawValue / STEP_RIAL) * STEP_RIAL, lowerBound, upperBound);
    if (Math.abs(value - minimum) <= Math.abs(value - maximum)) applyRange(value, maximum, true);
    else applyRange(minimum, value, true);
  };

  const handleClear = () => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = null;
    onClear();
  };

  return (
    <div className="relative w-full">
      <Accordion transition transitionTimeout={350} className="w-full">
        <AccordionItem
          className="border-foreground/15 w-full! border-t"
          header={({ state }) => (
            <div className="flex w-full! items-center justify-between">
              <UiSpan
                variant="style_1"
                className="text-foreground/70! w-fit text-start text-base! font-medium!"
              >
                قیمت
              </UiSpan>
              <svg
                aria-hidden="true"
                className={clsx(
                  'size-4 transition-transform duration-300',
                  state.isEnter && 'rotate-180',
                )}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
          buttonProps={{ className: 'pb-3 pt-4 w-full pl-3 cursor-pointer!' }}
          contentProps={{ className: 'overflow-hidden transition-[height] duration-[350ms]' }}
        >
          <div className="flex flex-col gap-5 px-1 pt-3 pb-5">
              <UiInputTextField
                id="minimum-product-price"
                type="text"
                inputMode="numeric"
                label="از قیمت (ریال)"
                value={minimumInput}
                onChange={(event) => setMinimumInput(event.target.value)}
                onBlur={commitMinimum}
                onKeyDown={(event) => commitOnEnter(event, commitMinimum)}
              />
              <UiInputTextField
                id="maximum-product-price"
                type="text"
                inputMode="numeric"
                label="تا قیمت (ریال)"
                value={maximumInput}
                onChange={(event) => setMaximumInput(event.target.value)}
                onBlur={commitMaximum}
                onKeyDown={(event) => commitOnEnter(event, commitMaximum)}
              />

              <div className="pt-1">
                <div
                  className="relative flex h-6 items-center"
                  onPointerDown={handleTrackPointerDown}
                >
                  <span className="bg-foreground/15 absolute inset-x-0 h-1 rounded-full" />
                  <span
                    className="bg-nice-red absolute h-1 rounded-full"
                    style={{ left: `${percentages.left}%`, right: `${percentages.right}%` }}
                  />
                  <input
                    className={styles.rangeInput}
                    type="range"
                    dir="rtl"
                    aria-label="حداقل قیمت"
                    min={lowerBound}
                    max={upperBound}
                    step={STEP_RIAL}
                    value={minimum}
                    disabled={sliderDisabled}
                    onChange={(event) =>
                      applyRange(Math.min(Number(event.target.value), maximum), maximum, true)
                    }
                  />
                  <input
                    className={styles.rangeInput}
                    type="range"
                    dir="rtl"
                    aria-label="حداکثر قیمت"
                    min={lowerBound}
                    max={upperBound}
                    step={STEP_RIAL}
                    value={maximum}
                    disabled={sliderDisabled}
                    onChange={(event) =>
                      applyRange(minimum, Math.max(Number(event.target.value), minimum), true)
                    }
                  />
                </div>
                <div dir="ltr" className="text-foreground/60 flex justify-between text-xs">
                  <span dir="rtl">گران‌ترین</span>
                  <span dir="rtl">ارزان‌ترین</span>
                </div>
              </div>
          </div>
        </AccordionItem>
      </Accordion>

      {isActive ? (
        <UiButton
          variant="style_7"
          aria-label="حذف فیلتر قیمت"
          onClick={handleClear}
          className="border-foreground/10 text-foreground/70 absolute top-4.5 sm:top-3.5 right-12 z-10 flex max-w-44! items-center justify-between gap-4 rounded-full border px-2! py-1! text-xs!"
        >
          <span className="truncate">
            {formatPrice(minimum)} تا {formatPrice(maximum)}
          </span>
          <span aria-hidden="true" className="shrink-0 text-base leading-none">
            ×
          </span>
        </UiButton>
      ) : null}
    </div>
  );
}
