import { UiButton, UiSpan } from '@/components/shared/ui';
import { Accordion, AccordionItem } from '@szhsin/react-accordion';
import clsx from 'clsx';
import { nanoid } from 'nanoid';

interface Item {
  title: string;
  children: string[];
}

const items: Item[] = [{ title: 'رنگ', children: ['قرمر', 'آبی'] }];

export const ColorFilter = () => {
  return (
    <Accordion transition transitionTimeout={350} className="w-full">
      {items.map((item: Item, index) => (
        <AccordionItem
          key={nanoid()}
          className={clsx('w-full!', index !== items.length - 1 && 'border-foreground/15 border-b')}
          header={({ state }) => (
            <div className="flex w-full! items-center justify-between">
              <UiSpan
                variant="style_1"
                className="text-foreground/70! w-fit text-start text-base! font-medium!"
              >
                {item.title}
              </UiSpan>

              <svg
                className={`size-4 transition-transform duration-300 ${
                  state.isEnter ? 'rotate-180' : 'rotate-0'
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
          buttonProps={{
            className: 'pb-3 pt-4 w-full pl-3 cursor-pointer!',
          }}
          panelProps={{
            className: '',
          }}
          contentProps={{
            className: 'overflow-hidden transition-[height] duration-[350ms]',
          }}
        >
          {item.children.map((child: string, index) => (
            <UiButton
              key={nanoid()}
              variant="style_7"
              className={clsx(
                'flex w-4/5! justify-start hover:shadow-none!',
                index !== item.children.length - 1 && 'border-foreground/10 border-b',
              )}
            >
              {child}
            </UiButton>
          ))}
        </AccordionItem>
      ))}
    </Accordion>
  );
};
