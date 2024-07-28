'use client';

import { Input, type InputProps } from '@/src/components/shadcn-ui/input';
import { type ElementRef, forwardRef, useState } from 'react';
import { Button } from '@/src/components/shadcn-ui/button';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import { cn } from '../lib/utils';

export const PasswordInput = forwardRef<
  ElementRef<'input'>,
  Omit<InputProps, 'type' | 'ref' | 'trailingSlot'>
>(({ className, ...props }, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Input
      type={showPassword ? 'text' : 'password'}
      className={cn('hide-password-toggle pr-10', className)}
      ref={ref}
      trailingSlot={() => (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setShowPassword((prev) => !prev)}>
          {showPassword ? (
            <Eye
              size={16}
              className="size-4"
              aria-hidden="true"
            />
          ) : (
            <EyeSlash
              size={16}
              className="size-4"
              aria-hidden="true"
            />
          )}
          <span className="sr-only">
            {showPassword ? 'Hide password' : 'Show password'}
          </span>
        </Button>
      )}
      {...props}
    />
  );
});

PasswordInput.displayName = 'PasswordInput';
