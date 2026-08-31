import clsx from 'clsx';

export interface BadgeProps {
  children: string;
  tone?: 'success' | 'neutral' | 'warning' | 'danger' | 'primary';
}

const toneMap = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  neutral: 'border-zinc-200 bg-zinc-100 text-zinc-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-rose-200 bg-rose-50 text-rose-700',
  primary: 'border-zinc-900 bg-zinc-950 text-white'
};

const dotColorMap = {
  success: 'bg-emerald-500',
  neutral: 'bg-zinc-400',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  primary: 'bg-emerald-400'
};

export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider font-sans',
        toneMap[tone]
      )}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full', dotColorMap[tone])} />
      {children}
    </span>
  );
}
