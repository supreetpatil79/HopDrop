import { forwardRef, TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, error, className, ...props },
  ref
) {
  return (
    <label className="flex w-full flex-col gap-1">
      {label ? <span className="text-sm font-medium text-text">{label}</span> : null}
      <textarea
        className={clsx(
          'w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none ring-primary/30 transition focus:border-primary focus:ring-2',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-200',
          className
        )}
        {...props}
        ref={ref}
      />
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  );
});
