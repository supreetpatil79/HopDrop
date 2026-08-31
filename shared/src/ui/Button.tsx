import { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-zinc-950 text-white shadow-xs hover:bg-zinc-800 active:scale-[0.98] focus-visible:ring-zinc-950/20',
  secondary:
    'bg-zinc-100 text-zinc-900 border border-zinc-200/70 hover:bg-zinc-200/80 active:scale-[0.98] focus-visible:ring-zinc-400/20',
  ghost:
    'border border-zinc-200/80 bg-white text-zinc-800 shadow-xs hover:bg-zinc-50 hover:border-zinc-300 active:scale-[0.98] focus-visible:ring-zinc-400/20',
  danger:
    'bg-rose-600 text-white shadow-xs hover:bg-rose-700 active:scale-[0.98] focus-visible:ring-rose-500/20',
  subtle:
    'bg-white/10 text-white/90 hover:bg-white/15 active:scale-[0.98] focus-visible:ring-white/20 border border-white/10'
};

const sizeStyles: Record<Size, string> = {
  sm: 'min-h-[36px] rounded-lg px-3 text-xs font-medium',
  md: 'min-h-[42px] rounded-xl px-4 text-sm font-medium',
  lg: 'min-h-[48px] rounded-xl px-5 text-[15px] font-semibold'
};

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={clsx('animate-spin', className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function Button({
  type = 'button',
  variant = 'primary',
  size = 'md',
  fullWidth,
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const spinnerSize = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 tracking-tight transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? (
        <><Spinner className={spinnerSize} /><span>{children}</span></>
      ) : (
        <>{icon && <span className="shrink-0">{icon}</span>}{children}</>
      )}
    </button>
  );
}

