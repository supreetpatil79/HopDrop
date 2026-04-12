import { forwardRef, InputHTMLAttributes } from 'react';
import clsx from 'clsx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(allProps, ref) {
  const { label, error, className, value, ...props } = allProps;
  const hasValueProp = Object.prototype.hasOwnProperty.call(allProps, 'value');
  const normalizedValue =
    value === undefined || value === null || (typeof value === 'number' && Number.isNaN(value)) ? '' : value;

  return (
    <label className="flex w-full flex-col gap-1">
      {label ? <span className="text-sm font-medium text-text">{label}</span> : null}
      <input
        className={clsx(
          'w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none ring-primary/30 transition focus:border-primary focus:ring-2',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-200',
          className
        )}
        {...props}
        {...(hasValueProp ? { value: normalizedValue } : {})}
        ref={ref}
      />
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  );
});
