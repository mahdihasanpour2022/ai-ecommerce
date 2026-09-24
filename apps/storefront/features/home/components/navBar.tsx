import { UiSpan } from '@/components/shared/ui';
import clsx from 'clsx';
import { nanoid } from 'nanoid';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Route {
  en_name: string;
  fa_name: string;
  href: string;
}

const routes: Route[] = [
  { en_name: 'home', fa_name: 'صفحه اصلی', href: '/' },
  { en_name: 'products', fa_name: 'محصولات', href: '/products' },
];
const NavBar = () => {
  const pathname = usePathname();

  return (
    <div className="bg-foreground/4 flex h-16 w-full items-center justify-start gap-8 px-6 sm:px-12 lg:px-24 2xl:px-36">
      {routes.map((route: Route) => (
        <Link
          key={nanoid()}
          href={route.href}
          aria-current={pathname === route.href ? 'page' : undefined}
        >
          <UiSpan
            variant="style_1"
            className={clsx(
              'pr-1 text-sm! leading-4 font-medium!',
              pathname === route.href ? 'text-nice-red/90' : 'text-foreground/60',
            )}
          >
            {route.fa_name}
          </UiSpan>
        </Link>
      ))}
    </div>
  );
};

export default NavBar;
