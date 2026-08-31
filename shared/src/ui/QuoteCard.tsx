import clsx from 'clsx';

export interface QuoteCardProps {
  quote: string;
  name: string;
  role: string;
  route: string;
  initials: string;
  accentColor?: 'emerald' | 'blue' | 'violet' | 'amber';
  className?: string;
}

const accentMap = {
  emerald: {
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-100',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    avatar: 'bg-emerald-950 text-emerald-100'
  },
  blue: {
    dot: 'bg-blue-500',
    ring: 'ring-blue-100',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    avatar: 'bg-blue-950 text-blue-100'
  },
  violet: {
    dot: 'bg-violet-500',
    ring: 'ring-violet-100',
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    avatar: 'bg-violet-950 text-violet-100'
  },
  amber: {
    dot: 'bg-amber-500',
    ring: 'ring-amber-100',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    avatar: 'bg-amber-950 text-amber-100'
  }
};

export function QuoteCard({
  quote,
  name,
  role,
  route,
  initials,
  accentColor = 'emerald',
  className
}: QuoteCardProps) {
  const accent = accentMap[accentColor];

  return (
    <div
      className={clsx(
        'group relative flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-6',
        'shadow-[0_1px_3px_0_rgba(0,0,0,0.04),0_1px_2px_-1px_rgba(0,0,0,0.04)]',
        'transition-all duration-300 hover:border-zinc-300 hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.10)]',
        'hover:-translate-y-0.5',
        className
      )}
    >
      {/* Large decorative quote mark */}
      <span
        className="absolute right-5 top-4 select-none font-serif text-7xl leading-none text-zinc-100 transition-colors duration-300 group-hover:text-zinc-200/70"
        aria-hidden="true"
      >
        &ldquo;
      </span>

      <div className="relative space-y-4">
        {/* Route badge */}
        <span
          className={clsx(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider',
            accent.bg,
            accent.text
          )}
        >
          <span className={clsx('h-1.5 w-1.5 rounded-full', accent.dot)} />
          {route}
        </span>

        {/* Quote text */}
        <p className="text-sm font-medium italic leading-relaxed text-zinc-700">
          &ldquo;{quote}&rdquo;
        </p>
      </div>

      {/* Attribution */}
      <div className="mt-5 flex items-center gap-3 border-t border-zinc-100 pt-4">
        <span
          className={clsx(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-2',
            accent.avatar,
            accent.ring
          )}
        >
          {initials}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-zinc-900">{name}</p>
          <p className="truncate text-[11px] text-zinc-500">{role}</p>
        </div>
      </div>
    </div>
  );
}
