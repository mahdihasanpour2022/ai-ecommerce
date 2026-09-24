import { UiH1, UiImage, UiSpan } from '@/components/shared/ui-polymorphic-comp';
import siteLogo1 from '@/public/assets/header/site_logo_1.webp';

const StoreName = () => {
  return (
    <div className="flex flex-row items-center justify-start gap-2 py-6">
      <UiImage
        alt=""
        src={siteLogo1}
        width={300}
        height={300}
        className="size-14 shrink-0 rounded-full"
        variant="style_2"
      />
      <div className="flex min-w-0 flex-col items-start">
        <UiH1 type="h1">فروشگاه عمو محسن</UiH1>
        <UiSpan>فروش محصولات مختلف مانند پوشاک، کلاه و موارد دیگر</UiSpan>
      </div>
    </div>
  );
};

export default StoreName;
