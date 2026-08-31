import clsx from 'clsx';

export interface TimelineStep {
  number: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export interface TimelineProps {
  steps: TimelineStep[];
  className?: string;
}

export function Timeline({ steps, className }: TimelineProps) {
  return (
    <div className={clsx('relative space-y-0', className)}>
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        return (
          <div key={step.number} className="relative flex gap-5">
            {/* Left: number bubble + connector */}
            <div className="flex flex-col items-center">
              <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-zinc-200 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
                <span className="font-mono text-[11px] font-bold text-zinc-700">{step.number}</span>
              </div>
              {!isLast && (
                <div className="mt-1 w-px flex-1 bg-gradient-to-b from-zinc-200 to-transparent" style={{ minHeight: '32px' }} />
              )}
            </div>

            {/* Right: content */}
            <div className={clsx('min-w-0 pb-8', isLast && 'pb-0')}>
              <div className="group rounded-xl border border-zinc-100 bg-zinc-50/60 p-4 transition-all duration-200 hover:border-zinc-200 hover:bg-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
                {step.icon && (
                  <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-950 text-white">
                    {step.icon}
                  </div>
                )}
                <h3 className="text-sm font-bold text-zinc-900">{step.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">{step.description}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
