'use client';
import clsx from 'clsx';

export const Skeleton = ({ className }: { className?: string }) => {
  return <div className={clsx('bg-nice-gray w-full animate-pulse', className)} />;
};
