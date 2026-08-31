import { ReactNode } from 'react';
import clsx from 'clsx';
import { Card, Spinner } from '../ui';

export interface LoadingStateProps {
  title?: string;
  description?: string;
  className?: string;
  actions?: ReactNode;
}

export function LoadingState({
  title = 'Loading workspace',
  description = 'Fetching the latest trips, deliveries, and live status.',
  className,
  actions
}: LoadingStateProps) {
  return (
    <Card className={clsx('flex flex-col items-start gap-4', className)} padding="lg">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/10 bg-primary/10">
        <Spinner className="h-6 w-6" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-[-0.02em] text-dark">{title}</h2>
        <p className="max-w-2xl text-sm leading-6 text-text-muted">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </Card>
  );
}
