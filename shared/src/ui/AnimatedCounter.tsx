import { useEffect, useRef } from 'react';
import { useInView, useMotionValue, useSpring, motion } from 'framer-motion';
import clsx from 'clsx';

export interface AnimatedCounterProps {
  from?: number;
  to: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  label: string;
  sublabel?: string;
  className?: string;
}

export function AnimatedCounter({
  from = 0,
  to,
  duration = 1.8,
  suffix = '',
  prefix = '',
  label,
  sublabel,
  className
}: AnimatedCounterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const motionValue = useMotionValue(from);
  const springValue = useSpring(motionValue, {
    damping: 50,
    stiffness: 200,
    duration
  });
  const displayRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isInView) {
      motionValue.set(to);
    }
  }, [isInView, motionValue, to]);

  useEffect(() => {
    return springValue.on('change', (latest) => {
      if (displayRef.current) {
        displayRef.current.textContent = `${prefix}${Math.round(latest).toLocaleString('en-IN')}${suffix}`;
      }
    });
  }, [springValue, prefix, suffix]);

  return (
    <div ref={ref} className={clsx('text-center', className)}>
      <div className="tabular-nums text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
        <span ref={displayRef}>{prefix}{from.toLocaleString('en-IN')}{suffix}</span>
      </div>
      <p className="mt-1 text-sm font-semibold text-zinc-700">{label}</p>
      {sublabel && <p className="mt-0.5 text-xs text-zinc-500">{sublabel}</p>}
    </div>
  );
}
