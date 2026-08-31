import { HTMLAttributes, PropsWithChildren } from 'react';
import clsx from 'clsx';

type CardVariant = 'default' | 'glow' | 'dark';
type AccentColor = 'emerald' | 'blue' | 'violet' | 'amber' | 'rose';

export interface CardProps extends PropsWithChildren, HTMLAttributes<HTMLDivElement> {
  className?: string;
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: CardVariant;
  accent?: AccentColor;
}

const paddingMap = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8'
};

const variantMap: Record<CardVariant, string> = {
  default: 'border-zinc-200/80 bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.03),0_1px_2px_-1px_rgba(0,0,0,0.03)]',
  glow: 'border-emerald-200/60 bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] hover:shadow-[0_0_0_3px_rgba(16,185,129,0.10),0_8px_24px_-8px_rgba(16,185,129,0.20)]',
  dark: 'border-zinc-800 bg-zinc-950 text-white shadow-xl'
};

const accentMap: Record<AccentColor, string> = {
  emerald: 'border-l-4 border-l-emerald-500',
  blue: 'border-l-4 border-l-blue-500',
  violet: 'border-l-4 border-l-violet-500',
  amber: 'border-l-4 border-l-amber-500',
  rose: 'border-l-4 border-l-rose-500'
};

export function Card({
  children,
  className,
  interactive = false,
  padding = 'md',
  variant = 'default',
  accent,
  ...props
}: CardProps) {
  return (
    <div
      {...props}
      className={clsx(
        'rounded-2xl border',
        variantMap[variant],
        paddingMap[padding],
        accent && accentMap[accent],
        interactive &&
          'transition-all duration-200 hover:border-zinc-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.10)]',
        className
      )}
    >
      {children}
    </div>
  );
}

