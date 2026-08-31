import { ReactNode } from 'react';
import clsx from 'clsx';
import { Card } from '../ui';

export interface StatCardProps {
  label: string;
  value: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
}

export function StatCard({ label, value, description, icon, className }: StatCardProps) {
  return (
    <Card className={clsx('flex flex-col justify-between gap-3 p-5', className)} interactive>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{label}</span>
        {icon ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
            {icon}
          </div>
        ) : null}
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold tracking-tight text-zinc-950 font-sans tabular-nums">{value}</p>
        {description ? <p className="text-xs text-zinc-500 font-normal leading-relaxed">{description}</p> : null}
      </div>
    </Card>
  );
}
