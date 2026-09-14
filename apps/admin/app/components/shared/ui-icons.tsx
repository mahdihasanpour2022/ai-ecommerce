import type { SVGProps } from 'react';
import { classNames } from './class-names';

type UiIconProps = Omit<SVGProps<SVGSVGElement>, 'children'>;

function iconProps(className?: string): Pick<SVGProps<SVGSVGElement>, 'className' | 'viewBox'> {
  return { className: classNames('size-4 shrink-0', className), viewBox: '0 0 24 24' };
}

export function ActionMenuIcon({ className, ...props }: UiIconProps) {
  return (
    <svg
      {...iconProps(className)}
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-icon="actions"
    >
      <path d="M4 6h5M13 6h7M4 12h9M17 12h3M4 18h2M10 18h10" />
      <circle cx="11" cy="6" r="2" />
      <circle cx="15" cy="12" r="2" />
      <circle cx="8" cy="18" r="2" />
    </svg>
  );
}

export function EditIcon({ className, ...props }: UiIconProps) {
  return (
    <svg
      {...iconProps(className)}
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-icon="edit"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </svg>
  );
}

export function DeleteIcon({ className, ...props }: UiIconProps) {
  return (
    <svg
      {...iconProps(className)}
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-icon="delete"
    >
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5" />
    </svg>
  );
}

export function SunIcon({ className, ...props }: UiIconProps) {
  return (
    <svg
      {...iconProps(className)}
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-icon="sun"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

export function MoonIcon({ className, ...props }: UiIconProps) {
  return (
    <svg
      {...iconProps(className)}
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-icon="moon"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}
