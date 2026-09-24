import { UiImage } from '@/components/shared/ui';
import Slide from '@/public/assets/header/sample_banner.webp';

const TopSliders = () => {
  return (
    <div className="h-fit w-full! overflow-hidden bg-red-500/20">
      <UiImage
        src={Slide}
        alt="اسلایدر صفحه اصلی"
        width={1000}
        height={1000}
        className=""
      />
    </div>
  );
};

export default TopSliders;
