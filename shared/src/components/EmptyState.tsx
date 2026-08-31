import { ReactNode } from 'react';
import clsx from 'clsx';
import { Card } from '../ui';

export interface EmptyStateProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, actions, icon, className }: EmptyStateProps) {
  return (
    <Card className={clsx('flex flex-col items-start gap-4 border-dashed border-border/90 bg-white/85', className)} padding="lg">
      {icon ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/10 bg-primary/10 text-primary">
          {icon}
        </div>
      ) : null}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-[-0.02em] text-dark">{title}</h2>
        {description ? <p className="max-w-2xl text-sm leading-6 text-text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </Card>
  );
}
