import { Seperator } from '@/components/shared';
import { UiButton, UiImage, UiP, UiSpan } from '@/components/shared/ui';
import { ProductPrice } from '@/features/components/shared';
import storeIcon from '@/public/assets/product/seller/store-icon.webp';
import { ProductByID } from '../../../interfaces/productById';
import { ProductBestPrice } from './subsets/productBestPrice';
import { ProductBetterPriceSuggest } from './subsets/productBetterPriceSuggest';
import { ProductGuarantee } from './subsets/productGuarantee';

export const ProductSellers = ({ product }: { product: ProductByID }) => {
  const addToCard = () => {
    console.log('addToCard');
  };

  return (
    <aside
      aria-label="اطلاعات فروشنده"
      className="border-foreground/10 bg-nice-gray flex w-full flex-col items-start justify-start gap-2 rounded-2xl border p-4 lg:w-1/5"
    >
      <UiP className="text-foreground/90! font-bold!" variant="style_7">
        فروشنده :
      </UiP>
      <div className="flex items-end justify-start gap-2">
        <UiImage className="h-7! w-7! opacity-50" src={storeIcon} alt="" width={28} height={28} />
        <UiSpan className="" variant="style_6">
          نام فروشگاه
        </UiSpan>
      </div>
      <Seperator className="my-1!" />
      <ProductPrice product={product} className={{ wrapper: 'mt-0!' }} />
      <ProductBestPrice />
      <Seperator className="my-1!" />

      <UiButton type="button" className="w-full!" variant="style_5" onClick={addToCard}>
        افزودن به سبد خرید
      </UiButton>

      <ProductGuarantee />
      <Seperator className="my-1!" />
      <ProductBetterPriceSuggest />
    </aside>
  );
};
