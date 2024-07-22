import * as React from 'react';
import { cn } from '@/src/lib/utils';
import type { Icon } from '@phosphor-icons/react';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  leadingSlot?: Icon | React.FC;
  trailingSlot?: Icon | React.FC;
  inputSize?: 'base' | 'lg';
  hint?: {
    message: string;
    type?: 'info' | 'success' | 'error';
  };
  fullWidth?: boolean;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      inputSize,
      hint,
      fullWidth,
      leadingSlot: Leading,
      trailingSlot: Trailing,
      ...props
    },
    ref
  ) => {
    return (
      <div className={cn('relative', hint && 'mb-2', fullWidth && 'w-full')}>
        {Leading && (
          <div className="text-base-10 absolute left-0 flex h-full items-center p-2">
            <Leading
              className={inputSize === 'lg' ? 'size-6' : 'size-4'}
              size={inputSize === 'lg' ? 24 : 16}
              aria-hidden="true"
            />
          </div>
        )}
        {Trailing && (
          <div className="text-base-10 absolute right-0 flex h-full items-center p-2">
            <Trailing
              className={inputSize === 'lg' ? 'size-6' : 'size-4'}
              size={inputSize === 'lg' ? 24 : 16}
              aria-hidden="true"
            />
          </div>
        )}
        <input
          type={type}
          className={cn(
            'border-input placeholder:text-muted-foreground focus-visible:ring-accent-9 flex w-full rounded-md border bg-white px-3 py-1 text-sm text-black shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50',
            inputSize === 'lg' ? 'h-12' : 'h-9',
            Leading && 'pl-9',
            Trailing && 'pr-8',
            hint
              ? hint.type === 'success'
                ? 'border-green-10'
                : hint.type === 'error'
                  ? 'border-red-10'
                  : 'border-base-11'
              : null,
            className
          )}
          ref={ref}
          {...props}
        />
        <p
          className={cn(
            'absolute text-xs',
            hint
              ? hint.type === 'success'
                ? 'text-green-10'
                : hint.type === 'error'
                  ? 'text-red-10'
                  : 'text-base-11'
              : null
          )}>
          {hint?.message}
        </p>
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
