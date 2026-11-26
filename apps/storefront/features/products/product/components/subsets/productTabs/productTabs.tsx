import { UiButton, UiSpan } from '@/components/shared/ui';
import { ProductSpecification } from '@/features/products/product/interfaces/productById';
import clsx from 'clsx';
import { type KeyboardEvent, useRef, useState } from 'react';
import { ProductSpecifications } from './subsets/productSpecifications';

type TabName = 'specifications' | 'opinion';

interface Tab {
  persian_txt: string;
  english_txt: TabName;
}

const tabs: Tab[] = [
  { persian_txt: 'مشخصات', english_txt: 'specifications' },
  { persian_txt: 'دیدگاه ها', english_txt: 'opinion' },
];

const defaultTab: TabName = 'specifications';

interface Props {
  specifications: readonly ProductSpecification[] | undefined;
}

export const ProductTabs = ({ specifications }: Props) => {
  const [activeTab, setActiveTab] = useState<TabName>(defaultTab);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const lastIndex = tabs.length - 1;
    let nextIndex: number | undefined;

    if (event.key === 'ArrowRight') nextIndex = index === lastIndex ? 0 : index + 1;
    if (event.key === 'ArrowLeft') nextIndex = index === 0 ? lastIndex : index - 1;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = lastIndex;
    if (nextIndex === undefined) return;

    event.preventDefault();
    setActiveTab(tabs[nextIndex]!.english_txt);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <section aria-label="جزئیات محصول" className="h-fit w-full">
      <div
        role="tablist"
        aria-label="بخش‌های جزئیات محصول"
        className="border-foreground/10 flex w-full items-center justify-start gap-2 border-b pt-6"
      >
        {tabs.map((tab, index) => (
          <UiButton
            key={tab.english_txt}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`product-tab-${tab.english_txt}`}
            aria-controls={`product-tabpanel-${tab.english_txt}`}
            aria-selected={activeTab === tab.english_txt}
            tabIndex={activeTab === tab.english_txt ? 0 : -1}
            size="small"
            variant="style_2"
            className={clsx(
              'w-fit! rounded-sm border-b-4 px-1! py-1! pb-4!',
              activeTab === tab.english_txt ? 'border-nice-red' : 'border-transparent',
            )}
            onClick={() => setActiveTab(tab.english_txt)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            <UiSpan
              className="text-foreground/40! w-fit! px-0! text-sm! font-bold! whitespace-nowrap!"
              variant="style_1"
            >
              {tab.persian_txt}
            </UiSpan>
          </UiButton>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`product-tabpanel-${activeTab}`}
        aria-labelledby={`product-tab-${activeTab}`}
        tabIndex={0}
        className="pt-12"
      >
        {activeTab === 'specifications' ? (
          <>
            <h2 className="text-foreground/80 border-nice-red w-fit border-b-2 text-lg font-bold">
              مشخصات
            </h2>
            <ProductSpecifications specifications={specifications} />
          </>
        ) : (
          <p className="text-foreground/40">هنوز دیدگاهی برای این محصول ثبت نشده است.</p>
        )}
      </div>
    </section>
  );
};
