'use client';
import clsx from 'clsx';

export const Skeleton = ({ className }: { className?: string }) => {
  return <div className={clsx('bg-foreground/10 min-h-24 w-full animate-pulse', className)} />;
};


