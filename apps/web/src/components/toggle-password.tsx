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
  const [passwordShown, setPasswordShown] = useState(false);
  return (
    <div className="flex">
      <Input
        className={cn('rounded-r-none', className)}
        type={passwordShown ? 'text' : 'password'}
        autoComplete={props.autoComplete}
        ref={ref}
        {...props}
      />
      <Button
        variant="outline"
        size="icon"
        type="button"
        className="border-input size-9 min-h-9 min-w-9 rounded-l-none"
        onClick={() => setPasswordShown(!passwordShown)}>
        {passwordShown ? <Eye size={16} /> : <EyeSlash size={16} />}
      </Button>
    </div>
  );
});

TogglePasswordBox.displayName = 'TogglePasswordBox';
