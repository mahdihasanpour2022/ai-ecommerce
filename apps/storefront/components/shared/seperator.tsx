import clsx from 'clsx';

export const Seperator = ({ className }: { className?: string }) => {
  return <div className={clsx('bg-foreground/10 my-4 h-px w-full', className)} />;
};
