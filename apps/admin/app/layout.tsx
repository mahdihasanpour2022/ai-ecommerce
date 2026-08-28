import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'پنل مدیریت',
  description: 'زیرساخت اولیه پنل مدیریت فروشگاه قطعات خودرو',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fa-IR" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
