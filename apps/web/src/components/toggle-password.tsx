'use client';

import { Input, type InputProps } from '@/src/components/shadcn-ui/input';
import { Button } from '@/src/components/shadcn-ui/button';
import { type ElementRef, forwardRef, useState } from 'react';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import { cn } from '../lib/utils';

export const TogglePasswordBox = forwardRef<
  ElementRef<'input'>,
  Omit<InputProps, 'type' | 'ref'>
>(({ className, ...props }, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <Input
        type={showPassword ? 'text' : 'password'}
        className={cn('hide-password-toggle pr-10', className)}
        ref={ref}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
        onClick={() => setShowPassword((prev) => !prev)}>
        {showPassword ? (
          <Eye
            className="h-4 w-4"
            aria-hidden="true"
          />
        ) : (
          <EyeSlash
            className="h-4 w-4"
            aria-hidden="true"
          />
        )}
        <span className="sr-only">
          {showPassword ? 'Hide password' : 'Show password'}
        </span>
      </Button>
    </div>
  );
});

TogglePasswordBox.displayName = 'TogglePasswordBox';
