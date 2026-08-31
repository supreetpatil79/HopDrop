import { forwardRef, InputHTMLAttributes, ReactNode, useId } from 'react';
import clsx from 'clsx';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  error?: string;
  helperText?: string;
  labelHint?: string;
  containerClassName?: string;
  inputClassName?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(allProps, ref) {
  const generatedId = useId();
  const {
    label,
    error,
    helperText,
    labelHint,
    className,
    containerClassName,
    inputClassName,
    prefix,
    suffix,
    id,
    value,
    required,
    disabled,
    ...props
  } = allProps;
  const hasValueProp = Object.prototype.hasOwnProperty.call(allProps, 'value');
  const normalizedValue =
    value === undefined || value === null || (typeof value === 'number' && Number.isNaN(value)) ? '' : value;
  const inputId = id || generatedId;
  const helperId = helperText ? `${inputId}-helper` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

  return (
    <label className={clsx('flex w-full flex-col gap-1.5', containerClassName)}>
      {label ? (
        <span className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wider text-zinc-600">
          <span>
            {label}
            {required ? <span className="ml-1 text-emerald-600">*</span> : null}
          </span>
          {labelHint ? <span className="text-[11px] font-normal text-zinc-400">{labelHint}</span> : null}
        </span>
      ) : null}
      <span
        className={clsx(
          'group flex min-h-[44px] items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-3.5 shadow-xs transition duration-150',
          error
            ? 'border-rose-300 bg-rose-50/30 shadow-[0_0_0_3px_rgba(244,63,94,0.08)]'
            : 'focus-within:border-zinc-950 focus-within:ring-2 focus-within:ring-zinc-950/10 hover:border-zinc-300',
          disabled && 'cursor-not-allowed bg-zinc-50 text-zinc-400'
        )}
      >
        {prefix ? <span className="shrink-0 text-zinc-400">{prefix}</span> : null}
        <input
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={clsx(
            'min-w-0 flex-1 border-0 bg-transparent px-0 py-3 text-[15px] text-text outline-none placeholder:text-slate-400 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:text-slate-400',
            inputClassName,
            className
          )}
          {...props}
          {...(hasValueProp ? { value: normalizedValue } : {})}
          required={required}
          disabled={disabled}
          ref={ref}
        />
        {suffix ? <span className="shrink-0 text-text-muted">{suffix}</span> : null}
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
