import { ChevronLeftIcon } from '@/components/shared/icons/chevron-icon';
import { UiButton, UiSpan } from '@/components/shared/ui';
import { ProductSpecification } from '@/features/products/product/interfaces/productById';
import { useId, useState } from 'react';

interface Props {
  specifications: readonly ProductSpecification[] | undefined;
}

export const ProductSpecifications = ({ specifications }: Props) => {
  const [showAllSpecs, setShowAllSpecs] = useState<boolean>(false);
  const expandableContentId = useId();
  const visibleSpecifications = specifications?.slice(0, 4);
  const expandableSpecifications = specifications?.slice(4);

  return (
    <div className="w-full">
      <ul className="flex w-full flex-col items-start justify-start gap-6 px-0 sm:px-12 lg:px-48">
        {visibleSpecifications?.map((specification) => (
          <li key={specification.title} className="flex w-full items-center justify-start gap-2">
            <UiSpan variant="style_15" className="text-foreground/40! max-w-32 min-w-32 pb-2">
              {specification.title} :
            </UiSpan>
            <UiSpan
              variant="style_15"
              className="border-foreground/5 text-foreground/70! w-full! border-b pb-3"
            >
              {specification.description}
            </UiSpan>
          </li>
        ))}
      </ul>

      <div
        id={expandableContentId}
        className="grid transition-all duration-500 ease-in-out motion-reduce:transition-none"
        style={{ gridTemplateRows: showAllSpecs ? '1fr' : '0fr' }}
        aria-hidden={!showAllSpecs}
      >
        <ul className="flex min-h-0 w-full flex-col items-start justify-start gap-6 overflow-hidden px-0 sm:px-12 lg:px-48">
          {expandableSpecifications?.map((specification) => (
            <li key={specification.title} className="flex w-full items-center justify-start gap-2">
              <UiSpan variant="style_15" className="text-foreground/40! max-w-32 min-w-32 pb-2">
                {specification.title} :
              </UiSpan>
              <UiSpan
                variant="style_15"
                className="border-foreground/5 text-foreground/70! w-full! border-b pb-3"
              >
                {specification.description}
              </UiSpan>
            </li>
          ))}
        </ul>
      </div>

      <UiButton
        variant="style_7"
        className="flex items-center justify-start gap-2 px-0! pt-4!"
        type="button"
        aria-controls={expandableContentId}
        aria-expanded={showAllSpecs}
        onClick={() => setShowAllSpecs((isExpanded) => !isExpanded)}
      >
        <UiSpan variant="style_2" className="text-nice-blue text-sm font-normal">
          {showAllSpecs ? 'بستن' : 'مشاهده بیشتر'}
        </UiSpan>
        <ChevronLeftIcon
          className={`text-nice-blue size-4 transition-transform duration-500 motion-reduce:transition-none ${
            showAllSpecs ? '-rotate-90' : 'rotate-0'
          }`}
          direction="left"
        />
      </UiButton>
    </div>
  );
};
