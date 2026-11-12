import { UiButton, UiP, UiSpan } from '@/components/shared/ui';
import { Accordion, AccordionItem } from '@szhsin/react-accordion';
import clsx from 'clsx';
import { useGetProductSizes } from '../../../hooks/useGetProductSizes';

interface SizeFilterProps {
  readonly selectedSize: string | undefined;
  readonly onSelect: (size: string) => void;
  readonly onClear: () => void;
}

const SizeFilter = ({ selectedSize, onSelect, onClear }: SizeFilterProps) => {
  const sizes = useGetProductSizes();
  const selectedSizeOption = sizes.data?.result.find(
    (size) => size['english-size-name'] === selectedSize,
  );

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
                سایز
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
          {sizes.isPending ? <UiP className="py-3 text-xs">در حال دریافت سایزها…</UiP> : null}
          {!sizes.isPending && !sizes.isError && sizes.data?.result.length
            ? sizes.data.result.map((size, index, sizeOptions) => {
                const value = size['english-size-name'];
                const selected = value === selectedSize;
                return (
                  <UiButton
                    key={value}
                    variant="style_7"
                    aria-pressed={selected}
                    onClick={() => onSelect(value)}
                    className={clsx(
                      'flex w-full! items-center justify-start rounded-none px-2! py-3! hover:shadow-none!',
                      index !== sizeOptions.length - 1 && 'border-foreground/10 border-b',
                    )}
                  >
                    {size['persian-size-name']}
                  </UiButton>
                );
              })
            : null}
        </AccordionItem>
      </Accordion>
      {selectedSizeOption ? (
        <UiButton
          variant="style_7"
          aria-label={`حذف فیلتر سایز ${selectedSizeOption['persian-size-name']}`}
          onClick={onClear}
          className="border-foreground/10 text-foreground/70 absolute top-2.5 right-14 z-10 flex w-fit! items-center justify-center gap-3 rounded-full border px-2! py-1! text-xs!"
        >
          <span>{selectedSizeOption['persian-size-name']}</span>
          <span aria-hidden="true" className="text-base leading-none">
            ×
          </span>
        </UiButton>
      ) : null}
    </div>
  );
};

export default SizeFilter;
