import { UiCarousel, UiImage } from '@/components/shared/ui';
import Slide from '@/public/assets/slides/sample_banner.webp';
import Slide2 from '@/public/assets/slides/sample_banner_2.webp';
import Slide3 from '@/public/assets/slides/sample_banner_3.webp';
import Slide4 from '@/public/assets/slides/sample_banner_4.webp';

const slides = [
  {
    id: 'main-banner',
    image: Slide,
    alt: 'بنر اول صفحه اصلی',
  },
  {
    id: 'main-banner-2',
    image: Slide2,
    alt: 'بنر دوم صفحه اصلی',
  },
  {
    id: 'main-banner-3',
    image: Slide3,
    alt: 'بنر سوم صفحه اصلی',
  },
  {
    id: 'main-banner-4',
    image: Slide4,
    alt: 'بنر چهارم صفحه اصلی',
  },
] as const;

export const TopSliders = () => {
  return (
    <UiCarousel
      className="h-32 w-full bg-red-500 sm:h-90!"
      options={{ loop: true, direction: 'rtl' }}
      autoplay={{ delay: 6000 }}
      controls="both"
      labels={{ carousel: 'بنرهای صفحه اصلی' }}
    >
      {slides.map((slide) => (
        <UiImage
          key={slide.id}
          src={slide.image}
          alt={slide.alt}
          width={slide.image.width}
          height={slide.image.height}
          sizes="100vw"
          className="h-32! w-full bg-center! object-cover! sm:h-90!"
          preload
        />
      ))}
    </UiCarousel>
  );
};
