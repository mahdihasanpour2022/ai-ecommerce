import clsx from 'clsx';

export const Seperator = ({ className }: { className?: string }) => {
  return <div className={clsx('my-4 h-px w-full bg-gray-200', className)} />;
};
