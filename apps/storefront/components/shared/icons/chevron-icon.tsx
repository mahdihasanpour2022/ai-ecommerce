import type { SVGProps } from 'react';

interface IconProps extends SVGProps<SVGSVGElement> {
  direction?: 'left' | 'right';
}

export const ChevronLeftIcon = ({ direction = 'left', ...props }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    style={{ transform: direction === 'right' ? 'rotate(180deg)' : 'none' }}
    {...props}
  >
    <path
      d="m15 18-6-6 6-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
