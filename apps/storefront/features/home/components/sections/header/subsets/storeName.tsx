import { UiH1, UiImage, UiSpan } from '@/components/shared/ui';
import siteLogo from '@/public/assets/header/site_logo.webp';

const StoreName = () => {
  return (
    <div className="flex items-center justify-start gap-2">
      <UiImage
        alt=""
        src={siteLogo}
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
