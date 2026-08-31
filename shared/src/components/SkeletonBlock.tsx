import clsx from 'clsx';

export interface SkeletonBlockProps {
  className?: string;
}

export function SkeletonBlock({ className }: SkeletonBlockProps) {
  return <div className={clsx('animate-pulse rounded-2xl bg-slate-200/80', className)} aria-hidden="true" />;
}
