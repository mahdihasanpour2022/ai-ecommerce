import { UiButton, UiP, UiSpan } from '@/components/shared/ui';
import { Accordion, AccordionItem } from '@szhsin/react-accordion';
import clsx from 'clsx';
import { useGetProductColors } from '../../../hooks/useGetProductColors';

interface ColorFilterProps {
  readonly selectedColor: string | undefined;
  readonly onSelect: (color: string) => void;
}

export const ColorFilter = ({ selectedColor, onSelect }: ColorFilterProps) => {
  const colors = useGetProductColors();
  const selectedColorOption = colors.data?.result.find(
    (color) => color['english-color-name'] === selectedColor,
  );

  return (
    <Accordion transition transitionTimeout={350} className="w-full">
      <AccordionItem
        className="w-full!"
        header={({ state }) => (
          <div className="flex w-full! items-center justify-between">
            <span className="flex items-center gap-4">
              <UiSpan
                variant="style_1"
                className="text-foreground/70! w-fit text-start text-base! font-medium!"
              >
                رنگ
              </UiSpan>
              {selectedColorOption ? (
                <span
                  role="img"
                  aria-label={`رنگ انتخاب‌شده: ${selectedColorOption['persian-color-name']}`}
                  className={`rounded-full px-3 w-14 py-1 text-xs opacity-75 text-center ${selectedColorOption['english-color-name'] === 'white' ? 'text-foreground/60 border-foreground/10 border' : 'text-white'}`}
                  style={{ backgroundColor: selectedColorOption['hex-code'] }}
                >
                  {selectedColorOption['persian-color-name']}
                </span>
              ) : null}
            </span>
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
        {colors.isPending ? <UiP className="py-3 text-xs">در حال دریافت رنگ‌ها…</UiP> : null}
        {!colors.isPending && !colors.isError && colors?.data?.result?.length > 0
          ? (colors.data?.result ?? []).map((color, index, colorOptions) => {
              const value = color['english-color-name'];
              const selected = value === selectedColor;
              return (
                <UiButton
                  key={value}
                  variant="style_7"
                  aria-pressed={selected}
                  onClick={() => onSelect(value)}
                  className={clsx(
                    'flex w-full! items-center justify-start gap-2 rounded-none px-2! py-3! hover:shadow-none!',
                    index !== colorOptions.length - 1 && 'border-foreground/10 border-b',
                    selected ? '' : '',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="border-foreground/10 size-3 shrink-0 rounded-full border"
                    style={{ backgroundColor: color['hex-code'] }}
                  />
                  {color['persian-color-name']}
                </UiButton>
              );
            })
          : null}
      </AccordionItem>
    </Accordion>
  );
};
