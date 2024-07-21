import type { Icon } from '@phosphor-icons/react';
import { cn } from '@/src/lib/utils';
import * as React from 'react';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
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
      label,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [hasValue, setHasValue] = React.useState(false);

    React.useEffect(() => {
      props.value && setHasValue(true);
    }, [props.value]);

    return (
      <div
        className={cn(
          'flex flex-col gap-1',
          hint && 'mb-2',
          fullWidth && 'w-full'
        )}>
        <div
          className={cn(
            'border-base-6 focus-within:ring-accent-9 bg-base-1 text-base-12 flex w-full flex-row gap-2 rounded-md border px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-within:outline-none focus-within:ring-1 disabled:cursor-not-allowed disabled:opacity-50',
            inputSize === 'lg' ? 'h-12' : 'h-9',
            hint
              ? hint.type === 'success'
                ? 'border-green-10'
                : hint.type === 'error'
                  ? 'border-red-10'
                  : 'border-base-11'
              : null
          )}
          onClick={(event) => {
            const parentElement = event.currentTarget;
            const inputElement = parentElement.querySelector('input');
            inputElement?.focus();
          }}>
          {Leading && (
            <div className="text-base-10 flex h-full items-center">
              <Leading
                className={inputSize === 'lg' ? 'size-6' : 'size-4'}
                size={inputSize === 'lg' ? 24 : 16}
                aria-hidden="true"
              />
            </div>
          )}
          <div className="flex h-full w-full flex-col justify-center gap-0">
            <label
              className={cn(
                'text-base-10 transition-all',
                hasValue ? 'text-[10px] leading-3' : 'text-sm'
              )}>
              {label}
            </label>
            <input
              type={type}
              className={cn(
                'placeholder:text-base-10 h-full w-full bg-transparent !outline-none transition-all focus-visible:outline-none focus-visible:ring-0',
                hasValue ? 'display-visible' : 'display-hidden h-0',
                className
              )}
              ref={ref}
              onFocus={(event) => {
                setHasValue(true);
                onFocus?.(event);
              }}
              onBlur={(event) => {
                const inputElement = event.currentTarget;
                if (inputElement.value === '') {
                  setHasValue(false);
                }
                onBlur?.(event);
              }}
              {...props}
            />
          </div>
          {Trailing && (
            <div className="text-base-10 flex h-full items-center">
              <Trailing
                className={inputSize === 'lg' ? 'size-6' : 'size-4'}
                size={inputSize === 'lg' ? 24 : 16}
                aria-hidden="true"
              />
            </div>
          )}
        </div>
        <p
          className={cn(
            'text-xs',
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
