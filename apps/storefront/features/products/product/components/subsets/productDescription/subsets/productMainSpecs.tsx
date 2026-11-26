import { UiP, UiSpan } from '@/components/shared/ui';
import { ProductByID } from '../../../../interfaces/productById';

interface Props {
  currentProduct: ProductByID | undefined;
}

export const ProductMainSpecs = ({ currentProduct }: Props) => {
  return (
    <div className="flex w-full flex-col items-start justify-between gap-2 py-6">
      <UiSpan className="" variant="style_10">
        ویژگی ها :
      </UiSpan>
      <div className="flex w-full! items-start justify-start gap-1">
        {currentProduct?.mainSpecs.map(({ title, description }) => (
          <UiP
            className="flex w-1/3! flex-col rounded-lg bg-gray-100 px-4 py-2"
            variant="style_2"
            key={title}
          >
            <UiSpan className="whitespace-nowrap" variant="style_6">
              {title}:
            </UiSpan>
            <UiSpan className="whitespace-nowrap" variant="style_8">
              {description}
            </UiSpan>
          </UiP>
        ))}
      </div>
    </div>
  );
};
