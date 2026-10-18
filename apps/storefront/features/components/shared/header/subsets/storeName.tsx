import { UiButton, UiHeading, UiImage, UiSpan } from '@/components/shared/ui';
import { AppRoutes } from '@/constants/appRoues';
import siteLogo from '@/public/assets/header/site_logo.webp';
import { useRouter } from 'next/navigation';

const StoreName = () => {
  const { push } = useRouter();

  return (
    <div className="flex items-center justify-start gap-2">
      <UiButton
        variant="style_8"
        className="h-full w-fit cursor-pointer p-0!"
        onClick={() => push(AppRoutes.home)}
      >
        <UiImage
          alt=""
          src={siteLogo}
          width={300}
          height={300}
          className="size-14 shrink-0 rounded-full"
          variant="style_2"
        />
      </UiButton>
      <div className="flex min-w-0 flex-col items-start">
        <UiHeading type="h1">فروشگاه عمو محسن</UiHeading>
        <UiSpan>فروش محصولات مختلف</UiSpan>
      </div>
    </div>
  );
};

export default StoreName;
