import clsx from 'clsx';

interface BadgeProps {
  children: string;
  tone?: 'success' | 'neutral' | 'warning' | 'danger';
}

const toneMap = {
  success: 'bg-green-100 text-green-800',
  neutral: 'bg-gray-100 text-gray-700',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-700'
};

export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return <span className={clsx('rounded-full px-2 py-1 text-xs font-semibold', toneMap[tone])}>{children}</span>;
}
