import { PropsWithChildren } from 'react';
import clsx from 'clsx';

interface CardProps extends PropsWithChildren {
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return <div className={clsx('rounded-lg border border-border bg-white p-4 shadow-sm', className)}>{children}</div>;
}
