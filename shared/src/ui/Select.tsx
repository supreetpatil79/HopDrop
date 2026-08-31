import { forwardRef, SelectHTMLAttributes, useId } from 'react';
import clsx from 'clsx';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  labelHint?: string;
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, helperText, labelHint, containerClassName, className, children, id, required, disabled, ...props },
  ref
) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const helperId = helperText ? `${selectId}-helper` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

  return (
    <label className={clsx('flex w-full flex-col gap-2', containerClassName)}>
      {label ? (
        <span className="flex items-center justify-between gap-3 text-sm font-semibold tracking-[-0.01em] text-text">
          <span>
            {label}
            {required ? <span className="ml-1 text-primary">*</span> : null}
          </span>
          {labelHint ? <span className="text-xs font-medium text-text-muted">{labelHint}</span> : null}
        </span>
      ) : null}
      <span
        className={clsx(
          'relative flex min-h-[52px] items-center rounded-2xl border border-border/80 bg-white px-4 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.65)] transition duration-200',
          error
            ? 'border-red-300 bg-red-50/50 shadow-[0_0_0_4px_rgba(239,68,68,0.08)]'
            : 'focus-within:border-primary/60 focus-within:shadow-[0_0_0_4px_rgba(15,118,110,0.10),0_18px_42px_-26px_rgba(15,23,42,0.35)] hover:border-primary/25',
          disabled && 'cursor-not-allowed bg-slate-50 text-slate-400'
        )}
      >
        <select
          id={selectId}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={clsx(
            'w-full appearance-none border-0 bg-transparent py-3 pr-8 text-[15px] text-text outline-none focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:text-slate-400',
            className
          )}
          {...props}
          required={required}
          disabled={disabled}
          ref={ref}
        >
          {children}
        </select>
        <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-text-muted">
          ˅
        </span>
      </span>
      {error ? (
        <span id={errorId} className="text-xs font-medium text-red-700">
          {error}
        </span>
      ) : helperText ? (
        <span id={helperId} className="text-xs leading-5 text-text-muted">
          {helperText}
        </span>
      ) : null}
    </label>
  );
});
