import clsx from 'clsx';

export interface SpinnerProps {
  className?: string;
}

export function Spinner({ className }: SpinnerProps) {
  return (
    <div
      aria-hidden="true"
      className={clsx(
        'h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary shadow-[0_0_0_1px_rgba(255,255,255,0.6)]',
        className
      )}
    />
  );
}
