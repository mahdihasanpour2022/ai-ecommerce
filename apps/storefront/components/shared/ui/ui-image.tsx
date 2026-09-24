import clsx from 'clsx';
import type { ImageProps } from 'next/image';
import Image from 'next/image';

const VARIANT_CLASSES = {
  style_1: 'h-auto w-full',
  style_2: '',
} as const;

type UiImageProps = ImageProps & {
  variant?: keyof typeof VARIANT_CLASSES;
};

export const UiImage = ({
  src,
  width = '300',
  height = '300',
  className,
  variant = 'style_1',
  alt,
  ...props
}: UiImageProps) => {
  return (
    <Image
      src={src}
      className={clsx(VARIANT_CLASSES[variant], className)}
      {...props}
      width={width}
      height={height}
      alt={alt}
    />
  );
};
