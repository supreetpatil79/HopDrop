import { ReactNode } from 'react';
import clsx from 'clsx';

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  centerOnMobile?: boolean;
}

export function PageHeader({ eyebrow, title, description, actions, className, centerOnMobile = false }: PageHeaderProps) {
  return (
    <div
      className={clsx(
        'flex flex-col gap-4 border-b border-zinc-200/60 pb-6 sm:flex-row sm:items-end sm:justify-between',
        centerOnMobile && 'text-center sm:text-left',
        className
      )}
    >
      <div className="max-w-3xl space-y-1.5">
        {eyebrow ? (
          <div className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-600 border border-zinc-200/60">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">{title}</h1>
        {description ? <p className="text-sm text-zinc-500 leading-normal max-w-2xl">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div> : null}
    </div>
  );
}
